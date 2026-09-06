> ✅ **PROCESSADO pelo Claude (2026-09-06).** Os 3 fixtures foram validados,
> classificados como **LIVE_READY** (contexto completo + células puras) e guardados
> em `src/v3/benchmarks/icmShortStack.ts`. O auditor "V2 × gabarito" foi estendido
> pra cobrir os nós de anel completo (`HJ_RFI`, `CO_RFI`, `BB_VS_UTG_RAISE`).
>
> **Resultado da auditoria:**
> - `BUB1_HJ8_RFI_PURE` (HJ 8bb): **12/12 concorda** — o V2 já empurra os premium e
>   folda o lixo igual ao solver (chipEV coincide nas células puras).
> - `BUB2_CO4_RFI_PURE` (CO 4bb): **12/12 concorda** — idem.
> - `FT_BB4_VS_UTG2_PURE` (BB 4bb vs UTG open, mesa final): **16 concorda / 9 diverge.**
>   As 9 divergências são **dirigidas por ICM**, não bug cru: nos suited (KJs/KTs/QJs/
>   QTs/JTs/T9s/98s) o solver **paga** e o V2 **empurra**; nos offsuit K9o/Q8o o solver
>   **folda** e o V2 **empurra**. É o caso clássico onde o V3 (com a premiação) vai ligar
>   a resposta certa no live — não "apertamos" o V2 no escuro.
>
> Nenhuma mudança no app/`dist` neste lote (só ferramenta/fixtures/docs do V3).
> Pendências (BUB4, FT UTG/LJ/BB sem setup) seguem no `REQUESTS.md`, Prioridade 1.

# Motor V3 — Prioridade 1 — células puras / contexto fechado

Fonte principal: GTO Wizard, Barry Carter, **“Playing Under 10bb – Part 2: ICM”** (13 Jul 2026).

Regra usada neste lote: só entram em `handActionFreq` células que a grade permite classificar como puras sem estimar frequência. Células visualmente mistas/ambíguas foram omitidas.

