// ---------------------------------------------------------------------------
// A DICA DO REVIEW NÃO PODE DEPENDER DE CHEGAR AO FIM DA MÃO.
//
// Pedido do Allan (17/09/2026), depois de revisar a aba inteira:
//   "As dicas tem que ser uma coisa de ouro e ela tá escondida. Eu tenho que ir
//    clicando na mão, passando cada um daqueles estágios... depois que finaliza
//    a jogada toda que aparece as dicas. Às vezes até a mão que eu foldo, eu
//    tenho que finalizar a jogada da ação do jogador, tudo pra aparecer a dica.
//    Você tinha que colocar lá em cima, naquela parte onde já tem a dica básica,
//    um botãozinho que eu clico e já abre a dica. E pode ser qualquer momento da
//    mão, porque tem mão que eu passo ela direto."
//
// Antes: o botão de abrir só nascia se existissem leitura/conta/topoRange/
// pesoDaBolha. Num fold pré-flop nenhuma delas existe — a faixa ficava morta e
// a única explicação era a do painel de RESULTADO, que só aparece no fim.
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import source from "./ImportReplayer.tsx?raw";
// @ts-ignore — disponível no ambiente Node/Vitest; o projeto não declara @types/node no build.
import { readFileSync } from "node:fs";
import { buildCoachV2PostHandDecision } from "./coachV2PostHand";
import type { FeedbackItem } from "../feedback/analyzer";

const css = readFileSync(new URL("./tableFinalLayout.css", import.meta.url), "utf8");

const foldPreflop: FeedbackItem = {
  street: "preflop",
  heroAction: "Fold",
  advice: "Fold",
  rating: "boa",
  text: "82o de UTG é lixo: fora do range de abertura em qualquer stack.",
  kind: "preflop",
  heroFam: "fold",
  adviceFam: "fold",
};

describe("Review: a dica abre em qualquer momento da mão", () => {
  it("num fold pré-flop sem camada nenhuma, ainda há o 'por quê' para abrir", () => {
    const dica = buildCoachV2PostHandDecision(foldPreflop, "simple");
    expect(dica.camadasCompletas ?? []).toHaveLength(0);
    // É exatamente este caso que deixava a faixa morta.
    expect(dica.reason).toBeTruthy();
  });

  it("o gatilho de abrir usa reason/metrics, não só as quatro camadas antigas", () => {
    expect(source).toContain("const camadasDaDica=dica.camadasCompletas??[]");
    expect(source).toContain(
      "const temCamada=camadasDaDica.length>0||!!dica.reason||dica.metrics.length>0",
    );
    expect(source).not.toContain(
      "const temCamada=!!(dica.leitura||dica.conta||dica.topoRange||dica.pesoDaBolha)",
    );
  });

  it("o botão de abrir é ESCRITO, não um chevron solto", () => {
    expect(source).toContain('"ver a dica ▾"');
    expect(source).toContain('"fechar ▴"');
    expect(css).toContain(".ir-fullscreen .ir-coach .ir-coach-mais");
  });

  it("a faixa vive ACIMA da mesa e independe do painel de resultado", () => {
    // O painel de RESULTADO só nasce com a mão revelada; a faixa não depende dele.
    expect(source).toContain("{!revealing?null:<div className=\"ir-result\"");
    expect(source).toContain('className={`ir-coach ${cls}');
  });
});

describe("Review: as camadas são listadas pelo motor, não à mão", () => {
  it("percorre camadasCompletas em vez de escrever camada por camada", () => {
    expect(source).toContain(
      'camadasDaDica.map((c)=><div key={c.chave} className="ir-camada"><b>{c.rotulo}</b>{c.texto}</div>)',
    );
    for (const escritaAMao of [
      '<b>A leitura</b>{dica.leitura}',
      '<b>A conta</b>{dica.conta}',
      '<b>O topo do range dele</b>{dica.topoRange}',
      '<b>O peso da bolha</b>{dica.pesoDaBolha}',
      '<b>O que mudaria</b>{dica.oQueMudaria}',
      '<b>Cartas que te salvavam</b>{dica.cartasSalvadoras}',
    ]) {
      expect(source).not.toContain(escritaAMao);
    }
  });

  it("marca a mão que merece review, como a tela de jogo já marcava", () => {
    expect(source).toContain('dica.importancia?.nivel==="excepcional"');
    expect(source).toContain("Essa mão merece um review");
    expect(css).toContain(".ir-fullscreen .ir-merece-review");
  });
});
