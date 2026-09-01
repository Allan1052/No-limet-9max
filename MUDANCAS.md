# 📓 MUDANÇAS DO APP — registro obrigatório

> **⚠️ OBRIGATÓRIO PARA AS DUAS IAs (Claude e Manus/ChatGPT).**
> **Toda vez** que você mexer no app e for subir (push), **anote aqui em cima**
> o que mudou — em **português**, curto e claro, do jeito que o Allan entende.
> Sem isso, o Allan não consegue acompanhar quem mexeu no quê, e um agente
> atrapalha o outro.

## Como anotar (modelo — copie e preencha no topo da lista)
```
## AAAA-MM-DD — [Claude ou Manus] — Título curto
- O que mudou (na visão do Allan, sem termo técnico).
- Por que mudou / o que resolve.
- Onde: (aba/tela do app, ex.: Torneio, Hoje, Perfil).
```

Regras do registro:
- **Mais novo em cima** (a entrada mais recente sempre no topo da lista abaixo).
- **Uma entrada por push** que muda o app (UI, motor, site ou textos).
- Escreva pro Allan **ler e entender** — nada de jargão sozinho.
- Se foi só ajuste interno que ele não vê, diga isso ("ajuste interno, sem
  mudança visível").

---

## 2026-09-01 — ChatGPT — Onboarding pelo principal problema
- Na primeira abertura, o app agora pergunta qual situação mais faz o jogador perder fichas e oferece cinco escolhas simples.
- A escolha fica salva neste aparelho e entra no funil; ela prepara a personalização futura das mãos sem alterar o motor agora.
- Onde: onboarding / primeira abertura.

## 2026-09-01 — Claude — Benchmark externo do motor (transparência)
- Novo teste que compara o motor com uma **referência independente** (push/fold
  no estilo Nash + teoria consolidada) numa grade ampla (~210 spots, 8–20bb,
  várias posições). Diferente do selo interno: o objetivo é ser **honesto** e
  mostrar **onde o motor ainda aproxima**, não dar 100%.
- Hoje bate em ~99%. As decisões universais (premium empurra / lixo folda) dão
  100% (guarda de regressão). O teste já **encontrou 1 divergência real**: o
  motor folda T9s na defesa de BB com ~20bb, quando a teoria defende — fica
  documentado e no radar pra melhorar.
- No app, o texto "Como a pontuação funciona" agora mostra esse teste externo e
  admite abertamente onde aproximamos. (Recomendação nº 6 da auditoria.)
- Onde: "Como a pontuação funciona" (ranking) e testes do motor.

## 2026-09-01 — Claude — Painel "Seu jogo" (prova de evolução) + base de dados
- Novo painel **"Seu jogo"** no Perfil: mostra sua **% de acerto por tipo de
  spot** (pré-flop, faixas de stack, estágios do torneio) e se você está
  **melhorando** (seta ↑/↓ comparando o agora com antes). Aponta sua **maior
  oportunidade** e tem um botão **"Treinar isso agora"** que abre o 1×1 já
  naquele tipo de spot. (Recomendações nº 1 e nº 2 da auditoria.)
- Por baixo: toda decisão avaliada (torneio, 1×1 e mão do dia) passa a ser
  registrada em "baldes" pra alimentar essa evolução. Tudo local, deste
  aparelho, e só mostra número com amostra suficiente (honestidade).
- Onde: Perfil (painel "Seu jogo"); grava a partir do Torneio e do 1×1.

## 2026-09-01 — Claude — Coach mais claro + selo mais honesto (auditoria)
- **Feedback pós-mão reorganizado**: agora lidera com a **decisão** (✔ Boa! / ✗
  Melhor era…), depois o **motivo** em linguagem simples, e a **matemática só no
  modo técnico e por último**. Tirei rótulos técnicos ("Coach V2:", "Você fez:").
  No modo simples não começa mais por número. (Recomendação nº 3 da auditoria.)
- **Selo de confiança mais humilde**: em vez de "100% de concordância com o GTO",
  agora diz que é **teste interno de qualidade** ("bate com a teoria em X% dos
  nossos spots"), deixando claro que **não é certificação externa nem solver**.
  Alinha com a nossa regra de claims honestas.
- Onde: feedback pós-mão (modal de dicas) e o texto "Como a pontuação funciona".

## 2026-09-01 — Claude — Recuperado: card de quiz + gerador de reels (Instagram)
- Trouxe pra `main` (e pro ar) um trabalho que tinha ficado preso numa branch
  antiga e nunca foi publicado: o **card de quiz** (a pergunta pro Instagram,
  além do card de resposta que já existia) e o **gerador de reels** a partir do
  card. É a raia visual/Instagram.
- Motivo: a branch antiga era a "porta da frente" do GitHub e ficou 253 mudanças
  atrás da `main`; esse recurso nunca tinha migrado.
- Onde: geração de cards do Instagram (aba Sua Mão / ferramentas de card).
- Ajuste interno junto: contrato de eventos do funil (teste) alinhado à `main`.

## 2026-09-01 — Claude — Feedback na mesa + Mão do dia direto no 1×1
- Quando a mão do torneio acaba, a explicação das suas jogadas **abre sozinha
  por cima da mesa** — não precisa mais rolar a tela pra baixo pra achar.
- A **dica do coach saiu do meio do feltro** (tampava pote/assentos) pra uma
  faixa fina acima da mesa, com texto curto.
- **"Analisar minha mão"** (tela Hoje) agora **abre direto no 1×1 jogando a mão
  do dia**, pulando a tela de análise. Nesse modo dá pra ver a explicação de
  cada jogada (Fold/Call/Raise/Re-raise) na mesma mão. O 1×1 geral (aba
  Treinar) segue separado.
- Onde: Torneio, Hoje, Treino 1×1.

## 2026-09-01 — Manus — Painel "Como explorar este vilão"
- Novo painel que mostra como explorar o perfil de cada oponente ao tocar no
  assento dele.
- Onde: mesa (popup de estatísticas do assento).

---

_(Entradas anteriores a este registro não estão listadas — o histórico completo
está nos commits do Git.)_
