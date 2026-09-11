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

## 2026-09-11 — Claude — O pós-flop ganhou a trava que faltava (e eu corrijo um erro meu)
**Primeiro, o meu erro.** Eu te disse que os bancos de referência do app não
testavam "o vilão abriu, e agora?". **Estava errado** — eu procurei pelo nome
errado do campo no código. A verdade é bem melhor: o app tem **615 spots de
referência** no pré-flop, cobrindo de 8bb a 45bb, todas as posições, 3-bet,
4-bet e ante. Peço desculpa: eu subestimei um trabalho que já estava feito.

**Agora o que realmente faltava.** Procurando direito, achei a lacuna de
verdade: o **pós-flop** — que é o que move o veredito rua a rua na tela de
Review, o diferencial do app — tinha **5 casos de teste, todos no mesmo flop**
(A♠8♦6♣). Qualquer erro em outra textura passaria despercebido.

- **O que fiz:** um banco de **39 situações** cobrindo 8 boards diferentes
  (seco, conectado, mesmo naipe, pareado, baixo, cartas altas) e as três ruas
  (flop, turn, river).
- **Só coisa indiscutível entra:** lixo contra aposta grande tem que foldar;
  mão enorme nunca folda; sem aposta e sem mão, passa; sem aposta e com mão
  enorme, aposta. Fronteira (par médio, projeto marginal) fica de fora — dizer
  o que é "certo" onde a teoria discorda seria inventar.
- **Achou algo na primeira rodada** — e era **erro meu**, não do motor: eu tinha
  escolhido T2o como "mão lixo" num board 9-8-7, mas T-9-8-7 é projeto de
  sequência aberto. O motor semi-blefou, que é o certo. Conferi antes de acusar.
- **Onde:** nenhuma tela muda. É proteção para o coach do Review não começar a
  falar besteira sem ninguém perceber.

## 2026-09-11 — Claude — Espanhol e inglês estavam pela metade
- **O que estava acontecendo:** faltavam **48 textos em espanhol** e **47 em
  inglês**. Não quebrava nada — o que faltava aparecia em português — então a
  tela simplesmente **misturava os idiomas** e ninguém percebia. As faltas se
  concentravam em "Aprenda do Zero", "Mesa Final", instalação e onboarding.
- **O que fiz:** traduzi os 95 textos. Agora os três idiomas têm as mesmas
  **576** frases.
- **Achei mais uma coisa:** havia 7 textos **mortos** no espanhol e no inglês,
  restos de uma renomeação antiga (`install.ios*`), que não eram usados em lugar
  nenhum. Removidos.
- **Para não acontecer de novo:** criei um teste que compara os três idiomas.
  Se alguém adicionar um texto e esquecer de traduzir, a publicação para.
- **Onde:** todas as telas, para quem usa o app em espanhol ou inglês.

## 2026-09-11 — Claude — Textos minúsculos: o "SEM DINHEIRO REAL" mal dava pra ler
- **No Ranking:** os números que dizem a faixa de buy-in ("5 FS", "1.000 FS",
  "10.000+ FS") estavam a 9,5px — o menor texto do app, e é justamente o que a
  pessoa lê pra saber onde se encaixa. Subiram para 11px. O mês/ano da
  temporada também.
- **O selo do rodapé** ("SEM DINHEIRO REAL · SÓ ESTUDO · PWA SEGURO") — que é a
  frase mais importante do app — estava a 10px, na cor mais fraca e ainda com
  transparência. Calculei o contraste: **3,09:1**, abaixo do mínimo de 4,5:1.
  Agora está a 11px, sem transparência e com contraste de cerca de 8:1.
  Continua discreto; agora dá pra ler.
- **Como ficou:** nas 6 telas medidas sobrou só o rótulo da barra de baixo
  (Hoje/Treinar/Estudar/Perfil) abaixo de 11px — e esse tem ícone em cima e
  área de toque grande, que é o padrão de celular. Deixei de propósito.
- **Onde:** Ranking e o rodapé de todas as telas.

## 2026-09-11 — Claude — Achei um CSS ANTIGO fantasma brigando com o app inteiro
Este é o achado mais importante da auditoria, e explica muita coisa.

- **O que estava acontecendo:** o `index.html` tinha uma linha ligando o app a
  um arquivo de estilo **congelado em 17 de agosto** (107 KB, 1.252 regras).
  Toda publicação empacotava esse arquivo velho junto com o atual. Ou seja: o
  app estava sendo pintado por **duas folhas de estilo ao mesmo tempo** — a de
  hoje e uma de um mês atrás.
- **É provavelmente a causa daquela sensação** de "arrumo uma coisa e outra
  desarruma". Várias regras que a gente escreveu estavam sendo sobrescritas por
  regras antigas que ninguém sabia que ainda existiam.
- **O que melhorou sozinho, só de tirar:** a setinha de ajuste fino voltou a ser
  o botão redondo dourado que era pra ser (estava quadrada e cinza), a faixa da
  dica voltou à altura certa, e os cantos arredondados dos botões voltaram ao
  desenho atual.
- **O app ficou mais leve:** o estilo principal caiu de **145 KB para 38 KB**.
  São 107 KB a menos baixados por toda pessoa que abre o app.
- **Também apaguei** a pasta `assets` da raiz do projeto: 3,8 MB de sobras de
  builds antigos que ninguém usava.
- **Conferi antes de tirar**, com a ferramenta de impressão digital de layout:
  19 medidas mudaram, e todas eram o desenho **correto voltando**. Depois
  conferi a mesa por print e as 6 telas pela régua — nada quebrou.

## 2026-09-11 — Claude — As fontes agora são do próprio site
- **O que mudou:** as fontes da marca (Cinzel e Playfair) deixaram de ser
  buscadas no Google e passaram a ser servidas pelo próprio calloufold.com.br.
- **Por quê:** do jeito antigo, o celular precisava baixar o estilo, ler a
  primeira linha, pedir um arquivo ao Google e só então as fontes — fila pura
  antes de aparecer qualquer coisa na tela. E sem internet a marca
  "CALL OU FOLD" do feltro aparecia em outra fonte.
- **Custo:** 3 arquivos, 103 KB no total, servidos junto com o app.
- **Conferido no navegador:** o app e o site **não pedem mais nada ao Google**,
  e a marca do feltro carrega em Cinzel normalmente.

## 2026-09-11 — Claude — Todo botão do app agora cabe no dedo
- **O que mudou:** os botões pequenos do app cresceram para o tamanho mínimo
  que o dedo alcança bem (44px). Medido: eram **72 botões pequenos demais** em
  6 telas; agora são **zero**.
- **Os piores eram:** "Trocar avatar" (22px), as bandeirinhas de idioma (24px),
  Simples/Técnico (26px) e as abas do topo (31px) — essas apareciam em 4 telas.
- **Também:** os campos e listas da tela "Sua Mão" (posição, cartas, stack) e as
  faixas do Ranking.
- **Onde:** Hoje, Treinar, Estudar, Perfil, Ranking e Importar. As telas de mesa
  não foram tocadas (já tinham sido ajustadas antes).
- Conferi tela por tela depois da mudança: nenhuma passou a rolar para os lados
  e nenhum layout quebrou.

## 2026-09-11 — Claude — "Seus dados": agora o app conta a verdade e deixa desligar
- **O que eu achei na auditoria:** o app carregava um **pixel de publicidade do
  Facebook** em toda abertura, e o único botão para desligar rastreamento
  estava **trancado atrás da sua senha de teste** — ou seja, só você tinha. Pior:
  o aviso na tela falava de um botão que o jogador não podia ver.
- **O que mudou:** o Perfil ganhou um bloco **🔒 Seus dados**, visível para todo
  mundo, que diz em português o que é medido (páginas abertas, eventos como
  "instalou") e **assume o pixel da Meta**, deixando claro que nenhum dos dois
  recebe suas mãos, seu histórico ou seu progresso.
- **O botão desliga de verdade:** conferi no navegador. Com o rastreamento
  ligado, o app pede os dois scripts; depois de desligar, **nenhum dos dois é
  sequer pedido**. Não é "não contar depois" — é não carregar.
