// ---------------------------------------------------------------------------
// Anatomia do Torneio — a comparação "como o recreativo joga × o jeito ideal".
// Mostra que a maioria das mãos é fold e onde a ficha escorre (o CALL).
// Só apresentação: números ilustrativos, alinhados ao motor pré-flop do app.
// ---------------------------------------------------------------------------
import { useT } from "../i18n";

type Dist = { fold: number; call: number; raise: number };
const REC: Dist = { fold: 62, call: 24, raise: 14 }; // recreativo típico
const IDE: Dist = { fold: 82, call: 7, raise: 11 }; // jogo disciplinado

function Bar({ d }: { d: Dist }) {
  return (
    <div className="anat-bar">
      <div className="anat-seg raise" style={{ height: `${d.raise}%` }}>
        <span>{d.raise}%</span>
      </div>
      <div className="anat-seg call" style={{ height: `${d.call}%` }}>
        <span>{d.call}%</span>
      </div>
      <div className="anat-seg fold" style={{ height: `${d.fold}%` }}>
        <span>{d.fold}%</span>
      </div>
    </div>
  );
}

export function AnatomiaTorneio() {
  const { t } = useT();
  return (
    <div className="train-view">
      <div className="panel anat-panel">
        <div className="ultra-badge">📊 {t("anat.badge")}</div>
        <h3>{t("anat.title")}</h3>
        <p className="ultra-sub">{t("anat.subtitle")}</p>

        <div className="anat-chart">
          <div className="anat-col">
            <Bar d={REC} />
            <div className="anat-lab rec">
              {t("anat.rec")}
              <small>{t("anat.recSub")}</small>
            </div>
          </div>
          <div className="anat-vs">×</div>
          <div className="anat-col">
            <Bar d={IDE} />
            <div className="anat-lab ide">
              {t("anat.ide")}
              <small>{t("anat.ideSub")}</small>
            </div>
          </div>
        </div>

        <div className="anat-legend">
          <span>
            <i className="fold" />
            {t("anat.fold")}
          </span>
          <span>
            <i className="call" />
            {t("anat.call")}
          </span>
          <span>
            <i className="raise" />
            {t("anat.raise")}
          </span>
        </div>

        <div className="anat-leak">
          <div className="anat-leak-t">
            {t("anat.leakTitle")}: 24% × 7%
          </div>
          <div className="anat-leak-s">{t("anat.leak")}</div>
        </div>

        <div className="anat-punch">{t("anat.punch")}</div>
        <div className="anat-note">{t("anat.note")}</div>
      </div>
    </div>
  );
}
