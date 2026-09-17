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

## 2026-09-17 — Claude — O coach passa a saber quando calar a boca (e a ver a mesa inteira)

- **Agora ele mede a importância da mão antes de falar.** Você pediu: *"8 e 2 é
  fold, pronto, acabou. Mas quando eu dou um raise, quero saber o porquê, a
  importância, o que a mão representa."* A régua não é "decisão apertada" — é
  **você estar colocando ficha no pote**. Mão que você joga ganha explicação;
  lixo que você joga fora, não.
- **Medi antes de mexer.** Rodei 18 torneios em três buy-ins para saber quanto o
  coach fala hoje (ele comenta 100% das decisões). Com a régua nova, **53% a 63%
  das decisões ficariam em silêncio** — sobrando atenção para as que ensinam.
  Régua: `CF_REGUA=1 npx vitest run src/sim/_vozRun.test.ts`.
- **O mapa da mesa saiu do escuro.** O motor SEMPRE soube quem cobre quem e que
  tem um short de 5bb na mesa — a lista de stacks já era montada para a conta de
  ICM e morria ali dentro. Agora ela vira frase: *"Você cobre 5 jogadores, mas
  existe 1 que cobre você"*, *"Tem um stack de 7bb nesta mesa lutando para
  sobreviver"*.
- **Torneio curto, review detalhado.** Na mesa, no meio da decisão, o coach
  mostra no máximo 2 camadas — o essencial. No review ele abre tudo que o motor
  provou, na ordem de um comentarista: primeiro a mesa, depois o vilão, depois a
  conta. O review é superconjunto da mesa: nada some quando você aprofunda.
- **O que NÃO mudou: a estratégia.** Nenhuma decisão do motor foi alterada.
  SELO GTO segue 61/61. O que mudou é o quanto e o quando o coach fala.
- **A trava continua.** As frases novas do mapa mostram a MESA, nunca a CAUSA:
  o app diz que existe um short de 7bb, e nunca que foi ele que te fez foldar —
  isso só o cálculo de ICM pode afirmar. Tem teste proibindo as palavras
  "por isso", "fez você", "obriga".
- **Onde:** dica na mesa (Torneio) e tela de Review.