- **O que EU não decidi por você:** se o pixel deve continuar existindo. Isso é
  decisão sua, de divulgação. Eu só fiz ele ser declarado e desligável.
- **Ainda falta:** uma página de política de privacidade no site. Eu não publico
  documento legal sozinho — quando você quiser, eu escrevo e você aprova.
- **Onde:** aba **Perfil**, bloco "Seus dados".

## 2026-09-11 — Claude — O site estava ensinando errado na porta de entrada
- **O que estava errado:** a demonstração da landing mostrava **K♠Q♠** e dizia
  *"o motor do app aponta Fold"*. Eu rodei o motor: ele manda **PAGAR** essa mão.
  Ou seja, quem respondia "Call" — que é o que o app ensina — era informado de
  que tinha errado. Era a **primeira experiência** de quem chega pelo site.
- **Como corrigi:** troquei um naipe. Agora a demonstração mostra **K♠Q♥**
  (naipes diferentes), que o motor **realmente folda**.
- **E a lição ficou melhor:** o veredito agora explica o detalhe que o
  recreativo não sabe — *se as duas fossem do mesmo naipe, o motor pagaria*.
  Isso é verdade (conferido) e mostra profundidade do app em uma frase.
- **Para nunca mais acontecer:** criei um teste que **lê o HTML do site**, pega
  as cartas que estão na tela e pergunta ao motor. Se o site ou o motor mudarem
  sozinhos, a publicação para. Conferi que o teste pega o erro antigo.
- **Onde:** calloufold.com.br (landing, bloco "Spot de demonstração").

## 2026-09-10 — Claude — Mesa Final agora abre em TELA CHEIA (padrão do app)
- **O que mudou:** a tela de **Mesa Final** (Treinar → Mais ⋯) passou a abrir
  com a mesa ocupando a tela inteira, igual à mesa de jogo normal.
- **Como estava (medido):** a mesa começava a **628px** de uma tela de 915px —
  o painel de ICM e a lista com os 9 stacks empurravam a mesa para baixo e era
  preciso **rolar a tela para ver as próprias cartas**. Agora a mesa começa em
  0 e ocupa **100% da largura e 90% da altura**.
- **O que saiu da frente:** a lista de stacks repetia o que cada assento da mesa
  já mostra. Ela agora abre no botão **📊 ICM**, no alto — mesmo padrão do menu
  "⋯" da tela de Review, que você aprovou. A dica do coach virou a mesma faixa
  flutuante da mesa de jogo e **abre inteira ao toque**.
- **Como foi feito:** a Mesa Final passou a usar a MESMA regra de layout da mesa
  de jogo, em vez de ter a dela. Assim o padrão vale para as duas de verdade — e
  qualquer melhoria futura na mesa chega nas duas de uma vez.
- **De quebra:** o rótulo de ICM (ex.: "40% ICM") ficava escrito em cor escura
  DENTRO da barra escura e sumia. Agora fica ao lado dela, legível.
- **Onde:** Treinar → Mais ⋯ (Estudo de Mesa Final).

## 2026-09-10 — Claude — Regra nova para os dois agentes não se atrapalharem
- **O que mudou:** nada no app. É uma regra de trabalho, escrita no `AGENTS.md`
  (Regra Nº 6), que vale para o Claude e para o Manus/ChatGPT.
- **Por que:** hoje eu errei um diagnóstico. Você mandou um print e eu disse que
  seu celular estava travado numa versão velha — **não estava**. O horário que
  aparecia era de uma publicação do OUTRO agente, feita depois da minha. Eu
  comparei só com o que EU tinha publicado e conclui errado.
- **O que a regra obriga agora:** (1) olhar o que o outro agente subiu antes de
  começar; (2) rodar os testes de novo se o envio trouxer código dele;
  (3) nunca dizer "está no ar" olhando só a própria publicação; (4) quando você
  perguntar "chegou?", pedir o **código de 7 letras** do Perfil em vez de
  comparar horário.
- **Onde:** nenhuma tela. Arquivos `AGENTS.md` e `CLAUDE.md`.

## 2026-09-10 — Claude — O Perfil agora RESPONDE "meu app está atualizado?"
- **O que mudou:** a linha **Versão**, no topo do Perfil, deixou de mostrar só
  uma data. Agora ela diz, em português:
  - **✓ Seu app está atualizado** (verde) — quando o app perguntou ao servidor
    e confirmou;
  - **⬇️ Existe uma versão nova** + botão **Atualizar agora** (dourado, grande);
  - **Não deu para verificar agora** — quando está sem internet.
- **Por que mudou:** a data sozinha não respondia nada. Pior: ela é convertida
  pelo **relógio do próprio celular**, então um aparelho com a hora errada
  mostrava um horário que não batia com nada e parecia defeito do app. Foi
  exatamente o que aconteceu hoje.
- **Honestidade:** o "atualizado" **só** aparece quando o app realmente
  conseguiu falar com o servidor. Sem resposta, ele diz que não conseguiu
  verificar — nunca afirma estar em dia "no chute".
- **Extra para suporte:** embaixo, pequeno, aparece a data e um **código de 7
  letras da versão** (ex.: `3d358be`). Esse código não depende de relógio nenhum:
  basta o jogador ler ele pra gente saber exatamente qual versão está no
  aparelho. Serve para o Allan e para qualquer pessoa que peça ajuda.
- **Onde:** aba **Perfil**, primeira linha (Versão).

## 2026-09-10 — Claude — O `dist` sai do repositório (ajuste interno)
- **O que mudou:** a pasta `dist` (o app "montado") **não é mais guardada no
  repositório**. Nada muda na sua tela — é arrumação de bastidor.
- **Por que mudou:** eu conferi o robô que publica o site e descobri que ele
  **monta o app do zero e publica a versão dele**. Ou seja, a `dist` que eu vinha
  guardando **nunca era a que ia pro ar** — era peso morto que ainda por cima
  sujava o histórico (cada publicação trocava dezenas de arquivos e o registro
  nunca mostrava o que de fato tinha mudado).
- **O que NÃO mudou:** eu continuo rodando o `npm run build` antes de todo push.
  Ele é quem pega erro de código que o teste sozinho não pega — isso já barrou
  uma publicação uma vez e a trava continua de pé.
- **Onde:** nenhuma tela. Regras atualizadas no `AGENTS.md` e no `CLAUDE.md`.

## 2026-09-10 — Claude — Atualização do app fica LEVE (só baixa o que mudou)
Corrigido o problema que eu tinha diagnosticado. Foram duas correções, porque a
primeira sozinha não resolvia:
1. **O carimbo de versão virou a data do último commit** (era a hora do build).
   Assim, construir duas vezes o mesmo código gera arquivos idênticos.
2. **O carimbo saiu de dentro do app.** Só a primeira correção não bastava: como
   o valor ficava embutido no código, **cada publicação ainda trocava 15 dos 24
   arquivos**. Agora ele vai numa etiqueta do `index.html` (que não tem código
   dentro) e o app lê de lá.
- **Medido:** trocando só o carimbo, **0 de 24 arquivos** mudam de nome (antes
  eram 15).
- **O que muda pra você:** a partir da **próxima** publicação, o celular baixa
  só o que realmente mudou, em vez do app inteiro. **Esta** publicação ainda
  troca tudo, porque o código mudou de verdade.
- A tela de Perfil continua mostrando "Versão · Atualizado em DD/MM/AAAA HH:MM"
  igual — agora com a data do commit que gerou a versão.
- Suíte: 4012 testes passando, SELO 61/61.

## 2026-09-10 — Claude — Achado: toda publicação troca o app INTEIRO (e não precisava)
*(Nada mudou no app — é um diagnóstico. A correção depende de você.)*
- Descobri, testando a ferramenta nova, que **dois builds do mesmo código geram
  arquivos com nomes diferentes**. Causa: o `vite.config.ts` carimba a
  **data e hora do build** dentro do código (é o rótulo de versão que aparece no
  Perfil). Como esse carimbo muda toda vez, **o pacote inteiro é reescrito**.
