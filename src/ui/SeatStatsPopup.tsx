// Popup de estatísticas de um jogador (toque no assento). Mostra VPIP/PFR/3-bet
// e, para vilões conhecidos do simulador, o conselho de exploração derivado do
// perfil real. Nenhuma estratégia é recalculada aqui: a UI apenas exibe o motor.
import { useT } from "../i18n";
import type { StatRow } from "../feedback/stats";
import { exploitAdvice } from "../bots/exploit";
import { PROFILES, profileById } from "../bots/profiles";
import "./exploitAdvicePanel.css";

function styleHint(row: StatRow): string {
  if (row.hands < 6) return "Amostra curta ainda.";
  if (row.vpip >= 40) return "Muito solto — entra em mãos demais.";
  if (row.vpip <= 15) return "Bem apertado — só mãos fortes.";
  if (row.vpip - row.pfr >= 12) return "Passivo — paga mais do que aumenta.";
  return "Equilibrado — seleção e agressão saudáveis.";
}

export function SeatStatsPopup({ row, onClose }: { row: StatRow; onClose: () => void }) {
  const { t } = useT();
  const matchedProfile = !row.isHero ? PROFILES.find((profile) => profile.name === row.name) : undefined;
  const advice = !row.isHero && matchedProfile ? exploitAdvice(profileById(matchedProfile.id)) : null;

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

        {advice ? (
          <section className="exploit-panel" aria-label="Como explorar este vilão">
            <div className="exploit-kicker">Como explorar este vilão</div>
            <div className="exploit-headline">{advice.headline}</div>
            <div className="exploit-key-stat">{advice.keyStat}</div>
            <div className="exploit-columns">
              <div className="exploit-list exploit-list-do">
                <h4>✅ Faça</h4>
                <ul>
                  {advice.dos.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="exploit-list exploit-list-dont">
                <h4>❌ Não faça</h4>
                <ul>
                  {advice.donts.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
