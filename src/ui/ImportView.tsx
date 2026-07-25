// ---------------------------------------------------------------------------
// IMPORTAR SESSÃO: cole ou anexe o hand history exportado do PokerStars/GGPoker
// e receba um raio-x pré-flop da sua sessão real — VPIP/PFR, vazamentos e nota
// mão a mão, usando o mesmo motor do simulador.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { useT } from "../i18n";
import { CardView } from "./Card";
import { cardsFromString } from "../engine/cards";
import { parseHandHistory } from "../import/handHistory";
import { analyzeSession, type SessionReport, type HandReport } from "../import/analyzeSession";
import type { Rating } from "../feedback/analyzer";

const RATING_CLASS: Record<Rating, string> = {
  boa: "grade-boa",
  ok: "grade-ok",
  imprecisa: "grade-imprecisa",
  ruim: "grade-ruim",
};

const RATING_ICON: Record<Rating, string> = {
  boa: "✅",
  ok: "🟡",
  imprecisa: "🟠",
  ruim: "🔴",
};

export function ImportView() {
  const { t } = useT();
  const [text, setText] = useState("");
  const [report, setReport] = useState<SessionReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyProblems, setOnlyProblems] = useState(false);

  const run = (raw: string) => {
    setError(null);
    const hands = parseHandHistory(raw);
    if (hands.length === 0) {
      setReport(null);
      setError(t("import.errorEmpty"));
      return;
    }
    setReport(analyzeSession(hands));
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await file.text();
    setText(content);
    run(content);
  };

  return (
    <div className="import-view">
      <div className="import-intro">
        <h2>📥 {t("import.title")}</h2>
        <p>{t("import.subtitle")}</p>
        <details className="import-how">
          <summary>{t("import.howTitle")}</summary>
          <ul>
            <li>
              <strong>PokerStars:</strong> {t("import.howStars")}
            </li>
            <li>
              <strong>GGPoker:</strong> {t("import.howGg")}
            </li>
          </ul>
        </details>
      </div>

      <div className="import-input">
        <textarea
          className="import-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("import.placeholder")}
          spellCheck={false}
        />
        <div className="import-actions">
          <label className="btn">
            📎 {t("import.chooseFile")}
            <input
              type="file"
              accept=".txt,text/plain"
              style={{ display: "none" }}
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          <button className="btn primary" disabled={!text.trim()} onClick={() => run(text)}>
            🔍 {t("import.analyze")}
          </button>
          {text ? (
            <button
              className="btn"
              onClick={() => {
                setText("");
                setReport(null);
                setError(null);
              }}
            >
              {t("import.clear")}
            </button>
          ) : null}
        </div>
        {error ? <div className="import-error">{error}</div> : null}
      </div>

      {report ? <ReportView report={report} onlyProblems={onlyProblems} setOnlyProblems={setOnlyProblems} /> : null}
    </div>
  );
}

function ReportView({
  report,
  onlyProblems,
  setOnlyProblems,
}: {
  report: SessionReport;
  onlyProblems: boolean;
  setOnlyProblems: (v: boolean) => void;
}) {
  const { t } = useT();
  const shown = report.hands.filter((h) => {
    if (!onlyProblems) return true;
    return h.feedback && (h.feedback.rating === "imprecisa" || h.feedback.rating === "ruim");
  });

  return (
    <div className="import-report">
      <div className="import-stats">
        <Stat label="VPIP" value={`${report.vpip}%`} />
        <Stat label="PFR" value={`${report.pfr}%`} />
        <Stat label={t("import.hands")} value={String(report.totalHands)} />
        <Stat label={t("import.evaluated")} value={String(report.evaluated)} />
        <Stat label="✅" value={String(report.counts.boa)} tone="boa" />
        <Stat label="🟠" value={String(report.counts.imprecisa)} tone="imprecisa" />
        <Stat label="🔴" value={String(report.counts.ruim)} tone="ruim" />
      </div>

      <div className="import-leaks">
        <h3>🎯 {t("import.leaks")}</h3>
        <ul>
          {report.leaks.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </div>

      <div className="import-hands-head">
        <h3>
          🃏 {t("import.handList")} ({shown.length})
        </h3>
        <label className="import-filter">
          <input
            type="checkbox"
            checked={onlyProblems}
            onChange={(e) => setOnlyProblems(e.target.checked)}
          />
          {t("import.onlyProblems")}
        </label>
      </div>

      <div className="import-hand-list">
        {shown.map((h, i) => (
          <HandRow key={h.handId || i} h={h} />
        ))}
      </div>
    </div>
  );
}

function HandRow({ h }: { h: HandReport }) {
  const { t } = useT();
  const cards = cardsOf(h.heroCardsText);
  const rating = h.feedback?.rating;
  return (
    <div className={`import-hand ${rating ? RATING_CLASS[rating] : "grade-skip"}`}>
      <div className="import-hand-top">
        <div className="import-hand-cards">
          {cards.map((c, i) => (
            <CardView key={i} card={c} small />
          ))}
        </div>
        <div className="import-hand-info">
          <div className="import-hand-sit">{h.situation || h.skipped}</div>
          {h.feedback ? (
            <div className="import-hand-fb">
              <span className="import-hand-grade">
                {RATING_ICON[h.feedback.rating]} {h.feedback.text}
              </span>
              {h.feedback.mix && h.feedback.mix.length > 0 ? (
                <span className="import-hand-mix">
                  {t("import.pattern")}: {mixLabel(h.feedback.mix)}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="import-hand-fb import-hand-skip">{h.skipped}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`import-stat ${tone ? `import-stat-${tone}` : ""}`}>
      <div className="import-stat-value">{value}</div>
      <div className="import-stat-label">{label}</div>
    </div>
  );
}

function mixLabel(mix: { action: string; freq: number }[]): string {
  const L: Record<string, string> = {
    fold: "Fold",
    call: "Call",
    raise: "Raise",
    "3bet": "3-bet",
    jam: "All-in",
    check: "Check",
  };
  return mix
    .filter((m) => m.freq >= 0.05)
    .map((m) => `${L[m.action] ?? m.action} ${Math.round(m.freq * 100)}%`)
    .join(" · ");
}

// Converte "AhKd" em índices de Card via o mesmo esquema do engine.
function cardsOf(text: string): number[] {
  if (!text) return [];
  try {
    return cardsFromString(text);
  } catch {
    return [];
  }
}
