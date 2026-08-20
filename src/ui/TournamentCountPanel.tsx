// ---------------------------------------------------------------------------
// Trajetória por Buy-in — contador de torneios DISPUTADOS no Circuito,
// separado por faixa de buy-in, com o número de vezes que o jogador chegou
// ao dinheiro (prêmio) em cada faixa.
//
// FONTE DOS DADOS
//   - Diário de resultados local ("Trophy Room", cof-trophy-room) — grava
//     cada torneio concluído no aparelho, inclusive os fora do dinheiro.
//   - Ranking do Circuito (Supabase, verified=true) — fonte oficial da nuvem,
//     usada no lugar do local quando o jogador tem apelido no Circuito.
//     A nuvem vence: é a fonte da verdade, resistente a limpezas de cache.
//
// A regra do Allan: "quem disputa 30 torneios e só ganha 1 quer ver que
// precisou de 30" — a contagem mostra TODOS os torneios disputados, não só
// os premiados. Cada faixa aparece separada.
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { BUY_INS } from "../tournament/structure";
import { loadResults, type TournamentResultRecord } from "../app/resultsLog";
import { getPlayerKey, fetchTournamentEntries } from "../lib/ranking";
import { getNickname } from "../lib/nickname";
import { tierForBuyIn } from "../tournament/poyPoints";

interface TierCount {
  /** Faixa (micro, baixa, media, alta, elite). */
  tier: ReturnType<typeof tierForBuyIn>;
  /** Rótulo curto exibido (ex.: "$11"). */
  label: string;
  /** Buy-ins desta faixa (ex.: "$22 e $55"). */
  buyins: string;
  /** Quantos torneios disputados nesta faixa (Circuito). */
  played: number;
  /** Quantos destes chegaram ao dinheiro. */
  inMoney: number;
}

const TIER_BUYINS: Record<string, string> = {
  micro: "$5",
  baixa: "$11",
  media: "$22 e $55",
  alta: "$109",
  elite: "$1.000+",
};

/**
 * Conta torneios por faixa a partir de uma lista de registros.
 * Só TORNEIO = modo "circuito" conta para a trajetória (Treino Livre é treino,
 * exatamente como a regra do ranking: "só o Circuito pontua").
 * Regra do Allan: conta TODOS os torneios disputados — premiados ou não.
 */
function countByTier(records: TournamentResultRecord[]): TierCount[] {
  const byTier = new Map<string, { played: number; inMoney: number }>();
  for (const r of records) {
    if (r.mode !== "circuito") continue;
    const tier = tierForBuyIn(r.buyIn);
    const c = byTier.get(tier) || { played: 0, inMoney: 0 };
    c.played += 1;
    if (r.inMoney) c.inMoney += 1;
    byTier.set(tier, c);
  }
  return buildTierCounts(byTier);
}

function buildTierCounts(
  byTier: Map<string, { played: number; inMoney: number }>,
): TierCount[] {
  return BUY_INS.map((b) => {
    const tier = tierForBuyIn(b.value);
    return {
      tier,
      label: b.label,
      buyins: TIER_BUYINS[tier] ?? b.label,
      played: byTier.get(tier)?.played ?? 0,
      inMoney: byTier.get(tier)?.inMoney ?? 0,
    };
  })
    .filter((c, i, arr) => arr.findIndex((x) => x.tier === c.tier) === i)
    .sort((a, b) => a.played + a.inMoney - (b.played + b.inMoney))
    .reverse();
}

