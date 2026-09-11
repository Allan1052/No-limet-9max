# 🔍 Avaliação da "Auditoria do Coach Premium" (ChatGPT, 11/09/2026)

> Revisada **contra o código de hoje**, como fizemos com o PDF anterior.
> **Veredito curto: é uma boa auditoria.** Melhor que a primeira. Não inventou
> arquivo, não inventou capacidade, e a regra central dela é a nossa regra da
> casa aplicada ao coach.

## 0. O que eu conferi antes de concordar

| Afirmação do PDF | Conferido | Resultado |
|---|---|---|
| Auditou 5 arquivos (analyzer, coachV2Decision, coachV2Live, FeedbackPanel, blockers) | `ls` nos 5 | **todos existem** — nenhum arquivo alucinado |
| "SPR: sim no pós-flop" | `coachV2Live.ts` | **verdade** — calculado, só não é mostrado |
| "A dica ao vivo reduz quase tudo a uma ação curta" | `App.tsx:361-379` | **verdade** — o objeto carrega equity, preço, SPR, range e sizing; a tela mostra o rótulo da ação + `trapNote` |
| Cita `breakEvenCallBB`, `topRank`, `aceBlocker` | commits `34a2c28`, `cfc612a` | são campos que **nasceram hoje** → o PDF auditou o código ATUAL, não uma versão velha |

> ⚠️ **Uma falha pequena:** ele lista `src/ui/FeedbackPanel.tsx` como arquivo-base
> auditado, mas esse componente **não é importado em lugar nenhum** — é código
> morto, o segundo que encontramos (o primeiro foi o `LiveRead.tsx`). Auditar um
> componente morto como se estivesse no ar é um deslize de método.

## 1. Onde ele está certo, e vale adotar

- **A regra central** — *"o Coach nunca deve explicar uma decisão usando um
  conceito que o app não calculou naquele spot"* — é exatamente a regra de
  honestidade da casa, aplicada ao texto da dica. **Adotar como está.**
- **"Primeiro provar. Depois explicar."** É a melhor frase do documento.
- **A lista VERMELHA está certa e eu não mudaria uma linha:** range advantage,
  nut advantage, capped/uncapped, polarização, plano de rua futura, exploits
  ("ele overfolda") e risk premium numérico. Nenhum desses o app calcula hoje;
  afirmar qualquer um seria inventar. **Já era minha posição antes de ler.**

## 2. As três ideias NOVAS que valem mais que o resto

### 2.1 ⭐ Contrato de dados por família de frase (a melhor do documento)
Cada tipo de frase declara o que precisa para existir: `DICA_EQUITY_PRECO` exige
`equity` + `requiredEquity`; `DICA_BREAK_EVEN` exige `breakEvenCallBB`;
`DICA_BLOCKER` exige blocker concreto; `DICA_EV` exige `evBB` + a trava de
consistência. **Sem dado, sem frase.**

Hoje eu faço isso **na mão**, decidindo caso a caso (e por isso as camadas somem
quando o dado falta). O contrato transforma disciplina em **mecanismo testável**:
some um campo, o teste reprova a frase. É o que impede o próximo agente — ou eu
num dia ruim — de escrever um template bonito sem lastro.

### 2.2 ⭐ Toque na dica AO VIVO (a ideia que é melhor que a minha)
Eu tinha proposto **não** levar as camadas para a mesa ao vivo, porque a dica
tem 3 linhas e não pode roubar o lugar da mesa. O PDF propõe algo melhor:
**2 linhas ao vivo + toque para abrir** o contexto (posição, stack, pote, preço,
equity, SPR, range, sizing).

Isso resolve a restrição de espaço **sem** custar profundidade. É melhor que a
minha proposta e eu assumo.

### 2.3 Rastrear a ORIGEM da decisão
O coach saber se a recomendação veio de **preço/equity**, de **range pré-flop**,
de **ICM** ou de outro módulo. É pré-requisito para algum dia dizer "o ICM mudou
essa decisão" sem mentir — e, de quebra, deixa a dica mais precisa hoje.

## 3. Onde eu corrijo o PDF

1. **O exemplo ao vivo dele não funciona no pré-flop.** Ele propõe
   *"FOLD — você tem 24% e precisa de 31%"*. No pré-flop **o motor não estima
   equity**; esse número não existe. A dica ao vivo de 2 linhas precisa de uma
   variante pré-flop (ação + posição/stack/nível enfrentado), senão vai faltar
   frase justamente onde estão a maioria das decisões.
2. **Outs só existem no Review.** Ele marca outs como VERDE* "quando calculado",
   sem separar as telas. O cálculo precisa das **cartas reais** (o naipe muda as
   outs de flush) — no Review elas existem; na mesa ao vivo o caminho de dica
   trabalha com tipo de mão.
3. **Ele descreve como "recomendado" o que já está no ar.** "Leitura / Conta /
   O que mudaria / Outs / Blockers" é literalmente o que foi publicado hoje
   (`cfc612a`, `34a2c28`). Não é crítica: é sinal de que estamos no mesmo rumo —
   mas quem ler o PDF depois pode achar que é trabalho pendente.

## 4. Ordem que eu recomendo

| # | Frente | Por quê |
|---|---|---|
| 1 | **Contrato de dados + testes de pré-condição** | vem ANTES de qualquer frase nova; é o guardrail |
| 2 | **Toque na dica ao vivo (Camada 2)** | maior ganho de experiência, e a ideia é boa |
| 3 | **Mostrar o SPR** | já é calculado e nunca aparece — barato |
| 4 | **Origem da decisão** | destrava o ICM honesto no futuro |
| 5 | ~~Range/nut advantage, ICM numérico, plano futuro~~ | **não fazer**: exigem cálculo que não existe |

Também: **apagar ou ligar** os dois componentes mortos (`LiveRead.tsx`,
`FeedbackPanel.tsx`). Código morto que parece vivo engana auditoria — enganou
esta.

## 5. Critério de aceite (adotado do PDF)

Para cada dica nova: (1) identificar o campo que a sustenta; (2) testar a
ausência do campo; (3) testar caso-limite; (4) garantir que não contradiz a
ação/nota; (5) validar contra os bancos de referência; (6) só então liberar.

É o que eu já fiz no `breakEvenToCallBB` (o teste confere que o valor sugerido é
aprovado pela mesma régua que reprovou o real). Vira regra para os dois agentes.
