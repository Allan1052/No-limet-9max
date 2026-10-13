// ---------------------------------------------------------------------------
// O CARD DO ALVO — a linha de chegada, no Hoje.
//
// 13/10/2026. Pedido do Allan: *"sempre começo algo e não termino, paro no meio
// do caminho. e com o App não foi diferente."*
//
// Tudo no app é loop infinito (streak, missões, campanha, XP, conquistas). Este
// card é o oposto: tem tamanho, enche, e ACABA. Regras que esta tela respeita e
// que não podem ser afrouxadas depois:
//
//   1. O ciclo só começa quando o Allan aperta o botão. Nada o abre sozinho.
//   2. Enquanto corre, a tela mostra UM número: quanto falta.
//   3. Quando enche, vira tela de fim — com o placar e o botão de encerrar.
//   4. Encerrou, SUMIU. Não propõe o próximo, não vira streak, não cobra nada.
//      Começar outro é decisão dele, de novo, do zero.
//
// ⚠️ O TEXTO DA TELA É GENÉRICO DE PROPÓSITO. O diagnóstico nasceu do histórico
// do Allan comparado ao do irmão, mas o calloufold.com.br é público: um rascunho
// desta tela dizia "comparando o seu histórico com o do seu irmão" e "o seu
// histórico do PokerStars", que não quer dizer nada para qualquer outro jogador.
// O caso particular fica no comentário do motor (train/alvo.ts); a tela fala da
// habilidade, não da pessoa.
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import {
  SPOTS_DO_ALVO,
  carregarAlvo,
  comecarAlvo,
  fecharAlvo,
  progressoDoAlvo,
  placarDoAlvo,
  evolucaoDoAlvo,
  type Alvo,
} from "../train/alvo";
import "./alvoCard.css";

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** O veredito do eixo, em português e sem prometer o que o número não dá. */
function textoDoEixo(eixo: string, peso?: number): { titulo: string; texto: string } {
  const p = peso !== undefined ? pct(peso) : "";
  switch (eixo) {
    case "passivo":
      return {
        titulo: "Você passa a mão",
        texto: `${p} das suas falhas foram por NÃO escalar quando o padrão pedia — e não por exagerar. Você sobrevive bem e deixa fichas na mesa: é o perfil de quem chega no dinheiro e não chega no topo.`,
      };
    case "excessivo":
      return {
        titulo: "Você exagera",
        texto: `${p} das suas falhas foram por escalar quando o padrão NÃO pedia. Deixar fichas na mesa não é o seu problema — segurar a mão é.`,
      };
    case "equilibrado":
      return {
        titulo: "Suas falhas estão repartidas",
        texto: "Metade por passar a mão, metade por exagerar. Não há um eixo só para atacar — o que aparece aqui é ruído de decisão, não uma tendência.",
      };
    default:
      return {
        titulo: "Ciclo sem falha registrada",
        texto: "Você escalou em todos os spots em que o padrão pedia, e não escalou onde não pedia.",
      };
  }
}

