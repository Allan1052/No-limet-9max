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

## 2026-09-01 — Claude — Correções (modal de dicas, texto do coach, JJ vs 3-bet)
- **Modal de dicas pós-mão**: agora espera ~2,3s depois da mão pra você **ver o
  showdown** antes de ele abrir; o botão "Nova mão" voltou pra DENTRO do modal
  (estava solto na mesa) e o modal ficou maior (mais tela cheia).
- **Texto do coach**: corrigida a contradição "dá pra jogar Raise, mas 3-bet é o
  padrão" — Raise e 3-bet são a mesma jogada (agressão); agora só aponta desvio
  quando a jogada é de fato diferente (ex.: Call vs Raise).
- **Motor (bug do JJ)**: mão forte (JJ/TT/99, AQs/AJs/KQs) enfrentando um 3-bet
  com o **pote comprometido** NÃO folda mais — vai de all-in (o preço não deixa
  largar). Era o que você pegou: preço barato e o motor mandando foldar.
- Onde: mesa/torneio (modal e dica), motor (resposta a 3-bet). SELO 61/61 ok.

## 2026-09-01 — Claude — Tendência por posição: "onde você perde mais ficha"
- Novo bloco que mostra, **por posição** (UTG…BB), sua **% de acerto** (ordenado
  da pior cadeira pra melhor) e, quando você erra, se é por **agressivo demais**
  (call/raise quando era fold) ou **passivo demais** (fold quando era continuar).
- Aparece em **DOIS lugares**: (1) na **revisão do fim de torneio** — a tendência
  daquele torneio; (2) no **"Seu jogo" (Perfil)** — o acumulado de todas as suas
  decisões. Ex.: "Sua posição mais fraca: BTN, acerta 48% — aqui seus erros são
  por dar call/raise demais."
- Honestidade: só aponta com amostra suficiente; tudo local, deste aparelho.
- Onde: revisão de fim de torneio e painel "Seu jogo" (Perfil).

## 2026-09-01 — Claude — Revisão das 3 divergências do benchmark (veredito)
- Conferi as 3 divergências que a ampliação da ChatGPT achou (J6o 30bb, T7o 40bb,
  96o 45bb, todas na defesa do BB vs BTN min-raise). Veredito: **não são leaks**.
  São mãos offsuit fracas de fronteira; o motor defende todos os broadways e
  conectados offsuit + suited e folda só os "raggy" com buraco — **de propósito**,
  mais conservador, o que é melhor pro recreativo jogar fora de posição.
- Deixei isso documentado no teste (sem mexer no motor). Ajuste interno, sem
  mudança visível pro jogador.
- Onde: testes do motor (comentário do benchmark).

## 2026-09-01 — ChatGPT — Benchmark externo ampliado para caçar vazamentos
- Ampliei o teste independente de cerca de 210 para **554 spots pré-flop**, com foco em stacks de 25–45bb, defesa de BB/SB, 3-bet, 4-bet, tamanho da abertura e ante.
- O motor não foi alterado. A nova grade encontrou **3 divergências** na defesa do BB contra BTN 2.2x (J6o 30bb, T7o 40bb e 96o 45bb), todas registradas com ressalva para confirmar a frequência exata da referência antes de qualquer correção.
- Onde: ajuste interno de calibração/benchmark; sem mudança visual no app.

## 2026-09-01 — Claude — Conserto do motor: defesa do BB a ~20bb (achado do benchmark)
- O benchmark externo tinha apontado que o motor **foldava T9s** (e mãos suited
  parecidas) na defesa do BB com ~17–21bb, quando a teoria **defende**. Corrigido:
  nessa faixa, o BB fechando a ação por **ótimo preço** contra um abridor **largo**
  (CO/BTN/SB) agora **flata** as suited que flopam bem (conectores, broadways,
  ases suited). O lixo offsuit dominado (KJo/ATo) e a defesa contra abridor
  apertado (UTG) seguem como antes (jam-ou-fold) — sem reabrir aqueles leaks.
- Resultado: o benchmark externo passou de ~99% pra **100%** (0 divergências),
  sem mexer no SELO 61/61. Foi o ciclo completo: o teste achou, a gente consertou.
- Onde: decisão do motor (defesa do BB em stack médio) — Torneio, 1×1, Sua Mão.

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