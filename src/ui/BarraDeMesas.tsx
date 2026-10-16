// ---------------------------------------------------------------------------
// A BARRA DE MESAS — até quatro torneios abertos, um na tela por vez.
//
// 16/10/2026, pedido do Allan: *"se eu conseguisse jogar quatro torneios
// simultâneos, pra fazer aquelas questões de tela igual é no PokerStars."*
//
// A barra fica no ALTO da mesa, fina, e some quando há uma mesa só — com um
// torneio aberto ela não informa nada e só rouba altura do feltro.
//
// ⚠️ DUAS HONESTIDADES QUE A TELA PRECISA CARREGAR:
//
// 1. Nada roda em paralelo. O app é por turnos: as outras mesas estão
//    CONGELADAS esperando você, não jogando sozinhas. Por isso a barra não diz
//    "é a sua vez na mesa 2" — seria mentira. Ela diz o stack em bb de cada
//    uma, que é a informação real para escolher por onde ir.
//
// 2. A troca só acontece entre mãos. O snapshot do controller não guarda o
//    meio de uma mão, então pular no meio apagaria a mão. O botão desabilita e
//    explica, em vez de o jogador descobrir perdendo fichas.
// ---------------------------------------------------------------------------
import type { MesaViva } from "../app/mesas";
import "./barraDeMesas.css";

const FASE_CURTA: Record<string, string> = {
  inicio: "início",
  meio: "meio",
  bolha: "BOLHA",
  mesa_final: "MESA FINAL",
};

export function BarraDeMesas({
  mesas,
  atualId,
  podeTrocar,
  onIr,
  onProxima,
}: {
  mesas: MesaViva[];
  atualId: string | null;
  podeTrocar: boolean;
  onIr: (id: string) => void;
  onProxima: () => void;
}) {
  // Uma mesa só: a barra não tem o que dizer.
  if (mesas.length <= 1) return null;

  // O menor stack entre as mesas que já jogaram: é onde a decisão pesa mais.
  const comBB = mesas.filter((m) => m.heroBB !== undefined);
  const menorBB = comBB.length ? Math.min(...comBB.map((m) => m.heroBB!)) : undefined;

  return (
    <div className="bdm" role="group" aria-label="Suas mesas abertas">
      <div className="bdm-lista">
        {mesas.map((m, i) => {
          const atual = m.id === atualId;
          const apertada = m.heroBB !== undefined && m.heroBB === menorBB && !atual;
          return (
            <button
              key={m.id}
              type="button"
              className={`bdm-mesa${atual ? " atual" : ""}${apertada ? " apertada" : ""}`}
              disabled={!atual && !podeTrocar}
              aria-current={atual ? "true" : undefined}
              title={
                atual
                  ? "Você está nesta mesa"
                  : podeTrocar
                    ? `Ir para a mesa ${i + 1}`
                    : "Termine a mão para poder trocar de mesa"
              }
              onClick={() => !atual && onIr(m.id)}
            >
              <span className="bdm-n">{i + 1}</span>
              <span className="bdm-info">
                <b>{m.heroBB !== undefined ? `${m.heroBB}bb` : "nova"}</b>
                <i>{m.stage ? FASE_CURTA[m.stage] ?? m.stage : `$${m.buyIn}`}</i>
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="bdm-prox"
        disabled={!podeTrocar}
        title={podeTrocar ? "Pular para a próxima mesa" : "Termine a mão para trocar de mesa"}
        onClick={onProxima}
      >
        próxima ⇥
      </button>

      {!podeTrocar ? (
        <div className="bdm-aviso">Termine a mão para trocar de mesa</div>
      ) : null}
    </div>
  );
}