- **Efeito prático no seu celular:** a cada publicação o app **baixa tudo de
  novo**, mesmo que só um texto tenha mudado. É a explicação mais provável para
  a atualização ser sempre pesada e exigir fechar/reabrir 2×.
- **E mais:** o robô que publica (GitHub Actions) **reconstrói o app do zero** e
  publica a versão dele. Ou seja, o `dist` que eu venho commitando **não é o que
  vai pro ar** — a regra antiga ("o app é servido do dist commitado") está
  desatualizada.
- **Não mexi em nada disso** — é a área que publica o app, e um erro ali te deixa
  sem site. As duas propostas estão escritas em
  `docs/handoff/2026-09-10-EXPERIMENTO-camadas-css.md` e a decisão é sua.

## 2026-09-10 — Claude — Passo 3: MEDI antes de mexer, e não compensava mexer
*(Nada mudou no app nesta entrada — foi investigação. Mas o resultado importa.)*
- O passo 3 era "apagar as camadas de CSS mortas da mesa". **Antes de refatorar,
  eu medi** — abri o app num navegador de verdade, desliguei cada camada uma por
  uma e comparei tudo o que aparece na tela.
- **Resultado: nenhuma delas é lixo.** Desligar cada uma muda de 6 a 18 coisas —
  o botão ✕ encolhe, a marca do feltro sai do lugar, o "Ver dicas" perde a cor,
  as suas cartas mudam de tamanho. Não é entulho acumulado: **é a base do visual
  espalhada em 4 arquivos**.
- **Decisão: não fazer.** Seria migrar regras vivas, com risco alto e **zero
  ganho visível pra você**. Fica pra quando houver uma mudança estrutural na
  mesa que justifique. Está tudo registrado em
  `docs/handoff/2026-09-10-EXPERIMENTO-camadas-css.md`.
- **O que ficou de bom:** criei uma ferramenta que **prova em segundos** se uma
  mudança visual mexeu em algo que não devia (`tools/layout-fingerprint/`). É
  exatamente o que faltava no dia em que eu apaguei sem querer um bloco inteiro
  e as suas cartas encolheram — os testes ficaram verdes porque nenhum deles
  olha a tela. Esse agora olha.

## 2026-09-10 — Claude — Dica muda a cada lance TAMBÉM no pós-flop + cartas somem no fold
**1. Pós-flop por decisão (fecha o que faltava).**
Antes, o app avaliava **uma decisão por rua**. Se você apostava no flop, levava um
raise e decidia de novo **na mesma rua**, só a aposta era avaliada. Agora cada
lance tem o seu veredito. Exemplo testado numa mão real:
- você aposta no flop → *"recomendava APOSTA · você fez APOSTA ✓"*;
- o vilão dá raise, você paga → a barra vira *"recomendava RAISE · você fez CALL ✗
  · 👍 pagar valia +18,0bb"*.
O limite honesto continua escrito na tela: o range do vilão é apertado uma vez
por rua, então duas decisões na mesma rua usam a mesma leitura — por isso o selo
**ESTIMATIVA (PÓS-FLOP)**.

**2. Suas cartas somem quando você folda.**
Você reclamou que, depois de foldar, a mão continuava à mostra e parecia que você
ainda estava na jogada. Agora: **no quadro do próprio fold as cartas ainda
aparecem** (é ali que você vê o que jogou fora) e, **do quadro seguinte em
diante, elas somem e o assento apaga** — como numa mesa de verdade. Vale para
você e para os vilões, no jogo e no review.
- Suíte: 4012 testes passando (2 novos), SELO 61/61.

## 2026-09-10 — Claude — Passos 1 e 2 da auditoria: base do visual + botões que dá pra acertar
**Passo 1 — a base (você não vê, mas era a causa da bagunça).**
Criei a camada oficial de medidas do app: espaçamento (4/8/12/16/24/32), raios,
escala de letra, tempo de animação, os 3 níveis de dourado e o **tamanho mínimo
de toque**. Antes existiam ~30 cores nomeadas e **zero** padrão de espaço ou
letra — por isso o app tinha 14 tamanhos de fonte diferentes e cada tela parecia
de uma época. **Nada mudou de aparência nesta parte**: é só a régua. A regra
agora é: código novo usa a régua.

**Passo 2 — o que você sente na mão.**
- **Botões pequenos demais viraram alvos de verdade.** A setinha era 24px, os
  atalhos Pote/4BB/3BB eram 26px e o "Ver dicas" 26px — o mínimo é 44px. Agora
  os atalhos e o "Ver dicas" têm 40px e a setinha tem 32px **com área de toque de
  44px que se estende só pra cima** (pra ela não roubar o toque do Call, que fica
  logo abaixo). Como esses botões flutuam sobre o feltro, **a mesa não encolheu**.
- **Os valores dos botões pararam de ser miudinhos.** "Call 7bb" e "RAISE 12BB"
  estavam com 9px; os atalhos com 8px. Foram pro piso de leitura (11–12px).
- **A plaquinha de ação do vilão** (Fold / Call 2bb) subiu pra 11px — é decisão,
  não pode ser miúda.
- **No Review**, as setas ficaram com 44px e os botões de rua com 40px. Como
  ficaram apertados na largura, o "Pré-Flop" virou **"Pré"** e o **⏭ saiu da
  barra**: agora é um botão redondo flutuando no canto, acima dela.
- Suíte: 4010 testes passando, SELO 61/61.

## 2026-09-10 — Claude — Auditoria do ChatGPT revisada e guardada no projeto
*(Só documento — nada do app mudou nesta entrada.)*
- Li a "Auditoria Premium" do ChatGPT inteira e conferi **cada afirmação contra o
  código**. O resultado está em
  **`docs/handoff/2026-09-10-AUDITORIA-ATUALIZADA.md`**, e é ele que vale quando
  divergir do PDF.
- **O diagnóstico dele está certo:** o app tem mais conteúdo do que a tela
  consegue mostrar, e o salto vem de organizar, não de adicionar.
- **Confirmei com número o achado principal:** 12 arquivos de CSS (um com 241 KB),
  455 `!important`, 327 estilos soltos em 51 arquivos, 14 tamanhos de letra
  diferentes entre 8 e 17px, e **zero** padrão de espaçamento. É a causa-raiz das
  brigas de layout que a gente viveu.
- **Ele pegou uma dívida minha:** vários botões estão abaixo do tamanho mínimo de
  toque (a setinha com 24px, os presets com 26px, "Ver dicas" com 26px — o mínimo
  é 44px). Fui eu que apertei pra caber na tela.
- **Corrigi 3 recomendações que estavam desatualizadas:** ele pede pra manter o
  2BB (você mandou tirar), pede o herói "só um pouco maior" (a sua mão é a maior
  da mesa de propósito) e pede pra congelar o motor (se valesse, o bug do BB
  mandando foldar AK ainda estaria no ar).
- **E anotei o que faltou nele:** a tela de Review nem foi auditada, não há
  capítulo sobre honestidade dos selos, nada sobre o "fechar e abrir 2×" e o
  contraste não foi medido.

## 2026-09-10 — Claude — A dica agora muda a CADA decisão sua no pré-flop
Você sentiu falta disso e tinha razão: **o app avaliava só a PRIMEIRA decisão
pré-flop da mão**. Se você abria, o vilão dava re-raise e você decidia de novo,
a segunda decisão ficava sem veredito — a barra continuava mostrando a primeira.
- **Agora cada decisão sua tem o seu veredito**, e a barra muda conforme você
  avança os passos do replay. Exemplo real testado: você abre com AJ → *"Coach
  recomendava RAISE · você fez RAISE ✓"*; o vilão dá 3-bet e você folda → a barra
  vira *"Coach recomendava FOLD · você fez FOLD ✓"*.
