// ---------------------------------------------------------------------------
// O SPOT QUE DIVIDE — a tela.
//
// 14/10/2026, pedido do Allan: *"mostre spots da decisão a ser tomada no flop,
// turn e river, mostrando toda a ação da mão. Assim fica mais próximo da
// realidade do torneio."*
//
// A tela tem DUAS metades, e a ordem importa:
//   1. A MÃO INTEIRA — contexto, stacks, e a ação rua por rua até a decisão.
//      Ele escolhe sem ver conta nenhuma, igual à mesa de verdade.
//   2. A CONTA — equity (Monte Carlo real), preço, e a pergunta que decide o
//      spot: quanto o vilão precisa estar blefando para o call empatar.
//
// ⚠️ ESTA TELA NÃO DÁ VEREDITO, e isso não é omissão. O range do vilão é
// estimativa; num spot que divide, a resposta muda com ela. Dizer "o certo era
// call" seria vender como medida uma coisa que é leitura. O app entrega a conta
// inteira, diz o que inclina para cada lado, e devolve a decisão para quem
// joga.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import {
  SPOTS,
  contaDoSpot,
  type ContaDoSpot,
  type EscolhaDoSpot,
  type SpotQueDivide,
} from "../train/spotQueDivide";
import { cardsFromString } from "../engine/cards";
import { CardView } from "./Card";
import "./spotQueDivide.css";

const RUA_PT: Record<string, string> = {
  preflop: "Pré-flop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
};
const ESCOLHA_PT: Record<EscolhaDoSpot, string> = {
  fold: "Fold",
  call: "Call",
  raise: "Raise",
};
const pct = (v: number) => `${Math.round(v * 100)}%`;

function Cartas({ texto, pequeno }: { texto: string; pequeno?: boolean }) {
  if (!texto.trim()) return null;
  return (
    <span className="sqd-cartas">
      {cardsFromString(texto).map((c, i) => (
        <CardView key={i} card={c} small={pequeno} />
      ))}
    </span>
  );
}

