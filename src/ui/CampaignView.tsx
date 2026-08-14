// ---------------------------------------------------------------------------
// MISSÃO 1×1 — ARENA DE DUELO (versão cinematográfica).
//
// A campanha agora parece um torneio real: cada estágio é um "desafiante"
// encapuzado com nível, barra de confronto e alerta de sequência.
// Antes de entrar, uma tela de confirmação mostra "Quem vai se curvar primeiro?".
// Sons de tensão/vitória/derrota acompanham cada momento.
// Reaproveita o motor de cenários e a grade de range do Ultra 1×1.
// ---------------------------------------------------------------------------
import { useMemo, useState, useEffect } from "react";
import { DuelArena, HOODED_VILLAIN, type RivalAvatar } from "./DuelArena";
import { SpotRangeGrid } from "./SpotRangeGrid";
import { AvatarSelector, getHeroAvatarData, canSwapAvatar, formatCooldown, HERO_AVATARS } from "./AvatarSelector";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import { spotRangeGrid } from "../ranges/spotGrid";
import { BASELINE_PROFILE } from "../bots/profiles";
import { comboToHandType } from "../ranges/types";
import {
  buildScenarioFromSpec,
  evaluateChoice,
  isCorrect,
  type Scenario,
  type ScenarioSpec,
} from "../train/scenarios";
import {
  STAGES,
  loadCampaign,
  saveCampaign,
  isStageUnlocked,
  recordStage,
  campaignStats,
  type Stage,
  type CampaignProgress,
} from "../train/campaign";
import { shareSpot } from "../app/share";
import { markActiveToday } from "../train/streak";
import { recordDecision } from "../train/decisionStats";
import type { FeedbackItem } from "../feedback/analyzer";
import { useDuelSound } from "./useDuelSound";

// ---------------------------------------------------------------------------
// Nomes imersivos para cada posição — o rival não é "Player42", é um personagem.
// ---------------------------------------------------------------------------
const POSITION_RIVAL_NAMES: Record<string, { name: string; title: string }> = {
  BTN: { name: "O Carteiro", title: "Domina o botão" },
  CO: { name: "O Acelerador", title: "Corta antes de você" },
  HJ: { name: "O Intermediário", title: "Abre do hijack" },
  LJ: { name: "O Estrategista", title: "Sabe ler o campo" },
  MP: { name: "O Paciente", title: "Abre do meio da mesa" },
  UTG1: { name: "O Corajoso", title: "Abre cedo, sem medo" },
  SB: { name: "O Provocador", title: "Defende a small" },
  BB: { name: "O Muro", title: "Defende o big blind" },
  UTG: { name: "O Pioneiro", title: "O primeiro a abrir" },
};

// Frases de taunt antes do duelo — tensão pré-jogo
const PRE_MATCH_TAUNTS = [
  "Quem vai se curvar primeiro?",
  "Ele já venceu as últimas. Sua vez de mudar isso.",
  "A mesa é pequena, mas o tamanho do momento é gigante.",
  "Dois lados. Um pote. Nenhum meio-termo.",
  "Ele riu do seu fold anterior. Agora é sua vez.",
  "Sem misericórdia. Sem remorso. Só decisão.",
  "O feltro não perdoa. Nem você.",
  "A última mão que ele ganhou ainda está fresca na sua cabeça.",
];

// Nomes dos vilões por posição (fallback imersivo)
function getRivalInfo(position?: string): { name: string; title: string } {
  if (!position) return { name: "O Ceifador", title: "A sombra da mesa" };
  const info = POSITION_RIVAL_NAMES[position];
  return info || { name: "O Desconhecido", title: "Posição oculta" };
}

// Mapeamento de rival por estágio — cada posição tem um avatar fotorrealista
const RIVAL_AVATAR_MAP: Record<string, string> = {
  BTN: "paga-tudo",       // O Carteiro — paga-tudo agressivo
  CO: "furacao",           // O Acelerador — corta antes de você
  HJ: "certinho",          // O Intermediário — certinho
  LJ: "estrategista",      // O Estrategista — lê o campo
  MP: "silencioso",        // O Paciente — monge do poker
  UTG1: "acelerador",      // O Corajoso — jovem, tinta, adrenalina
  SB: "cartilha",          // O Provocador — blue dourado, calculista
  BB: "muralha",           // O Muro — cinza, inabalável
  UTG: "ceifador",         // O Pioneiro — O Ceifador, encapuzado
};