- **De quebra, a segunda decisão ficou mais certa.** Quando é VOCÊ que abriu e
  levou o 3-bet, o motor usa o caminho "vs 3-bet" (que assume que você abriu).
  Quando você ainda não tinha aumentado e já chegou aberto + 3-betado na sua
  frente, ele usa a régua de "cold contra 3-bet", que é bem mais apertada. Antes
  os dois casos caíam na mesma régua.
- Contra all-in a conta continua sendo preço × equity, em qualquer decisão.

⚠️ **Falta o mesmo no PÓS-FLOP:** se você aposta no flop e leva um raise na mesma
rua, ainda só a primeira decisão daquela rua é avaliada. É o próximo passo — te
aviso quando estiver pronto.
- Suíte: 4010 testes passando (2 novos), SELO 61/61.

## 2026-09-10 — Claude — Review: fim das repetições na tela
Você apontou certo: a mesma informação aparecia 2 ou 3 vezes.
- **A faixa de narração embaixo da mesa saiu.** Ela dizia "Vilão 5: Call 3.4bb"
  — exatamente o que já estava escrito na plaquinha do assento dele, com a ficha
  de 3.4bb do lado, e a rua já estava marcada nos botões Pré-Flop/Flop/Turn/River.
  Era repetição pura. Sobrou espaço e a mesa desceu pra ocupar.
- **A plaquinha do assento parou de repetir o nome.** Era "Vilão 5: Call 3.4bb"
  logo abaixo do nome "Vilão 5". Agora é só a ação: **"Call 3.4bb"**.
- Tela: Perfil → Importar → replay. Suíte: 4008 testes passando, SELO 61/61.

## 2026-09-10 — Claude — Review: a ficha que VOCÊ apostou voltou pro seu lugar
- A sua ficha apostada estava subindo pro meio da mesa e parecia ficha de outro
  jogador (ou de ninguém). Agora ela fica **colada no seu assento**, no canto de
  cima à direita — o selo "VOCÊ" ocupa o meio e a plaquinha da posição, a
  esquerda, então esse canto ficou livre pra ela.
- Tela: Perfil → Importar → replay. Suíte: 4008 testes passando, SELO 61/61.

## 2026-09-10 — Claude — ⚠️ BUG GRAVE DE MOTOR CORRIGIDO: o BB estava sendo mandado FOLDAR
Você pegou um erro sério, e era do MOTOR (não do layout). Três coisas:

**1. O BB nunca mais folda um flop que já está pago.**
Quando ninguém aumentava (pote só com limpers), o motor mandava **FOLDAR** — e
mandava foldar TUDO, inclusive **AK**. Motivo: a "range de abertura do BB" vale
0% por definição (ninguém *abre* do big blind), então toda mão caía fora da
range e a resposta padrão era fold. Agora, no BB e com o pote não aberto:
- mão forte → **aumenta** (isola quem entrou barato);
- o resto → **passa** e vê o flop, que já está pago.
Foldar ali era jogar fora um flop pelo qual você já pagou.

**2. O BB agora defende pelo PREÇO.** Contra um min-raise (você completa uma
ninharia num pote grande), a largura de defesa era a mesma de um aumento
padrão — e mãos como **T7s pagando 0,5bb num pote de 5,7bb** saíam como fold.
Agora o tamanho da aposta entra na conta. **Contra o aumento padrão nada muda**
(o gabarito e o benchmark externo ficaram intactos).

**3. Efeito colateral honesto:** na tela "Anatomia do torneio", o "Fold ideal"
caiu de ~80% para ~74%. O número antigo embutia folds impossíveis do BB. O
número novo é o certo.

Também: a ficha que você apostou parou de cair em cima do selo "VOCÊ".

⚠️ Isso muda o **placar do seu review**: parte das mãos marcadas como "errei"
eram erro do app, não seu. Reimporte a sessão pra ver o placar certo.
- SELO GTO segue **61/61**. Suíte: **4008 testes** passando (5 novos, de
  regressão, pra esse bug nunca mais voltar).

## 2026-09-10 — Claude — REVIEW: nomes de gente, plaquinha fora da carta e a sua mão sempre visível
- **Os nomes viraram "Vilão 1" a "Vilão 8" e "Você".** Aqueles códigos do site
  ("a968e2a8", "756ec986") não diziam nada, ocupavam o quadradinho inteiro e
  ainda cobriam carta. Agora o círculo mostra o **número** do vilão, então dá pra
  identificar cada um de relance. Vale também na narração ("Você: Raise → 2.2bb")
  e no resultado ("Vilão 1 levou o pote").
- **A plaquinha da sua posição (BB/CO/…) saiu de cima da sua carta** — foi pra
  fora do quadradinho, ao lado do selo "VOCÊ", igual à mesa de jogo.
- **As suas cartas continuam à vista mesmo nas mãos que você foldou.** Antes,
  quando você foldava, as suas cartas sumiam e você não conseguia rever o que
  jogou fora — que é justamente o que mais interessa num review. O assento
  apaga (pra ficar claro que você saiu), mas a mão continua legível.
- **O painel de resultado virou uma folha embaixo**: a mesa continua à vista por
  cima dele (antes ele tomava a tela inteira e ficava metade vazio).
- Tela: Perfil → Importar → replay. Suíte: 4003 testes passando, SELO 61/61.

## 2026-09-09 — Claude — REVIEW EM TELA CHEIA (a mesa virou a tela inteira)
Você estava certo: a tela tinha **cinco fileiras de botão** brigando por altura
com a mesa. Refiz a tela:
- **A mesa agora é o fundo da tela inteira.** Todo o resto flutua sobre o feltro
  em faixas finas — nada mais divide espaço com a mesa.
- **Sobraram 3 faixas:** topo (✕ · MÃO 4/182 · ◀◀ ▶▶ · ⋯), o veredito do coach
  e uma **barra única embaixo** (◀ · Pré-Flop Flop Turn River · ⏭ · ▶).
- **Agora dá pra tocar na mesa pra andar:** toque na **metade direita** avança um
  lance, na **metade esquerda** volta. As setinhas continuam na barra pra quem
  preferir botão.
- **Sumiram da tela** (foram pro menu ⋯): filtro de mãos (Todas/Joguei/Errei),
  placar, "Todas as ações da mão", diagnóstico e "importar outra sessão". Estão
  todos a um toque no ⋯, sem ocupar a mesa.
- A plaquinha de ação do herói saiu (ela repetia a narração logo abaixo da mesa).
- Tela: Perfil → Importar → replay. Suíte: 4003 testes passando, SELO 61/61.

## 2026-09-09 — Claude — REVIEW com 9 jogadores: ajustes finos
Testei o review com uma mesa cheia (9 jogadores, com ante) e ajustei o que
aparecia torto:
- **A sua ficha apostada saiu de cima das suas cartas.** Ela era calculada pela
  posição padrão do assento; como no review você fica um pouco mais alto, ela
  caía em cima da mão.
- **Pote e cartas comunitárias desceram pra faixa livre** entre as fileiras —
  com 9 jogadores o board encostava nos jogadores das laterais.
- **Confirmado com a mesa cheia:** os antes não poluem mais o feltro (o pote já
  mostra tudo), os 9 pods cabem sem se cobrir e quem foldou fica apagado.
- Tela: Perfil → Importar → replay. Suíte: 4003 testes passando, SELO 61/61.

## 2026-09-09 — Claude — REVIEW: quanto o fold/call custou, em bb
- **Agora o review diz o preço da decisão.** Quando você estava numa situação de
  **pagar ou foldar** no pós-flop, aparece **"💸 custou ≈ X,Xbb"** na barra do
  coach. Quando você acertou o lado, aparece **"👍 pagar valia +X,Xbb"**.
- **Como a conta é feita (sem invenção):** EV de pagar = equity × (pote + call) −
  call. Como foldar vale zero, nesses spots esse número **é exatamente** a
  diferença entre as duas escolhas. A equity vem de simulação contra o range que
  o vilão mostrou pelas ações dele.
- **Onde NÃO aparece, de propósito:** erro de tamanho de aposta e decisão
  pré-flop. Ali eu teria que chutar, e chute não entra no app. O selo
  **ESTIMATIVA (PÓS-FLOP)** continua do lado, porque o range do vilão é deduzido.
