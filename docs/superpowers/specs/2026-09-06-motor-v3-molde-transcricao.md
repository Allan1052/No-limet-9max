# Motor V3 — Molde de Transcrição de Solver (pré-flop)

> Objetivo: transformar as grades do **GTO Wizard** (o material do canal) em
> **fixtures certificados** que o Motor V3 entende — de forma padronizada, à prova
> de erro e **sem inventar número**. Cada fixture novo é validado automaticamente
> e passa a alimentar o auditor "V2 × gabarito".

Este molde cobre o **schema pré-flop** (`ExternalBenchmarkFixture`), que é o que
pode **dirigir uma decisão ao vivo**. Pós-flop tem trilha própria (mais pra frente).

## Regras de ouro (não quebrar)
1. **Só o que está visível na grade do solver.** Nada de "parecido", nada de
   interpolar, nada de arredondar chute. Se não dá pra ler, não transcreve.
2. **Contexto exato.** Formato (VANILLA/PKO/MYSTERY_BOUNTY), estágio, stacks de
   cada posição, stack efetivo e quem cobre quem. É isso que faz o V3 casar (ou
   não) com o spot ao vivo.
3. **Fonte obrigatória.** Vídeo + minuto (ex.: `videoId` + `timestamp`) OU uma
   nota citando o artigo/imagem. Sem fonte, não é `CERTIFIED`.
4. **Frequências somam ~1** (o solver arredonda; a `tolerance` cobre isso).
5. **Mão-a-mão = o ouro.** As frequências GLOBAIS (barra do solver) sozinhas
   **não** dirigem o live. Pra o V3 assumir uma mão, precisa da **célula da mão**
   (`handActionFreq`). Célula PURA (uma ação em 100%) é a que o V3 usa primeiro;
   célula MISTA (frequências) fica registrada pra a trilha de estratégia mista.
6. **Ação ≠ tamanho.** Não crie ações como `raise3.5`. O tamanho vai em
   `actionSizing` (e `raise` é sempre o total, > 1bb).

## Vocabulário de ações
`fold` · `limp` · `raise` · `shove` · `check` · `call`

## O molde (copie e preencha)
```ts
{
  id: "BW6",                       // único, curtinho (família + número)
  node: "SB_RFI",                  // ex.: SB_RFI, BB_VS_SB_LIMP, BB_VS_SB_RAISE
  evidence: {
    level: "CERTIFIED",
    solver: "GTO_WIZARD",
    videoId: "YwMJwdM4Msc",        // id do vídeo
    timestamp: "12:34-13:00",      // trecho exato
    // ou, se for artigo/imagem: note: "Artigo 'ICM and Blind Battles', imagem 6"
  },
  context: {
    format: "PKO",                 // VANILLA | PKO | MYSTERY_BOUNTY
    stage: "IN_THE_MONEY",         // EARLY | MIDDLE | BUBBLE | IN_THE_MONEY | FINAL_TABLE
    fieldRemainingPct: 50,         // % do campo restante (se o solver mostrar)
    positions: ["SB", "BB"],
    stacksBB: { SB: 33, BB: 20 },  // stack de CADA posição, em bb
    effectiveStackBB: 20,          // o menor entre os dois
    coverage: [{ covers: "SB", covered: "BB" }], // quem cobre quem ([] se igual)
  },
  priorActions: [],                // ex.: ["SB_LIMP"] quando o node é vs-limp
  actionFreq: { shove: 0.180, raise: 0.250, limp: 0.439, fold: 0.131 }, // barra global
  actionSizing: { raise: [{ sizeBB: 3, freq: 1 }] },  // opcional; tamanho(s) do raise
  tolerance: 0.005,
  handActionFreq: {                // ← o OURO: célula por mão (o que dirige o live)
    A4s: { limp: 1 },              // pura
    K3s: { limp: 1 },
    T3s: { raise: 1 },
    "72o": { fold: 1 },
    // mistas (registradas pra estratégia mista, não dirigem ainda):
    // A9s: { raise: 0.62, limp: 0.38 },
  },
  notes: ["qualquer observação da fonte (arredondamento, ambiguidade, etc.)"],
}
```

## Exemplo pronto (BW5, já no motor)
`SB_RFI`, VANILLA, ITM, 40bb simétrico, 25% de campo. Barra global:
`raise 11.9% · limp 76.3% · fold 11.7%`. Células puras certificadas:
`A2s/A3s/A4s/K3s/K4s/Q4s → limp`, `T3s → raise`, `72o/62o/52o/42o → fold`.

## Como validar (automático)
Todo fixture novo precisa passar no validador **antes** de entrar:
- Função: `validateCertifiedFixture(fixture)` em `src/v3/intake/fixtureIntake.ts`
  (devolve a lista de erros; vazio = OK).
- Teste da família: `src/v3/intake/fixtureIntake.test.ts`.

O validador pega: frequência que não soma 1, mão inexistente, contexto
incompleto, falta de evidência, `raise` com tamanho ≤ 1bb, etc.

## O que acontece depois (o ciclo)
1. ChatGPT transcreve grades no molde acima → novos fixtures.
2. Validador confirma que estão certificado-seguros.
3. **Auditor `V2 × gabarito`** (`src/v3/audit/v2VsCertified.ts`) aponta sozinho
   onde o V2 diverge do solver → vira a lista de "consertar o V2" (#1) e "onde o
   V3 agrega" (#2).
4. Claude liga cada spot puro certificado atrás da trava (Fase 2, privado
   primeiro), e as células mistas viram a base da tela de frequências (Manus).

## Prioridade de conteúdo (foco atual: #1 e #2)
Encher **pré-flop com células mão-a-mão**, começando pelos spots de maior dor do
recreativo: **blind battles (SB×BB)**, **bolha** e **ICM** — de preferência com
as células puras marcadas (dirigem o live já) e as mistas anotadas.