export function TournamentCountPanel() {
  const [counts, setCounts] = useState<TierCount[]>([]);
  const [localOnly, setLocalOnly] = useState(true);

  // Fase 1 (rápida): carrega o diário local imediatamente — o jogador vê a
  // trajetória dele na hora, sem esperar a nuvem.
  useEffect(() => {
    setCounts(countByTier(loadResults()));
  }, []);

  // Fase 2 (oficial): se o jogador tem apelido, busca na nuvem os resultados
  // oficiais do Circuito e substitui a contagem local pela real.
  useEffect(() => {
    const nickname = getNickname();
    if (!nickname) return;
    const nick = nickname;
    let cancelled = false;
    const myKey = getPlayerKey();

    async function loadFromCloud() {
      // Busca por faixa — a nuvem filtra por verified, tier e apelido; o
      // frontend agrega o número de torneios por faixa (1 req por faixa).
      const tiers: Array<ReturnType<typeof tierForBuyIn>> = [
        "micro",
        "baixa",
        "media",
        "alta",
        "elite",
      ];
      try {
        const entries = await fetchTournamentEntries(tiers, nick);
        if (cancelled) return;
        // Nuvem: registros oficiais verified (só ITM grava no ranking — regra
        // WSOP). O diário LOCAL grava todos os concluídos (ITM ou não).
        // Merge: a nuvem domina; o local complementa com os não-ITM, dedup
        // pela chave (buyIn + colocação + campo + modo) pra não contar duas
        // vezes o mesmo torneio.
        const cloudKeys = new Set<string>();
        const cloudByTier = new Map<string, { played: number; inMoney: number }>();
        for (const e of entries) {
          if (e.player_key !== myKey) continue;
          const tier = tierForBuyIn(e.buy_in);
          const c = cloudByTier.get(tier) || { played: 0, inMoney: 0 };
          c.played += 1;
          if (e.finish_position <= (e.paid_places || 0)) c.inMoney += 1;
          cloudByTier.set(tier, c);
          // Chave de dedup: o mesmo torneio existe no diário local.
          // (entrants não vem da nuvem — a chave é o torneio + colocação +
          // jogador, que juntos identificam o mesmo resultado.)
          cloudKeys.add(`${e.buy_in}:${e.finish_position}:${e.player_key}`);
        }
        const local = loadResults();
        const byTier = new Map<string, { played: number; inMoney: number }>();
        for (const r of local) {
          if (r.mode !== "circuito") continue;
          // Já contado pela nuvem (mesmo torneio)? Pula — não duplica.
          const key = `${r.buyIn}:${r.finishPlace}:${myKey}`;
          if (cloudKeys.has(key)) continue;
          const tier = tierForBuyIn(r.buyIn);
          const c = byTier.get(tier) || { played: 0, inMoney: 0 };
          c.played += 1;
          if (r.inMoney) c.inMoney += 1;
          byTier.set(tier, c);
        }
        // Soma nuvem + local complementar.
        for (const [tier, c] of cloudByTier) {
          const agg = byTier.get(tier) || { played: 0, inMoney: 0 };
          agg.played += c.played;
          agg.inMoney += c.inMoney;
          byTier.set(tier, agg);
        }
        // Se nenhum dado existe (nem nuvem nem local), mantém o que já
        // mostrava na fase 1 — nunca esconde a trajetória do jogador.
        if (byTier.size > 0) {
          setCounts(buildTierCounts(byTier));
          setLocalOnly(false);
        }
      } catch {
        /* nuvem indisponível — mantém a contagem local */
      }
    }

    loadFromCloud();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalPlayed = counts.reduce((s, c) => s + c.played, 0);
  const totalInMoney = counts.reduce((s, c) => s + c.inMoney, 0);

  if (totalPlayed === 0) {
    return (
      <div className="tc-empty">
        🎟️ <b>Trajetória no Circuito</b>
        <div className="tc-empty-sub">
          Aqui fica a sua trilha: cada torneio do Circuito disputado, separado
          por faixa de buy-in — premiado ou não. Jogue a primeira etapa e sua
          trajetória começa aqui.
        </div>
      </div>
    );
  }

  return (
    <div className="tc-panel">
      <div className="tc-title">
        🎟️ Trajetória no Circuito
        {localOnly ? (
          <span className="tc-badge">📱 aparelho</span>
        ) : (
          <span className="tc-badge tc-badge-cloud">☁️ oficial</span>
        )}
      </div>
      <div className="tc-sub">
        {totalPlayed} {totalPlayed === 1 ? "torneio disputado" : "torneios disputados"} ·{" "}
        {totalInMoney}{" "}
        {totalInMoney === 1 ? "vez no dinheiro" : "vezes no dinheiro"}
      </div>
      <div className="tc-list">
        {counts.map((c) => {
          // Barra de presença: 100% = a faixa com mais torneios disputados.
          const max = Math.max(1, ...counts.map((x) => x.played));
          const pct = Math.max(8, Math.round((c.played / max) * 100));
          const cashRate = c.played > 0 ? Math.round((c.inMoney / c.played) * 100) : 0;
          return (
            <div key={c.tier} className="tc-row">
              <div className="tc-label">
                <span className="tc-buyin">{c.label}</span>
                <span className="tc-tier">{c.buyins}</span>
              </div>
              <div className="tc-body">
                <div className="tc-nums">
                  <span className="tc-played">{c.played} {c.played === 1 ? "disputado" : "disputados"}</span>
                  <span className="tc-inmoney">
                    {c.inMoney}{" "}
                    {c.inMoney === 1 ? "premiado" : c.inMoney === 0 ? "no dinheiro" : "premiados"}
                    {c.played > 0 ? <small> ({cashRate}%)</small> : null}
                  </span>
                </div>
                <div className="tc-bar-wrap">
                  <div className="tc-bar" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="tc-foot">
        Todo torneio do Circuito conta — disputado ou não. A jornada importa.
      </div>
    </div>
  );
}
