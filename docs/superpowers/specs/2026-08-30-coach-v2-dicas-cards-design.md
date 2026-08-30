# Coach V2 — Dicas e Cards

## Objetivo
Alinhar a experiência de dica ao vivo, feedback pós-ação e cards compartilháveis ao Motor V2 já integrado, para que cada recomendação reflita o estado atual da decisão e para que os cards contem a linha da mão sem inventar dados.

## Princípio central
A recomendação é por decisão, não apenas por street. Sempre que a ação volta ao herói, a dica anterior fica obsoleta e uma nova recomendação deve ser calculada a partir do estado atual da mesa. Isso vale no pré-flop, flop, turn e river, inclusive quando há múltiplas decisões na mesma street.

## Fonte única de verdade
Criar um objeto de apresentação `CoachV2Decision`, derivado de `HeroAdvice` + estado da mesa, sem alterar o cálculo do Motor V2. A mesma estrutura deve alimentar:
- dica ao vivo;
- feedback da ação executada;
- timeline da mão;
- card compartilhável.

Campos esperados: street, ação recomendada, rótulo contextual, razão curta, posição, stack efetivo, pote, to-call, sizing recomendado, equity, equity requerida/pot odds, EV quando confiável, range estimado do vilão, estágio/ICM e nível de aposta enfrentado.

## Dica ao vivo
No modo simples, mostrar ação + uma razão humana curta. No modo técnico, acrescentar apenas métricas calculadas e relevantes ao spot: equity/preço, SPR/pote, sizing, stack efetivo, range estimado e contexto de ICM quando disponíveis.

A dica deve ser recalculada a cada vez do herói. Não deve persistir uma recomendação anterior depois de uma nova ação adversária ou mudança de street.

Exemplos de contexto:
- `Pré-flop · BTN · 42bb · enfrentando 3-bet`
- `Flop · pote 15bb · SPR 2,4 · vilão aposta 5bb`

## Feedback pós-ação
O feedback continua avaliando a ação realmente tomada contra a recomendação daquele instante. Deve armazenar os campos do Coach V2 necessários para explicar depois por que a decisão foi boa ou ruim, sem recalcular retroativamente um spot diferente.

## Cards V2
O card principal deixa de depender apenas da última recomendação isolada. A timeline deve preservar todas as decisões do herói da mão e, quando possível, a recomendação daquele exato instante.

O card deve destacar:
- sequência street por street;
- ação do herói;
- ação Coach V2 correspondente;
- acerto/erro;
- decisão de maior impacto ou a última decisão relevante como foco;
- conclusão curta coerente com a linha da mão.

No modo técnico, incluir apenas métricas que existiam naquele spot. Nenhum valor pode ser inferido visualmente se o Motor V2 não o produziu.

## Guardrails
- Não alterar a lógica matemática do Motor V2 nesta entrega; apenas consumir sua saída e preservar contexto.
- Não chamar o produto de solver nem de GTO perfeito/certificado.
- Preservar SELO GTO 61/61.
- Não usar cartas ocultas dos adversários para gerar a recomendação ao vivo.
- Não inventar equity, EV, ranges ou sizing ausentes.
- Manter os modos Simples e Técnico.
- Não tocar em `main` até testes, build e CI aprovarem a branch.
- Sem force-push.

## Critérios de aceitação
1. Nova ação do vilão antes da vez do herói produz uma nova dica contextual.
2. Uma mesma street pode ter mais de uma recomendação do Coach V2 em momentos diferentes.
3. Pré-flop, flop, turn e river usam a recomendação do estado atual.
4. Feedback preserva a recomendação do exato instante em que o herói agiu.
5. Card mostra a sequência das decisões e recomendações corretas por street/decisão.
6. Card técnico omite métricas inexistentes em vez de inventá-las.
7. Testes completos, TypeScript, build, dist/paridade e SELO GTO continuam verdes.