function getRivalAvatar(_stageIdx: number, stage: Stage): RivalAvatar {
  const rivalInfo = getRivalInfo(stage.heroPosition);
  // Usar o avatar mapeado para a posição do rival
  const avatarId = RIVAL_AVATAR_MAP[stage.heroPosition] || "ceifador";
  const avatar = HERO_AVATARS.find((a) => a.id === avatarId) || HERO_AVATARS[8]; // fallback O Ceifador
  
  // Taunts personalizados por avatar
  const taunts: Record<string, string> = {
    "paga-tudo": "Toda ficha sua acaba na minha pilha.",
    "furacao": "Eu não blefo. Eu ataco.",
    "certinho": "Seguindo o manual. Sempre.",
    "estrategista": "Antes de eu sentar, já sei como termina essa mão.",
    "silencioso": "Enquanto você pensa... eu já decidi.",
    "acelerador": "Cada mão que eu jogo, alguém fica nervoso.",
    "cartilha": "A matemática está do meu lado.",
    "muralha": "Tente passar por mim.",
    "ceifador": "Ninguém sabe meu nome. Ninguém precisa saber.",
  };
  
  return {
    image: avatar.image,
    color: avatar.color,
    name: rivalInfo.name,
    taunt: taunts[avatarId] || "Hora de decidir.",
  };
}

function getRivalAvatarByStageIdx(stageIdx: number): RivalAvatar {
  const stage = STAGES[stageIdx];
  return getRivalAvatar(stageIdx, stage);
}

