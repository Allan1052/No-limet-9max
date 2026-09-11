# 🔬 AUDITORIA RIGOROSA — App e Site (10/09/2026)

> **Método:** tudo aqui foi **medido**, não observado. As telas foram abertas num
> Chromium real em tamanho de celular (412×915) pela régua nova
> (`tools/audit-ui/`); as afirmações sobre o motor foram checadas rodando o
> motor. Onde não deu para medir, está escrito que não deu.
>
> **Nenhum número deste documento foi estimado.**

---

## ⚑ ESTADO EM 11/09/2026 — tudo desta lista foi corrigido e publicado

| # | Frente | Estado | Commit |
|---|---|---|---|
| 1 | Veredito do site (KQs) contradizia o motor | ✅ corrigido + teste | `9d30cdf` |
| 2 | Pixel da Meta sem aviso e sem desligar | ✅ declarado e desligável | `41518d6` |
| 3 | 72 alvos de toque < 44px | ✅ **0** agora | `09656e1` |
| 4 | Fontes vindas do Google | ✅ self-hosted | `27eb321` |
| 5 | Texto decisivo < 11px e selo em 3,09:1 | ✅ 11px / ~8:1 | `102206b` |
| 6 | es/en com 95 textos faltando | ✅ 576/576/576 + teste | `9ff17d6` |
| — | **CSS fantasma de 17/08 (achado fora da lista)** | ✅ removido, −107 KB | `27eb321` |

**Ainda com o Allan (decisão, não código):** se o pixel da Meta continua
existindo, e a página pública de política de privacidade (documento legal não
sobe sem aval dele).

### Correções a este próprio documento

1. **Seção 2 estava imprecisa.** Eu escrevi que "o opt-out do Perfil cobre só o
   umami". Na verdade o botão estava dentro do bloco gated por `ruaUnlocked`
   (senha de teste): **o jogador comum não tinha desligar nenhum**, e a nota de
   privacidade citava um botão que ele não podia ver.
2. **Faltava o maior achado.** O `index.html` carregava um build de CSS de
   17/08 (107 KB, 1.252 regras) junto com o atual — duas folhas pintando o app
   ao mesmo tempo. Ver seção 8b.

---

## 0. Antes de criticar: o que está certo

| Conferido | Resultado |
|---|---|
| **Contraste** de texto em 6 telas | **0 problemas** mensuráveis |
| **Rolagem lateral** (nunca deve existir) | **0 telas** rolam |
| **Landings sincronizadas** (regra da casa) | `public/site/` = `site/` ✓ |
| **Honestidade da cópia do site** | sem número inventado, posicionamento humilde mantido |
| **SELO GTO** | 61/61 |
| **Suíte** | 4.023 testes passando |

> ⚠️ A primeira rodada da régua acusou **22 falhas de contraste**. Eram **falsas**:
> a medição não entendia fundo com degradê e chutava o fundo da página. Corrigida,
> sobrou zero. Fica o registro porque uma auditoria que inventa problema é pior
> que auditoria nenhuma.

---

## 1. 🔴 P0 — o site afirma uma coisa que o motor não faz

A landing tem um spot de demonstração: **K♠Q♠ no CO, 25bb, contra open 3x do UTG**.
Qualquer que seja a resposta do visitante, o texto diz:

> *"Neste spot, o motor do app aponta **Fold** como linha principal"*

**Rodei o motor.** Ele responde **CALL**, em todas as variações testadas:

| Spot | Motor |
|---|---|
| CO 25bb vs UTG 3x | **call 3bb** — *"KQs: paga a abertura de UTG (perfil tag)"* |
| CO 25bb vs UTG 2.3x | call |
| CO 25bb vs UTG 2x | call |
| CO 50bb vs UTG 3x | call |

**Gravidade:** é a **primeira interação** de quem chega pelo site. Quem responde
"Call" (o que o app ensina) é informado de que errou. E a frase atribui ao motor
uma recomendação que ele não dá — exatamente o que a regra de honestidade proíbe.

**Como resolver (uma das duas):**
1. Trocar o veredito para **Call**, com a explicação do próprio motor; ou
2. Trocar o spot por um em que o motor realmente folda.

**Raia:** a cópia do site é do Manus — mas a afirmação é sobre o motor, que é meu.
Precisa do aval do Allan para eu mexer.

---

## 2. 🔴 P0 — rastreador do Facebook sem política de privacidade

