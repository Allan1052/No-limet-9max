// ---------------------------------------------------------------------------
// O puxão de orelha fala pouco e com dado. Estes testes guardam as três travas:
// sem janela cheia não fala, sem a fase pesar não fala, e o contra-aviso existe
// para o app não ensinar a agredir sempre.
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import {
  lerPuxaoDeOrelha,
  JANELA_DE_SPOTS,
  FALHAS_PARA_PUXAO,
  JANELA_DE_EXCESSO,
  EXCESSOS_PARA_PUXAO,
  BB_QUE_APERTA,
  MAOS_ENTRE_AVISOS,
  MAX_AVISOS_POR_TORNEIO,
  type DecisaoDaJanela,
  type SinaisDoPuxao,
} from "./puxaoDeOrelha";
import type { Stage } from "../tournament/structure";

const spotPassou: DecisaoDaJanela = { pediaEscalar: true, escalou: false };
const spotEscalou: DecisaoDaJanela = { pediaEscalar: true, escalou: true };
const foraQuieto: DecisaoDaJanela = { pediaEscalar: false, escalou: false };
const foraAgrediu: DecisaoDaJanela = { pediaEscalar: false, escalou: true };

const rep = (d: DecisaoDaJanela, n: number) => Array.from({ length: n }, () => d);

function sinais(over: Partial<SinaisDoPuxao> = {}): SinaisDoPuxao {
  return {
    janela: [],
    heroBB: 18,
    stage: "meio" as Stage,
    maosDesdeOUltimo: MAOS_ENTRE_AVISOS,
    avisosNoTorneio: 0,
    ...over,
  };
}

describe("Trava 1 — sem dado, sem frase", () => {
  it("com a janela incompleta, cala a boca", () => {
    const janela = rep(spotPassou, JANELA_DE_SPOTS - 1);
    expect(lerPuxaoDeOrelha(sinais({ janela }))).toBeUndefined();
  });

  it("com a janela cheia e falhas suficientes, fala", () => {
    const janela = [
      ...rep(spotPassou, FALHAS_PARA_PUXAO),
      ...rep(spotEscalou, JANELA_DE_SPOTS - FALHAS_PARA_PUXAO),
    ];
    const p = lerPuxaoDeOrelha(sinais({ janela }))!;
    expect(p.tipo).toBe("passivo");
    expect(p.base.olhados).toBe(JANELA_DE_SPOTS);
    expect(p.base.falhas).toBe(FALHAS_PARA_PUXAO);
  });

  it("uma falha a menos que o limiar não acende", () => {
    const janela = [
      ...rep(spotPassou, FALHAS_PARA_PUXAO - 1),
      ...rep(spotEscalou, JANELA_DE_SPOTS - FALHAS_PARA_PUXAO + 1),
    ];
    expect(lerPuxaoDeOrelha(sinais({ janela }))).toBeUndefined();
  });

  it("olha só os spots MAIS RECENTES — erro velho não condena", () => {
    const janela = [
      ...rep(spotPassou, 20), // passado ruim
      ...rep(spotEscalou, JANELA_DE_SPOTS), // presente limpo
    ];
    expect(lerPuxaoDeOrelha(sinais({ janela }))).toBeUndefined();
  });

  it("todo texto carrega os números que o sustentam", () => {
    const janela = rep(spotPassou, JANELA_DE_SPOTS);
    const p = lerPuxaoDeOrelha(sinais({ janela }))!;
    expect(p.texto).toContain(String(JANELA_DE_SPOTS));
    expect(p.texto).toContain("18bb");
  });
});