Regras do registro:
- **Mais novo em cima** (a entrada mais recente sempre no topo da lista abaixo).
- **Uma entrada por push** que muda o app (UI, motor, site ou textos).
- Escreva pro Allan **ler e entender** — nada de jargão sozinho.
- Se foi só ajuste interno que ele não vê, diga isso ("ajuste interno, sem
  mudança visível").

---

## 2026-09-16 — Claude — 🔧 Os bots passaram do ponto · e duas telas que mentiam

Você jogou o $10.300 e trouxe três coisas. Todas confirmadas, todas corrigidas.

### 1. "Nem parece que é um torneio de 10,3k"

Você estava certo — eu passei da conta. Medi 2.500 mãos por faixa e olhei o
que tinha feito:

| No $10.300 | Antes de você reclamar | Referência real | Agora |
|---|---|---|---|
| Abriu e levou 3-bet | **55%** | ~30% | **42%** |
| Seguiu apostando no turn | **84%** | 50–65% | **65%** |
| 4-bet | com meio range | só premium | **AA · KK · QQ · JJ · AK · AQs** |

**O 4-bet light tinha uma causa boba:** o mesmo número governava o 3-bet e o
4-bet. Então um bot que 3-betava como regular também 4-betava como regular — e
4-betar na mesma frequência com que se 3-beta é exatamente jogar light. Agora o
leque fecha a cada degrau da guerra, como acontece de verdade: 4-bet é AA, KK,
QQ, JJ, AK e AQs. Só isso.

O campo continua sendo o mais duro de todos (check-raise 15% contra 8% do
micro), mas parou de ser caricato.

### 2. 🐞 "Agressivo demais" em quase todas as posições

Você viu 🔥 em **oito das nove posições** — acertando de 80% a 94% em todas.
Impossível, e a causa é aritmética: bastavam **3 erros**, sendo 2 do mesmo lado,
para o app carimbar a tendência.

Fiz a conta: **com 3 erros, a chance de carimbar um rótulo por puro acaso é de
50%.** É cara-ou-coroa, não diagnóstico. Com nove posições na tela, quase todas
ganhavam carimbo.

Agora são precisos **8 erros**, uma proporção de 70% e uma margem clara. E,
principalmente: **posição que já vai bem não recebe rótulo** — acertar 94% não é
lugar de melhorar, e apontar a direção dos pouquíssimos erros que sobraram é
inventar defeito.

### 3. 🐞 "Fold" aparecendo como "Perdeu"

Foldar no pré-flop sem pôr uma ficha **não é perder** — é não disputar. A tela
olhava só o que você levou; se foi zero, escrevia "Perdeu".

Agora o histórico mostra o **saldo real da mão**: `+6bb`, `−1bb`, ou
**"não disputou"** quando você largou sem investir nada. E consertei também o
outro lado: quem pagava 10 e levava 10 aparecia como vitória — empate agora não
mostra resultado nenhum, porque não houve.

**Onde está:** Perfil (acerto por posição) · Histórico de Mãos · e a mesa, em
todas as faixas.

---

## 2026-09-15 — Claude — ▶️ Tocar no erro abre a MÃO · e as cartas do flop desembaraçaram

### 🐞 Primeiro: as cartas embaraçadas — foi eu

Você viu certo. Eu tinha estreitado a faixa das cartas comunitárias para elas
pararem de cobrir os jogadores das laterais, mas deixei a carta com **tamanho
fixo**. Cinco cartas não cabiam no espaço que sobrou e se amassavam umas nas
outras.

Agora a carta é **calculada a partir do espaço que existe**: ela encolhe sozinha
quando a tela é estreita, sempre com folga entre uma e outra. Cinco cartas
cabem por construção, em qualquer celular. Medido: **zero sobreposição**.

### ▶️ Agora o principal: tocar no erro te leva de volta à mão

Era o que você pediu: *"se eu clicar nas mãos ruins, abria só as mãos ruins pra
me ver elas... essas informações que vem escrita aí, eu queria ter um jeito de
ter ela lá na tela"*.

No fim do torneio, toque em **Ok / Imprecisas / Ruins** como você já fazia. O
que mudou:

- **Toque em qualquer decisão da lista** → a mesa abre naquela mão, em tela
  cheia, no replay passo a passo.
- **A explicação vai junto e fica fixa na tela** enquanto você anda pela mão.
  Não precisa mais decorar a frase antes de voltar.
- **Você navega só entre as mãos daquele filtro:** "◀ mão · mão 3 de 9 · mão ▶".
  Clicou em Ruins? Só as ruins. Nada de procurar no meio das outras.
- Tem também um **"▶ Rever estas N mãos na mesa"** no topo, para começar pela
  primeira e ir passando.

### 🥊 E sobre os bots

Fico contente que já deu pra sentir. Os números da simulação diziam a mesma
coisa, mas o que vale é você notando na mesa.

**Onde está:** fim do torneio → toque numa decisão da lista.

---

## 2026-09-15 — Claude — 🐞 Dois bugs meus na "memória da mesa" (peguei jogando)

Você pediu para eu jogar de novo e comparar. Joguei 70 torneios — e a simulação
me entregou dois erros que eu tinha acabado de criar. Corrigidos.

**1. O contador de mãos estourava.** A mesa dizia que tinha **180.583 mãos**
suas no arquivo depois de 24 torneios. O limite é 600. Eu somava o total de
novo a cada mão, e a conta explodia.

**2. Pior: a memória não chegava nos bots.** Ela alimentava só a FRASE ("o
Furacão reparou que você larga 78% dos flops"). A adaptação dos vilões continuava
olhando apenas a sessão em curso. Ou seja: **a mesa dizia que te conhecia e
jogava exatamente igual.** Promessa que o app não cumpria — não podia ficar de
pé, e agora tem teste guardando.

Agora a leitura acumulada chega mesmo nos bots: na terceira noite eles te
exploram desde a primeira mão, em vez de precisar de ~30 mãos para te ler de
novo do zero.

**Também corrigi um texto que mentia:** onde estava escrito "sessões" eram na
verdade torneios (cada vez que você senta conta um). A frase do Perfil agora diz
"torneios", que é o que o app realmente conta.

**Onde está:** ☰ Perfil → "👁 O que a mesa sabe de você".

---

## 2026-09-15 — Claude — 🧬 Evolução dos bots: o que funciona e o que eu provei que não

Sua ideia: *"teria como deixar os bots com evolução automática? Cada bot usaria
o outro pra evoluir. Assim cada vez mais ficaria difícil enfrentar eles."*

**Dá.** Construí o motor inteiro, rodei — e descobri uma coisa importante no
caminho. Vou te contar as duas partes.

### ❌ A parte que NÃO fecha a conta (e os números)

Fiz o algoritmo: cada bot vira um "genoma" (os números que mandam no jogo dele),
eles disputam milhares de mãos, quem lucra mais deixa descendentes com pequenas
mudanças. Rodei três gerações no campo de $10.300.

O resultado veio assim:

> "O Cartilha": de −1 para **+149,9 bb/100**.
> "Paga-Tudo": de +167 para **+15,9 bb/100**.

**Ninguém ganha 150 big blinds a cada 100 mãos de ninguém.** Um jogador muito
bom ganha 5 a 20. Aquilo não era evolução — era **sorte sendo premiada como
habilidade**. Com poucas mãos por disputa, quem recebeu carta boa "vence" e
passa os genes adiante. Uma evolução dessas **piora** os bots com cara de
melhorar.

Tentei a técnica padrão contra isso (jogar as mesmas mãos duas vezes, como no
bridge duplicado). Cortou só 10% do ruído. Fiz a conta: para separar dois
genomas que diferem de verdade, seriam necessárias **~2,7 milhões de mãos por
candidato, por geração**. Não tem máquina aqui para isso.

**O motor ficou pronto no repositório**, com quatro travas escritas e testadas
(o juiz não é a própria população; cada bot só evolui dentro do seu tipo — o
"Paga-Tudo" nunca vira agressivo; o micro NÃO evolui, tem que continuar
micro; e nada roda no seu celular). Se um dia houver máquina, é só rodar.

### ✅ A parte que FUNCIONA — e é o que você queria sentir

Olhando de novo o seu pedido, o que você quer é **a mesa ficando mais difícil a
cada sessão**. Para isso os bots não precisam evoluir uns contra os outros.
Precisam evoluir **contra você** — e aí o sinal é o seu próprio jogo, sem sorte
nenhuma no meio.

**👁 A MESA NÃO TE ESQUECE.** O que os vilões aprenderam sobre você agora
sobrevive de uma sessão para a outra. Na terceira noite, eles já te leem desde a
primeira mão — como acontece quando você vira regular de uma sala.

No Perfil tem uma faixa nova: **"O que a mesa sabe de você"**, com uma barra que
mostra o quanto eles já te conhecem:

> *A mesa te conhece bem — 420 mãos em 6 sessões. Eles vão jogar em cima do seu
> padrão.*

Detalhes que importam:

- **O passado perde peso.** Se você largava todo flop e corrigiu isso, a mesa
  te relê dentro de algumas centenas de mãos. Ninguém fica marcado para sempre.
- **Sumiu 3 meses? A memória zera.** Você já não é o mesmo jogador.
- **Eles leem só o seu histórico de jogadas — nunca as suas cartas.** Isso
  continua valendo e está testado.

**Onde está:** ☰ Perfil → "👁 O que a mesa sabe de você" · e na mesa, entre as
mãos, quando um vilão resolve falar.

---

## 2026-09-15 — Claude — 🥊 SACUDIMOS OS BOTS: check-raise, plano de mão e "ele te leu"

Do seu pedido: sentir cada faixa como a mesa que ela imita, o **10,3K bem
difícil**, e algo novo nos bots.

### O que estava errado (medido, não achismo)

Rodei 70 torneios antes de mexer em qualquer coisa. Três buracos:

1. **A palavra "check-raise" não existia no código dos bots.** Eles só sabiam
   "estou enfrentando aposta" e "a ação chegou limpa". Passar COM A INTENÇÃO de
   aumentar — a jogada que mais tira o chão — nunca acontecia.
2. **Eles apostavam o flop e sumiam no turn.** Cada rua era decidida do zero,
   contra uma frequência fixa. Daí a carta de graça em 3 de cada 4 ruas.
3. **O pós-flop do $5 e o do $10.300 eram IDÊNTICOS.** A escada de dificuldade
   existia, mas só mexia no pré-flop: o barrel e a c-bet nunca eram ajustados
   pela faixa.

### ✨ O que entrou

**1. Check-raise de verdade.** Com range de valor E de blefe, e frequência
própria de cada perfil. Um "Paga-Tudo" quase não check-raisa; um "Furacão" de
faixa alta check-raisa bastante.

**2. Plano de mão — a carta que veio manda no jogo.** Antes o bot sorteava
"sigo ou não" contra um número fixo. Agora ele faz a pergunta que um jogador de
verdade faz: *"essa carta ajuda a história que eu estou contando?"*
- Veio um Ás no turn? Ele segue com mais força (o Ás combina com quem abriu).
- Completou o naipe? Ele blefa mais e vai por valor menos.
- Pareou o board? Ele ataca — sabe que assustou você.

E a segunda barrelada agora é **maior** que a aposta do flop, como se joga em
torneio.

**3. Eles aumentam sem ter mão.** Antes, contra uma aposta, o bot só pagava ou
largava. Você nunca era aumentado por quem não tinha nada — por isso sua decisão
era sempre fácil.

**4. Probe bet.** Quem não tinha a iniciativa quase nunca apostava. Nas faixas
altas, o vilão agora toma a aposta quando você desiste do flop.

**5. O campo do 10,3K passou a DEFENDER.** Este foi o achado mais importante: o
campo de elite era apertado, mas não reagia — você roubava os blinds e ninguém
devolvia. Terminando 75% na faixa premiada, com posição média 11,7 de 100. Não
era difícil, era só "todo mundo folda". Agora ele 3-beta e defende o big blind.

### 👁 A novidade: "ELE TE LEU"

Os bots já se adaptavam ao seu jogo — e você nunca ficava sabendo. Agora, entre
as mãos, o vilão **fala**:

> 👁 **O Furacão reparou que você larga 78% dos flops em que leva aposta.**
> *Ele vai apostar mais em você — inclusive sem mão.*

A leitura só sai com amostra, só de quem tem cabeça para ler (peixe não estuda
ninguém), e cada frase aparece **uma vez** por sessão. E ela olha só o seu
HISTÓRICO de jogadas — nenhum bot espia carta fechada, isso continua valendo.

### 📏 O resultado, medido

**O campo, por faixa (2.500 mãos em cada):**

| Faixa | Check-raise | C-bet | Segue no turn |
|---|---|---|---|
| $5 | 7,3% | 46% | 69% |
| $55 | 6,4% | 61% | 68% |
| $109 | 11,3% | 70% | 78% |
| **$10.300** | **13,3%** | **68%** | **78%** |

O micro caiu em 7,3%, que é exatamente onde a literatura põe os micros. O
10,3K ficou em 13,3%, dentro da faixa de MTT (10% a 18,5%).

**E o que VOCÊ sente (20 torneios em cada):**

| | $11 | $10,3K |
|---|---|---|
| Carta de graça | 72% | **55%** |
| Levou 3-bet ao abrir | 38% | **42%** |
| Levou aposta no flop | 35% | **46%** |
| Passou e levou aumento | 20% | **34%** |
| Terminou premiado | 50% | **65%** ← e caiu de 75% |
| Posição média | 29º | **20º** ← e piorou de 11,7º |

No $10.300 você passa a ser aumentado em **um terço** das vezes em que passa, e
quase metade das ruas vem com alguém pedindo fichas.

### ⚠️ Honestidade

Isto **não é uma cópia estatística** da população do GGPoker ou do PokerStars —
esse dado ninguém publica. É uma escada construída para CABER nas faixas que
são publicadas (check-raise de micro e de MTT, c-bet moderno, 3-bet de reg,
composição de campo), ancorada nos dois extremos e **medida** depois. As fontes
estão escritas no código, em `src/bots/escadaDeBuyIn.ts`.

**Onde está:** aba Torneio, em todas as faixas — e principalmente no 10,3K.

---

## 2026-09-15 — Claude — 🛟 Seus pontos do ranking não se perdem mais

Do seu relato: *"num desses prints mostra que não conseguiu falar com o servidor
do ranking e os pontos não foram salvos. E não é a primeira vez."*

Era uma tentativa **única**. Se o Wi-Fi caiu, se o 4G oscilou, se o servidor
demorou a responder — os pontos de um torneio inteiro morriam ali. E a tela
ainda sugeria "dá pra repetir a etapa", ou seja: jogar tudo de novo. Para quem
joga no celular, com sinal instável, isso ia acontecer de novo, e de novo.

**Agora o resultado que não subiu fica guardado no seu aparelho** e o app tenta
enviar sozinho:

- quando você abre o app;
- quando você abre o Placar.

A mensagem também mudou. Antes dizia que os pontos "não foram gravados"; agora
diz a verdade: **"seus X pontos estão guardados no aparelho — não precisa
repetir a etapa, eu envio sozinho assim que a conexão voltar"**.

Detalhes de segurança que valem a pena saber:

- **O mesmo resultado nunca é enviado duas vezes** (cada um tem uma assinatura
  própria). Você não vai pontuar em dobro por acidente.
- Resultado com mais de 30 dias sai da fila sozinho — a temporada já virou.
- Se o armazenamento do celular estiver cheio ou bloqueado, o app continua
  funcionando normalmente; só a fila não grava.

**Onde está:** aba Torneio → tela do fim do torneio (a caixa do Circuito), e
aba Placar.

---

## 2026-09-14 — Claude — ⚖️ "Você × o padrão do app" na tela de fim de torneio

Do seu pedido depois do 4º lugar em 100 jogado quase todo às cegas: *"tinha que
ter um comparativo da forma que eu joguei às cegas e da forma que o aplicativo
pede. Colocar porcentagem."*

Você tinha razão. A tela mostrava o que VOCÊ fez (Fold 82% · Call 7% ·
Raise 11%) e nunca dizia o que o app teria feito. Sem o outro lado, "82% de
fold" não responde nada: é muito? é pouco?

### O que entrou

**⚖️ Você × o padrão do app** — um quadro novo, com as três ações lado a lado,
em porcentagem, e a diferença em pontos:

```
              VOCÊ     PADRÃO    DIF.
Largou        82%       76%       +6
Pagou          7%        9%       -2
Agrediu       11%       15%       -4
```

⚠️ **Esse "padrão" não é tabela de fora nem número de propaganda.** É a
recomendação que o próprio motor deu, decisão por decisão, **nas mesmas mãos
que você jogou** — mesmas cartas, mesma posição, mesmo stack. Por isso a
comparação é justa: os dois lados vêm do mesmo torneio.

Quando a maior parte do torneio correu às cegas (foi o seu caso), o quadro
mostra o recorte **só das mãos sem dica** — o seu jogo de verdade.

**🙈 Às cegas × com a dica** — o "Jogar sozinho" mostrava só metade da conta
("81 de 99"). Agora mostra os dois lados em porcentagem, que é a única pergunta
que esse modo existe para responder: você joga pior quando a dica some? Quando
falta amostra de um dos lados, o app diz isso em vez de inventar comparação.

### Três erros que achei olhando os seus prints

1. **O conselho brigava com a medição.** A tela disse *"você jogou bem apertado
   (VPIP 14%): dá para roubar mais blinds abrindo um pouco a range em posição"*.
   Na MESMA tela, as mãos para rever eram **quatro aberturas fora do range**
   (LJ, BTN, UTG+1, LJ) e o gráfico marcava LJ e SB como "agressivo demais". O
   app mandou você abrir mais justo onde tinha acabado de medir que você já
   abria demais. O VPIP conta QUANTAS mãos você jogou, não QUAIS.
   Agora, quando há aberturas fora do range, o conselho é outro:
   **antes de abrir mais, abrir melhor.**

2. **"4º de 100" vinha no vermelho de eliminação.** Você foi premiado. A cor
   passou a dizer a mesma coisa que o número.

3. **"Mãos para rever (5)"** parecia que eram só 5 problemas — eram 21. Agora
   diz "as 5 mais graves de 21".

E uma correção interna: a referência da anatomia estava com Fold e Raise
trocados (dizia que a referência de MTT é 82% de raise e 11% de fold — é o
contrário). Não aparecia na tela, mas era uma bomba-relógio.

**Onde está:** aba Torneio → tela do fim do torneio.

---

## 2026-09-14 — Claude — 🪑 Cadeira vazia, nomes que não repetem e mesa arrumada

### 1) "Ele tinha vinte e poucas fichas e na mão seguinte apareceu sem ficha"

Você estava certo de novo — e desta vez achei a outra metade do problema.

Num torneio de verdade, quando sobra gente demais numa mesa, a sala **move
jogadores** para outra. O app já fazia isso. Só que ele marcava quem saiu com o
MESMO estado de quem quebrou: fichas zeradas. A mesa então escrevia
**"— sem fichas —"** embaixo do nome de alguém que continua vivo no torneio,
jogando em outra mesa. Daí a sua conta não fechar: "ele está na minha mesa, não
pode ficar sem ficha".

**Corrigido:** agora a mesa sabe a diferença. Quem muda de mesa deixa
**cadeira vazia** — sem pod, sem nome, sem nada. "— sem fichas —" só aparece
para quem quebrou na mão que você acabou de jogar, e some na mão seguinte
(a cadeira fica vazia até alguém sentar).

### 2) "O Certinho, O Certinho 2, O Certinho 3 na mesma mesa"

O app tinha 4 apelidos por tipo de jogador — 32 no total. Num torneio de 100,
acabavam rápido e ele começava a numerar.

Pior: o sorteio só olhava a lista **do tipo que tinha sorteado**. Esgotados os
quatro apelidos de "jogador certinho", ele numerava — mesmo com dezenas de
apelidos livres nos outros tipos. Era esse o "O Certinho 2".

**Corrigido:** o app passou a ter **128 apelidos** (16 por tipo), e quando um
tipo esgota ele pega emprestado de outro — levando o estilo junto, para
"Muralha" continuar jogando apertado. Medido: 128 reposições seguidas sem
repetir e sem numerar nenhuma.

### 3) As informações do torneio pararam de comer a mesa

Elas ficavam **fora** da mesa, e por isso só sabiam ficar POR CIMA de tudo. Eu
tinha subido a linha e ela só trocou de vítima — foi cobrir o jogador de cima,
como você viu.

Agora ela é desenhada **dentro do feltro, na camada de baixo**: carta, ficha e
pod passam por cima dela, como você pediu. E ela mudou de lugar, para a faixa
vazia logo abaixo das cartas comunitárias, em três linhas curtas.

### 4) As cartas comunitárias não cobrem mais os jogadores das laterais

Achei isso medindo, e dá para ver nos seus prints: com as **5 cartas** do river
a fileira crescia até entrar por cima do pod do vilão da direita e da esquerda
(medido: 36 a 43 pixels de jogador coberto). A fileira ficou mais estreita e
agora para antes de encostar em qualquer um.

### 5) O relógio 🕘 saiu de baixo dos botões de aposta

Ele tinha nascido no canto de baixo à direita — que é exatamente onde moram os
atalhos Pote / 4BB / 3BB, e eles passavam por cima. Mudou para a coluna da
esquerda, junto do "Jogar sozinho" e do "Ver dicas".

### 6) Os botões de aposta só aparecem na SUA vez (igual ao GG)

Fora da sua vez, Fold / Call / Raise e os atalhos de tamanho somem. O espaço
continua reservado de propósito: se eles sumissem de vez, a mesa mudaria de
tamanho a cada jogada dos bots e ficaria pulando na sua frente.

### 7) O replay da mão agora é tela cheia, igual ao torneio

Era um cartãozinho com moldura no meio de uma tela preta. Agora a mesa ocupa a
tela toda, com o mesmo desenho do torneio, e o rodapé da revisão (o passo, o
Anterior/Próximo) fica embaixo.

**Onde está tudo:** aba Torneio (a mesa e o replay).

---

**O que ficou faltando, para você saber:** com o celular DEITADO, o replay
ainda aperta — os jogadores de cima encostam nas cartas comunitárias, porque
sobra pouca altura. Em pé está limpo nos tamanhos que medi. Se você usar muito
o replay deitado, me avise que eu ataco só isso.

---

## 2026-09-14 — Claude — 🐞 O jogador que "subiu as fichas do nada" + histórico de volta na mesa

### 1) O erro que você viu: um jogador aparecendo com mais ficha do que tinha

Você desconfiou e estava certo — mas não era ficha nascendo do nada. Era o
**nome voltando**.

Quando alguém quebra, a cadeira é preenchida por um jogador novo (é assim que
torneio funciona: mesa quebrada, gente sendo remanejada). Só que o app montava
a lista de "nomes já usados" olhando apenas quem **ainda tinha ficha na mesa**.
Quem tinha acabado de quebrar saía dessa lista na hora — e o nome dele ficava
livre para ser sorteado de novo, numa cadeira nova, com um stack novo.

Resultado na sua tela: o "Muralha" que você acabou de eliminar reaparecia duas
mãos depois com 200bb. Parece ficha do nada; era gente diferente com o mesmo
nome.

**Medido antes de corrigir** (40 torneios simulados): o nome de quem quebrou
voltava em **15 dos 40 casos**, e em **8 deles com mais ficha do que ele tinha**.

**Corrigido:** a mesa agora guarda todo nome que já sentou nela — inclusive o de
quem quebrou. Nome usado não volta mais no mesmo torneio. Começou torneio novo,
a lista zera.

**E as fichas?** Conferi separado, porque a sua desconfiança merecia resposta
com número: escrevi um teste que soma TODAS as fichas da mesa antes e depois de
cada mão, inclusive nas mãos de all-in de vários jogadores com stacks diferentes
(side pot). **A soma bate sempre.** O motor não cria e não some com ficha. O
problema era só o nome.

### 2) O histórico das mãos voltou para a mesa (botão 🕘)

Você foi procurar a mão anterior justamente por causa disso e não achou — porque
no **modo "Jogar sozinho"** o histórico tinha sumido junto com as dicas. Era erro
meu de escopo: conferir **o que aconteceu** na mesa não é receber dica.

Agora tem um botão **🕘** no canto de baixo à direita da mesa, a partir da
segunda mão, **sempre** — inclusive jogando sozinho. Jogando sozinho ele mostra
o **fato** (cartas, ações, fichas, quem levou) e **esconde a nota** (boa/ruim,
"o ótimo era..."). O blackout continua valendo até o fim da sessão; o que você
ganha é o direito de conferir a mesa quando desconfiar de alguma coisa.

### 3) O status do torneio não tapa mais a aposta

No seu print o "0.5bb" do small blind estava escondido atrás da linha de status
(posição/blinds). Ela ficava exatamente na faixa por onde as fichas apostadas
viajam para o centro. Subiu para logo abaixo das cartas comunitárias, onde a
faixa é vazia. **Medido depois: zero sobreposição.**

### 4) A borda dourada da mesa está mais dourada

Pedido seu. O aro era um fio de ouro apagado; virou um aro cheio, com luz por
cima, ouro sólido no meio, sombra por baixo e um brilho suave para fora.

**Onde está tudo:** aba Torneio (a mesa).

---

## 2026-09-14 — Claude — 🥷 ROUBO TARDIO: o treino dos seus dois vazamentos

Nasceu das suas estatísticas REAIS do GGPoker (45.027 mãos). Dois números
apontavam para o mesmo lugar:

- **VPIP 27% × PFR 16%** — onze pontos de diferença. Você entra em onze mãos a
  cada cem **sem aumentar** (limp e call).
- **ATS 29%** — sua tentativa de roubo está abaixo da faixa de MTT.

Os dois se encontram no mesmo spot: a ação chega em você no **CO, BTN ou SB** e
ninguém entrou.

**Onde está:** Treinar → Treino → **🥷 Roubo Tardio (CO/BTN/SB)**. Sem senha,
sem trava.

- **Só existe AUMENTAR ou SOLTAR.** O módulo nem oferece o botão de pagar — em
  pote não aberto, pagar é limp, e limp não está no padrão em nenhuma das três
  cadeiras. A disciplina vira regra da tela, não conselho.
- **PLACAR AO VIVO:** *"Você abriu 14% · o motor abriria 36% nestas mesmas
  mãos — você está roubando de MENOS."* A barra mostra a sua frequência e o
  risquinho dourado marca a do motor.
- **Stacks de 22 a 55bb**, que é a faixa em que roubar decide torneio.

⚠️ **A régua é o nosso próprio motor, nas mesmas mãos que você acabou de
jogar** — não é "35 a 45%, que é o que dizem por aí". Medi separadamente em
3.600 mãos: o motor abre **37,4%** nesses spots (CO 26,8% · BTN 44,3% ·
SB 41,0%). Bate com a faixa que o pessoal de torneio usa, mas quem manda na tela
é a contagem da sua sessão.

E com menos de 10 mãos respondidas o placar **não mostra porcentagem** — diz
quantas faltam. Com pouca mão, aquilo mediria sorteio, não o seu jogo.

---

## 2026-09-14 — Claude — Botão à esquerda, contador da mão no topo e CELULAR DEITADO

Três pedidos seus, e o terceiro era o antigo que nunca tinha funcionado.

- **BOTÃO "COM DICAS / SOZINHO" FOI PARA A ESQUERDA.** No canto direito ele caía
  em cima da coluna de atalhos de raise — dá para ver no seu print, cobrindo o
  "4BB". Agora os dois botões de estudo ficam juntos no canto de baixo à
  esquerda: **🙈 Sozinho** embaixo e **💡 Ver dicas** logo acima.
- **"MÃO 1 / 182" VOLTOU PARA O TOPO, na Revisão.** Lá embaixo ele disputava a
  linha com as setas e os quatro botões de rua, e o **"River" saía cortado como
  "Rive"** (no seu print). No topo, entre o ✕ e o ⋯, existe faixa vazia — e
  agora os quatro botões de rua cabem inteiros.

### 📱 CELULAR DEITADO — agora funciona de verdade

Você disse: *"foi mexido bastante, mas até hoje não funcionou"*. Fui medir no
navegador em cinco tamanhos de tela deitada, e o motivo apareceu: eram **três
problemas ao mesmo tempo**, e nenhum dava para ver lendo o código.

1. **Em celular mais largo que 860px, o layout de tela cheia simplesmente
   parava de valer** — os botões de ação ficavam **108px ABAIXO do fim da tela**.
   Fora de alcance.
2. **Os assentos são desenhados para uma mesa em pé.** Deitado, a mesa vira
   larga e baixa, e os pods empilhavam uns nos outros: **8 sobreposições e 2
   assentos fora da tela**.
3. **A coluna de atalhos de raise** (Pote / 4BB / 3BB), que em pé fica num canto
   livre, deitado caía **em cima do assento da direita**.

O que mudou: anel de assentos próprio para a horizontal (largo e baixo), pods
compactos, atalhos de raise viram **fileira** na faixa livre entre o feltro e os
botões, e o status do torneio sai do meio da mesa. Resultado medido: **zero
sobreposições e nada fora da tela** em 667×375, 740×340, 800×360, 915×412 e
1024×500.

🔧 Guardei a régua como ferramenta (`tools/audit-ui/deitado.mjs`): qualquer um de
nós roda e vê na hora se voltou a quebrar.

⚠️ **Uma coisa que eu NÃO consertei, de propósito:** em pé sobra um encosto de
11px entre dois pares de assentos. Tentei corrigir e ficou pior — eles passam a
bater no board, que é bem mais feio. Deixei como estava e anotei no código para
ninguém tentar de novo achando que é descuido.

---

## 2026-09-13 — Claude — O preço do pote na dica + treinar o que você erra sozinho

Três coisas, e uma delas é uma regra nova de como eu trabalho.

- **📏 O PREÇO DO POTE, na hora de decidir.** Camada nova no ▾ da mesa:
  *"Você paga 1bb para disputar 11,5bb: o preço pede 8% de chance — e contra 5
  oponentes de uma vez, não contra um."* Isso faltava justamente no **pré-flop**,
  onde o motor não estima chance e por isso "A conta" não nascia.

  O pedaço final da frase não é enfeite: ele é o **antídoto** do erro mais comum
  com essa conta. Mais gente no pote barateia o preço **e** tira a sua chance ao
  mesmo tempo — e para mão fraca a chance cai mais rápido do que o preço melhora.
  A frase entrega o número e **não recomenda nada** (tem teste garantindo que ela
  nunca vira "então pode pagar").

- **🎯 "TREINAR ISSO" no ponto fraco do modo sozinho.** O diagnóstico agora vira
  treino: se o app mediu que você erra com stack curto **jogando sem dica**, o
  botão abre um drill de 12 mãos **naquela profundidade** (9bb, não 40bb). Bolha
  e mesa final vão para o treino de mesa final, que já tem ICM.
  Onde o app não saberia treinar direito, **o botão não aparece** — mandar você
  para um treino que não é o do seu problema seria pior que não oferecer nada.

- **📖 REGRA NOVA (AGENTS.md nº 7).** A pedido seu: tudo que você me manda de
  fora (auditoria de outra IA, prompt pronto, dica de alguém) chega como
  **sugestão, não como ordem**. Eu confiro contra o motor, uso o que presta,
  rejeito o resto **dizendo o porquê** — e nunca deixo nada passar por cima das
  ranges calibradas sem o SELO validar.

  Foi o que aconteceu aqui: de um prompt que pedia para reescrever a decisão
  pré-flop inteira, medi e **rejeitei quase tudo** (o app já fazia certo, e a
  fórmula proposta pioraria o jogo). Do prompt sobrou o preço do pote — e ele
  está no ar.

---

## 2026-09-13 — Claude — Onde você vaza JOGANDO SOZINHO (parte 2)

Fecha o modo sozinho. A parte 1 respondeu *"quanto eu acerto sem ajuda"*; esta
responde **"onde eu erro sem ajuda"** — que é o que vira treino.

No Perfil → Minha evolução, dentro do bloco "Como você joga sozinho", agora tem:

- **ONDE VOCÊ MAIS VAZA SOZINHO** — o ponto mais fraco das suas decisões às
  cegas, com o número: *"Stack curto (≤12bb) — 33% de acerto em 24 decisões"*.
- **A CURVA** — se o seu jogo sozinho está subindo ou caindo: *"↑ subiu 9 pontos
  jogando sozinho: 61% antes · 70% agora"*. Verde quando sobe, vermelho quando
  cai (na primeira versão eu tinha deixado a queda pintada de verde — corrigido).
- **"VER TUDO QUE MEDI SOZINHO"** — a lista completa por rua, faixa de stack e
  estágio do torneio, contando **só** o que você jogou sem dica.

⚠️ **Uma coisa importante:** o ponto fraco que o app aponta **com** dica pode ser
diferente do que ele aponta **sem**. E é justamente esse segundo que interessa,
porque é o que você leva pro torneio de verdade.

Tudo isso sai do mesmo histórico de decisões que já existia — não há contagem
paralela nenhuma. O que é de antes de ontem continua contando como jogado **com**
dica disponível, porque era.

---

## 2026-09-13 — Claude — 🙈 JOGAR SOZINHO: o número que mede você, não a dica

Ideia do Allan: *"quando for jogar torneios de verdade não terei essas dicas
aparecendo"*. Ele pediu um botão para desligar tudo e um jeito de ver como joga
sem ajuda nenhuma.

**Por que isso é grande.** Todo número de precisão do app até hoje somava
decisões tomadas **com a dica aberta na tela**. Acertar com a dica não prova que
você sabe jogar — prova que você sabe ler uma dica. O número novo é o único que
mede **você**.

- **BOTÃO NA MESA.** No canto de baixo, do lado oposto ao "Ver dicas":
  **💡 Com dicas** ↔ **🙈 Sozinho**. Um toque troca, e o app lembra da sua
  escolha.
- **SOZINHO = BLACKOUT DE VERDADE.** Some a faixa da dica, o ▾, o 💡 do feltro,
  o chip do tamanho sugerido e até o botão "Ver dicas" depois da mão — você
  escolheu não ver **nada** até o fim da sessão. Conferi no navegador jogando 45
  lances seguidos: **zero vazamentos**.
- **AS CONQUISTAS TAMBÉM CALAM A BOCA.** Esse eu achei conferindo a tela e você
  não teria como perceber: existem conquistas como *"Disciplina de Ferro — 10
  decisões 'boa' seguidas"* que pipocavam **no meio da mão**. Quem visse uma
  descobria na hora que a última decisão foi julgada boa. Agora elas ficam
  guardadas e aparecem quando você sai da mesa — você não perde nenhuma.
- **A REGRA DURA.** Se a dica aparecer em **qualquer momento** de uma mão, a mão
  **inteira** deixa de contar como "sozinho" — não só aquele lance. É severo de
  propósito: um número que você vai usar para julgar seu próprio jogo não pode
  aceitar uma espiadinha.
- **O RELATÓRIO.** No Perfil → Minha evolução, no topo de tudo:
  **Sozinho 63% · Com dica 89% — "a dica está te levantando 26 pontos"**. E no
  fim do torneio, a linha da sessão. Com menos de 30 decisões sozinho o app
  **não mostra porcentagem nenhuma** — mostra quantas faltam, porque com pouca
  amostra o número falaria mais da sorte do que do seu jogo.

⚠️ **Aviso honesto:** a primeira vez que você vir esse número, ele vai ser mais
baixo do que o que você está acostumado. É esse o ponto. O que interessa é ele
subir, e a distância para o "com dica" diminuir.

---

## 2026-09-12 — Claude — A dica da mesa finalmente explica o PORQUÊ

O Allan mandou 4 prints e a crítica certa: *"AJo pede pra dar raise, mas queria
uma explicação melhor do porquê. Mesma coisa KJs."* E sobre o "tá barato":
*"essa mensagem é muito superficial, aparece em muitas situações que é meio
óbvio o fold."* Ele estava certo nos dois pontos, e havia um terceiro escondido.

- **AGORA TODA RECOMENDAÇÃO EXPLICA.** Antes a faixa só dizia algo no fold
  barato e ficava **muda** no resto — "💡 Raise" e ponto final. Agora ela traz o
  motivo do motor em toda jogada: *"3-bet por valor contra a abertura de CO"*,
  *"Mão de valor (equity 69% vs range): aposta 88% do pote"*.
- **O ▾ VIRA EXPLICAÇÃO, NÃO TABELA.** Tocando no ▾ na mesa você agora lê
  **Por quê · A leitura · O topo do range dele · A conta · O peso da bolha** —
  as mesmas camadas que só existiam DEPOIS da mão. Os números crus (posição,
  stack, pote) continuam, mas embaixo: são apoio, não a resposta.
- **"TÁ BARATO" SÓ QUANDO É BARATO DE VERDADE.** Num print seu, com 10,7bb e
  dois all-ins na frente, o app dizia "tá barato" para pagar 10,2bb — **95% do
  seu stack**, o torneio inteiro. Era barato em relação ao pote e o app só
  olhava isso. Agora "barato" exige as duas coisas: barato no pote **e** no seu
  stack.

🐞 **Dois bugs sérios achados no caminho:**

1. **A frase chegava sem os números.** O texto passava por uma "limpeza" que
   apagava toda porcentagem. *"Paga: equity 52% ≥ preço 38%"* virava literalmente
   **"Paga: ≥."**, e o caso de ICM do seu print virava *"exige (2 oponentes)"* —
   sem o número. Era essa a superficialidade que você sentiu: a frase chegava
   **sem o que a sustentava**. Agora o motivo vai inteiro.
2. **A dica tremia.** Com o painel aberto dava pra ver a faixa dizendo "equity
   41%" e o painel, dois centímetros abaixo, "equity 38%" — a mesma decisão,
   dois números. A dica era recalculada a cada repintura da tela e a conta de
   equity é por sorteio, então cada repintura dava um número. Agora ela é
   calculada **uma vez por situação** e só muda quando a situação muda. De
   quebra, parou de rodar 1500 simulações a cada repintura (o celular agradece).

Onde ver: mesa de jogo — a faixa da dica e o ▾.

---

## 2026-09-12 — Claude — Resultado ≠ decisão, e onde a mão saiu do caminho

Duas ideias novas da segunda auditoria do ChatGPT, mais uma limpeza. Nenhuma
delas mexe no motor: as duas só juntam coisas que o app já sabia e nunca
mostrava junto.

- **"RESULTADO ≠ DECISÃO".** Faixa nova no topo das dicas da mão e na Revisão.
  De um lado, quanto você ganhou ou perdeu (**−18,3bb**); do outro, se a decisão
  ficou no padrão. E aí a frase que faltava: *"Você não levou esse pote — e
  jogou certo"*, ou *"Ganhou a mão, mas a jogada não era essa"*. É o vício nº 1
  do jogador recreativo — achar que a jogada foi boa porque o river foi bom. O
  app sabia as duas coisas desde sempre e nunca as tinha colocado na mesma tela.
- **"ONDE A MÃO SAIU DO CAMINHO".** Agora dá pra bater o olho e ver a mão
  inteira: **Pré-flop ✓ · Flop ✓ · Turn ✗ · River (sem decisão)** — com o
  momento do erro destacado e a conta dele por baixo: *"No Turn: você fez CALL;
  o padrão era FOLD. Você precisava de 45% e tinha 4%."* Na Revisão isso entrou
  nos botõezinhos de rua que já existiam lá embaixo: eles ficam verdes ou
  vermelhos, e **um toque te leva direto ao momento do erro**. Rua em que você
  não decidiu nada fica apagada — não ter decidido não é a mesma coisa que ter
  acertado.
- **LIMPEZA: três arquivos mortos saíram do projeto.** Eram telas e textos
  antigos que nenhuma parte do app usava mais. Um deles estava cheio de
  porcentagem escrita à mão (número que ninguém calculou) e trazia "vozes" com
  nome de jogadores reais — aquilo que você já tinha mandado tirar. Foram
  apagados de vez pra não voltarem por engano.

🐞 **Bug corrigido no caminho (Importar).** Toda mão ganha **sem showdown** ficava
sem vencedor: o app não reconhecia a linha `Seat 5: Você recebeu (1760)` do
histórico e dizia só "pote resolvido". Por causa disso a faixa nova chegou a
dizer que você tinha perdido uma mão que você ganhou. Achei testando, corrigi o
leitor de histórico e deixei teste pra não voltar.

---

## 2026-09-11 — Claude — Como bater o vilão, range limitado e o ICM em número

Os três conceitos que o app "não fornecia" e que agora fornece — cada um medido,
nenhum inventado.

- **"COMO BATER [NOME DO VILÃO]" NAS DICAS DA MÃO.** O app já sabia disso e era
  honesto: o conselho sai dos **parâmetros reais do bot** (se o Paga-Tudo é
  grudento, é porque o código dele diz isso). Só que estava escondido atrás de um
  toque no assento e ninguém achava. Agora aparece no fim das dicas da mão, com
  o nome de quem jogou contra você, o VPIP/PFR/3-bet dele e as listas de **✅
  Faça / ❌ Não faça**. Em mão **importada** não aparece — ali o oponente é gente
  de verdade, de quem o app não tem parâmetro nenhum.
- **"O TOPO DO RANGE DELE" (o range limitado).** Nova camada nas dicas e na
  Revisão: *"Do range dele, 3 em cada 100 mãos formam trinca ou melhor nesse
  board."* É a frase do comentarista de vídeo — e é **contagem**, não opinião: o
  app pega o mesmo range que usou pra calcular sua chance, testa combinação por
  combinação contra o board e conta. Quando dá zero, ele diz: *"Nenhuma mão do
  range dele forma trinca ou melhor nesse board."* Entrega o número e **para** —
  não conclui "logo, blefe"; a jogada continua vindo do motor.
- **O ICM EM NÚMERO.** Até hoje o app se recusava a dizer "foi o ICM", e estava
  certo: estar na bolha não prova nada. Agora ele **mede**: roda a decisão duas
  vezes, uma com os prêmios na conta e outra sem, e só fala quando as duas
  respostas **diferem de verdade** — *"valendo só fichas o padrão seria CALL; com
  o prêmio em jogo, é FOLD."* Aparece pouco, e isso é o certo: numa mesa de 9 com
  o prêmio longe, o ICM quase nunca vira a decisão. Ele vira na **mesa final**,
  com stack curto — e é lá que a frase nasce.

⚠️ **Só no pré-flop**, de propósito. No pós-flop a decisão passa por sorteio
(simulação), então uma diferença que aparecesse poderia ser o sorteio e não o
ICM — e o app não afirma o que não consegue provar.

Onde ver: dicas da mão (botão 💡 depois da mão), Revisão da mão e a dica ao vivo
(no ▾).

---

## 2026-09-11 — Claude — Toque na dica ao vivo + trava contra frase sem dado

Três coisas, todas nascidas da auditoria que o ChatGPT fez das nossas dicas.

- **A DICA AO VIVO AGORA ABRE.** Durante a mão, a faixa do coach continua curta
  (ela não pode roubar o lugar da mesa), mas ganhou um **▾** no canto. Tocando
  nele, ela abre e mostra o contexto que o app **já calculava e nunca mostrava**:
  posição, seu stack, pote, quanto falta pagar, sua chance, a chance que o preço
  exige, SPR, quão largo é o range do vilão e o tamanho sugerido. Tocar na faixa
  continua preenchendo o valor sugerido, igual antes — o ▾ é botão separado
  justamente para não roubar esse atalho. Onde: mesa de jogo (Treinar → Jogar).
- **TRAVA "SEM DADO, SEM FRASE".** A regra da casa sempre foi não inventar
  número. Agora ela virou **mecanismo**: cada tipo de frase do coach declara num
  registro único de qual dado ela depende, e um teste tira esse dado e exige que
  a frase **suma**. Na prática: nenhum de nós dois consegue mais escrever uma
  frase bonita sem lastro sem quebrar a suíte. São 31 testes só disso.
- **"DE ONDE VEIO A RECOMENDAÇÃO".** As dicas agora sabem dizer se a base foi o
  preço, a força da mão, o range da posição ou push/fold. Só esses quatro — o
  ICM ficou **de fora de propósito**: saber que estamos perto da bolha não prova
  que foi o ICM que mudou a decisão, e prometer isso seria justamente o tipo de
  frase sem lastro que a trava acima existe para impedir.

Onde ver: mesa de jogo (o ▾ na faixa da dica) e Revisão da mão.

---

## 2026-09-11 — Claude — As dicas completas: o que mudaria, as outs e o Ás
Os três últimos itens da auditoria das dicas. Estes precisaram de **conta nova**.

- **"O QUE MUDARIA"** — quando o motor manda foldar, a dica agora responde a
  pergunta do vídeo: *"Se ele tivesse apostado até 2,1bb, aí valeria pagar."*
  Não é chute: eu **inverti a régua do próprio motor** (por busca), então a
  resposta nunca contradiz o veredito. Se a dica diz que com 2,1bb valia pagar,
  pagar 2,1bb é mesmo aprovado pela mesma conta que reprovou o valor real.
- **"CARTAS QUE TE SALVAVAM"** — *"9 cartas te colocavam na frente — 19% de
  chance de vir na próxima."* O app não sabia contar isso. Agora ele testa
  **carta por carta** (as 47 que podiam vir) e conta quais te tiram de trás.
  Só aparece quando você estava **atrás** e ainda havia carta por vir — para
  quem já está na frente não existe "carta que salva".
- **BLOQUEADOR DE ÁS** — faltava o mais comum do poker: *"Você tem o A♦ — reduz
  os ases e o par de ases do vilão."* E quando a sua carta pareia a **mais alta
  da mesa**, a dica agora diz isso com o peso certo ("reduz muito o top par
  dele") em vez de tratar igual a um par qualquer.
- **A leitura do board saiu do modo Técnico.** Os bloqueadores estavam
  escondidos atrás daquela chave; agora aparecem para todo mundo.
- **Velocidade:** medi a análise de uma sessão com tudo isso ligado — **234ms**.
  Não dá pra sentir.
- **Onde:** painel "Ver dicas" e Review (tocando na faixa do coach).

## 2026-09-11 — Claude — As dicas ganharam "A LEITURA" e "A CONTA"
Os três primeiros itens da auditoria das dicas. **Nenhum deles inventa nada** —
são dados que o motor já calculava e jogava fora antes de chegar na tela.

- **A LEITURA** — agora a dica te diz o que o vilão está jogando:
  *"O vilão joga cerca de 28% das mãos nesse ponto — range médio."* É a primeira
  frase de qualquer comentarista de poker, e o app sabia o número desde sempre.
  Aparece no pré-flop (quando alguém abriu antes de você) e rua a rua no
  pós-flop, apertando conforme o vilão age.
- **A CONTA** — sua chance de ganhar contra o preço, **em português**:
  *"Você ganha 22 de cada 100 vezes. Pelo preço que estava pagando, precisaria
  ganhar 33 — faltam 11."* Antes esse número só existia se você achasse a chave
  "Técnico", que é justamente a que o recreativo não aperta.
- **A chave Simples/Técnico mudou de significado.** Antes ela decidia entre
  *os números* e **nada**. Agora ela decide o **jeito de falar**: em Simples,
  "você ganha 22 de cada 100 vezes"; em Técnico, "Equity 22% vs preço 33%".
  A explicação chega nos dois.
- **O Review ganhou dica completa.** Era a única tela sem nada disso. Agora a
  faixa do coach **abre ao toque** (tem uma setinha ▾) e mostra A leitura,
  A conta e o Por quê — no espaço que sobrou depois que os botões do topo saíram.
- **Honestidade:** onde o motor não calcula, a dica **não aparece** em vez de
  inventar. No pré-flop não existe "a conta" (o motor não estima equity ali), e
  se ninguém abriu antes de você não existe "a leitura" — não há range para ler.
- **Onde:** painel "Ver dicas" (depois da mão) e tela de Review, rua a rua.

## 2026-09-11 — Claude — Review: saíram os botões do topo, o contador desceu
- Depois de você testar e aprovar o toque, tirei os **◀◀ ▶▶ do topo**: viraram
  duplicata e obrigavam o polegar a subir.
- O **"Mão 2 / 3" desceu** para a barra de baixo, na altura do polegar.
- O topo agora tem só **✕** e **⋯** — sobrou espaço livre na melhor parte da
  tela, que é onde a dica do coach pode crescer.

## 2026-09-11 — Claude — Review: agora é o TOQUE que troca de mão
- **O problema que você apontou:** para trocar de mão os botões ficavam **lá em
  cima** (◀◀ ▶▶), e para andar rua a rua os botões ficam **lá embaixo**. O
  polegar subia e descia o tempo todo.
- **O que mudou (invertido, como você pediu):** **tocar na mesa agora troca de
  mão** — lado direito vai para a próxima, lado esquerdo volta. E o **passo a
  passo / rua a rua continua nos botões de baixo** (◀ ▶, Pré/Flop/Turn/River e
  o ⏭ "sua vez"), que já existiam e ficam na altura do polegar.
- Os ◀◀ ▶▶ do topo continuam lá: são a única pista visível de que dá pra
  navegar entre mãos, e mostram quando não tem mão anterior ou próxima.
- **Conferido no navegador** com 3 mãos importadas: toque na direita foi Mão 1
  → 2 → 3, toque na esquerda voltou para a 2, o botão ▶ de baixo andou o passo
  **sem trocar a mão**, e o chip "Flop" pulou a rua na mesma mão.

## 2026-09-11 — Claude — O selo agora diz o tamanho certo (615, não 61)
- **O que mudou:** o selo verde que aparece nas dicas dizia *"Bate com a teoria
  em 100% de 61 spots"*. Agora diz **"Bate com a referência em 612 de 615
  spots"**.
- **Por quê:** auditando, descobri que o app tem **dois** bancos de referência —
  o interno (61 spots) e um **externo, com 554 spots** comparados contra
  referência independente. O selo estava contando só um: ele **prometia menos
  do que o app entrega**.
- **Por que "612 de 615" e não "99%":** porque 99,51% arredonda para 100% e
  afirmaria acerto total — e existem **3 divergências conhecidas**, todas
  documentadas no código com o motivo. Mostrar a fração não deixa margem.
- **Também corrigi** um número velho na tela de Ranking: dizia que o teste
  externo cobria "8 a 20bb"; o correto, medido, é **8 a 45bb**, incluindo
  defesa contra aumento, 3-bet, 4-bet, tamanho de aposta e ante.
- **Onde:** selo nas "Dicas da mão" e texto explicativo no Ranking.

## 2026-09-11 — Claude — O painel de fim de mão tinha 14 botões. Agora tem 2.
- **Medido:** depois de uma mão jogada, o painel "Ver dicas" mostrava **14
  ações** e **precisava rolar** (972px de conteúdo em 824px de painel) — bem no
  momento em que você só quer saber se jogou certo.
- **Como ficou:** à vista só as duas que continuam o estudo — **NOVA MÃO**
  (dourado, dominante) e **Rever mão**. O resto virou dois grupos que abrem ao
  toque: **📊 Meu progresso** (evolução, conquistas, mãos da sessão, pontos
  fracos) e **📤 Compartilhar e exportar**.
- É o mesmo padrão do menu "⋯" da tela de Review, que você aprovou.
- **Resultado medido:** 14 → **5 ações visíveis**, e o painel **parou de rolar**.
- **De quebra:** o botão "💡 Ver dicas" da mesa estava com 26px de altura (o
  passo 2 da auditoria tinha subido os outros e esse ficou para trás). Agora
  tem 40px.
- **Onde:** mesa de jogo, ao terminar uma mão.

## 2026-09-11 — Claude — "Suas cartas" ficou mais fácil de preencher
- **O defeito:** na tela **Sua Mão**, escolher o naipe era uma lista suspensa
  que não cabia na largura do celular — aparecia **"♠ Es.."**, cortado.
- **O que mudou:** o naipe virou **4 botões** (♠ ♥ ♦ ♣), com as cores certas.
  Um toque em vez de dois, nada cortado, e dá pra ver o naipe de longe.
- Cada botão tem 78×44 — bem acima do mínimo para o dedo.
- **Onde:** Estudar → Sua Mão, bloco "Suas cartas".

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
