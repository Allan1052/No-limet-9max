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