describe("Trava 2 — a fase precisa pesar", () => {
  const janelaRuim = rep(spotPassou, JANELA_DE_SPOTS);

  it("stack confortável no início: não cutuca", () => {
    expect(
      lerPuxaoDeOrelha(sinais({ janela: janelaRuim, heroBB: 60, stage: "inicio" })),
    ).toBeUndefined();
  });

  it("stack curto: cutuca", () => {
    expect(
      lerPuxaoDeOrelha(sinais({ janela: janelaRuim, heroBB: BB_QUE_APERTA }))?.tipo,
    ).toBe("passivo");
  });

  it("bolha e mesa final cutucam mesmo com stack grande", () => {
    for (const stage of ["bolha", "mesa_final"] as Stage[]) {
      expect(
        lerPuxaoDeOrelha(sinais({ janela: janelaRuim, heroBB: 80, stage }))?.tipo,
      ).toBe("passivo");
    }
  });

  it("na bolha o texto explica que o padrão JÁ conta o ICM", () => {
    const p = lerPuxaoDeOrelha(sinais({ janela: janelaRuim, heroBB: 30, stage: "bolha" }))!;
    expect(p.texto).toContain("ICM");
  });

  it("NUNCA diz que ele está jogando apertado contra uma régua genérica", () => {
    for (const stage of ["inicio", "meio", "bolha", "mesa_final"] as Stage[]) {
      const p = lerPuxaoDeOrelha(sinais({ janela: janelaRuim, heroBB: 14, stage }));
      if (!p) continue;
      for (const proibido of ["VPIP", "tight", "apertado demais", "range estreito"]) {
        expect(p.texto).not.toContain(proibido);
      }
    }
  });
});

describe("Trava 3 — o contra-aviso impede 'agrida sempre'", () => {
  it("agressão fora de spot acende o aviso contrário", () => {
    const janela = [
      ...rep(foraAgrediu, EXCESSOS_PARA_PUXAO),
      ...rep(foraQuieto, JANELA_DE_EXCESSO - EXCESSOS_PARA_PUXAO),
    ];
    const p = lerPuxaoDeOrelha(sinais({ janela }))!;
    expect(p.tipo).toBe("excessivo");
    expect(p.titulo).toBe("Segura");
    expect(p.base.falhas).toBe(EXCESSOS_PARA_PUXAO);
  });

  it("o contra-aviso NÃO depende da fase — exagerar é caro em qualquer lugar", () => {
    const janela = rep(foraAgrediu, JANELA_DE_EXCESSO);
    expect(
      lerPuxaoDeOrelha(sinais({ janela, heroBB: 120, stage: "inicio" }))?.tipo,
    ).toBe("excessivo");
  });

  it("o aviso passivo tem precedência quando os dois batem", () => {
    const janela = [...rep(spotPassou, JANELA_DE_SPOTS), ...rep(foraAgrediu, JANELA_DE_EXCESSO)];
    expect(lerPuxaoDeOrelha(sinais({ janela }))?.tipo).toBe("passivo");
  });
});

describe("Anti-spam", () => {
  const janela = rep(spotPassou, JANELA_DE_SPOTS);

  it("não repete antes do intervalo de mãos", () => {
    expect(
      lerPuxaoDeOrelha(sinais({ janela, maosDesdeOUltimo: MAOS_ENTRE_AVISOS - 1 })),
    ).toBeUndefined();
  });

  it("respeita o teto por torneio", () => {
    expect(
      lerPuxaoDeOrelha(sinais({ janela, avisosNoTorneio: MAX_AVISOS_POR_TORNEIO })),
    ).toBeUndefined();
    expect(
      lerPuxaoDeOrelha(sinais({ janela, avisosNoTorneio: MAX_AVISOS_POR_TORNEIO - 1 })),
    ).toBeDefined();
  });
});

describe("O silêncio é a resposta mais comum", () => {
  it("jogando no padrão, o app não fala nada", () => {
    const janela = [...rep(spotEscalou, 30), ...rep(foraQuieto, 30)];
    expect(lerPuxaoDeOrelha(sinais({ janela, heroBB: 10, stage: "bolha" }))).toBeUndefined();
  });

  it("janela vazia não fala", () => {
    expect(lerPuxaoDeOrelha(sinais({ janela: [] }))).toBeUndefined();
  });
});
