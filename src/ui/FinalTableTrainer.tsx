// ---------------------------------------------------------------------------
// ESTUDO DE MESA FINAL — treino dedicado do estágio mais difícil do torneio.
//
// O que resolve: no torneio normal, quando a mesa final se forma, os stacks
// vêm "herdados" do que sobrou (geralmente 4–8bb) e o jogo vira um grande
// shove-or-fold. Aqui o jogador ESCOLHE o stack (10–30bb), o nº de jogadores
// e a pressão ICM — e treina a FT de verdade, com recomeço em 1 clique.
//
// Usa o controller existente (configureTournament com heroStackOverride —
// polish UI) e o módulo puro src/train/ftSession.ts (só leitura dos motores).
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import {
  ftContextSummary,
  ftHeroContext,
  ftStackBand,
  ftCoachLine,
  makeFinalTableSession,
  type FtConfig,
  type FtSession,
} from "../train/ftSession";
import { PokerTable } from "./Table";
import { Controls } from "./Controls";
import { HandActions } from "./HandActions";
import { legalActions } from "../game/betting";
import { HandTipsModal } from "./HandTipsModal";
import { TournamentSummary } from "./TournamentSummary";
import { useGame } from "../app/useGame";
import type { TournamentConfig } from "../app/gameController";
type UserSubscriptionLevel = "free" | "technical" | "ultra";

// ---------------------------------------------------------------------------
// Tela de CONFIGURAÇÃO (o "setup" da mesa final de estudo)
// ---------------------------------------------------------------------------
type PresetKey = "ft" | "curta" | "folgada" | "heads_up";

interface Preset {
  key: PresetKey;
  label: TransKey;
  heroStackBb: number;
  avgOppBb: number;
  nPlayers: number;
  oppSpread: number;
  pressure: "baixa" | "media" | "alta";
}

// Presets inspirados na realidade da FT: a média "ideal" é 15–25bb.
const PRESETS: Preset[] = [
  {
    key: "ft",
    label: "ft.preset.ft",
    heroStackBb: 20,
    avgOppBb: 20,
    nPlayers: 9,
    oppSpread: 0.4,
    pressure: "media",
  },
  {
    key: "curta",
    label: "ft.preset.short",
    heroStackBb: 12,
    avgOppBb: 15,
    nPlayers: 9,
    oppSpread: 0.5,
    pressure: "alta",
  },
  {
    key: "folgada",
    label: "ft.preset.deep",
    heroStackBb: 25,
    avgOppBb: 18,
    nPlayers: 9,
    oppSpread: 0.45,
    pressure: "baixa",
  },
  {
    key: "heads_up",
    label: "ft.preset.heads",
    heroStackBb: 22,
    avgOppBb: 22,
    nPlayers: 2,
    oppSpread: 0,
    pressure: "alta",
  },
];

interface FtSetupProps {
  onStart: (cfg: FtConfig) => void;
}