`index.html` carrega o **Meta Pixel** (`fbq('init','2895094507517479')` +
`fbq('track','PageView')`) em **toda abertura do app**, sem consentimento.

Três problemas somados:

1. **Não existe política de privacidade** em lugar nenhum (procurei em `src/`,
   `site/` e `public/site/`: zero ocorrência de "privacidade"). Para um app
   brasileiro que coleta dados, isso é exposição de LGPD.
2. **Contradição interna.** O comentário ao lado do umami diz
   *"ANALYTICS (privacy-first, sem cookie)"* — verdade para o umami, **falso**
   para o Pixel logo acima, que usa cookie e manda dados para o Facebook.
3. **O desligar não cobre tudo.** O Perfil deixa desligar o umami
   (`umami.disabled`), mas **não existe nenhum desligar para o Pixel**.

**Por que é P0 num app que se vende pela honestidade:** o produto promete
"sem cadastro, sem dinheiro real, feito por um recreativo". Um pixel de
publicidade silencioso é o oposto disso — e é o tipo de coisa que, se alguém
descobrir antes de vocês contarem, custa a confiança inteira.

**Como resolver:** (a) escrever uma página curta de privacidade dizendo o que é
coletado e por quê; (b) decidir conscientemente se o Pixel fica — se ficar,
declarar e oferecer o mesmo desligar do umami.

---

## 3. 🟠 P1 — 72 alvos de toque abaixo de 44px

O passo 2 da auditoria anterior corrigiu os alvos **da mesa**. O resto do app
nunca foi feito. Medido agora, em 6 telas:

| Tela | Alvos < 44px | Os piores |
|---|---|---|
| Estudar | **26** | chips do hub 31px · "10bb" 35px |
| Perfil | **18** | "Trocar avatar" **22px** · bandeiras 🇧🇷🇪🇸🇬🇧 **24px** · Simples/Técnico 26px |
| Ranking | **13** | chips 31px · "Como a pontuação funciona" 34px |
| Treinar | 8 | chips do hub 31px |
| Importar | 5 | chips 31px |
| Hoje | 2 | "Resolver a mão do dia" 37px |

**Os chips do hub (31px) aparecem em 4 telas** — é um componente só, logo é uma
correção só. As bandeiras de idioma a 24px são o menor alvo do app inteiro.

---

## 4. 🟠 P1 — a fonte da marca vem de um servidor de fora

`src/ui/theme.css`, **linha 1**:

```css
@import url('https://fonts.googleapis.com/css2?family=Cinzel...&family=Playfair+Display...');
```

Conferido: o `@import` **sobrevive ao build** e está no CSS publicado de 186 KB.

Dois efeitos:

1. **Atrasa a primeira pintura.** O navegador precisa baixar o CSS → ler o
   `@import` → pedir o CSS do Google → e só então as fontes. Numa conexão móvel
   brasileira ruim, isso é cascata pura antes de qualquer pixel aparecer.
2. **A identidade depende de terceiro.** A marca "CALL OU FOLD" no feltro é
   Cinzel. Há fallback (`Cinzel, Georgia, serif`) — então **não quebra**, mas o
   app offline mostra a marca em Georgia.

**Como resolver:** embutir as duas fontes no próprio site (self-host) e trocar o
`@import` por `<link rel="preload">` no `index.html`.

---

## 5. 🟠 P1 — texto abaixo de 11px onde ele decide

38 ocorrências no total; a maioria é o rótulo da navegação (10,5px, aceitável
porque vem com ícone). O problema real está no **Ranking**:

| Texto | Tamanho |
|---|---|
| "5 FS", "11 FS", "22 e 55 FS", "109 FS", "1.000 FS", "10.000+ FS" | **9,5px** |
| "Set/2026", "2026" | 10px |

São justamente os números que identificam a faixa de buy-in — ou seja,
**informação que decide** onde a pessoa se encaixa, no menor tamanho do app.

---

## 6. 🟡 P2 — espanhol e inglês incompletos

| Idioma | Chaves | Faltando |
|---|---|---|
| pt | 576 | — |
| es | 535 | **48** |
| en | 536 | **47** |

Não quebra (o `t()` cai para o português), mas a tela **mistura idiomas**. As
faltas se concentram na Mesa Final (`ft.*`) e no ICM.

---

## 7. 🟡 P2 — peso e dívida de CSS

