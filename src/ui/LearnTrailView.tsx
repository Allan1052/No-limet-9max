// ---------------------------------------------------------------------------
// APRENDA DO ZERO — trilha de 7 lições com cadeados progressivos.
//
// Design: reutiliza o visual de "cards de missão" do app (panel, mission-card,
// cores dourado + feltro) para parecer parte natural do hub Estudar.
// Fluxo: mapa da trilha → tocar na lição → ler (corpo curto) → quiz de 5 →
// ≥ 3 acertos destrava a próxima lição (🔓) e marca 🏅 na concluída.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { useT } from "../i18n";
import { CardView } from "./Card";
import { cardsFromString } from "../engine/cards";

/** Renderiza uma string de cartas ("Ks9h") como cartas de verdade. */
function Cards({ str, small }: { str?: string; small?: boolean }) {
  if (!str) return null;
  let cards: number[] = [];
  try {
    cards = cardsFromString(str);
  } catch {
    return null;
  }
  return (
    <span className="learn-cards">
      {cards.map((c, i) => (
        <CardView key={i} card={c} small={small} />
      ))}
    </span>
  );
}

/** Bloco "sua mão / board" com cartas (usado na leitura e no quiz). */
function HandBoard({ hero, board }: { hero?: string; board?: string }) {
  if (!hero && !board) return null;
  return (
    <div className="learn-ex-cards">
      {hero ? (
        <div className="learn-ex-group">
          <span className="learn-ex-cap">sua mão</span>
          <Cards str={hero} small />
        </div>
      ) : null}
      {board ? (
        <div className="learn-ex-group">
          <span className="learn-ex-cap">board</span>
          <Cards str={board} small />
        </div>
      ) : null}
    </div>
  );
}
import {
  LEARN_LESSONS,
  HAND_RANKINGS,
  loadLearn,
  saveLearn,
  isLessonUnlocked,
  recordLesson,
  learnStats,
  type LearnProgress,
} from "../train/learn";

type View =
  | { kind: "map" }
  | { kind: "read"; index: number }
  | { kind: "quiz"; index: number }
  | { kind: "ranking" };

