# Padrão oficial dos cards de quiz — Call ou Fold

**Status:** aprovado como referência visual em 25/08/2026.

**Asset principal:** `public/instagram/quiz-padrao-bb-shove-15bb.png`

**Reel padrão:** `public/instagram/quiz-padrao-bb-shove-15bb-reel.mp4` — 12 segundos, 720×1280, 24 fps, sem áudio.

## Conceito

Este é o padrão visual dos quizzes de decisão do Call ou Fold. A peça deve parecer uma ferramenta séria de estudo criada por um recreativo, e não uma propaganda de cassino ou uma interface genérica de inteligência artificial.

A estética combina um HUD técnico premium com fundo preto e verde-feltro, molduras finas em dourado envelhecido, linhas de dados discretas, tipografia editorial de alto contraste, fichas apenas como apoio visual e bastante espaço respirável. O formato padrão é vertical 9:16 para Instagram.

## Hierarquia obrigatória

A ordem visual deve ser: marca oficial no topo; identificação `ESTUDO • MTT • DECISÃO`; assinatura humana `feito por um recreativo`; selo `QUIZ DE 10 SEGUNDOS`; headline com a mão e a posição; pergunta objetiva; dois painéis compactos de cenário e pergunta; etiqueta `MÃO PARA ANALISAR`; cartas grandes e separadas; CTA; rodapé com o domínio oficial.

## Regras das cartas

As cartas devem ser sempre determinísticas, legíveis e visualmente separadas. Não pode existir terceira carta, carta fundida, símbolo extra ou rank inventado. O rank e o naipe precisam aparecer no índice e na disposição tradicional da carta. Em qualquer quiz, a mão exibida deve ser conferida contra a mão usada pelo motor.

## Spot de referência aprovado

O card aprovado usa **A♠ 7♠ no Big Blind contra all-in de 15 BB do botão**, em um MTT com blinds 500/1.000. A pergunta é `Você paga o all-in de 15 BB?` e o CTA é `COMENTA: CALL OU FOLD ANTES DA RESPOSTA`.

Para a configuração reproduzida no motor, a resposta é **FOLD**: equity estimada de 45% contra preço de 47%. A resposta deve permanecer fora da capa do quiz e aparecer somente no card de resposta ou na legenda posterior.

## Regras de texto e marca

Usar sempre a logo oficial existente no projeto; nunca pedir para a IA redesenhar a marca. Preservar exatamente `calloufold.com.br`. A assinatura `feito por um recreativo` aparece uma única vez no topo. O rodapé pode variar, mas deve manter o tom humilde, por exemplo `UMA MÃO POR VEZ • SÓ ESTUDO`.

O cenário e o CTA precisam descrever a mesma decisão. Se a situação for abertura, a pergunta deve ser `ABRE OU FOLD?`, com stack compatível com raise. Se a situação for defesa contra shove, a pergunta e o CTA devem usar `CALL OU FOLD`.

## Reel padrão

O Reel usa o card aprovado como quadro visual e aplica apenas um movimento de aproximação muito sutil. Essa solução preserva literalmente a logo, o domínio, o texto e as cartas A♠ e 7♠, evitando que um modelo altere ranks, naipes ou palavras durante a animação. O arquivo é vertical, silencioso e adequado para revisão antes da publicação.

## Checklist antes de entregar ou publicar

| Verificação | Critério |
|---|---|
| Pergunta e CTA | Usam a mesma decisão: abrir ou pagar/foldar. |
| Motor | A resposta e a explicação foram executadas no motor do aplicativo. |
| Cartas | Há exatamente as cartas da mão, com rank e naipe corretos. |
| Marca | Logo oficial e `calloufold.com.br` preservados. |
| Tom | Humilde, educativo e sem linguagem de cassino. |
| Formato | 9:16, textos dentro da área segura e CTA legível. |
| Publicação | Nenhuma peça é publicada sem aprovação explícita do Allan. |
