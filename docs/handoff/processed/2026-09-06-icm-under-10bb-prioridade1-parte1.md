# Lote — Playing Under 10bb Part 2: ICM — Prioridade 1 / Parte 1

Fonte oficial: GTO Wizard Blog, Barry Carter, 2026-07-13.

Regras aplicadas: nenhuma frequência mista estimada por cor; barra parcial fica em notes; contexto incompleto permanece EVIDÊNCIA e não deve dirigir live.

```ts
[
  {
    id: "BUB1_HJ8_RFI",
    node: "HJ_RFI",
    evidence: { level: "CERTIFIED", solver: "GTO_WIZARD", note: "Artigo 'Playing Under 10bb – Part 2: ICM', imagens 1-2" },
    context: {
      format: "VANILLA", stage: "BUBBLE",
      positions: ["UTG","UTG1","LJ","HJ","CO","BTN","SB","BB"],
      stacksBB: { UTG: 32, UTG1: 14, LJ: 29, HJ: 8, CO: 17, BTN: 23, SB: 10.5, BB: 25 },
      effectiveStackBB: 8,
      coverage: [
        { covers: "UTG", covered: "HJ" }, { covers: "UTG1", covered: "HJ" },
        { covers: "LJ", covered: "HJ" }, { covers: "CO", covered: "HJ" },
        { covers: "BTN", covered: "HJ" }, { covers: "SB", covered: "HJ" },
        { covers: "BB", covered: "HJ" }
      ]
    },
    priorActions: [],
    tolerance: 0.005,
    handActionFreq: {},
    notes: [
      "Setup visual: HJ 8bb; UTG32/UTG1 14/LJ29/CO17/BTN23/SB10.5/BB25; ante 1bb.",
      "Texto: shove global ICM 12% versus 30% ChipEV; 12% é barra parcial e por isso não foi colocado em actionFreq.",
      "Risk Premium do stack de 8bb: 18.9%.",
      "Existe pequeno range de open não-all-in dentro do range de shove; AA quer induzir e os bluffs são majoritariamente Ax.",
      "Como a imagem não permite separar com segurança todos os tons de open vs shove por célula, nenhuma célula foi promovida por cor. EVIDÊNCIA até obter leitura inequívoca das células."
    ]
  },
  {
    id: "BUB2_CO4_RFI",
    node: "CO_RFI",
    evidence: { level: "CERTIFIED", solver: "GTO_WIZARD", note: "Artigo 'Playing Under 10bb – Part 2: ICM', imagens 3-4" },
    context: {
      format: "VANILLA", stage: "BUBBLE",
      positions: ["UTG","UTG1","LJ","HJ","CO","BTN","SB","BB"],
      stacksBB: { UTG: 24, UTG1: 18, LJ: 22, HJ: 50, CO: 4, BTN: 12, SB: 13.5, BB: 15 },
      effectiveStackBB: 4,
      coverage: [
        { covers: "UTG", covered: "CO" }, { covers: "UTG1", covered: "CO" },
        { covers: "LJ", covered: "CO" }, { covers: "HJ", covered: "CO" },
        { covers: "BTN", covered: "CO" }, { covers: "SB", covered: "CO" },
        { covers: "BB", covered: "CO" }
      ]
    },
    priorActions: [],
    tolerance: 0.005,
    handActionFreq: {},
    notes: [
      "Setup visual: CO 4bb; UTG24/UTG1 18/LJ22/HJ50/BTN12/SB13.5/BB15; ante 1bb.",
      "Risk Premium do CO: 19.2%.",
      "Texto afirma que o CO empurra mais amplo que o HJ 8bb do exemplo anterior, apesar do RP maior.",
      "Nenhuma frequência global ou mistura por mão foi inferida visualmente. EVIDÊNCIA até obter células inequivocamente legíveis."
    ]
  },
  {
    id: "BUB3_LJ8_VS_UTG1_SHOVE",
    node: "LJ_VS_UTG1_SHOVE",
    evidence: { level: "CERTIFIED", solver: "GTO_WIZARD", note: "Artigo 'Playing Under 10bb – Part 2: ICM', imagens 26-28" },
    context: { format: "VANILLA", stage: "BUBBLE", positions: ["UTG1","LJ"], stacksBB: { UTG1: 11, LJ: 8 }, effectiveStackBB: 8, coverage: [{ covers: "UTG1", covered: "LJ" }] },
    priorActions: ["UTG1_SHOVE"],
    tolerance: 0.005,
    handActionFreq: { TT: { fold: 1 }, AQs: { fold: 1 } },
    notes: [
      "TT e AQs são folds declarados explicitamente pelo texto; não inferidos por cor.",
      "Texto cita 99/AJs como mãos que humanos tenderiam a pagar largo demais, mas não foram promovidas sem declaração numérica/pura.",
      "LJ tem Risk Premium de aproximadamente 15% contra cada jogador; texto traduz isso em ~65% equity necessária antes do dead money.",
      "Estrutura completa de payouts não foi recuperada desta passagem; manter fora do matching live ICM exato até completar."
    ]
  },
  {
    id: "BUB4_HJ8_VS_OPEN",
    node: "HJ_VS_OPEN",
    evidence: { level: "CERTIFIED", solver: "GTO_WIZARD", note: "Artigo 'Playing Under 10bb – Part 2: ICM', imagens 31-32" },
    context: { format: "VANILLA", stage: "BUBBLE", positions: ["OPENER","HJ"], stacksBB: { HJ: 8 }, effectiveStackBB: 8, coverage: [] },
    priorActions: ["OPEN_2BB"],
    tolerance: 0.005,
    handActionFreq: {},
    notes: [
      "Texto: quando HJ continua, sempre usa shove para maximizar fold equity; range forte e linear.",
      "Isso não significa shove 100% das 169 mãos e não foi convertido em actionFreq.",
      "Stack/posição exata do opener e demais stacks não ficaram legíveis nesta passagem. EVIDÊNCIA, não PRONTO-PRO-LIVE."
    ]
  },
  {
    id: "FT8_BB8_VS_UTG_OPEN",
    node: "BB_VS_UTG_OPEN",
    evidence: { level: "CERTIFIED", solver: "GTO_WIZARD", note: "Artigo 'Playing Under 10bb – Part 2: ICM', imagens 39-40" },
    context: { format: "VANILLA", stage: "FINAL_TABLE", positions: ["UTG","BB"], stacksBB: { BB: 8 }, effectiveStackBB: 8, coverage: [] },
    priorActions: ["UTG_RAISE_2BB"],
    tolerance: 0.005,
    handActionFreq: {},
    notes: [
      "Texto: defesa BB 8bb é muito mais tight que ChipEV e perde as weak suited hands que tipicamente dariam call.",
      "Stack de UTG e demais stacks não foram recuperados com clareza nesta passagem. EVIDÊNCIA, não PRONTO-PRO-LIVE."
    ]
  }
]
```

## Pendências explícitas deste artigo

Continuar Prioridade 1 buscando os setups/imagens dos nodes restantes: FT UTG 8bb RFI; FT UTG 2bb RFI; LJ 8bb vs UTG1 10bb shove; LJ 8bb vs 2bb open; LJ 4bb vs 2bb open; BB 4bb vs UTG 2bb. Não promover célula por cor quando a ação/tom não estiver inequívoco.

---
## ✅ Processado por Claude (2026-09-06)
- **Reenvio dos mesmos 5 spots** (BUB1, BUB2, BUB3, BUB4, FT8) com notas mais
  ricas (risk premiums, ante), mas **sem células puras novas nem contextos
  completados**.
- **BUB3** já estava na biblioteca live (`blindBattleHands.ts`).
- **BUB1/BUB2/BUB4/FT8** já estão no banco de evidências — continuam EVIDÊNCIA
  (sem células / contexto incompleto). Nada novo entrou no jogo.
- **Falta (o que realmente vira melhoria):** as **células puras** por mão desses
  nós + os **stacks que faltam** (OPENER do BUB4, UTG do FT8), e os nós pendentes
  do artigo. Sem isso, ficam como evidência.