```ts
[
  {
    id: "BUB1_HJ8_RFI_PURE",
    node: "HJ_RFI",
    evidence: {
      level: "CERTIFIED",
      solver: "GTO_WIZARD",
      note: "Artigo 'Playing Under 10bb – Part 2: ICM', imagens 1-2 (setup + grade ICM do HJ 8bb)"
    },
    context: {
      format: "VANILLA",
      stage: "BUBBLE",
      positions: ["UTG", "UTG1", "LJ", "HJ", "CO", "BTN", "SB", "BB"],
      stacksBB: {
        UTG: 32,
        UTG1: 14,
        LJ: 29,
        HJ: 8,
        CO: 17,
        BTN: 23,
        SB: 10.5,
        BB: 25
      },
      effectiveStackBB: 8,
      coverage: [
        { covers: "UTG", covered: "HJ" },
        { covers: "UTG1", covered: "HJ" },
        { covers: "LJ", covered: "HJ" },
        { covers: "CO", covered: "HJ" },
        { covers: "BTN", covered: "HJ" },
        { covers: "SB", covered: "HJ" },
        { covers: "BB", covered: "HJ" }
      ]
    },
    priorActions: [],
    tolerance: 0.005,
    handActionFreq: {
      AKs: { shove: 1 },
      AQs: { shove: 1 },
      AKo: { shove: 1 },
      KK: { shove: 1 },
      QQ: { shove: 1 },
      JJ: { shove: 1 },
      TT: { shove: 1 },
      "72o": { fold: 1 },
      "62o": { fold: 1 },
      "52o": { fold: 1 },
      "42o": { fold: 1 },
      "32o": { fold: 1 }
    },
    notes: [
      "1bb ante no setup.",
      "Artigo informa Risk Premium do short stack de 18.9%.",
      "Artigo informa shove global ICM de 12%, mas barra parcial não foi copiada para actionFreq.",
      "AA foi deliberadamente omitido: o texto diz que prefere induzir com open não-all-in, portanto não foi tratado como shove puro.",
      "Demais células não foram promovidas quando havia qualquer dúvida de mistura entre shove/open/fold."
    ]
  },

  {
    id: "BUB2_CO4_RFI_PURE",
    node: "CO_RFI",
    evidence: {
      level: "CERTIFIED",
      solver: "GTO_WIZARD",
      note: "Artigo 'Playing Under 10bb – Part 2: ICM', imagens 3-4 (setup + grade ICM do CO 4bb)"
    },
    context: {
      format: "VANILLA",
      stage: "BUBBLE",
      positions: ["UTG", "UTG1", "LJ", "HJ", "CO", "BTN", "SB", "BB"],
      stacksBB: {
        UTG: 24,
        UTG1: 18,
        LJ: 22,
        HJ: 50,
        CO: 4,
        BTN: 12,
        SB: 13.5,
        BB: 15
      },
      effectiveStackBB: 4,
      coverage: [
        { covers: "UTG", covered: "CO" },
        { covers: "UTG1", covered: "CO" },
        { covers: "LJ", covered: "CO" },
        { covers: "HJ", covered: "CO" },
        { covers: "BTN", covered: "CO" },
        { covers: "SB", covered: "CO" },
        { covers: "BB", covered: "CO" }
      ]
    },
    priorActions: [],
    tolerance: 0.005,
    handActionFreq: {
      AKs: { shove: 1 },
      AQs: { shove: 1 },
      AKo: { shove: 1 },
      KK: { shove: 1 },
      QQ: { shove: 1 },
      JJ: { shove: 1 },
      TT: { shove: 1 },
      "72o": { fold: 1 },
      "62o": { fold: 1 },
      "52o": { fold: 1 },
      "42o": { fold: 1 },
      "32o": { fold: 1 }
    },
    notes: [
      "1bb ante no setup.",
      "Risk Premium do CO informado pelo artigo: 19.2%.",
      "Somente células inequivocamente puras foram transcritas; fronteiras/misturas foram omitidas."
    ]
  },

  {
    id: "FT_BB4_VS_UTG2_PURE",
    node: "BB_VS_UTG_RAISE",
    evidence: {
      level: "CERTIFIED",
      solver: "GTO_WIZARD",
      note: "Artigo 'Playing Under 10bb – Part 2: ICM', imagens 28-29; link da própria fonte para a solução GTO Wizard expõe stacks=17.125-35.125-48.125-24.125-39.125-45.125-22.125-4.125 e preflop_actions=R2-F-F-F-F-F-F-C"
    },
    context: {
      format: "VANILLA",
      stage: "FINAL_TABLE",
      positions: ["UTG", "UTG1", "LJ", "HJ", "CO", "BTN", "SB", "BB"],
      stacksBB: {
        UTG: 17.125,
        UTG1: 35.125,
        LJ: 48.125,
        HJ: 24.125,
        CO: 39.125,
        BTN: 45.125,
        SB: 22.125,
        BB: 4.125
      },
      effectiveStackBB: 4.125,
      coverage: [
        { covers: "UTG", covered: "BB" },
        { covers: "UTG1", covered: "BB" },
        { covers: "LJ", covered: "BB" },
        { covers: "HJ", covered: "BB" },
        { covers: "CO", covered: "BB" },
        { covers: "BTN", covered: "BB" },
        { covers: "SB", covered: "BB" }
      ]
    },
    priorActions: ["UTG_RAISE_2"],
    tolerance: 0.005,
    handActionFreq: {
      AKs: { shove: 1 },
      AQs: { shove: 1 },
      AJs: { shove: 1 },
      AKo: { shove: 1 },
      AQo: { shove: 1 },
      KK: { shove: 1 },
      QQ: { shove: 1 },
      JJ: { shove: 1 },
      TT: { shove: 1 },

      KJs: { call: 1 },
      KTs: { call: 1 },
      QJs: { call: 1 },
      QTs: { call: 1 },
      JTs: { call: 1 },
      T9s: { call: 1 },
      "98s": { call: 1 },

      K9o: { fold: 1 },
      Q8o: { fold: 1 },
      J8o: { fold: 1 },
      T8o: { fold: 1 },
      "72o": { fold: 1 },
      "62o": { fold: 1 },
      "52o": { fold: 1 },
      "42o": { fold: 1 },
      "32o": { fold: 1 }
    },
    notes: [
      "O artigo arredonda o BB para 4bb no título; o link da solução expõe 4.125bb e foi usado como contexto exato.",
      "Open de UTG é 2bb.",
      "Células com divisão de cor na grade foram omitidas; só foram registradas regiões visualmente puras e inequívocas."
    ]
  }
]
```

## Pendências que NÃO foram promovidas

Os seguintes setups/ranges pertencem ao mesmo artigo e foram revisitados, mas os arquivos de imagem específicos do blog não ficaram recuperáveis de forma confiável nesta passagem (o endpoint retornou `Internal Error`/`Cache miss`). Por isso **não inventei os stacks nem promovi células**:

- BUB4 — HJ 8bb vs open 2bb: falta recuperar a imagem 18 (setup) e 19-1 (grade) para confirmar stack/posição do opener e células puras.
- FT UTG 8bb RFI: imagens 5-6 indisponíveis nesta passagem.
- FT UTG 2bb RFI: imagens 9-10 indisponíveis nesta passagem.
- FT LJ 8bb vs 10bb shove: setup/range da família final-table não foi recuperado com contexto completo suficiente para live.
- FT LJ 8bb vs open 2bb: imagens 22-23 indisponíveis nesta passagem.
- FT LJ 4bb vs open 2bb: a grade (imagem 25) ficou visível, mas o setup (imagem 24) não; sem stack do opener não é PRONTO-PRO-LIVE.
- FT BB 8bb vs UTG 2bb: a grade (imagem 27) ficou visível, mas o setup (imagem 26) não; sem stack do UTG não é PRONTO-PRO-LIVE.

Esses nodes devem permanecer fora do matching live até o contexto exato ser recuperado.