export function AlvoCard() {
  const [alvo, setAlvo] = useState<Alvo | null>(() => carregarAlvo());

  // Re-lê quando a aba volta ao foco: o contador anda enquanto ele joga o
  // torneio, em outra tela.
  useEffect(() => {
    const refresh = () => setAlvo(carregarAlvo());
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  // Encerrado: o card SOME. É o fim, e fim não deixa resíduo na tela.
  if (alvo?.fechadoEm) return null;

  // ---- Nada aberto: o convite ----
  if (!alvo) {
    return (
      <section className="alvo alvo-convite">
        <div className="alvo-rot">Um alvo com fim</div>
        <h3 className="alvo-titulo">{SPOTS_DO_ALVO} spots de acumulação</h3>
        <p className="alvo-texto">
          <b>Sobreviver</b> no torneio e <b>acumular</b> fichas são duas habilidades
          diferentes — e é a segunda que decide mesa final. Este alvo conta só as
          decisões em que o padrão manda <b>escalar</b>, e para quando chegar a{" "}
          {SPOTS_DO_ALVO}.
        </p>
        <p className="alvo-nota">
          São {SPOTS_DO_ALVO} spots, não {SPOTS_DO_ALVO} torneios. Pela medição do motor,
          dá de <b>4 a 9 torneios</b>. Quando encher, acaba — não vira streak nem missão diária.
        </p>
        <button
          className="btn primary alvo-btn"
          onClick={() => setAlvo(comecarAlvo())}
        >
          Começar o alvo
        </button>
      </section>
    );
  }

  const prog = progressoDoAlvo(alvo);

  // ---- Em andamento: UM número, quanto falta ----
  if (!prog.concluido) {
    return (
      <section className="alvo alvo-andando">
        <div className="alvo-linha">
          <span className="alvo-rot">Alvo · acumulação</span>
          <span className="alvo-contagem">
            <b>{prog.feito}</b> de {prog.total}
          </span>
        </div>
        <div
          className="alvo-barra"
          role="progressbar"
          aria-valuenow={prog.feito}
          aria-valuemin={0}
          aria-valuemax={prog.total}
          aria-label={`${prog.feito} de ${prog.total} spots de acumulação`}
        >
          <div className="alvo-barra-fill" style={{ width: `${prog.pct}%` }} />
        </div>
        <p className="alvo-texto">
          Faltam <b>{prog.faltam}</b> spots — mais ou menos{" "}
          {prog.torneiosMin === prog.torneiosMax
            ? `${prog.torneiosMax} torneio${prog.torneiosMax === 1 ? "" : "s"}`
            : `${prog.torneiosMin} a ${prog.torneiosMax} torneios`}
          . O placar só aparece no fim: durante o ciclo, jogue normal.
        </p>
      </section>
    );
  }

  // ---- Concluído: o placar e o FIM ----
  const placar = placarDoAlvo(alvo);
  const ev = evolucaoDoAlvo(alvo);
  const eixo = textoDoEixo(placar.eixo, placar.pesoPassivo);

  return (
    <section className="alvo alvo-fim">
      <div className="alvo-rot">Alvo concluído · {SPOTS_DO_ALVO} spots</div>
      <h3 className="alvo-titulo">Você escalou {pct(placar.taxaEscalada ?? 0)} das vezes</h3>

      <div className="alvo-numeros">
        <div className="alvo-num">
          <b>{alvo.escalou}</b>
          <span>escalou</span>
        </div>
        <div className="alvo-num alvo-num-falha">
          <b>{placar.falhasPassivas}</b>
          <span>passou a mão</span>
        </div>
        <div className="alvo-num alvo-num-falha">
          <b>{placar.falhasExcesso}</b>
          <span>escalou demais</span>
        </div>
      </div>

      {placar.taxaSozinho !== undefined ? (
        <p className="alvo-nota">
          Sem dica na tela (o número de verdade): <b>{pct(placar.taxaSozinho)}</b> em{" "}
          {alvo.spotsSozinho} spots.
        </p>
      ) : null}

      <div className="alvo-eixo">
        <b>{eixo.titulo}</b>
        {eixo.texto}
      </div>

      {ev ? (
        <p className="alvo-nota">
          Primeira metade <b>{pct(ev.primeira)}</b> · segunda metade <b>{pct(ev.segunda)}</b>.{" "}
          {ev.saiDoRuido
            ? "Essa diferença é maior que o ruído da amostra."
            : "A diferença está dentro do ruído de 100 spots — não dá para chamar de evolução, nem para os dois lados."}
        </p>
      ) : null}

      <button
        className="btn primary alvo-btn"
        onClick={() => setAlvo(fecharAlvo())}
      >
        Encerrar o ciclo
      </button>
      <p className="alvo-nota alvo-nota-fim">
        Encerrar fecha de vez: o card some do Hoje e nada recomeça sozinho.
      </p>
    </section>
  );
}
