// ---------------------------------------------------------------------------
// O veredito da sessão é MEDIDO (sim/_sessaoRun.test.ts). Estes testes guardam
// que ele não vira palpite: usa a régua do mundo certo, não extrapola as caudas
// e não esconde o achado duro — no dinheiro real a sessão típica é NEGATIVA.
// ---------------------------------------------------------------------------
import { beforeEach, describe, expect, it } from "vitest";
import {
  MENOR_SESSAO,
  MAIOR_SESSAO,
  abrirSessao,
  carregarSessao,
  faixaDaSessao,
  fecharSessao,
  progressoDaSessao,
  registrarTorneio,
  vereditoDaSessao,
} from "./sessao";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
  clear() { this.data.clear(); }
}
beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
  });
});

describe("O achado que a tela não pode esconder", () => {
  it("no DINHEIRO REAL a mediana é negativa em TODOS os tamanhos de sessão", () => {
    for (const n of [5, 10, 15, 20, 30, 40, 60, 100]) {
      expect(faixaDaSessao(n, "real").p50).toBeLessThan(0);
    }
  });

  it("no APP, sem rake, a mediana vira positiva em sessão grande", () => {
    expect(faixaDaSessao(10, "app").p50).toBeLessThan(0);
    expect(faixaDaSessao(60, "app").p50).toBeGreaterThan(0);
  });

  it("a sessão termina no vermelho na MAIORIA das vezes, nos dois mundos", () => {
    expect(faixaDaSessao(10, "real").vermelho).toBeGreaterThan(50);
    expect(faixaDaSessao(10, "app").vermelho).toBeGreaterThan(50);
  });

  it("o rake desloca a faixa inteira para baixo", () => {
    for (const n of [10, 40, 100]) {
      const app = faixaDaSessao(n, "app");
      const real = faixaDaSessao(n, "real");
      expect(real.p50).toBeLessThan(app.p50);
      expect(real.p90).toBeLessThan(app.p90);
    }
  });
});

describe("A faixa", () => {
  it("é sempre crescente nos percentis", () => {
    for (const mundo of ["app", "real"] as const) {
      for (const n of [5, 12, 33, 77, 100]) {
        const f = faixaDaSessao(n, mundo);
        expect(f.p10).toBeLessThanOrEqual(f.p25);
        expect(f.p25).toBeLessThanOrEqual(f.p50);
        expect(f.p50).toBeLessThanOrEqual(f.p75);
        expect(f.p75).toBeLessThanOrEqual(f.p90);
      }
    }
  });

  it("abre conforme a sessão cresce — mais torneios, mais extremos possíveis", () => {
    const pequena = faixaDaSessao(10, "app");
    const grande = faixaDaSessao(60, "app");
    expect(grande.p90 - grande.p10).toBeGreaterThan(pequena.p90 - pequena.p10);
  });

  it("não inventa fora da faixa simulada — avisa e usa a ponta", () => {
    expect(faixaDaSessao(2, "app").foraDaFaixa).toBe(true);
    expect(faixaDaSessao(400, "app").foraDaFaixa).toBe(true);
    expect(faixaDaSessao(2, "app").p50).toBe(faixaDaSessao(MENOR_SESSAO, "app").p50);
    expect(faixaDaSessao(400, "app").p50).toBe(faixaDaSessao(MAIOR_SESSAO, "app").p50);
    expect(faixaDaSessao(20, "app").foraDaFaixa).toBe(false);
  });
});

describe("O veredito", () => {
  it("um dia na mediana cai no percentil 50 e é NORMAL", () => {
    const f = faixaDaSessao(20, "app");
    const v = vereditoDaSessao(20, f.p50, "app");
    expect(v.percentil).toBe(50);
    expect(v.onde).toBe("normal");
    expect(v.dentroDoNormal).toBe(true);
  });

  it("um dia muito ruim ainda pode estar DENTRO do normal", () => {
    const f = faixaDaSessao(20, "app");
    const v = vereditoDaSessao(20, f.p10, "app");
    expect(v.onde).toBe("ruim");
    expect(v.dentroDoNormal).toBe(true); // o acaso explica sozinho
  });

  it("as caudas não ganham percentil inventado", () => {
    const f = faixaDaSessao(20, "app");
    const baixo = vereditoDaSessao(20, f.p10 - 50, "app");
    const alto = vereditoDaSessao(20, f.p90 + 50, "app");
    expect(baixo.onde).toBe("abaixo_de_tudo");
    expect(baixo.percentil).toBeUndefined();
    expect(baixo.dentroDoNormal).toBe(false);
    expect(alto.onde).toBe("acima_de_tudo");
    expect(alto.percentil).toBeUndefined();
  });

  it("usa a régua do MUNDO certo — o mesmo dia muda de veredito", () => {
    const resultado = -1.5;
    const noApp = vereditoDaSessao(40, resultado, "app");
    const noReal = vereditoDaSessao(40, resultado, "real");
    expect(noReal.percentil!).toBeGreaterThan(noApp.percentil!);
  });
});

describe("A sessão aberta", () => {
  it("sem sessão aberta, nada é contado", () => {
    expect(registrarTorneio(3)).toBeNull();
    expect(carregarSessao()).toBeNull();
  });

  it("conta torneios e soma o resultado", () => {
    abrirSessao(10);
    registrarTorneio(-1);
    registrarTorneio(-1);
    registrarTorneio(8);
    const s = carregarSessao()!;
    expect(s.jogados).toBe(3);
    expect(s.resultado).toBe(6);
    const p = progressoDaSessao(s);
    expect(p.faltam).toBe(7);
    expect(p.pct).toBe(30);
    expect(p.completa).toBe(false);
  });

  it("completa quando bate o planejado, e não trava se passar", () => {
    abrirSessao(5);
    for (let i = 0; i < 7; i++) registrarTorneio(-1);
    const p = progressoDaSessao(carregarSessao()!);
    expect(p.jogados).toBe(7);
    expect(p.completa).toBe(true);
    expect(p.faltam).toBe(0);
    expect(p.pct).toBe(100);
  });

  it("o plano é preso à faixa que a simulação cobre", () => {
    expect(abrirSessao(1).planejados).toBe(MENOR_SESSAO);
    expect(abrirSessao(9999).planejados).toBe(MAIOR_SESSAO);
  });

  it("fechar some com a sessão — nada recomeça sozinho", () => {
    abrirSessao(10);
    fecharSessao();
    expect(carregarSessao()).toBeNull();
    expect(registrarTorneio(5)).toBeNull();
  });
});
