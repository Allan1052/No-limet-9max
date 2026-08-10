// ---------------------------------------------------------------------------
// CIRCUITO — seleção de etapa.
//
// Mostra as próximas etapas disponíveis do circuito, quanto vale cravar cada
// uma e o progresso do mês. Nada aqui trava o Treino Livre: quem quer só
// treinar segue na outra aba, com todos os estágios e qualquer nº de inscritos.
// ---------------------------------------------------------------------------
import {
  CIRCUIT_STAGE_COUNT,
  getAvailableStages,
  circuitProgress,
  stageWinValue,
  fullCircuitValue,
  currentSeason,
  seasonLabel,
  tierLabel,
} from "../tournament/circuit";
import { tierForBuyIn } from "../tournament/poyPoints";

function num(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

export function CircuitPicker({
  buyIn,
  nickname,
  onPick,
}: {
  buyIn: number;
  nickname: string | null;
  onPick: (stageIndex: number, entrants: number) => void;
}) {
  const tier = tierForBuyIn(buyIn);
  const season = currentSeason();
  const available = getAvailableStages(tier, season);
  const progress = circuitProgress(tier, season);

  return (
    <div className="circuit">
      <div className="panel circuit-head">
        <div className="ultra-badge">🏆 Circuito {seasonLabel(season)}</div>
        <h3>Faixa {tierLabel(tier)} · ${buyIn}</h3>
        <p className="ultra-sub">
          10 etapas. Cravou uma, ela sai da sua lista. Só torneio jogado desde o
          início conta — igual à WSOP.
        </p>

        <div className="circuit-bar">
          <div className="circuit-bar-fill" style={{ width: `${progress.percent}%` }} />
        </div>
        <div className="circuit-bar-lbl">
          {progress.clearedCount} de {CIRCUIT_STAGE_COUNT} etapas cravadas
          {progress.complete ? " · 🏅 Circuito completo!" : ""}
        </div>

        {nickname ? (
          <div className="circuit-nick">
            Você joga como <b>{nickname}</b>
          </div>
        ) : (
          <div className="circuit-nick warn">
            Você vai escolher seu apelido antes de entrar
          </div>
        )}
      </div>

      {progress.complete ? (
        <div className="panel circuit-done">
          <div className="circuit-done-crest">🏅</div>
          <h3>Circuito {seasonLabel(season)} completo</h3>
          <p>
            Você cravou todas as 10 etapas da faixa {tierLabel(tier)}. O selo é
            permanente no seu perfil — e no dia 1º um circuito novo começa.
          </p>
          <div className="circuit-done-pts">
            {num(fullCircuitValue(buyIn))} pontos possíveis nesta faixa
          </div>
          <p className="legend">
            Quer continuar jogando? O <b>Treino Livre</b> está liberado, com
            qualquer nº de inscritos e qualquer estágio.
          </p>
        </div>
      ) : (
        <div className="panel">
          <h3>Suas próximas etapas</h3>
          <div className="legend" style={{ marginBottom: 10 }}>
            👆 <b>Toque numa etapa para jogar.</b> Perdeu? Pode repetir quantas
            vezes quiser. Cravou? A etapa sai e a próxima aparece.
          </div>

          {available.map((stage) => (
            <button
              key={stage.index}
              className={`circuit-stage${stage.isMainEvent ? " main" : ""}`}
              onClick={() => onPick(stage.index, stage.entrants)}
            >
              <div className="cs-left">
                <div className="cs-name">
                  {stage.isMainEvent ? "👑 " : ""}
                  {stage.name}
                </div>
                <div className="cs-meta">
                  {num(stage.entrants)} inscritos · paga {num(stage.paid)}
                </div>
              </div>
              <div className="cs-right">
                <div className="cs-pts">{num(stageWinValue(stage.index, buyIn))}</div>
                <div className="cs-pts-lbl">pts se cravar</div>
              </div>
              <div className="cs-go" aria-hidden="true">▶</div>
            </button>
          ))}

          <div className="circuit-rules">
            <b>Como pontua</b>
            <ul>
              <li>Só entra no ranking quem chega ao dinheiro (top 15%).</li>
              <li>Vencer vale 20× o mínimo pago — a mesma escala da WSOP.</li>
              <li>Contam seus 10 melhores resultados.</li>
              <li>Tudo zera no dia 1º. O ranking anual guarda o ano inteiro.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
