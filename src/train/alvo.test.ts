// ---------------------------------------------------------------------------
// O ALVO é a única coisa do app que TEM FIM. Estes testes guardam exatamente
// isso: que ele para de contar, que não recomeça sozinho, e que o contra-placar
// impede o alvo de ensinar o vazamento oposto.
// ---------------------------------------------------------------------------
import { beforeEach, describe, expect, it } from "vitest";
import {
  SPOTS_DO_ALVO,
  METADE_DO_ALVO,
  alvoNovo,
  carregarAlvo,
  comecarAlvo,
  limparAlvo,
  fecharAlvo,
  registrarNoAlvo,
  progressoDoAlvo,
  placarDoAlvo,
  evolucaoDoAlvo,
  diferencaSaiDoRuido,
  type EntradaDoAlvo,
} from "./alvo";

const ESCALOU: EntradaDoAlvo = { adviceFam: "aggro", heroFam: "aggro" };
const PASSOU: EntradaDoAlvo = { adviceFam: "aggro", heroFam: "call" };
const EXAGEROU: EntradaDoAlvo = { adviceFam: "call", heroFam: "aggro" };
const NEUTRA: EntradaDoAlvo = { adviceFam: "fold", heroFam: "fold" };

function rodar(entradas: EntradaDoAlvo[]) {
  for (const e of entradas) registrarNoAlvo(e);
  return carregarAlvo()!;
}
function repetir(e: EntradaDoAlvo, n: number): EntradaDoAlvo[] {
  return Array.from({ length: n }, () => e);
}

// Mesmo stub de armazenamento usado em `progress.test.ts` (o ambiente da suíte
// é "node", sem localStorage).
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

describe("O alvo tem FIM", () => {
  it("sem ciclo aberto, não conta nada e o app segue normal", () => {
    expect(registrarNoAlvo(ESCALOU)).toBeNull();
    expect(carregarAlvo()).toBeNull();
  });

  it("para de contar quando a barra enche — e não recomeça sozinho", () => {
    comecarAlvo();
    rodar(repetir(ESCALOU, SPOTS_DO_ALVO));
    const cheio = carregarAlvo()!;
    expect(cheio.spots).toBe(SPOTS_DO_ALVO);
    expect(cheio.concluidoEm).toBeTruthy();

    // mais 50 decisões depois do fim: NADA muda.
    rodar(repetir(ESCALOU, 50));
    const depois = carregarAlvo()!;
    expect(depois.spots).toBe(SPOTS_DO_ALVO);
    expect(depois.escalou).toBe(SPOTS_DO_ALVO);
    expect(depois.decisoes).toBe(cheio.decisoes);
  });

  it("fechar é fim de verdade, e só vale em ciclo concluído", () => {
    comecarAlvo();
    rodar(repetir(ESCALOU, 10));
    expect(fecharAlvo()?.fechadoEm).toBeUndefined(); // ainda não encheu

    rodar(repetir(ESCALOU, SPOTS_DO_ALVO - 10));
    const fechado = fecharAlvo()!;
    expect(fechado.fechadoEm).toBeTruthy();
    expect(progressoDoAlvo(fechado).fechado).toBe(true);
  });

  it("só começa por ação explícita — nada no app abre um ciclo sozinho", () => {
    expect(carregarAlvo()).toBeNull();
    const a = comecarAlvo();
    expect(a.spots).toBe(0);
    limparAlvo();
    expect(carregarAlvo()).toBeNull();
  });
});

describe("O que o alvo conta", () => {
  it("conta como spot só quando o padrão mandou ESCALAR", () => {
    comecarAlvo();
    const a = rodar([ESCALOU, PASSOU, EXAGEROU, NEUTRA]);
    expect(a.decisoes).toBe(4);
    expect(a.spots).toBe(2); // ESCALOU e PASSOU
    expect(a.escalou).toBe(1);
  });

  it("CONTRA-PLACAR: escalar quando o padrão não pedia é falha, não progresso", () => {
    comecarAlvo();
    const a = rodar(repetir(EXAGEROU, 12));
    expect(a.spots).toBe(0); // a barra NÃO anda
    expect(a.escalouDemais).toBe(12);
    const p = placarDoAlvo(a);
    expect(p.falhasExcesso).toBe(12);
    expect(p.eixo).toBe("excessivo");
  });

  it("separa as mãos jogadas sem dica na tela", () => {
    comecarAlvo();
    const a = rodar([
      { ...ESCALOU, semDica: true },
      { ...PASSOU, semDica: true },
      { ...ESCALOU, semDica: false },
    ]);
    expect(a.spots).toBe(3);
    expect(a.escalou).toBe(2);
    expect(a.spotsSozinho).toBe(2);
    expect(a.escalouSozinho).toBe(1);
    expect(placarDoAlvo(a).taxaSozinho).toBeCloseTo(0.5, 5);
  });

  it("congela a primeira metade na marca, e só uma vez", () => {
    comecarAlvo();
    rodar(repetir(ESCALOU, METADE_DO_ALVO - 1));
    expect(carregarAlvo()!.primeira).toBeUndefined();
    rodar([ESCALOU]);
    const a = carregarAlvo()!;
    expect(a.primeira).toEqual({ spots: METADE_DO_ALVO, escalou: METADE_DO_ALVO });
    rodar(repetir(PASSOU, 10));
    expect(carregarAlvo()!.primeira).toEqual({ spots: METADE_DO_ALVO, escalou: METADE_DO_ALVO });
  });
});

