// ---------------------------------------------------------------------------
// "COMO VOCÊ JOGA SOZINHO" — o número que mede o jogador, e não a dica.
//
// Fica no topo do "Minha evolução" porque é a resposta da pergunta que o Allan
// fez em 13/09: "como estou jogando próximo do que o Call ou Fold orienta,
// quando ninguém me sopra?". Todos os outros números da tela somam decisões
// tomadas COM a dica aberta — este é o único que não.
//
// A tela não calcula nada: pede o relatório a soloMode.ts e mostra. Quando não
// há amostra suficiente ela NÃO inventa porcentagem — diz quantas decisões
// faltam. É a regra da casa, e aqui ela vale dobrado.
// ---------------------------------------------------------------------------
import { AMOSTRA_MINIMA, relatorioSozinho, type RelatorioSozinho } from "../train/soloMode";
import {
  biggestOpportunity,
  progressReport,
  tendenciaSozinho,
  type BucketProgress,
} from "../train/progress";
import "./soloScore.css";

/** Leitura honesta da distância: o que ela significa, sem prometer mais. */
function leituraDaDistancia(d: number): string {
  if (d <= 3) return "Você joga praticamente igual com e sem ajuda — a dica virou confirmação, não muleta.";
  if (d <= 10) return "Você já carrega o jogo sozinho; a dica ainda te salva em alguns spots.";
  if (d <= 20) return "A dica está fazendo boa parte do trabalho. É aqui que o treino sozinho rende mais.";
  return "Hoje quem está jogando é a dica. Não tem problema nenhum — é exatamente o que este número serve para mudar.";
}

export function SoloScore({ relatorio = relatorioSozinho() }: { relatorio?: RelatorioSozinho }) {
  const r = relatorio;
  // ONDE ele vaza jogando sozinho, e se está melhorando. As duas leituras saem
  // do MESMO histórico de decisões, filtrado pelas que correram às cegas — não
  // há contagem paralela. Vêm null enquanto não houver amostra.
  const vazamento = r.totalSozinho > 0 ? biggestOpportunity({ somenteSozinho: true }) : null;
  const curva = r.totalSozinho > 0 ? tendenciaSozinho() : null;
  const baldes = r.totalSozinho > 0 ? progressReport({ somenteSozinho: true }) : [];

  // Nunca jogou sozinho: explica o que é, sem número nenhum.
  if (r.totalSozinho === 0) {
    return (
      <section className="solo-score solo-vazio" aria-label="Como você joga sozinho">
        <div className="solo-kicker">Como você joga sozinho</div>
        <p className="solo-texto">
          Na mesa existe o botão <b>🙈 Sozinho</b>. Com ele ligado o app não sopra nada
          e não dá veredito nenhum até o fim da sessão — e passa a medir <b>você</b>,
          não a dica. Todo número desta tela hoje inclui decisões tomadas com a dica
          aberta; este seria o único que não.
        </p>
      </section>
    );
  }

  return (
    <section className="solo-score" aria-label="Como você joga sozinho">
      <div className="solo-kicker">Como você joga sozinho</div>

      {r.amostraSuficiente ? (
        <>
          <div className="solo-numeros">
            <div className="solo-col solo-destaque">
              <span className="solo-rot">Sozinho</span>
              <b>{r.acertoSozinho}%</b>
              <span className="solo-amostra">{r.totalSozinho} decisões</span>
            </div>
            <div className="solo-col">
              <span className="solo-rot">Com dica</span>
              <b>{r.acertoComDica !== null ? `${r.acertoComDica}%` : "—"}</b>
              <span className="solo-amostra">
                {r.acertoComDica !== null
                  ? `${r.totalComDica} decisões`
                  : `${r.totalComDica} decisões · faltam ${Math.max(0, AMOSTRA_MINIMA - r.totalComDica)}`}
              </span>
            </div>
          </div>
          {r.distancia !== null ? (
            <p className="solo-texto">
              <b>
                {r.distancia > 0
                  ? `A dica está te levantando ${r.distancia} pontos.`
                  : r.distancia < 0
                    ? `Você acerta ${Math.abs(r.distancia)} pontos MAIS sozinho do que com a dica.`
                    : "Mesmo acerto com e sem a dica."}
              </b>{" "}
              {leituraDaDistancia(Math.abs(r.distancia))}
            </p>
          ) : (
            <p className="solo-texto">
              Ainda não dá para comparar com o outro lado: faltam decisões jogadas com a dica.
            </p>
          )}
        </>
      ) : (
        <div className="solo-parcial">
          <div className="solo-barra" aria-hidden="true">
            <span style={{ width: `${Math.round((r.totalSozinho / AMOSTRA_MINIMA) * 100)}%` }} />
          </div>
          <p className="solo-texto">
            <b>{r.totalSozinho} de {AMOSTRA_MINIMA} decisões</b> jogadas sozinho.
            Faltam <b>{r.faltam}</b> para o número aparecer — com menos que isso ele
            diria mais sobre a sorte do que sobre o seu jogo.
          </p>
        </div>
      )}

      {curva ? (
        <p className="solo-curva">
          {/* A cor segue a DIREÇÃO. Pintar uma queda de verde é mentir com
              estilo — foi assim que saiu na primeira versão. */}
          <b className={curva.delta > 0 ? "solo-sobe" : curva.delta < 0 ? "solo-cai" : ""}>
            {curva.delta > 0
              ? `↑ subiu ${curva.delta} pontos`
              : curva.delta < 0
                ? `↓ caiu ${Math.abs(curva.delta)} pontos`
                : "→ estável"}
          </b>{" "}
          jogando sozinho: {curva.anterior}% antes · {curva.recente}% agora.
        </p>
      ) : null}

      {vazamento ? (
        <div className="solo-vazamento">
          <span className="solo-rot">Onde você mais vaza sozinho</span>
          <b>{vazamento.label}</b>
          <span className="solo-amostra">
            {Math.round(vazamento.accuracy * 100)}% de acerto em {vazamento.total} decisões às cegas
          </span>
        </div>
      ) : null}

      {baldes.length > 0 ? (
        <details className="solo-detalhe">
          <summary>Ver tudo que medi sozinho</summary>
          <ul className="solo-lista">
            {baldes.map((b: BucketProgress) => (
              <li key={b.id}>
                <span className="solo-lista-nome">{b.label}</span>
                <span className="solo-lista-num">
                  {Math.round(b.accuracy * 100)}%
                  <i>{b.total}</i>
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