function FtSetup({ onStart }: FtSetupProps) {
  const { t } = useT();
  const [preset, setPreset] = useState<PresetKey>("ft");
  const [heroStackBb, setHeroStackBb] = useState(20);
  const [avgOppBb, setAvgOppBb] = useState(20);
  const [nPlayers, setNPlayers] = useState(9);
  const [oppSpread, setOppSpread] = useState(0.4);
  const [pressure, setPressure] = useState<"baixa" | "media" | "alta">("media");

  const applyPreset = (p: Preset) => {
    setPreset(p.key);
    setHeroStackBb(p.heroStackBb);
    setAvgOppBb(p.avgOppBb);
    setNPlayers(p.nPlayers);
    setOppSpread(p.oppSpread);
    setPressure(p.pressure);
  };

  const cfg: FtConfig = {
    heroStackBb,
    avgOppBb,
    nPlayers,
    oppSpread,
    pressure,
    buyIn: 1000,
    entrants: 180,
    rng: Math.random,
  };

  const preview = useMemo(() => makeFinalTableSession(cfg), [
    heroStackBb, avgOppBb, nPlayers, oppSpread,
  ]);

  return (
    <div className="ft-setup">
      <div className="panel">
        <h3>📊 {t("ft.title")}</h3>
        <p className="ft-subtitle">{t("ft.subtitle")}</p>
        <div className="ft-presets">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              className={`ft-preset ${preset === p.key ? "active" : ""}`}
              onClick={() => applyPreset(p)}
            >
              {t(p.label)}
            </button>
          ))}
        </div>
        <div className="ft-sliders">
          <div className="ft-slider-row">
            <label>
              {t("ft.heroStack")}: <b>{heroStackBb}bb</b>
            </label>
            <input
              type="range"
              min={10}
              max={30}
              value={heroStackBb}
              onChange={(e) => {
                setHeroStackBb(Number(e.target.value));
                setPreset("custom" as PresetKey);
              }}
            />
          </div>
          <div className="ft-slider-row">
            <label>
              {t("ft.oppStack")}: <b>{avgOppBb}bb</b>
            </label>
            <input
              type="range"
              min={10}
              max={30}
              value={avgOppBb}
              onChange={(e) => {
                setAvgOppBb(Number(e.target.value));
                setPreset("custom" as PresetKey);
              }}
            />
          </div>
          <div className="ft-slider-row">
            <label>
              {t("ft.players")}: <b>{nPlayers}</b>
            </label>
            <input
              type="range"
              min={2}
              max={9}
              value={nPlayers}
              onChange={(e) => {
                setNPlayers(Number(e.target.value));
                setPreset("custom" as PresetKey);
              }}
            />
          </div>
          <div className="ft-slider-row">
            <label>
              {t("ft.variety")}: <b>{oppSpread.toFixed(1)}</b>
            </label>
            <input
              type="range"
              min={0}
              max={0.8}
              step={0.05}
              value={oppSpread}
              onChange={(e) => {
                setOppSpread(Number(e.target.value));
                setPreset("custom" as PresetKey);
              }}
            />
          </div>
        </div>
        <div className="ft-pressure">
          <span>{t("ft.pressure")}: </span>
          {(["baixa", "media", "alta"] as const).map((p) => (
            <button
              key={p}
              className={`ft-press-btn ${pressure === p ? "active" : ""}`}
              onClick={() => {
                setPressure(p);
                setPreset("custom" as PresetKey);
              }}
            >
              {t(`ft.pressure.${p}` as TransKey)}
            </button>
          ))}
        </div>
        {/* Prévia da mesa: stacks em bb + prêmios */}
        <div className="ft-preview">
          <div className="ft-preview-title">{t("ft.preview")}</div>
          <div className="ft-stacks">
            {preview.stacksBb.map((bb, i) => (
              <span key={i} className={`ft-stack ${preview.seats[i].isHero ? "hero" : ""}`}>
                {preview.seats[i].name === "Você" ? "VOCÊ" : `P${i}`} {bb}bb
              </span>
            ))}
          </div>
          <div className="ft-payouts">
            {preview.payouts
              .filter((p) => p > 0)
              .slice(0, 9)
              .join(" · ")}
          </div>
          <div className="ft-disclaimer">{t("ft.disclaimer")}</div>
        </div>
        <button
          className="btn primary ft-start-btn"
          onClick={() => onStart(cfg)}
        >
          ▶ {t("ft.start")}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel lateral de CONTEXTO DA MESA FINAL (ICM em tempo real)