| Medida | Hoje | Na auditoria de 09/09 |
|---|---|---|
| Linhas de CSS | 10.004 | 9.783 |
| `!important` | **489** | 455 |
| Estilos inline no JSX | 327 em 51 arquivos | 327 |
| CSS publicado | 186 KB + 145 KB | — |
| JS publicado | vendor 412 KB · main 280 KB · theme 240 KB | — |

A dívida **cresceu** (+34 `!important` em um dia) — e parte é minha, das correções
desta semana. Não é urgente, mas é a curva que explica por que toda correção
visual vira uma camada nova.

---

## 8. ✅ Corrigido hoje, durante esta auditoria

**Mesa Final estava fora da tela.** Medido: a mesa começava em **y=628px** de uma
tela de 915px — era preciso rolar para ver as próprias cartas. O painel de ICM e
a lista dos 9 stacks (que repetem o que cada assento já mostra) ocupavam a tela
toda.

Depois: mesa em **y=0**, ocupando **100% × 90%** — mesmo patamar da mesa de jogo
(100% × 94%).

Feito do jeito certo: a tela deixou de ter layout próprio e passou a usar **a
mesma regra da mesa de jogo**. É o que torna o padrão real — melhoria na mesa
agora chega nas duas de uma vez.

### As 4 superfícies com mesa, depois da correção

| Superfície | Tela cheia? | Mesa ocupa |
|---|---|---|
| Mesa de jogo | ✅ | 100% × 94% |
| Review / Importar | ✅ | tela inteira, controles flutuando |
| **Mesa Final** | ✅ **hoje** | 100% × 90% |
| "Rever mão" (modal) | ✅ ocupa a tela | mesa em ~72% da altura: 258px ficam para os controles de replay |

A quarta é a única fora do padrão fino: ela é tela cheia, mas a mesa divide
espaço com um bloco de controles, em vez de usar zonas de toque como o Review.
**Candidata natural ao mesmo tratamento**, se o Allan quiser.

---

## 8b. 🔴 O achado fora da lista: um CSS de agosto pintando o app junto

Apareceu ao investigar por que as fontes do Google continuavam no CSS publicado
depois de eu removê-las do fonte.

`index.html` tinha `<link rel="stylesheet" href="/assets/index-RmRA6gsZ.css">`
apontando para um **build antigo commitado na raiz** — 107 KB minificados,
1.252 regras, congelados em 17/08. O Vite resolvia o link em build e empacotava
o arquivo inteiro junto com o CSS atual.

**Efeito:** o app era pintado por duas folhas ao mesmo tempo. É a explicação
mais provável do padrão "arruma uma coisa e outra desarruma" — regras novas
sobrescritas por regras que ninguém sabia que existiam.

Medido com `tools/layout-fingerprint/` antes e depois: **19 diferenças, todas o
desenho atual voltando ao lugar** — `.fine-tune-toggle` de 13px/quadrado/cinza
para 17px/redondo/dourado (o botão que "não pegava"), `.play-coach-bar` de 23
para 46px de altura, raio dos botões de 8 para 9px.

- CSS principal: **145,27 KB → 38,13 KB**.
- `assets/` da raiz removida: 3,8 MB de sobras, sem referência no código.

> ⚠️ Isto **não** contradiz o experimento das 4 camadas
> (`2026-09-10-EXPERIMENTO-camadas-css.md`). Aquelas camadas são vivas e
> continuam necessárias. Este era um build inteiro do passado, coisa diferente.

## 9. Ordem recomendada

| # | Frente | Risco | Por que primeiro |
|---|---|---|---|
| 1 | **Veredito do site (KQs)** | baixo | está informando errado agora, na porta de entrada |
| 2 | **Privacidade + Pixel** | baixo | exposição legal e de confiança |
| 3 | **Alvos de toque (chips + Perfil)** | baixo | um componente resolve 4 telas |
| 4 | **Fontes self-hosted** | baixo | ganho de velocidade em toda abertura |
| 5 | **Ranking: 9,5px** | baixo | informação que decide |
| 6 | **es/en** | baixo | 95 chaves |
| 7 | "Rever mão" no padrão do Review | médio | só se o Allan sentir falta |

**Não recomendado agora:** consolidar as camadas de CSS. Já foi medido e refutado
em `2026-09-10-EXPERIMENTO-camadas-css.md`.
