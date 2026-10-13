// ---------------------------------------------------------------------------
// A BANCA IMPÕE, não avisa. Estes testes guardam a diferença: um buy-in acima
// da regra não debita e, por isso, o torneio não começa.
// ---------------------------------------------------------------------------
import { beforeEach, describe, expect, it } from "vitest";
import {
  BANCA_INICIAL,
  BUYINS_DE_RESERVA,
  bancaNova,
  carregarBanca,
  comecarBanca,
  creditarPremio,
  debitarInscricao,
  desligarBanca,
  faltaParaLiberar,
  liberado,
  melhorBuyInLiberado,
  menorBuyIn,
  quebrou,
  retratoDaBanca,
  tetoDaBanca,
} from "./banca";
import { BUY_INS } from "../tournament/structure";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
}

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
  });
});

describe("A regra que o Allan pediu", () => {
  it("com $300 e 100 buy-ins de reserva, o teto é $3", () => {
    expect(BANCA_INICIAL).toBe(300);
    expect(BUYINS_DE_RESERVA).toBe(100);
    expect(tetoDaBanca(300)).toBe(3);
    expect(melhorBuyInLiberado(300)).toBe(3);
  });

  it("EXISTE um torneio jogável no dia 1 — sem isso a regra travaria o app", () => {
    expect(menorBuyIn()).toBeLessThanOrEqual(tetoDaBanca(BANCA_INICIAL));
    expect(quebrou(BANCA_INICIAL)).toBe(false);
  });

  it("a escada sobe junto com a banca", () => {
    expect(melhorBuyInLiberado(100)).toBe(1);
    expect(melhorBuyInLiberado(300)).toBe(3);
    expect(melhorBuyInLiberado(500)).toBe(5);
    expect(melhorBuyInLiberado(1100)).toBe(11);
    expect(melhorBuyInLiberado(10900)).toBe(109);
  });

  it("não existe degrau impossível: todo buy-in tem o anterior a menos de 4× dele", () => {
    const vals = BUY_INS.map((b) => b.value).sort((a, b) => a - b);
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] >= 1000) continue; // a faixa elite é desbloqueio, não escada
      expect(vals[i] / vals[i - 1]).toBeLessThanOrEqual(4);
    }
  });

  it("diz quanto falta para o próximo degrau", () => {
    expect(faltaParaLiberar(5, 300)).toBe(200); // 5 × 100 − 300
    expect(faltaParaLiberar(3, 300)).toBe(0);
  });

  it("quebrar é não cobrir nem o menor torneio", () => {
    expect(quebrou(menorBuyIn() * BUYINS_DE_RESERVA)).toBe(false);
    expect(quebrou(menorBuyIn() * BUYINS_DE_RESERVA - 1)).toBe(true);
    expect(melhorBuyInLiberado(10)).toBeUndefined();
  });
});

describe("A banca IMPÕE", () => {
  it("buy-in acima da regra NÃO debita — logo o torneio não começa", () => {
    comecarBanca(300);
    expect(debitarInscricao(5)).toBeNull();
    expect(carregarBanca()!.saldo).toBe(300);
    expect(carregarBanca()!.inscricoes).toBe(0);
  });

  it("buy-in dentro da regra debita e conta a inscrição", () => {
    comecarBanca(300);
    const b = debitarInscricao(3)!;
    expect(b.saldo).toBe(297);
    expect(b.inscricoes).toBe(1);
    expect(b.investido).toBe(3);
  });

  it("sem banca ligada, não há nada a impor (o app volta a ser o de antes)", () => {
    desligarBanca();
    expect(debitarInscricao(10300)).toBeNull();
    expect(creditarPremio(50)).toBeNull();
    expect(carregarBanca()).toBeNull();
  });
});