// ---------------------------------------------------------------------------
// Componente principal — Mapa de Estágios → Tela de Confirmação → Duelo → Conquista
// ---------------------------------------------------------------------------
export function CampaignView() {
  const { t } = useT();
  const { playCorrect, playWrong, playVictory, playDefeat, startLoop, stopLoop } = useDuelSound();
  const [progress, setProgress] = useState<CampaignProgress>(loadCampaign);
  const [stageIdx, setStageIdx] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [result, setResult] = useState<FeedbackItem | null>(null);
  const [done, setDone] = useState<{
    passed: boolean;
    correct: number;
  } | null>(null);
  const [showAvatar, setShowAvatar] = useState(false);

  const appUrl =
    typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";

  const stats = campaignStats(progress);

  // Loop ambiente — toca enquanto está na missão
  useEffect(() => {
    startLoop();
    return () => { stopLoop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startStage = (i: number) => {
    setStageIdx(i);
    setShowConfirm(true);
  };

  const confirmStage = (i: number) => {
    setShowConfirm(false);
    setStageIdx(i);
    setRound(0);
    setCorrect(0);
    setResult(null);
    setDone(null);
    setScenario(buildScenarioFromSpec(roundSpec(STAGES[i]), Math.random));
  };

  const cancelStage = () => {
    setShowConfirm(false);
    setStageIdx(null);
  };

  const backToMap = () => {
    setStageIdx(null);
    setShowConfirm(false);
    setScenario(null);
    setResult(null);
    setDone(null);
  };

  const choose = (key: "fold" | "call" | "raise" | "allin") => {
    if (!scenario || result) return;
    const item = evaluateChoice(scenario, key);
    setResult(item);
    markActiveToday();
    recordDecision(key);
    if (isCorrect(item)) {
      setCorrect((c) => c + 1);
      playCorrect();
    } else {
      playWrong();
    }
  };

  const next = () => {
    if (stageIdx == null) return;
    const stage = STAGES[stageIdx];
    if (round + 1 >= stage.rounds) {
      // Primeira vez que bate este estágio? (checar ANTES de registrar)
      const { passed, progress: np } = recordStage(progress, stage.id, correct);
      saveCampaign(np);
      setProgress(np);
      // Farmar áurea — só quando passa. Guarda no celular.
      if (passed) {
      }
      setDone({ passed, correct });
      // Toca som de vitória ou derrota
      if (passed) {
        playVictory();
      } else {
        playDefeat();
      }
    } else {
      setRound((r) => r + 1);
      setResult(null);
      setScenario(buildScenarioFromSpec(roundSpec(stage), Math.random));
    }
  };

  const cells = useMemo(() => {
    if (!scenario) return null;
    const s = scenario.spec;
    return spotRangeGrid({
      heroPosition: s.heroPosition,
      effectiveBB: s.effectiveBB,
      profile: BASELINE_PROFILE,
      raiserPosition: s.raiserPosition,
      openSizeBB: s.openSizeBB,
    });
  }, [scenario]);

  // ---------------------------------------------------------------------------
  // TELA DE CONFIRMAÇÃO PRÉ-DUELO
  // ---------------------------------------------------------------------------
  if (showConfirm && stageIdx != null) {
    const stage = STAGES[stageIdx];
    const rivalInfo = getRivalInfo(stage.heroPosition);
    const rivalAvatar = getRivalAvatarByStageIdx(stageIdx);
    const prevResults = progress.best[stage.id];
    const taunt = PRE_MATCH_TAUNTS[Math.floor(Math.random() * PRE_MATCH_TAUNTS.length)];
    const streakAlert = prevResults != null && prevResults < stage.passNeeded;
    const heroAvatar = getHeroAvatarData();

    return (
      <div className="train-view">
        <div className="arena-confirm-overlay">
          <div className="arena-confirm-card">
            {/* Topo — arena header */}
            <div className="confirm-header">
              <span className="confirm-label">{t("mission.badge")}</span>
              <div className="confirm-vs-title">DUELO IMINENTE</div>
            </div>

            {/* Os dois lados */}
            <div className="confirm-arena">
              <div className="confirm-side hero-side">
                <div className="confirm-avatar hero-avatar" style={{ borderColor: heroAvatar.color}}>
                  <img src={heroAvatar.image} alt="" className="confirm-hero-img" />
                </div>
                <div className="confirm-name">{t(heroAvatar.nameKey as TransKey)}</div>
                <div className="confirm-detail">Posição {stage.heroPosition}</div>
              </div>

              <div className="confirm-vs-badge">VS</div>

              <div className="confirm-side villain-side">
                <div className="confirm-avatar villain-avatar" style={{ borderColor: rivalAvatar.color, boxShadow: `0 0 16px ${rivalAvatar.color}66`, animation: 'none' }}>
                  <img src={rivalAvatar.image} alt="" className="confirm-rival-img" />
                </div>
                <div className="confirm-name" style={{ color: rivalAvatar.color }}>{rivalAvatar.name}</div>
                <div className="confirm-detail">{rivalInfo.title}</div>
              </div>
            </div>

            {/* Informações do confronto */}
            <div className="confirm-info">
              <div className="confirm-rounds">
                {stage.rounds} rodadas · precisa de {stage.passNeeded} certas
              </div>
              {prevResults != null ? (
                <div className="confirm-history">
                  Último recorde: {prevResults}/{stage.rounds} ({prevResults >= stage.passNeeded ? "✅" : "❌"})
                </div>
              ) : (
                <div className="confirm-history">Primeiro confronto com {rivalInfo.name}</div>
              )}
              {prevResults != null ? (
                streakAlert ? (
                  <div className="confirm-streak-alert">
                    ⚠️ Você ainda não passou deste estágio. Hora de mudar.
                  </div>
                ) : (
                  <div className="confirm-streak-info">
                    Recorde anterior: {prevResults}/{stage.rounds}
                  </div>
                )
              ) : null}
            </div>

            {/* Taunt */}
            <div className="confirm-taunt">"{taunt}"</div>

            {/* Botões */}
            <div className="confirm-actions">
              <button className="btn confirm-back" onClick={cancelStage}>
                Voltar
              </button>
              <button className="btn primary confirm-start" onClick={() => confirmStage(stageIdx)}>
                ⚔️ DESAFIAR AGORA
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // CONQUISTA (fim do estágio)
  // ---------------------------------------------------------------------------
  if (done && stageIdx != null) {
    const stage = STAGES[stageIdx];
    const rivalAvatar = getRivalAvatarByStageIdx(stageIdx);
    const shareText = t("mission.shareText", { n: stageIdx + 1, pos: stage.heroPosition });
    const onShare = () => void shareSpot(null, appUrl, shareText);
    const onWhats = () =>
      window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${appUrl}`)}`, "_blank");
    const hasNext = stageIdx + 1 < STAGES.length;
    return (
      <div className="train-view">
        <div className={`panel mission-done ${done.passed ? "won" : "lost"}`}>
          <div className={`mission-villain ${done.passed ? "beaten" : "gloat"}`}>
            <img src={rivalAvatar.image} alt="" className="mission-villain-img" />
            {done.passed ? <span className="mission-medal-badge">🏅</span> : null}
          </div>
          <h3>{done.passed ? t("mission.passed") : t("mission.almost")}</h3>
          <div className="mission-villain-cap">
            {done.passed
              ? t("mission.beat", { name: rivalAvatar.name })
              : `“${rivalAvatar.taunt}”`}
          </div>
          <div className="mission-score">
            {done.correct}/{stage.rounds} · {t("mission.needed", { n: stage.passNeeded })}
          </div>
          {done.passed ? (
            <>
              <p className="mission-share-cta">{t("mission.shareCta")}</p>
              <div className="mission-share-row">
                <button className="btn primary" onClick={onWhats}>💬 {t("mission.whatsapp")}</button>
                <button className="btn" onClick={onShare}>📣 {t("mission.share")}</button>
              </div>
              <div className="mission-nav">
                {hasNext ? (
                  <button className="btn primary" onClick={() => startStage(stageIdx + 1)}>
                    {t("mission.next")} ▶
                  </button>
                ) : (
                  <div className="mission-champion">🏆 {t("mission.champion")}</div>
                )}
                <button className="btn tiny" onClick={backToMap}>{t("mission.map")}</button>
              </div>
            </>
          ) : (
            <div className="mission-nav">
              <button className="btn primary" onClick={() => startStage(stageIdx)}>{t("mission.retry")}</button>
              <button className="btn tiny" onClick={backToMap}>{t("mission.map")}</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // JOGANDO UM ESTÁGIO
  // ---------------------------------------------------------------------------
  if (stageIdx != null && scenario) {
    const stage = STAGES[stageIdx];
    const s = scenario.spec;
    const handType = comboToHandType(scenario.hand[0], scenario.hand[1]);
    return (
      <div className="train-view">
        <div className="panel">
          <div className="ss-head">
            <button className="btn tiny" onClick={backToMap}>{t("mission.map")}</button>
            <span className="train-session">
              {t("mission.round", { r: round + 1, t: stage.rounds })} · ✅ {correct}
            </span>
          </div>

          <DuelArena
            spec={s}
            hand={scenario.hand}
            result={result}
            villain={HOODED_VILLAIN}
            rivalAvatar={getRivalAvatarByStageIdx(stageIdx)}
            heroAvatar={getHeroAvatarData()}
          />

          {!result ? (
            <div className="train-actions">
              {scenario.actions.map((a) => (
                <button key={a.key} className="btn primary" onClick={() => choose(a.key)}>
                  {t(a.labelKey as TransKey)}
                </button>
              ))}
            </div>
          ) : (
            <div className="train-result">
              <div className={`train-verdict ${isCorrect(result) ? "ok" : "bad"}`}>
                {isCorrect(result) ? t("train.correct") : t("train.wrong")}
              </div>
              <div className={`fb-item ${result.rating}`}>
                <div className="fb-text">{result.text}</div>
              </div>
              {cells ? (
                <>
                  <div className="ultra-grid-title">{t("ultra.rangeTitle")}</div>
                  <SpotRangeGrid cells={cells} highlight={handType} />
                </>
              ) : null}
              <button className="btn primary train-next" onClick={next}>{t("train.next")}</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAPA DE ESTÁGIOS — ARENA DE DUELO (visual cinematográfico)
  // ---------------------------------------------------------------------------
  const heroAvatar = getHeroAvatarData();
  return (
    <div className="train-view">
      {/* Banner de Daily Hand — destaque no topo da tela inicial */}
      <div style={{
        padding: '12px 16px 10px',
        background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(18,58,42,0.8))',
        border: '1px solid rgba(212,175,55,0.3)',
        borderRadius: '12px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
      }} onClick={() => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('nav-to', { detail: 'treino' })); }}>
        <div style={{ fontSize: '28px', lineHeight: 1 }}>🃏</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '700', fontSize: '14px', color: '#d4af37', marginBottom: '2px' }}>Mão do Dia</div>
          <div style={{ fontSize: '12px', color: '#ece7d5', opacity: 0.85 }}>Nova mão toda manhã — 1 minuto de treino.</div>
        </div>
        <div style={{ fontSize: '12px', color: '#d4af37', fontWeight: '600' }}>Jogar →</div>
      </div>
      <div className="panel mission-panel">
        {/* Header da missão */}
        <div className="mission-header-cinema">
          <div className="mission-crown">⚔️</div>
          <h3 className="mission-title-cinema">{t("mission.title")}</h3>
          <p className="mission-subtitle-cinema">{t("mission.subtitle")}</p>
        </div>

        {/* Barra de progresso */}
        <div className="mission-progressbar">
          <div className="mp-fill" style={{ width: `${(stats.done / stats.total) * 100}%` }} />
          <span className="mp-label">{t("mission.progress", { done: stats.done, total: stats.total })}</span>
        </div>

        {/* Botão de avatar com cooldown */}
        <button className="btn avatar-picker-btn" onClick={() => setShowAvatar(true)}>
          <img src={heroAvatar.image} alt="" className="avatar-picker-img" />
          {t("avatar.button")}
          {!canSwapAvatar().allowed && (
            <span className="avatar-cooldown-badge">
              ⏳ {formatCooldown(canSwapAvatar().remainingMs)}
            </span>
          )}
        </button>

        {/* Estágios como cards de duelo */}
        <div className="duel-stages">
          {STAGES.map((stage, i) => {
            const unlocked = isStageUnlocked(progress, i);
            const cleared = progress.cleared.includes(stage.id);
            const rivalInfo = getRivalInfo(stage.heroPosition);
            const bestScore = progress.best[stage.id];
            return (
              <button
                key={stage.id}
                className={`duel-stage ${cleared ? "cleared" : unlocked ? "unlocked" : "locked"}`}
                disabled={!unlocked}
                onClick={() => unlocked && startStage(i)}
              >
                {/* Avatar do rival */}
                <div className="duel-stage-avatar">
                  {cleared ? (
                    <span className="duel-stage-medal">🏅</span>
                  ) : unlocked ? (
                    <img src={getRivalAvatarByStageIdx(i).image} alt="" className="duel-stage-rival-img" />
                  ) : (
                    <span className="duel-stage-lock">🔒</span>
                  )}
                </div>

                {/* Info do estágio */}
                <div className="duel-stage-info">
                  <span className="duel-stage-level">
                    {t("mission.stage", { n: i + 1 })} · {stage.heroPosition}
                  </span>
                  <span className="duel-stage-rival">{rivalInfo.name}</span>
                  <span className="duel-stage-rounds">
                    {stage.villainPool.length
                      ? t("mission.faceField", { r: stage.rounds })
                      : t("mission.rfiField", { r: stage.rounds })}
                  </span>
                  {bestScore != null ? (
                    <span className="duel-stage-best">
                      Recorde: {bestScore}/{stage.rounds}
                    </span>
                  ) : null}
                </div>

                {/* Indicador visual */}
                <div className="duel-stage-indicator">
                  {cleared ? "✅" : unlocked ? "⚔️" : "🔒"}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {showAvatar ? <AvatarSelector onClose={() => setShowAvatar(false)} /> : null}
    </div>
  );
}

function roundSpec(stage: Stage): ScenarioSpec {
  const pool = stage.villainPool;
  const villain = pool.length ? pool[Math.floor(Math.random() * pool.length)] : undefined;
  const stack = stage.stacks[Math.floor(Math.random() * stage.stacks.length)];
  return {
    heroPosition: stage.heroPosition,
    effectiveBB: stack,
    raiserPosition: villain,
    openSizeBB: villain ? 2.3 : undefined,
  };
}
