// ---------------------------------------------------------------------------
// A ESCADA DE DIFICULDADE EXISTE E SOBE — e cabe nas faixas publicadas.
//
// Pedido do Allan (15/09/2026): sentir a diferença entre as faixas, com o
// $10,3K bem difícil. Antes desta data `adjustProfileForBuyIn` não tocava em
// cbetFactor/barrelTurn/barrelRiver: o pós-flop do micro e o do elite eram
// idênticos. Este teste existe para isso não voltar a acontecer.
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { PROFILES, adjustProfileForBuyIn, profileById } from "./profiles";
import { fatoresPosFlop, alvoDaFaixa, ALVOS } from "./escadaDeBuyIn";
import { frequenciaAlvo } from "./checkRaise";

const FAIXAS = ALVOS.map((a) => a.buyIn);

describe("escada de dificuldade por buy-in", () => {
  it("a agressão pós-flop SOBE a cada degrau — nenhuma faixa empata", () => {
    for (const campo of ["cbet", "barrelTurn", "barrelRiver"] as const) {
      let anterior = -Infinity;
      for (const b of FAIXAS) {
        const v = fatoresPosFlop(b)[campo];
        expect(v, `${campo} não subiu de ${b}`).toBeGreaterThan(anterior);
        anterior = v;
      }
    }
  });

  it("o campo do 10,3K aperta mais que o do micro em todas as frentes", () => {
    // ⚠️ 16/09/2026 — a escada foi PUXADA PARA BAIXO depois do relato do Allan
    // jogando o $10.300 ("apostando em todas as streets", "4-bet light", "nem
    // parece um torneio de 10,3k"). Medido antes: o campo seguia no turn em
    // 84,4% das vezes e 55,2% das aberturas levavam 3-bet. Um campo caricato
    // não é um campo difícil — é um campo que não existe.
    // O que este teste guarda é a ORDEM (o topo é sempre o mais duro), não o
    // tamanho do salto: o tamanho é calibragem e vai mudar com a medição.
    for (const p of PROFILES) {
      const micro = adjustProfileForBuyIn(p, 5);
      const elite = adjustProfileForBuyIn(p, 10300);
      expect(elite.barrelTurn, `${p.name} barrelTurn`).toBeGreaterThan(micro.barrelTurn);
      expect(elite.barrelRiver, `${p.name} barrelRiver`).toBeGreaterThan(micro.barrelRiver);
      expect(elite.cbetFactor, `${p.name} cbet`).toBeGreaterThan(micro.cbetFactor);
      expect(elite.aggression, `${p.name} agressão`).toBeGreaterThan(micro.aggression);
      expect(elite.threeBetFactor, `${p.name} 3bet`).toBeGreaterThan(micro.threeBetFactor);
      expect(elite.defendFactor, `${p.name} defesa`).toBeGreaterThan(micro.defendFactor);
    }
  });

  it("o arquétipo continua sendo ele mesmo (a escada não achata os perfis)", () => {
    // Um "Paga-Tudo" de elite ainda é mais passivo que um "Furacão" de micro.
    const stationElite = adjustProfileForBuyIn(profileById("station"), 10300);
    const lagMicro = adjustProfileForBuyIn(profileById("lag"), 5);
    expect(stationElite.aggression).toBeLessThan(lagMicro.aggression);
    expect(stationElite.stickiness).toBeGreaterThan(lagMicro.stickiness);
  });

  it("o barrel do turn nunca passa de um teto sadio", () => {
    for (const p of PROFILES) {
      const elite = adjustProfileForBuyIn(p, 10300);
      expect(elite.barrelTurn).toBeLessThanOrEqual(0.95);
      expect(elite.barrelRiver).toBeLessThanOrEqual(0.9);
    }
  });

  it("a probabilidade de check-raise sobe do peixe ao reg de elite", () => {
    // ⚠️ `frequenciaAlvo` é a probabilidade POR SPOT de blefe, não a taxa
    // agregada que se mede na mesa. Os alvos agregados (e o que foi medido)
    // estão em escadaDeBuyIn.ts. Aqui checamos a ORDEM, que é o que não pode
    // quebrar: passivo < sólido < agressivo, e micro < elite dentro do perfil.
    const station = frequenciaAlvo(adjustProfileForBuyIn(profileById("station"), 5));
    const recreativo = frequenciaAlvo(adjustProfileForBuyIn(profileById("recreativo"), 5));
    const tagMicro = frequenciaAlvo(adjustProfileForBuyIn(profileById("tag"), 5));
    const tagElite = frequenciaAlvo(adjustProfileForBuyIn(profileById("tag"), 10300));
    const lagElite = frequenciaAlvo(adjustProfileForBuyIn(profileById("lag"), 10300));

    expect(station).toBeLessThan(recreativo);
    expect(recreativo).toBeLessThan(tagMicro);
    expect(tagMicro).toBeLessThan(tagElite);
    expect(tagElite).toBeLessThanOrEqual(lagElite);
    // Perfil passivo quase não check-raisa: o intercepto negativo da curva
    // existe para isso (sem ele o campo do micro dobrava o publicado).
    expect(station).toBeLessThanOrEqual(0.06);
  });

  it("cada faixa tem alvo declarado, e o topo é o mais duro", () => {
    // Faixa a faixa a comparação não se sustenta (entre $11 e $55 o campo é
    // dominado por ABC/nit e o check-raise fica plano — está medido e
    // documentado na escadaDeBuyIn.ts). O que não pode falhar é o EXTREMO.
    const micro = alvoDaFaixa(5);
    const elite = alvoDaFaixa(10300);
    expect(elite.checkRaiseFlop[0]).toBeGreaterThan(micro.checkRaiseFlop[0]);
    expect(elite.checkRaiseFlop[1]).toBeGreaterThan(micro.checkRaiseFlop[1]);
    expect(elite.cbetFlop[0]).toBeGreaterThan(micro.cbetFlop[0]);
    expect(elite.barrelTurn[1]).toBeGreaterThan(micro.barrelTurn[1]);
    expect(elite.rotulo).toBe("10,3K");
    expect(micro.rotulo).toBe("Micro");
    // Nenhum alvo pode encolher ao subir de faixa.
    let antes = micro;
    for (const b of FAIXAS.slice(1)) {
      const a = alvoDaFaixa(b);
      expect(a.checkRaiseFlop[1], `${b}`).toBeGreaterThanOrEqual(antes.checkRaiseFlop[1]);
      expect(a.cbetFlop[1], `${b}`).toBeGreaterThanOrEqual(antes.cbetFlop[1]);
      antes = a;
    }
  });

  it("sem buy-in (treino livre) nada é multiplicado", () => {
    const f = fatoresPosFlop(undefined);
    expect(f.cbet).toBe(1);
    expect(f.barrelTurn).toBe(1);
    expect(f.barrelRiver).toBe(1);
  });
});