export function SpotQueDivideView() {
  const [idx, setIdx] = useState(0);
  const [escolha, setEscolha] = useState<EscolhaDoSpot | null>(null);
  const spot: SpotQueDivide = SPOTS[idx];

  // A conta roda UMA vez por spot, só quando ele já decidiu — rodar antes
  // deixaria o número pronto na memória antes da hora, e rodar a cada render
  // queimaria bateria à toa.
  const conta: ContaDoSpot | null = useMemo(
    () => (escolha ? contaDoSpot(spot, 20_000) : null),
    [escolha, spot],
  );

  const irPara = (i: number) => {
    setIdx((i + SPOTS.length) % SPOTS.length);
    setEscolha(null);
  };

  const ruas = ["preflop", "flop", "turn", "river"] as const;

  return (
    <div className="sqd">
      <div className="sqd-topo">
        <div>
          <div className="sqd-rot">O spot que divide</div>
          <h2 className="sqd-titulo">{spot.titulo}</h2>
          <div className="sqd-arq">{spot.arquetipo}</div>
        </div>
        <span className="sqd-contagem">
          {idx + 1}/{SPOTS.length}
        </span>
      </div>

      <p className="sqd-contexto">{spot.contexto}</p>

      {/* ---- a mesa ---- */}
      <div className="sqd-mesa">
        <div className="sqd-voce">
          <div className="sqd-lab">
            Você · {spot.posicaoHeroi} · {spot.stackHeroiBB}bb
          </div>
          <Cartas texto={spot.maoHeroi} />
        </div>
        {spot.board.trim() ? (
          <div className="sqd-board">
            <div className="sqd-lab">Mesa</div>
            <Cartas texto={spot.board} pequeno />
          </div>
        ) : null}
        <div className="sqd-vilao">
          <div className="sqd-lab">
            {spot.posicaoVilao} · {spot.stackVilaoBB}bb
          </div>
          <div className="sqd-oculto">? ?</div>
        </div>
      </div>

      {/* ---- a ação, rua por rua ---- */}
      <div className="sqd-acoes">
        {ruas.map((r) => {
          const linhas = spot.acoes.filter((a) => a.rua === r);
          if (!linhas.length) return null;
          return (
            <div key={r} className="sqd-rua">
              <div className="sqd-rua-t">{RUA_PT[r]}</div>
              {linhas.map((a, i) => (
                <div key={i} className={`sqd-linha${a.marco ? " marco" : ""}`}>
                  <b>{a.quem}</b>
                  <span>{a.texto}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="sqd-pote">
        Pote <b>{spot.potBB}bb</b> · para pagar <b>{spot.paraPagarBB}bb</b>
      </div>

      {/* ---- a decisão ---- */}
      {!escolha ? (
        <div className="sqd-decisao">
          <div className="sqd-pergunta">E aí? Sem conta, como na mesa.</div>
          <div className="sqd-botoes">
            {spot.opcoes.map((o) => (
              <button key={o} className="btn primary sqd-btn" onClick={() => setEscolha(o)}>
                {ESCOLHA_PT[o]}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="sqd-resposta">
          <div className="sqd-escolheu">
            Você escolheu <b>{ESCOLHA_PT[escolha]}</b>
          </div>

          {/* A conta vem antes do texto: o número manda, a prosa explica. */}
          {conta ? (
            <>
              <div className="sqd-numeros">
                <div className="sqd-num">
                  <b>{pct(conta.equity)}</b>
                  <span>sua chance de ganhar</span>
                </div>
                <div className="sqd-num">
                  <b>{pct(conta.precoExigido)}</b>
                  <span>o preço exige</span>
                </div>
                <div className={`sqd-num ${conta.margem >= 0 ? "ok" : "ruim"}`}>
                  <b>
                    {conta.margem >= 0 ? "+" : "−"}
                    {Math.abs(Math.round(conta.margem * 100))}
                  </b>
                  <span>pontos de margem</span>
                </div>
              </div>

              {/* A PERGUNTA QUE DECIDE O SPOT. */}
              <div className="sqd-chave">
                <div className="sqd-chave-t">A pergunta que decide</div>
                {conta.blefeNecessario === undefined ? (
                  <p>
                    Neste spot, <b>nem um range de blefe puro</b> cobriria o preço. A conta
                    não salva o call — só a leitura de que ele está apostando por valor fino.
                  </p>
                ) : conta.blefeNecessario === 0 ? (
                  <p>
                    O call <b>já paga mesmo contra o range de valor dele</b>, sem precisar de
                    blefe nenhum. Aqui a dúvida não é matemática — é o que você perde ao
                    errar.
                  </p>
                ) : (
                  <p>
                    Ele precisa estar blefando em <b>{pct(conta.blefeNecessario)}</b> das vezes
                    para o seu call empatar. Pelo range que o app estimou, o blefe é{" "}
                    <b>{pct(conta.blefeEstimado)}</b> —{" "}
                    {conta.blefeEstimado >= conta.blefeNecessario ? (
                      <b className="sqd-pos">acima do necessário.</b>
                    ) : (
                      <b className="sqd-neg">abaixo do necessário.</b>
                    )}
                  </p>
                )}
                <p className="sqd-fino">
                  Contra só o valor dele você ganha {pct(conta.equityVsValor)}; contra só os
                  blefes, {pct(conta.equityVsBlefe)}.
                </p>
              </div>
            </>
          ) : null}

          <div className="sqd-bloco">
            <div className="sqd-bloco-t">Como li o range dele</div>
            <p>{spot.comoLiORange}</p>
          </div>

          <div className="sqd-bloco destaque">
            <div className="sqd-bloco-t">Por que este spot divide</div>
            <p>{spot.porQueDivide}</p>
          </div>

          <div className="sqd-lados">
            <div className="sqd-lado call">
              <div className="sqd-lado-t">O que inclina para o CALL</div>
              <ul>
                {spot.inclinaCall.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
            <div className="sqd-lado fold">
              <div className="sqd-lado-t">O que inclina para o FOLD</div>
              <ul>
                {spot.inclinaFold.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="sqd-honesto">
            <b>O app não vai te dizer qual era a certa.</b> O range dele é estimativa, e
            neste spot a resposta muda junto com ela. A conta acima é real — a leitura é
            sua, e é isso que se treina aqui.
          </div>
        </div>
      )}

      <div className="sqd-nav">
        <button className="btn tiny" onClick={() => irPara(idx - 1)}>
          ◀ anterior
        </button>
        <button className="btn tiny" onClick={() => irPara(idx + 1)}>
          próximo ▶
        </button>
      </div>
    </div>
  );
}
