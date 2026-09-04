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

## 2026-09-04 — Claude — Texto da dica bate com a mão + tocar na dica preenche o valor
- **Texto da dica corrigido.** Ao enfrentar um **3-bet**, a dica dizia "não domina
  o range de **all-in**" — mas não havia all-in nenhum, era um 3-bet. Agora diz
  "fica dominada contra o range que **re-raise**", que bate com a mão. Onde: faixa
  de dica quando você enfrenta um 3-bet/4-bet.
- **Tocar na dica preenche o valor.** Quando o coach sugere um tamanho (ex.: "Bet
  ~8.6bb" / "Raise 12bb"), agora dá pra **tocar na dica** que ela **preenche
  automático** aquele valor no controle de aposta/raise — é só confirmar. A dica
  mostra "tocar para usar" quando é clicável. Onde: mesa, na hora da sua decisão.

## 2026-09-03 — Claude — 🐛 CORREÇÃO GRAVE: bot afundava 200bb com A4 (guerra de re-raise)
**Achado do Allan (Mão 8):** deep, 200bb, um bot entrou numa guerra de
open→3bet→4bet→5bet→6bet e **pagou o all-in de 200bb com A4s**. Isso é absurdo —
ninguém empilha 200bb com A4.

**Causa (honesta):** foi um efeito colateral do meu conserto de ICM de ontem.
Existe um portão no motor — "depois de guerra de 5-bet+, só AA/KK/QQ/AK
continuam" — mas o caminho novo de decisão por preço/equity rodava ANTES e
**furava** esse portão. Antes, a conta de ICM (bugada) exigia 99% e foldava tudo,
então o furo não aparecia. Quando corrigi o ICM (baixando a exigência pro nível
certo, o que resolveu o KQs/77), o furo ficou exposto: com A4s já tendo inflado o
pote, o "preço fechava" (pot-committed) e o bot pagava.

**Corrigido:** o portão de guerra agora vale TAMBÉM no caminho por equity. Numa
guerra de 5-bet+, mão fora de AA/KK/QQ/AK **folda**, ponto — não importa o preço.
Verificado: A4s na guerra → FOLD; QQ/AK → CALL (premium empilha certo); e o
conserto de ontem seguiu de pé (KQs/77 pagam o all-in barato). SELO 61/61,
3881 testes. Travado com testes de regressão no spot exato do Allan.

## 2026-09-03 — Claude — 🐛 CORREÇÃO GRAVE: ICM mandava foldar call barato (KQs/77)
**O que estava errado (achado do Allan):** contra um all-in curto, o motor mandava
**FOLDAR mãos fortes que pagam fácil e barato** — ex.: KQs no BB pagando só 0.7bb
num pote de 3.6bb (você até já tinha o Broadway!), e 77 no SB pagando barato. Isso
é erro grave e podia custar torneio.

**Causa:** a conta de ICM no call de all-in usava, no pré-flop, os stacks de um
jeito inconsistente (fichas "atrás" em vez do total, e mistura de unidade fichas×BB
no custo do fold). Com isso o estado de "se eu pagar e perder" ficava **pior do que
a realidade**, o ICM inflava a equity exigida (chegava a pedir 53% onde o certo era
~22%) e mandava foldar mão boa.

**Corrigido:** o call de all-in agora usa os stacks totais em BB, igual ao pós-flop,
e desconta certo o que você já pagou (custo afundado). Resultado nos spots do Allan:
KQs passou a **PAGAR** (exige ~22%, tem 57%), 77 passou a **PAGAR** (exige ~46%,
tem 60%). Onde: decisão/dica em qualquer all-in pré-flop (Torneio/Jogar). Blindado
com testes novos pra nunca voltar. SELO GTO segue 61/61.

## 2026-09-02 — Claude — Dica "tá barato" só em mão que tenta + placar POR TORNEIO
- **A explicação "tá barato, mas..." agora só aparece em mãos que realmente
  tentam** (broadways, ases, pares, mãos do topo). Antes ela saía em QUALQUER
  fold — até 82o, 43o, 42o, que são fold óbvio e ninguém se tenta a pagar. Agora
  lixo não recebe a nota; ela fica reservada pros spots que de fato enganam.
  Onde: faixa de dica durante a mão.
- **Placar do topo (Sessão · Decisões · Precisão) agora é POR TORNEIO.** Antes
  zerava quando você saía da mesa e voltava. Agora conta só as mãos e decisões
  DAQUELE torneio, **persiste** quando você sai e volta quantas vezes quiser, e
  **só zera ao iniciar um torneio novo**. Onde: faixa no topo da mesa (Jogar).

## 2026-09-02 — Claude — HUD do torneio vira linha fina + "Seu jogo" mais claro
- **HUD do torneio agora é uma linha FININHA** colada nos botões (Fold/Call/Raise).
  Antes tinha uma barra de progresso grande que roubava espaço e cortava o
  slider do raise embaixo. Tirei a barra grande; ficou só a linha compacta
  (posição · faixa/ITM · blinds), sem empurrar nada. Onde: mesa durante a mão.
- **Painel "Seu jogo" mais claro** (Perfil): 
  - Coloquei uma explicação em português de gente dizendo **o que a % significa**
    ("quanto das suas decisões bateram com a jogada recomendada; 100% = fez a
    jogada certa em todas").
  - Tirei a contradição do "📍 Onde você perde mais ficha" (mostrava 75–100%, que
    não é perder ficha). Virou **"📍 Seu acerto por posição"**, e o destaque agora
    fala em **"posição com mais espaço pra melhorar"** com a % de decisões certas
    — e, quando você vai bem em tudo, ele elogia em vez de te chamar de "fraco".
  - Onde: Perfil → Seu jogo (e a mesma lista na revisão do torneio).

## 2026-09-02 — Claude — "Porquê" na hora nos spots que enganam (fold barato)
- Quando o coach manda **Fold** mas o **preço está barato** (aquele "ah, tá
  barato, deixa eu pagar" que engana), a faixa de dica agora mostra uma **frase
  curta explicando o porquê** — ex.: "Tá barato, mas sem posição e sem valor de
  3-bet, foldar é melhor que pagar dominado". Assim dá pra entender **na hora**
  por que não compensa pagar, antes de agir.
- A frase vem do **motivo real do motor** (nada inventado), sem números, e só
  aparece **nesses spots que enganam** — nas jogadas óbvias a dica continua
  limpa, só com a ação (Raise/Call/Fold).
- Onde: faixa de dica durante a mão (Torneio/Jogar).

## 2026-09-02 — Claude — Ganho líquido, all-in no feedback, versão no topo, HUD embaixo
Quatro ajustes que o Allan pediu (a partir dos prints do torneio):
- **Ganho da mão agora é LÍQUIDO.** Antes mostrava o pote inteiro ("ganhou
  4.7bb") somando as fichas que eram do próprio Allan. Agora mostra **quanto a
  pilha realmente subiu** na mão (o pote menos o que ele investiu). Em pote
  dividido que só devolve o investido, a mensagem avisa "pote dividido".
  Onde: mensagem de fim de mão (Torneio/Jogar).
- **Feedback contra all-in.** Quando o Allan folda (ou paga) e o vilão veio de
  **all-in**, a dica de fim de mão agora diz "(vilão foi all-in)" — assim as duas
  linhas de "Pré-flop" da mesma mão não ficam iguais e o fold fica justificado.
  Onde: modal de dicas (fim de mão).
- **Botão da versão no topo do Perfil.** Não precisa mais rolar a tela até o fim
  pra ver/atualizar a versão — o botão 🔄 subiu pro começo do Perfil.
  Onde: aba Perfil.
- **Classificação do torneio foi pra BAIXO.** A faixa "12º/74 · 29 p/ faixa · 
  blinds" saiu do topo (estava cobrindo a mesa) e foi pra perto do botão de
  raise, embaixo. Onde: mesa durante a mão (Torneio/Jogar).

## 2026-09-02 — Claude — Dica do coach com termos padrão de poker + mais limpa
- A faixa de dica acima da mesa agora usa os **termos padrão de poker**: Raise,
  Call, Fold, Check, Bet, 3-bet, All-in (no lugar de Aumentar/Pagar/Foldar).
- **Removida a info de pote/preço** da faixa ("Pote X · Pagar Y") — fica só a
  ação, já que esses números aparecem na mesa central.
- Onde: faixa de dica durante a mão (Torneio/Jogar).

## 2026-09-02 — Claude — Auditoria do motor: corrige decisões inconsistentes
- Fiz uma auditoria pesada no motor com **invariantes objetivas** (regras que só
  um bug quebra) varrendo milhares de spots. Corrigidos:
  1. **Inversões de kicker** na abertura: o motor abria K3s mas foldava K4s (a
     mais forte!), idem Q2s/Q3s, T8o/T9o, K2o/K3o, Q8o/Q9o. Causa: a força das
     mãos vinha de um sorteio com ruído maior que a diferença entre kickers
     vizinhos. Agora a ordenação é corrigida pra nunca inverter.
  2. **Range de stack curto** não crescia direito: uma mão abria a 11bb e sumia
     a 10bb (o contrário do certo — mais curto = mais largo). Corrigido.
- Onde: motor de decisão pré-flop (Torneio, 1×1, Sua Mão). SELO 61/61 e o
  benchmark externo seguem intactos; novo teste trava a monotonicidade.
- O que ficou limpo na auditoria (sem bug): enfrentar all-in, defesa por
  tamanho de aposta, ordem das posições e resposta a 3-bet.

## 2026-09-02 — Claude — Dicas NÃO abrem mais sozinhas + mesa maior/controles menores
- O modal de dicas **não abre mais automático** — só aparece quando você toca no
  botão **"Ver dicas"** na mesa. Assim você vê o showdown e decide se quer as dicas.
- **Mesa maior, controles menores:** a área de ação (Fold/Call/Raise + slider)
  tinha um vão de ~40px sobrando embaixo e o painel do slider estava alto.
  Compactei (controles de ~200px pra ~155px) e dei o espaço pra a mesa crescer.
  Verificado com render real: mesa maior e os controles sempre cabem, em telas
  de 640/780/900px de altura.
- Onde: mesa de jogo (Torneio/Jogar) no celular.

## 2026-09-02 — Claude — Fim da duplicata das dicas + mesa se adapta a cada tela
- **Sem duplicata:** o feedback e as ações de fim de mão não aparecem mais
  embaixo da mesa (era o que se via rolando). Agora ficam **só no modal** (botão
  "Ver dicas"). Embaixo da mesa sobra só o **Nova mão** pra continuar rápido.
- **Mesa automática por tela:** troquei o limite fixo por um cálculo que
  **reserva o espaço dos controles e usa o resto da altura real do aparelho**
  (dvh) pra mesa. Testei em 3 tamanhos de tela (640/780/900): a mesa cresce ou
  encolhe sozinha e os controles **sempre cabem**, com folga.
- Onde: mesa de jogo (Torneio/Jogar) no celular.

## 2026-09-01 — Claude — Mesa não corta mais os controles no celular
- Na tela de jogo, a mesa estava alta demais e **empurrava os botões (Fold/Call/
  Raise + slider) pra fora da tela** — ficavam cortados embaixo. Limitei a altura
  da mesa no celular pra a área de ação **sempre caber**. Testei renderizando de
  verdade num celular: antes os controles iam até 822px numa tela de 780; agora
  vão até 716px, com folga.
- Conferi as outras abas (Hoje, Treinar, Estudar, Perfil): são telas que
  **rolam** normalmente — nada cortado; o corte era só na tela de jogo.
- Onde: mesa de jogo (Torneio/Jogar) no celular.

## 2026-09-01 — Claude — Modal de dicas vira o "centro" pós-mão + Simples×Técnico
- Agora o modal de **Dicas da mão** traz TUDO num lugar só: além das dicas, os
  botões que ficavam embaixo da mesa (Nova mão, Rever mão, Compartilhar mão,
  Evolução, Conquistas, Mãos desta sessão, Pontos fracos, Exportar). Não precisa
  mais rolar pra baixo — clicou em "Ver dicas", tem tudo ali.
- **Simples × Técnico** agora diferem de verdade: o resumo do topo do modal
  seguia o modo global do app (ficava técnico mesmo na aba Simples). Corrigido —
  o resumo segue a ABA escolhida. As explicações por decisão já mudavam.
- Onde: mesa/torneio (modal de dicas pós-mão).

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