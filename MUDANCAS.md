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
- **Mesa imersiva:** antes ela só subia e sobrava um **vão embaixo** (a mesa tinha
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