describe("O prêmio volta para a banca", () => {
  it("creditar zero é chamada válida — a maioria dos torneios não paga", () => {
    comecarBanca(300);
    debitarInscricao(3);
    const b = creditarPremio(0)!;
    expect(b.saldo).toBe(297);
    expect(b.premios).toBe(0);
  });

  it("o pico guarda a maior banca já alcançada, mesmo depois de cair", () => {
    comecarBanca(300);
    debitarInscricao(3);
    creditarPremio(400); // saldo 697
    debitarInscricao(5);
    creditarPremio(0); // saldo 692
    const b = carregarBanca()!;
    expect(b.saldo).toBe(692);
    expect(b.pico).toBe(697);
  });

  it("uma sequência de torneios bate com o líquido", () => {
    comecarBanca(300);
    // A banca EMPURRA PARA BAIXO assim que o saldo não cobre mais o degrau:
    // $3 na primeira, $2 depois de cair para 297, e $3 de novo quando o prêmio
    // devolve o saldo. É a regra funcionando, não um roteiro inventado.
    const esperado = [
      { bi: 3, premio: 0, saldo: 297 },
      { bi: 2, premio: 0, saldo: 295 },
      { bi: 2, premio: 45, saldo: 338 },
      { bi: 3, premio: 0, saldo: 335 },
    ];
    for (const e of esperado) {
      expect(debitarInscricao(e.bi)).not.toBeNull();
      creditarPremio(e.premio);
      expect(carregarBanca()!.saldo).toBe(e.saldo);
    }
    const b = carregarBanca()!;
    expect(b.investido).toBe(10);
    expect(b.premios).toBe(45);
    expect(retratoDaBanca(b).liquido).toBe(35);
  });

  it("A REGRA EMPURRA PARA BAIXO NA HORA — e isso é de propósito", () => {
    // Com $300 exatos o teto é $3. Um torneio de $3 derruba para $297, e aí
    // $3 pede $300 de novo: a regra manda descer para $2 imediatamente.
    // Quem pediu "a regra certinho" pediu isto; é o aperto que a gestão de
    // banca realmente impõe, não uma versão amaciada dela.
    comecarBanca(300);
    expect(debitarInscricao(3)).not.toBeNull();
    expect(carregarBanca()!.saldo).toBe(297);
    expect(liberado(3, 297)).toBe(false);
    expect(melhorBuyInLiberado(297)).toBe(2);
    expect(debitarInscricao(3)).toBeNull();
  });
});

describe("O retrato da banca", () => {
  it("mostra o teto de agora e o próximo degrau", () => {
    const r = retratoDaBanca(bancaNova(300));
    expect(r.teto).toBe(3);
    expect(r.proximo).toEqual({ buyIn: 5, falta: 200 });
    expect(r.quebrou).toBe(false);
  });

  it("mede o crescimento sobre o início", () => {
    const r = retratoDaBanca({ ...bancaNova(300), saldo: 450 });
    expect(r.crescimento).toBeCloseTo(0.5, 5);
  });

  it("no topo da escada não há próximo degrau", () => {
    const r = retratoDaBanca({ ...bancaNova(300), saldo: 10300 * 100 });
    expect(r.teto).toBe(10300);
    expect(r.proximo).toBeUndefined();
  });

  it("quebrada, não tem teto e avisa", () => {
    const r = retratoDaBanca({ ...bancaNova(300), saldo: 20 });
    expect(r.teto).toBeUndefined();
    expect(r.quebrou).toBe(true);
    expect(r.proximo?.buyIn).toBe(menorBuyIn());
  });
});

describe("A regra de 100 é a de bolso, não a medida", () => {
  it("o módulo guarda o número MEDIDO para a tela poder ser honesta", async () => {
    const { RESERVA_MEDIDA_ALLAN, RESERVA_MEDIDA_IRMAO } = await import("./banca");
    // SharkScope: banca necessária ÷ buy-in médio de cada um.
    expect(RESERVA_MEDIDA_ALLAN).toBe(834);
    expect(RESERVA_MEDIDA_IRMAO).toBe(510);
    expect(BUYINS_DE_RESERVA).toBeLessThan(RESERVA_MEDIDA_ALLAN);
  });
});

describe("Um buy-in liberado é sempre jogável", () => {
  it("para qualquer saldo, o teto informado passa na regra", () => {
    for (const saldo of [100, 250, 300, 777, 1100, 5500, 10900, 53000]) {
      const teto = melhorBuyInLiberado(saldo);
      if (teto === undefined) continue;
      expect(liberado(teto, saldo)).toBe(true);
      expect(debitarInscricao(teto)).toBeNull(); // sem banca ligada
    }
  });
});