- **Detalhe honesto:** o filtro "Errei" e o placar ✓/✗ no topo contam o
  **pré-flop** (é o que o app avalia em todas as mãos de uma vez). O pós-flop é
  avaliado mão a mão, quando você abre a mão. Está escrito no toque longo dos
  botões.
- Tela: Perfil → Importar → replay. Suíte: 4003 testes passando, SELO 61/61.

## 2026-09-09 — Claude — REVIEW: navegação, filtro de mãos e placar
Continuação do review (R2, R3 e R4 da análise):
- **A mão já abre na SUA decisão.** Antes você tinha de atravessar o fold de
  cada vilão pra chegar na sua vez. Agora o replay abre direto no seu primeiro
  lance — e o "◀ Anterior" rebobina se você quiser ver o que veio antes.
- **Botão "⏭ minha vez"** pula pro seu próximo lance dentro da mão.
- **Atalhos de rua** (Pré-Flop / Flop / Turn / River): pula direto pra rua que
  interessa, em vez de clicar "Próximo" dez vezes.
- **Filtro de mãos no topo: Todas · Joguei · Errei.** Num torneio de 182 mãos
  você jogou umas poucas — o resto é fold pré-flop. As setas ◀◀ ▶▶ passam a
  andar só dentro do filtro escolhido.
- **Placar da sessão** ao lado do filtro: **✓ acertos · ✗ erros** (conta só as
  mãos que o coach avaliou).
- **O selo "estimativa (pós-flop)" ficou visível de verdade.** No pré-flop a
  recomendação vem do motor certificado; do flop pra frente é estimativa, e isso
  precisa estar claro — principalmente se você for usar o review em vídeo.
- Tela: Perfil → Importar → replay. Suíte: 4003 testes passando, SELO 61/61.

## 2026-09-09 — Claude — MESA DE REVIEW: tela cheia e sem botão em cima de nada
Você tinha razão: **o review nunca recebeu nada do que a gente arrumou na mesa de
jogo** — todas as regras novas estavam presas à tela de jogo. Corrigido:
- **Tela cheia de verdade.** A mesa do review estava dentro de uma caixinha
  16/10, o conteúdo transbordava e por isso o **"Anterior"/"Próximo" caía em
  cima dos jogadores e das suas cartas**. Agora a tela é uma coluna: topo →
  dica → mesa (ocupa o resto) → passo → navegação. **Nada em cima de nada.**
- **A dica do coach subiu pro topo, em destaque:** "PRÉ-FLOP · Coach recomendava
  RAISE · você fez RAISE", com ✓ verde quando bate e ✗ vermelho quando não bate.
  Ela existia, mas estava empurrada pra fora da tela — por isso você não via.
- **Mesa com menos de 9 jogadores parou de ficar torta.** Antes o app usava só
  os primeiros pontos do anel de 9 e jogava todo mundo pra esquerda. Agora cada
  quantidade (2 a 9 jogadores) tem a sua roda simétrica.
- **Os antes sumiram do feltro.** Com 9 jogadores virava um tapete de "0.1bb" na
  frente de cada um. Agora o ante entra direto no pote; os blinds continuam como
  fichas (eles contam a história do pré-flop).
- **O resto do acabamento da mesa de jogo entrou no review:** marca dourada no
  feltro, cartas grandes na sua mão, plaquinha de posição legível, quem foldou
  apagado e o vencedor aceso.
- Tela: Perfil → Importar → replay da mão. Suíte: 4003 testes passando, SELO 61/61.

## 2026-09-09 — Claude — Correção: as cartas voltaram ao tamanho grande
- **Erro meu, e sério:** na atualização anterior eu editei o arquivo de layout
  cortando um pedaço maior do que devia e **apaguei sem querer todo o bloco 1 da
  auditoria** (cartas grandes do herói, nome/stack legíveis, plaquinha de
  posição com contraste). Por isso as cartas encolheram no seu celular. Já
  restaurei tudo — a sua carta voltou aos **50x70**, a maior da mesa.
- **Tirei o botão fixo de All-in** (o que ficava embaixo do 3BB), como você
  pediu. Pra ir de all-in agora: arraste a barra da setinha até o topo (ou toque
  em "Pote" quando o pote for maior que o seu stack) — o botão principal vira
  **ALL-IN em vermelho** avisando que é tudo.
- Tela: mesa de jogo. Suíte: 4003 testes passando, SELO 61/61.

## 2026-09-09 — Claude — Botão de ALL-IN, atalhos fixos, barra vertical e o pote andando
- **Agora dá pra ir de ALL-IN.** Não existia botão nenhum pra isso — se o coach
  dissesse "all-in", você não tinha como. Entrou o atalho **All-in** (em
  vermelho, embaixo do 3BB) e, quando o valor bate no teto, o botão principal
  passa a dizer **ALL-IN** em vermelho, pra você saber que está indo com tudo.
- **Pote / 4BB / 3BB ficaram FIXOS.** Não somem mais atrás da setinha — estão
  sempre à vista na coluna do RAISE.
- **A setinha agora abre a barra de aumento, em pé (vertical), ali mesmo.** Ela
  sobe do lado da sua mão, **à esquerda das suas cartas** — não passa em cima
  delas nem dos botões. Enquanto ela está aberta, o "Ver dicas" some (os dois
  disputam aquele canto); fecha a barra e ele volta. O valor que você escolhe
  aparece ao vivo no botão RAISE.
- **P7 da auditoria: o pote ANDA até quem ganhou.** Antes a mão acabava e o pote
  simplesmente sumia. Agora as fichas saem do meio da mesa e viajam até o
  vencedor (que já acende em dourado) — é o fecho da mão, e é o que rende no
  vídeo. Com isso a auditoria fecha: P1 a P9 todos feitos.
- Tela: mesa de jogo. Suíte: 4003 testes passando, SELO 61/61.

