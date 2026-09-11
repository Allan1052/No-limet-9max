// ---------------------------------------------------------------------------
// A landing tem um spot de demonstração e AFIRMA o que o motor recomenda.
// Em 10/09/2026 a auditoria pegou essa afirmação errada: o site dizia que o
// motor foldava K♠Q♠ (mesmo naipe) no CO com 25bb contra UTG 3x — o motor
// pagava. Quem respondia "Call", que é o que o app ensina, era informado de
// que tinha errado.
//
// Este teste amarra a CÓPIA DO SITE ao MOTOR: ele lê o HTML da landing, extrai
// as cartas mostradas e confere que o motor realmente responde o que o texto
// promete. Se um dos dois lados mudar sozinho, o deploy para aqui.
// ---------------------------------------------------------------------------
import { describe, it, expect } from "vitest";
// Import "?raw" do Vite em vez de node:fs: assim o arquivo continua com
// checagem de tipo completa (o tsconfig do app não tem as tipagens do Node, e
// desligar o checador aqui esconderia erro na chamada do motor — que é
// justamente o que este teste existe para vigiar).
import siteHtml from "../site/index.html?raw";
import publicHtml from "../public/site/index.html?raw";
import { preflopDecision } from "./ranges/preflop";
import { cardFromString } from "./engine/cards";
import { BASELINE_PROFILE } from "./bots/profiles";

const NAIPE: Record<string, string> = { "♠": "s", "♥": "h", "♦": "d", "♣": "c" };

const LANDINGS: Record<string, string> = {
  "site/index.html": siteHtml,
  "public/site/index.html": publicHtml,
};

function cartasDaLanding(arquivo: string): string[] {
  const html = LANDINGS[arquivo];
  const bloco = html.match(/<div class="demo-cards"[\s\S]*?<\/div>\s*<\/div>/);
  if (!bloco) throw new Error(`bloco .demo-cards não encontrado em ${arquivo}`);
  const achadas: string[] = [];
  const re = /<span class="r">([^<]+)<\/span><span class="s">([^<]+)<\/span>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bloco[0])) !== null) achadas.push(`${m[1]}${NAIPE[m[2]] ?? "?"}`);
  return achadas;
}

const spot = (mao: string[]) =>
  preflopDecision({
    heroPosition: "CO",
    hand: [cardFromString(mao[0]), cardFromString(mao[1])],
    effectiveBB: 25,
    profile: BASELINE_PROFILE,
    variant: "holdem",
    raiserPosition: "UTG",
    openSizeBB: 3,
  });

describe("demo da landing: o que o site afirma é o que o motor faz", () => {
  const arquivos = Object.keys(LANDINGS);

  it.each(arquivos)("%s mostra exatamente duas cartas válidas", (arq) => {
    const mao = cartasDaLanding(arq);
    expect(mao).toHaveLength(2);
    for (const c of mao) expect(c).not.toContain("?");
  });

  it.each(arquivos)("%s: o motor FOLDA a mão mostrada (o site diz Fold)", (arq) => {
    expect(spot(cartasDaLanding(arq)).action).toBe("fold");
  });

  // O texto do veredito afirma: "se as duas fossem do mesmo naipe, o motor
  // pagaria". Essa frase também precisa ser verdade.
  it.each(arquivos)("%s: a mesma mão do MESMO NAIPE seria call", (arq) => {
    const [a, b] = cartasDaLanding(arq);
    const mesmoNaipe = [a, `${b[0]}${a[1]}`];
    expect(spot(mesmoNaipe).action).toBe("call");
  });

  it("as duas cópias da landing mostram a mesma mão (regra da casa)", () => {
    expect(cartasDaLanding(arquivos[0])).toEqual(cartasDaLanding(arquivos[1]));
  });
});
