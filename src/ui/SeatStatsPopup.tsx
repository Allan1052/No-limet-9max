// Popup de estatísticas de um jogador (toque no assento). Mostra VPIP/PFR/3-bet
// e uma leitura simples do estilo — funciona para os vilões e para o herói.
import { useT } from "../i18n";
import type { StatRow } from "../feedback/stats";

function styleHint(row: StatRow): string {
  if (row.hands < 6) return "Amostra curta ainda.";
  if (row.vpip >= 40) return "Muito solto — entra em mãos demais.";
  if (row.vpip <= 15) return "Bem apertado — só mãos fortes.";
  if (row.vpip - row.pfr >= 12) return "Passivo — paga mais do que aumenta.";
  return "Equilibrado — seleção e agressão saudáveis.";
}

export function SeatStatsPopup({ row, onClose }: { row: StatRow; onClose: () => void }) {
  const { t } = useT();
  return (
    <div className="overlay" onClick={onClose}>
      <div className="replay seat-stats" onClick={(e) => e.stopPropagation()}>
        <div className="ss-head">
          <h3>{row.name}{row.isHero ? " (você)" : ""}</h3>
          <button className="btn tiny" onClick={onClose}>
            fechar ✕
          </button>
        </div>
        <div className="summary-stats">
          <div className="ss-item">
            <div className="ss-num">{row.hands}</div>
            <div className="ss-lbl">{t("progress.hands")}</div>
          </div>
          <div className="ss-item">
            <div className="ss-num">{row.vpip}%</div>
            <div className="ss-lbl">VPIP</div>
          </div>
          <div className="ss-item">
            <div className="ss-num">{row.pfr}%</div>
            <div className="ss-lbl">PFR</div>
          </div>
          <div className="ss-item">
            <div className="ss-num">{row.threeBet}%</div>
            <div className="ss-lbl">3-bet</div>
          </div>
        </div>
        <div className="summary-note">{styleHint(row)}</div>
      </div>
    </div>
  );
}
