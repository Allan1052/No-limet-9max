// ---------------------------------------------------------------------------
// A TIRA DA BANCA — o saldo, o teto e o próximo degrau, na tela de inscrição.
//
// 13/10/2026, pedido do Allan: *"colocar lá como se eu tivesse 300 de ficha,
// representando minha banca no PokerStars, e o app vai impor que eu seguisse a
// regra certinho — 100 buy-ins."*
//
// A tira não é decoração: ela é a explicação do cadeado 🏦 que aparece nas
// faixas. Sem ela o jogador só veria buy-ins travados sem saber por quê.
// ---------------------------------------------------------------------------
import {
  BANCA_INICIAL,
  BUYINS_DE_RESERVA,
  RESERVA_MEDIDA_ALLAN,
  comecarBanca,
  desligarBanca,
  retratoDaBanca,
  type Banca,
} from "../train/banca";
import "./bancaStrip.css";

const usd = (n: number) => `$${Math.round(n).toLocaleString("pt-BR")}`;

export function BancaStrip({
  banca,
  onMudou,
}: {
  banca: Banca | null;
  onMudou: (b: Banca | null) => void;
}) {
  // ---- regra desligada: o convite ----
  if (!banca) {
    return (
      <section className="banca banca-convite panel">
        <div className="banca-rot">Gestão de banca</div>
        <p className="banca-texto">
          Começar com <b>{usd(BANCA_INICIAL)}</b> e deixar o app <b>impor</b> a regra
          dos <b>{BUYINS_DE_RESERVA} buy-ins</b>: você só se inscreve em torneios que a
          banca cobre {BUYINS_DE_RESERVA} vezes. Com {usd(BANCA_INICIAL)}, o teto é{" "}
          <b>{usd(BANCA_INICIAL / BUYINS_DE_RESERVA)}</b>.
        </p>
        <button className="btn primary banca-btn" onClick={() => onMudou(comecarBanca())}>
          Ligar a regra · {usd(BANCA_INICIAL)}
        </button>
      </section>
    );
  }

  const r = retratoDaBanca(banca);

  return (
    <section className={`banca panel${r.quebrou ? " banca-quebrou" : ""}`}>
      <div className="banca-topo">
        <div>
          <div className="banca-rot">Sua banca</div>
          <div className="banca-saldo">{usd(r.saldo)}</div>
        </div>
        <div className="banca-teto">
          {r.teto !== undefined ? (
            <>
              <span className="banca-teto-rot">teto de hoje</span>
              <b>{usd(r.teto)}</b>
            </>
          ) : (
            <>
              <span className="banca-teto-rot">teto de hoje</span>
              <b className="banca-nada">nenhum</b>
            </>
          )}
        </div>
      </div>

      {r.quebrou ? (
        <p className="banca-texto">
          A banca não cobre {BUYINS_DE_RESERVA} buy-ins nem do menor torneio. Pela regra,
          acabou — e é exatamente o que ela existe para te mostrar antes de acontecer com
          dinheiro de verdade.
        </p>
      ) : (
        <>
          <div className="banca-barra" aria-hidden="true">
            <div
              className="banca-barra-fill"
              style={{
                width: `${Math.max(2, Math.min(100, r.proximo ? ((r.saldo / (r.proximo.buyIn * BUYINS_DE_RESERVA)) * 100) : 100))}%`,
              }}
            />
          </div>
          <p className="banca-texto">
            {r.proximo ? (
              <>
                Faltam <b>{usd(r.proximo.falta)}</b> para liberar{" "}
                <b>{usd(r.proximo.buyIn)}</b>.
              </>
            ) : (
              <>Você está no topo da escada.</>
            )}{" "}
            {r.inscricoes > 0 ? (
              <>
                {r.inscricoes} inscriç{r.inscricoes === 1 ? "ão" : "ões"} ·{" "}
                <b className={r.liquido >= 0 ? "banca-pos" : "banca-neg"}>
                  {r.liquido >= 0 ? "+" : "−"}
                  {usd(Math.abs(r.liquido))}
                </b>{" "}
                · pico {usd(r.pico)}
              </>
            ) : null}
          </p>
        </>
      )}

      {/* HONESTIDADE: a regra de 100 é a de bolso, não a que a variância dele
          exige. O número medido no histórico dele é bem maior, e esconder isso
          seria o app prometendo mais segurança do que a conta dá. */}
      <p className="banca-nota">
        {BUYINS_DE_RESERVA} buy-ins é a regra de bolso do MTT. O seu próprio histórico
        aponta <b>{RESERVA_MEDIDA_ALLAN} buy-ins</b> para a variância que você viveu —
        aqui são {BUYINS_DE_RESERVA} porque o que se treina é o hábito, e não há
        dinheiro real em jogo.
      </p>

      <div className="banca-acoes">
        <button
          className="btn tiny"
          onClick={() => {
            if (confirm("Recomeçar a banca em " + usd(BANCA_INICIAL) + "? O saldo atual se perde.")) {
              onMudou(comecarBanca());
            }
          }}
        >
          Recomeçar
        </button>
        <button
          className="btn tiny"
          onClick={() => {
            if (confirm("Desligar a regra? Os buy-ins voltam a ficar todos liberados.")) {
              desligarBanca();
              onMudou(null);
            }
          }}
        >
          Desligar a regra
        </button>
      </div>
    </section>
  );
}
