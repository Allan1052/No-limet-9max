# Motor V3 — Prioridade 2 — Blind Battle SB×BB — lote 1

Fontes oficiais GTO Wizard auditadas neste lote:
- Andrew Brokos, **“ICM and Blind Battles: The Small Blind”**, 1 May 2023.
- Andrew Brokos, **“ICM and Blind Battles: The Big Blind”**, 2 May 2023.
- Andrew Brokos, **“Aggregate Flop Strategy: SB C-Betting in SRP”**, 29 Apr 2024 (usado apenas para procurar stacks/nodes adicionais; não promove contexto ChipEV sem estágio compatível com o schema live).

Regra aplicada: `handActionFreq` contém somente células cuja ação 100% pode ser confirmada na grade. Nenhuma frequência mista foi estimada pela largura de cor.

```ts
[
  {
    id: "BB40_ITM25_VS_SB3_PURE",
    node: "BB_VS_SB_RAISE",
    evidence: {
      level: "CERTIFIED",
      solver: "GTO_WIZARD",
      note: "Artigo 'ICM and Blind Battles: The Small Blind', seção 'BB Response to SB Open: 40bb Stacks, 25% of Field Remaining', imagem 7. O painel numérico da imagem confirma J3o: Allin 0 / Raise 7.5 0 / Call 100 / Fold 0 em todos os quatro combos. A barra do node mostra Allin 40 = 0%, Raise 7.5 = 13%, Call = 52%, Fold = 35%."
    },
    context: {
      format: "VANILLA",
      stage: "IN_THE_MONEY",
      fieldRemainingPct: 25,
      positions: ["SB", "BB"],
      stacksBB: { SB: 40, BB: 40 },
      effectiveStackBB: 40,
      coverage: []
    },
    priorActions: ["SB_RAISE_3"],
    actionFreq: { raise: 0.13, call: 0.52, fold: 0.35 },
    actionSizing: { raise: [{ sizeBB: 7.5, freq: 1 }] },
    tolerance: 0.005,
    handActionFreq: {
      AA:  { raise: 1 },
      AKs: { raise: 1 },
      AQs: { raise: 1 },
      KK:  { raise: 1 },
      QQ:  { raise: 1 },
      JJ:  { raise: 1 },

      J3o: { call: 1 },

      Q3o: { fold: 1 },
      T3o: { fold: 1 },
      "93o": { fold: 1 },
      "83o": { fold: 1 },
      "73o": { fold: 1 },
      "63o": { fold: 1 },
      "53o": { fold: 1 },
      "43o": { fold: 1 },
      Q2o: { fold: 1 },
      J2o: { fold: 1 },
      T2o: { fold: 1 },
      "92o": { fold: 1 },
      "82o": { fold: 1 },
      "72o": { fold: 1 },
      "62o": { fold: 1 },
      "52o": { fold: 1 },
      "42o": { fold: 1 },
      "32o": { fold: 1 }
    },
    notes: [
      "J3o é a célula de maior confiança do lote: o painel HANDS mostra os quatro combos individualmente e todos são Call 100%.",
      "As demais células registradas são somente células visualmente uniformes na grade; qualquer célula com divisão visível foi omitida.",
      "A barra global é completa e soma 1.00; shove foi omitido de actionFreq porque a própria barra mostra 0%.",
      "O cabeçalho visual após o open mostra stacks remanescentes aproximados SB 37 / BB 39; o contexto inicial do artigo é explicitamente 40bb simétrico e é o valor usado em stacksBB."
    ]
  },

  {
    id: "BB20_FT_VS_SB3_PANEL_ANCHOR",
    node: "BB_VS_SB_RAISE",
    evidence: {
      level: "CERTIFIED",
      solver: "GTO_WIZARD",
      note: "Artigo 'ICM and Blind Battles: The Big Blind', imagem 5: BB response to a 3bb SB open at a 9-handed final table, 20bb effective. Fixture-âncora complementar ao FTBB4 já existente; não deve duplicar FTBB4 no live."
    },
    context: {
      format: "VANILLA",
      stage: "FINAL_TABLE",
      positions: ["SB", "BB"],
      stacksBB: { SB: 20, BB: 20 },
      effectiveStackBB: 20,
      coverage: []
    },
    priorActions: ["SB_RAISE_3"],
    tolerance: 0.005,
    handActionFreq: {},
    notes: [
      "NÃO é novo candidato live: o FTBB4 já cobre este node.",
      "Mantido apenas como âncora de auditoria visual: a imagem traz EVs por célula e cores de ação, mas não frequências por mão; por regra do REQUESTS nenhuma célula adicional foi promovida apenas pela cor.",
      "O texto oficial confirma que light red = 3-bet não all-in e que, sob ICM extremo, o BB desenvolve esse sizing polar."
    ]
  }
]
```

## Cobertura auditada e lacunas reais da fonte

A Prioridade 2 pede `SB_RFI` 15/20/25/30bb e `BB_VS_SB_RAISE` 15/25/30/40bb, além de `BB_VS_SB_LIMP`.

Nesta passagem, os dois artigos ICM oficiais fornecem contexto live exato para 40bb simétrico em várias fases, 20bb simétrico, 35bb FT, 30bb FT vs limp, SB19/BB30 FT e assimetrias 35/40 e 100/35. Eles **não publicam grades hand-level com frequências numéricas legíveis para todos os stacks 15/25/30 solicitados**.

Também foi auditado o artigo oficial **“Aggregate Flop Strategy: SB C-Betting in SRP”**. Ele possui grades pré-flop excelentes em ChipEV para 30bb e 20bb. Porém o schema live atual exige `stage` (`EARLY|MIDDLE|BUBBLE|IN_THE_MONEY|FINAL_TABLE`). Como a fonte diz ChipEV e não identifica um desses estágios, eu não converti ChipEV em `EARLY` por inferência. A grade 30bb de BB vs SB 3.5bb mostra barra completa (shove 6.4%, raise 9bb 4.8%, call 53.1%, fold 35.7%), mas fica fora deste arquivo de live até existir representação explícita de ChipEV no contexto ou uma fonte que fixe o estágio.

O artigo oficial **“Playing Limped Pots as the BB in MTTs”** mostra BB vs SB limp em 10bb e 25bb e descreve a estratégia pré-flop por stack. As imagens hand-level 10/25bb do blog retornaram erro nesta passagem, portanto não foram transcritas por memória/texto qualitativo.

### Resultado útil deste lote

- Novo candidato hand-certified: `BB40_ITM25_VS_SB3_PURE` — 40bb simétrico, 25% field, barra completa + 26 células puras conservadoras, incluindo J3o explicitamente 100% call nos quatro combos.
- 20bb FT foi auditado, mas não duplicado no live porque FTBB4 já existe.
- 15/25/30bb não receberam células inventadas: os buracos permanecem explícitos para a próxima fonte oficial/vídeo que mostre as frequências por mão.
