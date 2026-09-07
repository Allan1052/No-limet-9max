# Mesa de jogo em tela cheia — Design aprovado

**Objetivo:** durante a mão no mobile, fazer a mesa ocupar praticamente toda a viewport, com o feltro como plano de fundo contínuo e os controles flutuando sobre a parte inferior, preservando legibilidade, toque e safe-area.

**Abordagem aprovada:** caminho 2 do brainstorm — manter a estrutura atual (`.play` + `.table-modern` + `.controls`) e mudar apenas a apresentação do modo `.app.nav-hidden`. A mesa passa a ocupar a viewport; o feltro se expande quase de borda a borda; os controles viram overlay na base com fundo translúcido; o herói fica protegido acima da faixa de ações; não haverá mudança de regras, ranges, ICM ou lógica do jogo.

## Regras
- Não alterar `src/ranges`, `src/bots`, `src/game` ou `src/v3`.
- Primeira iteração sem mudar `Table.tsx`; usar CSS e contrato visual existente.
- Preservar cartas 4 cores, avatars, stacks em BB, cartas ocultas pequenas e popup de range.
- Fold/Call/Raise continuam inteiros e tocáveis, com slider acessível.
- Respeitar `env(safe-area-inset-bottom)`.
- Fora de `.app.nav-hidden`, layout atual permanece igual.
- Atualizar `mobilePolish.contract.test.ts`, `MUDANCAS.md` e `dist`.
- Verificação: Vitest completo, build Vite e SELO GTO 61/61 via CI antes de integrar.

## Geometria mobile
- `.app.nav-hidden .play`: camada fixa 100dvh, overflow hidden.
- `.app.nav-hidden .table-modern`: ocupa a viewport, não apenas o espaço restante do flex.
- `.app.nav-hidden .felt`: inset reduzido para dar sensação de mesa de borda a borda.
- `.app.nav-hidden .controls`: posição absoluta/fixa na base da própria `.play`, com z-index acima da mesa e fundo em gradiente/translúcido.
- Reservar uma zona visual inferior dentro da mesa para que hero/pods nunca sejam cobertos pelos controles.
- Landscape mantém regra própria mais compacta.

## Critério visual
Sucesso é o print do aparelho mostrar uma única composição contínua: feltro predominante, board e seats maiores/mais legíveis, sem vão preto entre mesa e ações, e controles aparentando flutuar sobre o feltro. Ajustes finos posteriores serão guiados pelos prints do Allan.