// ---------------------------------------------------------------------------
function FtContextPanel({
  session,
  controller,
}: {
  session: FtSession;
  controller: ReturnType<typeof useGame>["controller"];
}) {
  const ctx = useMemo(() => ftHeroContext(session), [session]);
  const { lines, icmPercent } = ftContextSummary(session, ctx);
  const liveHeroStack = controller.table.players.find((p) => p.isHero)?.stack ?? ctx.heroStack;
  const liveBand = ftStackBand(liveHeroStack, session.bigBlind);

  return (
    <div className="ft-context-panel">
      <div className="ft-ctx-title">📊 Mesa Final · ICM</div>
      <div className="ft-ctx-bar">
        <div
          className="ft-ctx-fill"
          style={{ width: `${icmPercent}%` }}
          aria-label={String(icmPercent)}
        />
        <span className="ft-ctx-pct">{icmPercent}% {liveBand === "medio" ? "ICM" : liveBand === "muito_curto" || liveBand === "curto" ? "risco" : "poder"}</span>
      </div>
      <ul className="ft-ctx-lines">
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      <div className="ft-ctx-stacks">
        {session.seats.map((s, i) => {
          const seat = controller.table.players.find(
            (p) => p.name === s.name || (s.isHero && p.isHero),
          );
          const st = seat?.stack ?? s.stack;
          const bb = Math.round(st / session.bigBlind);
          return (
            <div
              key={i}
              className={`ft-ctx-seat ${s.isHero ? "hero" : ""} ${st <= 0 ? "out" : ""}`}
            >
              <span className="ft-ctx-name">{s.isHero ? "Você" : s.name}</span>
              <span className="ft-ctx-bb">{st <= 0 ? "OUT" : `${bb}bb`}</span>
              <span className="ft-ctx-icm">
                ${Math.round(session.icmValues[i])}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// O treino em si: joga com o controller real, com painel FT + coach FT.
// ---------------------------------------------------------------------------
export function FinalTableTrainer() {
  const { t } = useT();
  const { controller, newHand, setLevel } = useGame("free" satisfies UserSubscriptionLevel);
  const [, setTick] = useState(0);
  const [lastHand, setLastHand] = useState(0);
  const [phase, setPhase] = useState<"setup" | "playing" | "done">("setup");
  const [session, setSession] = useState<FtSession | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [coachLine, setCoachLine] = useState<string>("");
  const configRef = useRef<FtConfig | null>(null);
  const sessionRef = useRef<FtSession | null>(null);

  const start = (cfg: FtConfig) => {
    configRef.current = cfg;
    const s = makeFinalTableSession(cfg);
    sessionRef.current = s;
    setSession(s);
    // Configura o controller real: estágio mesa final + stack do herói escolhido
    // + blinds do nível de FT.handsPerLevel 0 = blinds NÃO sobem (estudo puro).
    const tcfg: TournamentConfig = {
      buyIn: cfg.buyIn,
      entrants: cfg.entrants,
      stage: "mesa_final",
      handsPerLevel: 0,
      heroStackOverride: cfg.heroStackBb * s.bigBlind,
    };
    controller.configureTournament(tcfg);
    // Os oponentes do controller têm stacks "de campo" (mesa_final spread 0.62);
    // sobrepomos os stacks reais da sessão de estudo para manter fidelidade.
    s.seats.forEach((seat, i) => {
      const p = controller.table.players[i];
      if (p) p.stack = seat.stack;
    });
    setTick((v) => v + 1);
    setLevel(8); // blinds da FT: 600/1200 + 150
    setPhase("playing");
    newHand();
  };

  // Coach FT: linha contextual a cada mão nova (stack + ICM + prêmio).
  useEffect(() => {
    if (phase !== "playing" || !sessionRef.current) return;
    const s = sessionRef.current;
    const ctx = ftHeroContext(s);
    const line = ftCoachLine(ftStackBand(ctx.heroStack, s.bigBlind), ctx, configRef.current?.pressure ?? "media");
    setCoachLine(line);
  }, [lastHand, phase]);

  // Ritmo da mesa ao vivo: enquanto for vez de um bot, agenda UM passo de bot
  // (mesmo padrão do jogo normal no useGame — quiet 720ms / drama 1050ms).
  useEffect(() => {
    if (phase !== "playing") return;
    if (controller.phase === "playing" && !controller.table.handOver && !controller.isHeroTurn()) {
      const last = controller.table.lastAggressor >= 0 ? controller.table.currentBet : 0;
      const quiet = last <= controller.table.bigBlind;
      const id = setTimeout(() => {
        controller.botStep();
        setTick((v) => v + 1);
      }, quiet ? 720 : 1050);
      return () => clearTimeout(id);
    }
  });

  // Rastreia a última mão do controller para atualizar o coach FT.
  useEffect(() => {
    const id = setInterval(() => {
      // Identificador de mão: posição final + cartas (mãos são objetos novos a cada handOver).
      const h = controller.lastHand as NonNullable<typeof controller.lastHand> | null;
      if (!h) return;
      const cards = h.holeCards[controller.heroSeat] ?? [];
      const key = `${h.heroPosition ?? ""}:${cards.map((c) => String(c)).join(":")}`;
      setLastHand(key.length);
    }, 500);
    return () => clearInterval(id);
  }, [controller, phase]);

  // Detecta fim da sessão (herói bustou ou virou campeão).
  useEffect(() => {
    if (phase !== "playing") return;
    if (controller.tournamentOver) {
      setPhase("done");
    }
  }, [controller.tournamentOver, phase]);

  if (phase === "setup" || !session) {
    return <FtSetup onStart={start} />;
  }

  const restart = () => {
    setPhase("setup");
    setSession(null);
  };

  return (
    <div className="ft-trainer">
      {phase === "playing" && (
        <div className="ft-topbar">
          <button className="btn tiny" onClick={restart}>
            ← {t("ft.back")}
          </button>
          <span className="ft-topbar-title">📊 {t("ft.title")}</span>
          <FtContextPanel session={session} controller={controller} />
        </div>
      )}
      <div className="ft-coach-bar">{coachLine}</div>
      <PokerTable
        table={controller.table}
        lastActionLabel={controller.lastActionLabel}
        onShowTips={() => setTipsOpen(true)}
        showTips={controller.feedback.length > 0}
        buyIn={controller.tournament?.buyIn}
      />
      {phase === "playing" && controller.lastHand ? (
        <HandActions hand={controller.lastHand} feedback={controller.feedback} />
      ) : null}
      {phase === "playing" && controller.table.handOver ? (
        <div className="ft-actions">
          <button className="btn primary" onClick={() => newHand()}>
            🃏 {t("ft.newHand")}
          </button>
          <button className="btn" onClick={() => setTipsOpen(true)}>
            📖 {t("ft.tips")}
          </button>
        </div>
      ) : null}
      {phase === "playing" && controller.isHeroTurn() ? (
        <Controls
          legal={legalActions(controller.table)}
          active
          pot={controller.pot}
          bigBlind={controller.table.bigBlind}
          onAction={(a) => {
            controller.heroAct(a);
            setTick((v) => v + 1);
          }}
          isOmaha={controller.table.variant === "omaha"}
          defaultRaiseTo={controller.suggestedRaiseTo()}
        />
      ) : null}
      {phase === "playing" && controller.feedback.length > 0 && (
        <div className="ft-actions">
          <button className="btn primary" onClick={() => setTipsOpen(true)}>
            📖 {t("ft.tips")}
          </button>
          <button className="btn" onClick={restart}>
            🔄 {t("ft.restart")}
          </button>
        </div>
      )}
      {phase === "done" && controller.tournamentSummary() ? (
        <div className="ft-done">
          <TournamentSummary
            summary={controller.tournamentSummary()!}
            onClose={() => setPhase("setup")}
          />
          <button className="btn primary" onClick={restart}>
            🔄 {t("ft.restart")}
          </button>
        </div>
      ) : null}
      {tipsOpen && controller.lastHand ? (
        <HandTipsModal
          items={controller.feedback}
          itemsFree={controller.feedbackFree}
          itemsTechnical={controller.feedbackTechnical}
          heroHand={controller.lastHand.holeCards[controller.heroSeat] ?? []}
          userSubscriptionLevel={"free" satisfies UserSubscriptionLevel}
          board={controller.lastHand.finalBoard ?? []}
          heroPosition={controller.lastHand.heroPosition}
          onClose={() => setTipsOpen(false)}
        />
      ) : null}
    </div>
  );
}