export function LearnTrailView() {
  const { t } = useT();
  const [progress, setProgress] = useState<LearnProgress>(() => loadLearn());
  const [view, setView] = useState<View>({ kind: "map" });
  const [toast, setToast] = useState<string | null>(null);

  const persist = (next: LearnProgress) => {
    saveLearn(next);
    setProgress({ ...next });
  };

  const stats = useMemo(() => learnStats(progress), [progress]);

  if (view.kind === "ranking") {
    return (
      <div className="train-view">
        <HandRankingView onBack={() => setView({ kind: "map" })} />
      </div>
    );
  }

  if (view.kind !== "map") {
    const lesson = LEARN_LESSONS[view.index];
    return (
      <div className="train-view">
        {view.kind === "read" ? (
          <LessonRead
            lesson={lesson}
            onQuiz={() => setView({ kind: "quiz", index: view.index })}
            onBack={() => setView({ kind: "map" })}
          />
        ) : (
          <LessonQuiz
            lesson={lesson}
            onDone={(correct) => {
              const { passed, progress: next } = recordLesson(progress, lesson.id, correct);
              persist(next);
              setToast(
                passed
                  ? t("learn.passed", { c: correct, n: lesson.quiz.length })
                  : t("learn.failed", { c: correct, n: lesson.quiz.length }),
              );
              setView({ kind: "map" });
            }}
            onBack={() => setView({ kind: "read", index: view.index })}
          />
        )}
        {toast ? <div className="chal-msg">{toast}</div> : null}
      </div>
    );
  }

  return (
    <div className="train-view">
      <div className="panel mission-panel">
        <div className="mission-header-cinema">
          <div className="mission-crown">🎓</div>
          <h3 className="mission-title-cinema">{t("learn.title")}</h3>
          <p className="mission-subtitle-cinema">{t("learn.subtitle")}</p>
        </div>
        {/* Barra de progresso */}
        <div className="mission-progressbar">
          <div className="mp-fill" style={{ width: `${(stats.done / stats.total) * 100}%` }} />
          <span className="mp-label">
            {t("learn.progress", { done: stats.done, total: stats.total })}
          </span>
        </div>
        {/* Consulta rápida: a tabela de força das mãos, sempre à mão. */}
        <button className="learn-ref-btn" onClick={() => setView({ kind: "ranking" })}>
          <span className="learn-ref-ic">🃏</span>
          <span className="learn-ref-txt">
            <b>Todas as mãos do poker</b>
            <span>Da mais forte à mais fraca — com as cartas</span>
          </span>
          <span className="learn-ref-go">▶</span>
        </button>
        {/* Lições como cards de missão (padrão do hub) */}
        <div className="missions-list">
          {LEARN_LESSONS.map((lesson, i) => {
            const unlocked = isLessonUnlocked(i, progress);
            const cleared = progress.cleared.includes(lesson.id);
            const best = progress.best[lesson.id];
            return (
              <button
                key={lesson.id}
                className={`mission-card train-card ${cleared ? "done" : ""}`}
                disabled={!unlocked}
                onClick={() => unlocked && setView({ kind: "read", index: i })}
              >
                <div className="mission-icon">
                  {cleared ? "🏅" : unlocked ? lesson.icon : "🔒"}
                </div>
                <div className="mission-body">
                  <div className="mission-top">
                    <span className="mission-title">
                      {t("learn.lesson", { n: i + 1 })} · {lesson.title}
                    </span>
                    {cleared && best != null ? (
                      <span className="mission-cat">
                        {t("learn.best", { c: best, n: lesson.quiz.length })}
                      </span>
                    ) : !unlocked ? (
                      <span className="mission-cat">{t("learn.locked")}</span>
                    ) : (
                      <span className="mission-cat">{t("learn.todo")}</span>
                    )}
                  </div>
                  <div className="mission-desc">
                    {unlocked
                      ? lesson.body[0].slice(0, 110) + (lesson.body[0].length > 110 ? "…" : "")
                      : t("learn.lockedHint")}
                  </div>
                </div>
                <div className="duel-stage-indicator">
                  {cleared ? "✅" : unlocked ? "▶️" : "🔒"}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Leitura da lição
// ---------------------------------------------------------------------------
function LessonRead({
  lesson,
  onQuiz,
  onBack,
}: {
  lesson: (typeof LEARN_LESSONS)[number];
  onQuiz: () => void;
  onBack: () => void;
}) {
  const { t } = useT();
  return (
    <div className="panel">
      <div className="ss-head">
        <button className="btn tiny" onClick={onBack}>{t("learn.back")}</button>
        <span className="train-session">
          {lesson.icon} {lesson.title}
        </span>
      </div>
      <div className="learn-body">
        {lesson.body.map((p, i) => (
          <p key={i} className="learn-para">{p}</p>
        ))}
        {lesson.examples && lesson.examples.length > 0 ? (
          <div className="learn-examples">
            {lesson.examples.map((ex, i) => (
              <div key={i} className="learn-example">
                <div className="learn-ex-label">{ex.label}</div>
                <HandBoard hero={ex.hero} board={ex.board} />
                {ex.note ? <div className="learn-ex-note">{ex.note}</div> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <button className="btn primary" onClick={onQuiz} style={{ marginTop: 16, width: "100%" }}>
        {t("learn.startQuiz")}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quiz da lição (5 perguntas)
// ---------------------------------------------------------------------------
function LessonQuiz({
  lesson,
  onDone,
  onBack,
}: {
  lesson: (typeof LEARN_LESSONS)[number];
  onDone: (correct: number) => void;
  onBack: () => void;
}) {
  const { t } = useT();
  const [q, setQ] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const item = lesson.quiz[q];
  const total = lesson.quiz.length;

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === item.answer) setCorrect((c) => c + 1);
  };

  const next = () => {
    setPicked(null);
    if (q + 1 < total) setQ(q + 1);
    else onDone(correct + (picked === item.answer ? 1 : 0));
  };

  return (
    <div className="panel">
      <div className="ss-head">
        <button className="btn tiny" onClick={onBack}>{t("learn.back")}</button>
        <span className="train-session">
          {t("learn.quizOf", { c: q + 1, n: total })}
        </span>
      </div>
      <div className="learn-body">
        <p className="learn-question">{item.question}</p>
        <HandBoard hero={item.hero} board={item.board} />
        <div className="learn-choices">
          {item.choices.map((c, i) => {
            const isAnswer = i === item.answer;
            const state =
              picked === null ? "idle" : isAnswer ? "right" : i === picked ? "wrong" : "idle";
            return (
              <button
                key={i}
                className={`learn-choice ${state}`}
                onClick={() => pick(i)}
                disabled={picked !== null}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>
      {picked !== null && (
        <button className="btn primary" onClick={next} style={{ marginTop: 16, width: "100%" }}>
          {q + 1 < total ? t("learn.next") : t("learn.finish")}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabela de FORÇA das mãos — referência visual (consulta rápida, sempre à mão).
// ---------------------------------------------------------------------------
function HandRankingView({ onBack }: { onBack: () => void }) {
  const { t } = useT();
  return (
    <div className="panel">
      <div className="ss-head">
        <button className="btn tiny" onClick={onBack}>{t("learn.back")}</button>
        <span className="train-session">🃏 Todas as mãos do poker</span>
      </div>
      <p className="learn-para" style={{ marginTop: 10 }}>
        Da mais forte (1ª) à mais fraca (10ª). Quando duas pessoas têm a mesma
        mão, ganha quem tiver a carta mais alta dentro dela.
      </p>
      <div className="hr-list">
        {HAND_RANKINGS.map((h) => (
          <div key={h.rank} className="hr-row">
            <div className="hr-rank">{h.rank}º</div>
            <div className="hr-main">
              <div className="hr-name">{h.name}</div>
              <Cards str={h.cards} small />
              <div className="hr-note">{h.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