describe("O placar testa a tese do SharkScope dentro do app", () => {
  it("falha majoritariamente por PASSAR a mão lê como passivo", () => {
    comecarAlvo();
    const a = rodar([...repetir(PASSOU, 8), ...repetir(EXAGEROU, 2), ...repetir(ESCALOU, 10)]);
    const p = placarDoAlvo(a);
    expect(p.falhasPassivas).toBe(8);
    expect(p.falhasExcesso).toBe(2);
    expect(p.eixo).toBe("passivo");
    expect(p.pesoPassivo).toBeCloseTo(0.8, 5);
    expect(p.taxaEscalada).toBeCloseTo(10 / 18, 5);
  });

  it("falhas repartidas leem como equilibrado — o app não força o diagnóstico", () => {
    comecarAlvo();
    const p = placarDoAlvo(rodar([...repetir(PASSOU, 5), ...repetir(EXAGEROU, 5)]));
    expect(p.eixo).toBe("equilibrado");
  });

  it("sem falha nenhuma, não inventa eixo", () => {
    comecarAlvo();
    const p = placarDoAlvo(rodar(repetir(ESCALOU, 6)));
    expect(p.eixo).toBe("limpo");
    expect(p.pesoPassivo).toBeUndefined();
  });
});

describe("Evolução só fala quando sai do ruído", () => {
  it("não existe antes de o ciclo concluir", () => {
    comecarAlvo();
    expect(evolucaoDoAlvo(rodar(repetir(ESCALOU, METADE_DO_ALVO + 5)))).toBeUndefined();
  });

  it("compara as duas metades no ciclo concluído", () => {
    comecarAlvo();
    rodar([...repetir(PASSOU, METADE_DO_ALVO), ...repetir(ESCALOU, METADE_DO_ALVO)]);
    const ev = evolucaoDoAlvo(carregarAlvo()!)!;
    expect(ev.primeira).toBe(0);
    expect(ev.segunda).toBe(1);
    expect(ev.saiDoRuido).toBe(true);
  });

  it("uma diferença pequena NÃO é chamada de evolução", () => {
    // 50 spots por metade, 35/50 (70%) → 36/50 (72%): dentro do ruído.
    expect(diferencaSaiDoRuido(35, 50, 36, 50)).toBe(false);
    // 25/50 (50%) → 40/50 (80%): sai do ruído.
    expect(diferencaSaiDoRuido(25, 50, 40, 50)).toBe(true);
  });

  it("o corte com 50 por metade fica em ~18 pontos — o alvo não promete mais", () => {
    expect(diferencaSaiDoRuido(35, 50, 43, 50)).toBe(false); // 70% → 86%
    expect(diferencaSaiDoRuido(35, 50, 44, 50)).toBe(true);  // 70% → 88%
  });

  it("extremos: 0% → 100% é a MAIOR diferença possível, nunca ruído", () => {
    // Na fórmula crua a variância zera nos extremos e isto dava "ruído" —
    // foi o bug que o ajuste de Agresti-Caffo veio consertar.
    expect(diferencaSaiDoRuido(0, 50, 50, 50)).toBe(true);
  });

  it("amostra minúscula não vira conclusão", () => {
    expect(diferencaSaiDoRuido(0, 2, 2, 2)).toBe(false);
    expect(diferencaSaiDoRuido(0, 0, 0, 0)).toBe(false);
  });
});

describe("Progresso", () => {
  it("estima quantos torneios faltam pela régua medida", () => {
    const a = { ...alvoNovo(), spots: 40 };
    const p = progressoDoAlvo(a);
    expect(p.feito).toBe(40);
    expect(p.faltam).toBe(60);
    expect(p.pct).toBe(40);
    expect(p.torneiosMin).toBe(2); // 60 / 31 spots por torneio
    expect(p.torneiosMax).toBe(6); // 60 / 11 spots por torneio
  });

  it("não passa de 100% nem mostra faltando negativo", () => {
    const p = progressoDoAlvo({ ...alvoNovo(), spots: SPOTS_DO_ALVO + 30 });
    expect(p.feito).toBe(SPOTS_DO_ALVO);
    expect(p.faltam).toBe(0);
    expect(p.pct).toBe(100);
  });
});