## 2026-09-09 — Claude — Marca em destaque, mesa mais oval e bloco 3
Pedidos seus desta rodada:
- **"CALL OU FOLD" maior e com cor forte.** Saiu do creme lavado: agora é um
  **dourado quente cheio (#f5c542)**, 21px, com um fio escuro embaixo que
  "grava" a marca no feltro e um brilho quente atrás. Aparece de longe e fica
  bonita no vídeo, sem competir com as cartas.
- **A mesa fechou e ficou mais oval.** Antes o feltro vazava 7% pra fora de cada
  lado — no seu celular ela parecia redonda e passava da tela. Agora ela fecha
  dentro da tela e as pontas ficaram menos circulares. **Os vilões não saíram do
  lugar**: eles são posicionados pela mesa, não pelo feltro. A formação que você
  aprovou está intacta.
- **A informação do torneio desceu pro miolo da mesa** (posição, faixa
  pontuável, blinds). Você não precisa mais olhar lá pro topo — ela fica na
  faixa livre entre as cartas do meio e a sua mão.

Bloco 3 da auditoria (o que eu já ia fazer):
- **Quem foldou virou quase fundo** — antes o quadradinho de quem saiu tinha o
  mesmo peso de quem ainda está na mão.
- **Momento de vitória:** quem leva o pote **acende em dourado e dá uma
  pulsada**. Antes a mão acabava e não acontecia nada — é o que dá clímax no
  vídeo.
- **A dica do coach parou de cortar o texto** (cabem 3 linhas agora).
- Tela: mesa de jogo. Suíte: 4003 testes passando, SELO 61/61.

## 2026-09-09 — Claude — Auditoria, bloco 2: MARCA e QUEM ESTÁ JOGANDO
- **"CALL OU FOLD" escrito em dourado no meio do feltro.** Era o que você tinha
  pedido e nunca apareceu direito: antes era só um logo de 42px com 16% de
  opacidade, que sumia. Agora é a marca escrita, no centro da mesa — aparece
  bonito no vídeo e fica atrás das cartas comunitárias, como marca d'água de
  mesa de verdade.
- **Tirei o quadradinho do logo de dentro do feltro:** aquele PNG tem fundo
  claro e no verde ele aparecia como um retângulo esbranquiçado, não como marca.
  O logo continua na abertura do app e no site. Se quiser ele de volta na mesa,
  é só falar.
- **Dá pra ver de longe quem está jogando.** Quem está na vez ganhou um **anel
  dourado grosso que pulsa**, e os **bots ganharam uma barrinha correndo**
  enquanto "pensam". No seu assento **não tem barra de tempo de propósito** —
  aqui você nunca perde a mão no relógio, o app é de estudo.
- Bônus: a plaquinha da sua posição (BTN/CO/…) saiu de cima da sua carta.
- Tela: mesa de jogo. Suíte: 4003 testes passando, SELO 61/61.

## 2026-09-09 — Claude — Auditoria de layout, bloco 1: LEGIBILIDADE
Três problemas que eu medi na mesa e corrigi:
- **Sua mão era a MENOR carta da mesa.** Media 24x47 contra 46x72 das cartas do
  meio — quase o dobro a favor delas. Agora a sua carta é **50x70, a maior da
  mesa**, do jeito que tem que ser (e do jeito que o GG faz).
- **Nome e stack dos vilões eram ilegíveis:** o nome saía com ~7 pixels e o stack
  com 8 (tinha uma redução de 20% aplicada em tudo dentro do quadradinho).
  Subiram pra ~10,5 e ~11 — e o assento ficou mais largo, então "O Certinho"
  parou de virar "O Certin...".
- **A plaquinha de posição (UTG/CO/BTN) era dourado sobre dourado** — contraste
  1,36:1, praticamente invisível. Virou texto quase preto sobre o dourado.
Junto disso: as fileiras de assentos foram reespaçadas pra ninguém se encostar
com as cartas maiores, o verso das cartas dos vilões ficou discreto, e o avatar
do herói saiu (a moldura dourada + "VOCÊ" já dizem que é você).
- Tela: mesa de jogo. Suíte: 4003 testes passando, SELO 61/61.

## 2026-09-09 — Claude — Cartas da mesa não cobrem mais os oponentes
- **O problema de verdade:** dois jogadores ficavam exatamente na mesma altura
  das cartas comunitárias. Quando vinha o flop/turn/river, as 5 cartas passavam
  **por cima dos pods da esquerda e da direita** (era isso que você via de
  estranho quando abria o range no fim da mão).
- **Arrumado:** os 9 assentos foram redistribuídos em 4 fileiras + você embaixo,
  deixando a **faixa do meio da mesa livre** só pro pote e pras cartas. Agora as
  comunitárias aparecem grandes, no meio, sem tapar ninguém.
- **A linha "🏆 X fichas simuladas" saiu de dentro da mesa** — ela caía por cima
  da dica e do "Pote".
- **Blinds/posição viraram UMA linha no topo do feltro** (antes eram 3 linhas no
  meio da mesa, brigando com a dica e com os pods), e a **dica do coach ficou
  logo abaixo dela**, larga e fácil de ler.
- Tela: mesa de jogo (pré-flop e showdown). Suíte: 4003 testes passando, SELO 61/61.

## 2026-09-08 — Claude — A mesa não sobe mais quando você abre a setinha
- **Antes:** ao tocar na setinha, as barras Pote/4BB/3BB entravam na barra de
  baixo e **empurravam a mesa pra cima**. **Agora:** essas barras **flutuam no
  canto direito** (onde já tinha espaço vazio) e a **mesa fica parada** — abre e
  fecha sem mexer em nada.
- **"Ver dicas" voltou pro canto de baixo à esquerda** (a direita agora é das
  barras de aumento), e a plaquinha "coach: ~Xbb" saiu de cima do feltro.
- Tela: mesa de jogo. Suíte: 4003 testes passando, SELO 61/61.

## 2026-09-08 — Claude — Cartas de volta ao tamanho que você aprovou
- **Cartas do jeito do seu print:** eu tinha aumentado demais e as plaquinhas
  "D"/"VOCÊ" começaram a encavalar no canto da carta. Voltei ao tamanho que
  você aprovou — e as plaquinhas ficaram limpas de novo em cima das cartas.
- **"Ver dicas" mudou pro canto de baixo à DIREITA** do feltro, porque na
  esquerda ele batia na plaquinha "coach: ~Xbb".
- Tela: mesa de jogo. Suíte: 4003 testes passando, SELO 61/61.

## 2026-09-08 — Claude — Mesa TELA CHEIA de ponta a ponta (referência GGPoker)
- **O feltro agora ocupa a tela inteira**, encostando nas bordas (sem tarja preta
  em volta) — do jeito do print do GGPoker que você mandou.
- **Dica do coach saiu do topo** e foi pro miolo da mesa, numa faixa livre logo
  acima do pote. Sem o "tocar para usar" — é só pra ler mesmo.
- **"Ver dicas" foi pro canto de baixo à esquerda do feltro**, onde não tapa
  ficha, carta nem pod de ninguém.
- **Blinds (25/50) foram pra dentro da mesa** (texto discreto, igual o GG faz com
  as infos do torneio).
- **Ajuste fino (slider) não aparece mais** na mesa — os tamanhos saem da coluna
  vertical que abre na setinha (Pote / 4BB / 3BB), em cima do RAISE.
- **Plaquinha de ação embaixo do nome saiu** (Fold / Call 2bb): as fichas na mesa
  já mostram isso, e o pod ficou menor, sobrando espaço.
- Tela: mesa de jogo. Suíte: 4003 testes passando, SELO 61/61.

## 2026-09-08 — Claude — Barra de aumentos como você pediu + cartas maiores
- **Só a setinha fica em cima do Call.** Ao tocar nela, os tamanhos
  **Pote / 4BB / 3BB** abrem no sentido vertical **em cima do RAISE** (e o
  ajuste fino aparece acima, numa faixa rasa). Fechou, some tudo.
- **Botões bem mais compactos** — pararam de comer meia tela: a barra fechada
  ocupa só a tirinha de baixo e a mesa fica com o resto.
- **Cartas maiores de novo:** as suas cartas voltaram a ficar grandes (50×71) e
  as cartas viradas dos vilões cresceram e ficaram legíveis no feltro.
- Tela: mesa de jogo. Suíte: 4003 testes passando, SELO 61/61.

## 2026-09-08 — Claude — MESA CONSERTADA DE VERDADE (olhei a tela antes de subir)
- **O bug da mesa cortada acabou.** A mesa estava aparecendo espremida num
  cantinho, com os botões cortados na beirada. Motivo: sobrou uma regra antiga
  de "centralizar" que **empurrava a mesa pra fora da tela**, e outra que
  **limitava a altura** da mesa (por isso sobrava aquele vazio preto embaixo).
  As duas foram zeradas no arquivo que manda no layout (`tableFinalLayout.css`).
- **Agora a mesa ocupa a tela inteira**, centralizada, no formato oval de mesa
  de poker — as suas cartas ficam grandes e os 9 jogadores cabem sem se cobrir.
- **Barra de aumentos do jeito que você pediu:** por padrão só aparece **uma
  setinha, logo acima do botão Call**. Tocando nela, abre **no sentido vertical**:
  ajuste fino (slider), depois Pote / 4BB / 3BB. Fechou, some e devolve o espaço.
- **Tirei o atalho "2BB"** da coluna — ele já é o próprio botão RAISE.
- **Como eu conferi desta vez:** abri o app aqui dentro num navegador de verdade,
  tirei print da mesa e **olhei** antes de subir. Chega de subir no escuro.
- Telas: mesa de jogo (Treinar → Jogar). Suíte: 4003 testes passando, SELO 61/61.

## 2026-09-08 — Claude — RESGATE do layout da mesa (parou a sobreposição)
- **Problema:** a mesa tinha virado uma briga de **4 arquivos de CSS** (cada rodada do
  ChatGPT criou uma camada nova com regras "flutuantes" e `!important`). Resultado: a
  **dica cobria os jogadores**, o **painel de aumento cobria a sua mão**, o **"Ver dicas"
  grudava no jogador da vez e tapava os pods**, e a mesa aparecia **cortada**.
- **O que fiz:** criei **um único arquivo de layout que manda em tudo**
  (`tableFinalLayout.css`, carregado por último). Ele impõe uma estrutura simples em
  coluna — **dica no topo → mesa no meio (ocupa todo o espaço) → status → botões
  embaixo** — com **tudo em fluxo, nada flutuando**. Assim é **impossível** um elemento
  cobrir o outro.
- **Também:** o **"Ver dicas" parou de seguir o jogador da vez** (ia pra cima dos pods);
  agora fica fixo no **canto superior direito**, e o **X de sair** no canto esquerdo.
  Os **atalhos de aumento (Pote/4BB/3BB/2BB)** viraram uma **coluna dentro da barra de
  baixo**, sem flutuar sobre a mesa. Mesa **centralizada** e em **tela cheia sempre**.
- Onde: **mesa do jogo no celular**. Sem mudança no motor, ranges, ICM ou decisões.

## 2026-09-08 — ChatGPT — Atualização 6: mesa centralizada e botões sem corte
- A mesa foi corrigida para proporção **4:3 horizontal**, centralizada com margem e com os **9 jogadores dentro do feltro**, menores e uniformes.
- **Fold / Call(Check) / Raise** ficam fixos na barra inferior; **Pote / 4BB / 3BB / 2BB** ficam em uma coluna própria à direita, sem sobreposição nem corte.
- O centro ficou mais limpo, com a logo **Call ou Fold** como marca d’água discreta, e **Ver dicas** foi deslocado para perto do jogador da vez. Onde: **mesa do jogo no celular**. Sem mudança no motor.

## 2026-09-08 — ChatGPT — Mesa rodada 5: presets editáveis e centralização
- Removido o **2BB duplicado** da coluna rápida; permanecem três atalhos de aumento, agora personalizáveis em BB e persistidos no aparelho.
- **Fold / Call(Check) / Raise** usam a largura útil inteira; a coluna rápida flutua acima sem comprimir os três botões principais.
- Mesa recebeu novo ajuste de centralização óptica, entorno um pouco mais claro e marca **Call ou Fold** menor para não disputar espaço com board/pote. Sem mudança no motor.

## 2026-09-08 — ChatGPT — Mesa rodada 4: cockpit, saída e atualização
- O botão **Treinar** volta a abrir primeiro o hub de treinos; a mesa não captura mais a navegação automaticamente.
- A mesa ganhou **X para sair**, entorno mais claro e geometria centralizada; Fold/Call/Raise ficam lado a lado e Pote/4BB/3BB/2BB viraram a coluna rápida à direita.
- A setinha agora abre só o **ajuste fino por slider**, e o botão de versão do Perfil força atualização real do PWA com feedback visível. Onde: **mesa, Treinar e Perfil**. Sem mudança no motor.

## 2026-09-08 — ChatGPT — Mesa fullscreen rodada 3
- A dica foi levada para dentro do feltro e a marca **Call ou Fold** ganhou destaque dourado no centro da mesa.
- Os aumentos **Pote/4BB/3BB/2BB** ficam recolhidos atrás de uma setinha e abrem para cima, liberando espaço para jogadores, cartas e ações.
- A mesa ficou centralizada e a região do herói foi protegida dos controles. Onde: **mesa do jogo no celular**. Sem mudança no motor.

## 2026-09-08 — ChatGPT — Mesa fullscreen rodada 2
- A mesa ficou mais centralizada e os jogadores menores, com avatar reduzido para deixar as cartas sempre livres.
- Os controles agora deixam **Desistir/Pagar à esquerda** e empilham **Pote/4BB/3BB/2BB/Aumentar à direita**; o status do torneio e **Ver dicas** ficam sobre o feltro.
- A tela de jogo passa a manter a experiência imersiva também entre as mãos. Onde: **mesa do jogo no celular**. Sem mudança no motor.

## 2026-09-07 — ChatGPT — Mesa premium consolidada
- A mesa em tela cheia ganhou uma hierarquia mais limpa: jogadores menos “encaixotados”, herói/vez de agir mais destacados e centro da mesa mais legível.
- Os controles continuam flutuando sobre o feltro, agora com menos painel escuro e aparência mais integrada à mesa.
- Onde: **mesa do jogo durante a mão**. Sem mudança no motor, ranges, ICM ou decisões.

## 2026-09-07 — ChatGPT — Mesa em tela cheia com controles sobre o feltro
- Durante a mão no celular, a **mesa agora usa a viewport inteira** e o feltro vai quase até as bordas.
- **Fold/Call/Raise e o slider flutuam na parte inferior sobre o feltro**, em vez de diminuir a área da mesa.
- O assento do herói foi reposicionado para continuar visível acima dos controles; há ajuste próprio para celular deitado.
- Onde: **mesa do jogo durante a mão**. Sem mudança no motor, ranges, ICM ou decisões.

## 2026-09-07 — Claude — Tela cheia de verdade (mesa preenche, sem vão)
- A tentativa anterior deixava a mesa igual e um **vão vazio embaixo**. Refiz com um
  método firme: durante a mão, a tela de jogo vira uma **camada fixa de tela cheia** e
  a **mesa estica pra preencher tudo**, com os botões colados embaixo — **sem vão**.
- Onde: **mesa do jogo** (durante a mão). Entre as mãos, layout normal volta.

## 2026-09-07 — Claude — Conserto do deploy (teste "azarado" travava a publicação) — nada visível
**Ajuste interno: NADA muda no app.** Descobri por que às vezes "não atualizava": a
publicação roda os testes antes e um teste do Drill Pós-Flop usava sorteio aleatório
(`Math.random`) — em ~8% das vezes ele falhava por azar e **bloqueava o deploy**. Deixei
o teste com semente fixa (determinístico), então a publicação não trava mais por isso.
(A publicação do #4 tinha falhado por causa disso; re-rodei e subiu.)

## 2026-09-07 — Claude — Botões flutuando (upgrade #4) — mesa enche a tela
- Durante a mão, os botões de ação (Fold/Call/Raise + slider) agora **flutuam sobre
  o feltro** (com um gradiente que deixa o feltro aparecer atrás), em vez de um painel
  sólido comendo uma faixa fixa. A **mesa estica por cima** e enche a tela.
- Motivo: a mesa "continuava do mesmo tamanho" porque a barra de botões ocupava um
  espaço fixo; agora ela flutua e libera a mesa.
- Onde: **mesa do jogo** (durante a mão). Entre as mãos volta ao layout normal.

## 2026-09-07 — Claude — Correções: mesa preenche a tela + botão "fechar" do range
- **Mesa imersiva:** antes ela só subia e sobrava um **vão vazio embaixo** (a mesa tinha
  altura fixa e travava num mínimo). Agora ela **estica de verdade** pra preencher a
  tela toda durante a mão (flexbox), sem espaço vago.
- **Popup de range:** o botão **"fechar" estava sumindo** atrás do menu de baixo.
  Corrigido (o popup agora fica por cima do menu).
- Onde: **mesa do jogo** e **popup de range**.

## 2026-09-07 — Claude — Modo imersivo / tela cheia (upgrade #3 de 4)
- **Enquanto a mão rola**, a barra de cima (marca + abas) e a faixa
  "SESSÃO/DECISÕES/PRECISÃO" **somem**, junto com o menu de baixo — a **mesa toma
  quase a tela toda**. Fica ótimo pra gravar vídeo. **Entre as mãos tudo volta**
  (some só durante a mão).
- A marca "Call ou Fold" continua no feltro (marca d'água), então o vídeo segue com
  identidade.
- Onde: **mesa do jogo**. 3º dos 4 upgrades (falta só: botões flutuando).

## 2026-09-07 — Claude — Cartas atrás do avatar (upgrade #2 de 4)
- As cartas de cada jogador agora ficam **no topo do pod, com o avatar por cima**
  (estilo GG): os versos dos vilões "espiam" atrás do avatar e a sua mão fica em
  destaque acima. Pods ainda mais limpos e enxutos.
- Onde: **mesa do jogo** e **Review**. 2º dos 4 upgrades (faltam: modo imersivo/tela
  cheia total e botões flutuando).

## 2026-09-07 — Claude — Feltro premium (upgrade #1 de 4)
- O feltro ganhou acabamento "caro": **verde com mais profundidade**, **brilho
  central**, **vinheta** escura nas bordas e um **aro tipo almofada com fio dourado**
  em volta (parece a borda de couro da mesa de verdade).
- Onde: **mesa do jogo** e **Review**. É o 1º dos 4 upgrades combinados (faltam:
  cartas atrás do avatar, modo imersivo/tela cheia total e botões flutuando).

## 2026-09-07 — Claude — Mesa mais limpa: versos pequenos + pods compactos
- As **cartas escondidas dos vilões** (os versos "CF") estavam grandes e enchiam a
  mesa, escondendo o feltro. Agora ficam **pequenas e discretas** — a mesa "respira"
  e o feltro verde aparece de novo.
- Os **pods** ficaram mais **compactos**, com menos sobreposição entre jogadores.
- As cartas reveladas no showdown seguem legíveis, e a sua mão (herói) segue grande.
- Onde: **mesa do jogo** e **Review**.

## 2026-09-07 — Claude — Nova mesa (Etapa 3): mesa maior + Review em tela cheia
- A **mesa de jogo ficou bem maior** — o teto de altura subiu (de 515 pra 700px) e
  sobra menos espaço pras barras, então a mesa enche mais a tela nos celulares
  grandes. Sua **carta (herói) aumentou** também.
- O **Review (Replay da mão) agora abre em TELA CHEIA**, com a mesma mesa grande do
  jogo — em vez da janelinha antiga. Fica ótimo pra gravar vídeo.
- Onde: **mesa do jogo** e **Review/Replay** (Hoje/Treino, ao revisar uma mão).
- Passo firme rumo à tela cheia total; ainda dá pra afinar o tamanho com seu retorno.

## 2026-09-07 — Claude — Popup de range modernizado + cartas da mão limpas
- Quando você **clica no "RANGE"** de um jogador, o popup ganhou um visual novo,
  no capricho da mesa: fundo verde-dourado, título e "profundidade" (bb) em pílula
  dourada, mão do jogador num painel, legenda em etiquetas e botão **fechar** dourado.
- As **duas cartas da mão** no topo do popup estavam poluídas (índice no canto) —
  agora ficam **limpas, centralizadas e grandes**, fáceis de ler.
- Onde: **popup de range** (Jogar/Treino, ao tocar no selo RANGE de um jogador).

## 2026-09-07 — Claude — Ajuste: cartas do vilão mais limpas e legíveis
- As **cartas dos oponentes** (pequenas) estavam poluídas com o índice no canto +
  naipe grande. Agora as cartas **pequenas** ficam **limpas e centralizadas**
  (número sobre naipe) e um pouco **maiores** pra ler. O índice no canto + naipe
  grande fica só nas **cartas grandes** (mesa e a sua mão).
- Também recentralizei o **verso das cartas** (tinha desalinhado na Etapa 1).
- Onde: **mesa do jogo**. Ajuste dentro da reforma da mesa (Etapas 3 e 4 ainda vêm).

## 2026-09-07 — Claude — Nova mesa (Etapa 2): avatar + fichas em BB azul nos jogadores
- Cada jogador agora tem um **avatar** (círculo com a inicial do nome, cor própria) —
  dá cara à mesa no estilo GG. É um selo gerado, não foto real (o app não guarda
  avatar/bandeira por jogador).
- As **fichas (stack)** dos oponentes ficaram em **azul BB**, mais fáceis de bater o olho.
  O seu assento (herói) mantém o destaque dourado de sempre.
- Onde: **mesa do jogo**. É a **2ª etapa** da reforma da mesa. Faltam: mesa em tela
  cheia (Etapa 3) e botões flutuantes (Etapa 4).

## 2026-09-07 — Claude — Nova mesa (Etapa 1): cartas com número/naipe no canto
- As cartas agora têm o **número e o naipe no canto** e um **naipe grande** embaixo,
  igual a um baralho de verdade (e igual à maquete que você aprovou). Fica fácil de
  ler mesmo quando as cartas se encostam.
- Onde: **mesa do jogo** (Torneio / Treino).
- É a **1ª etapa** da reforma da mesa (rumo ao visual estilo GG). As próximas etapas
  (pods dos jogadores, mesa em tela cheia e botões flutuantes) vêm em seguida, cada
  uma testada e no ar aos poucos pra não quebrar o app.

## 2026-09-06 — Claude — Cartas mais legíveis: baralho de 4 cores + cartas maiores
- Agora cada naipe tem **cor própria** (padrão dos apps modernos tipo GGPoker):
  **espadas preto, copas vermelho, ouros azul, paus verde**. Antes eram só duas
  cores (vermelho/preto), o que fazia copas×ouros e paus×espadas se confundirem.
- As **cartas da mesa** (comunitárias) e as **suas cartas** (mão do herói) ficaram
  **maiores**, com número e naipe graúdos, pra ler de um olhar. As cartas dos
  oponentes (versos) seguem pequenas — não precisa ler.
- Onde: **mesa do jogo** (Torneio / Treino). É o primeiro passo da melhoria de
  layout; o redesign visual completo da mesa fica com o Manus.

## 2026-09-06 — Claude — Área de handoff Claude⇄ChatGPT no Git — nada visível
**Ajuste interno: NADA muda no app.** Criei uma pasta `docs/handoff/` pros dois
agentes trocarem direto pelo Git, sem o Allan no meio: o Claude escreve os pedidos
em `REQUESTS.md`, o ChatGPT deposita os fixtures em `inbox/`, e o Claude processa
e move pra `processed/`. Já deixei a lista de prioridades pro ChatGPT (completar o
artigo de ICM <10bb e ampliar o blind battle).

## 2026-09-06 — Claude — Motor V3: 2º lote do ChatGPT + banco de evidências — nada visível
**Ajuste interno: NADA muda no app.** Entrou o 2º lote do ChatGPT (6 spots de
bolha/mesa final, artigo de <10bb ICM). Implementei a regra que o ChatGPT sugeriu
(e que é a certa): **dois níveis** —
- **PRONTO-PRO-LIVE:** contexto completo + célula pura por mão → pode dirigir o
  jogo. Desse lote, só o **BUB3** (LJ 8bb defendendo shove na bolha) se qualifica.
- **EVIDÊNCIA:** certificado pela fonte mas com contexto incompleto/sem células →
  guardado no banco de evidências pra completar depois, **nunca** dirige o jogo
  (BUB1, BUB2, BUB4, FT8).
- Um classificador automático (`assessLiveReadiness`) separa os dois; o validador
  foi relaxado pra aceitar evidência, mantendo o rigor (barra parcial vai em
  notes, não inventa nada).
- Nota honesta: o BUB3 é bolha/ICM — em chipEV o V2 pagaria TT/AQs (certo pelas
  odds); o fold certificado é 100% ICM, então comparar exige a estrutura de
  premiação (próximo passo). Não é bug do V2. SELO 61/61, 3978 testes verdes.

## 2026-09-06 — Claude — 1ª melhoria do V3 no motor: AKo/AQo all-in a ~20bb (BB vs SB)
**Primeira correção de jogo vinda do gabarito do V3!** O auditor (comparando o V2
com o dado real do solver, spot FTBB4) achou um vazamento: no **BB defendendo o
open do SB** com stack curto (13–22bb), o V2 dava um **3-bet não-all-in** com
**AKo/AQo** — e a 20bb isso te compromete e ainda joga dominado se levar um shove.
O solver dá **all-in** nessas. Corrigido: **AKo/AQo agora vão de all-in** nesse
spot (broadway offsuit, stack curto). As suited/AA/pares seguem no 3-bet normal
(como o solver também mostra). A 100bb e ≤10bb nada muda. Onde: sua dica quando
você está no BB, curto, contra um open do SB. SELO 61/61, 3974 testes verdes.
