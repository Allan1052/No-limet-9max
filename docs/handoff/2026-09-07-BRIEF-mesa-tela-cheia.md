# 🎨 BRIEF pro ChatGPT — Mesa de jogo em TELA CHEIA (visual/UI)

> Escrito pelo Claude a pedido do Allan. É uma tarefa de **layout/UI** (a raia do
> visual). O Claude cuida do motor; aqui a gente precisa do seu olho de UI.
> **Trabalhe junto com o Allan pelos prints dele** — ele testa no celular e te
> mostra; ninguém aqui consegue ver a renderização no aparelho dele.

## 🎯 Objetivo
Durante a mão, a **mesa de poker precisa ocupar a tela inteira** do celular (estilo
GGPoker), pra ficar bonita nos **vídeos** que o Allan vai gravar. Hoje ela **não
enche** — fica um **vão vazio** entre a mesa e os botões, ou a mesa parece do mesmo
tamanho. O Claude já tentou várias abordagens e não fechou no aparelho do Allan.

**Importante (legal):** NÃO copiar a interface/marca do GGPoker pixel a pixel —
inspirar no layout (clareza, tela cheia), com a nossa cara.

## ✅ O que o Allan JÁ APROVOU (NÃO desfazer)
- Cartas com **4 cores** (♠ preto, ♥ vermelho, ♦ azul, ♣ verde) e índice no canto.
- **Avatar (monograma)** por jogador + **fichas em BB azul**.
- **Cartas escondidas dos vilões pequenas atrás do avatar**; feltro premium (aro/vinheta).
- **Popup de range** modernizado.
Essas partes estão boas — mexa só no que for necessário pra a **tela cheia**.

## 🔧 Como o app está montado (arquivos e mecanismos)
- **Modo imersivo já existe:** em `src/app/App.tsx` (~linha 248):
  `const navHidden = view === "play" && (!handOver || firstContactOverlay);`
  Quando `navHidden` é true, a raiz recebe a classe `app nav-hidden` (durante a mão).
  Ao terminar a mão (`handOver`), volta ao normal.
- **Estrutura da tela de jogo (DOM):**
  `.app > .view-enter > .play > [ .play-coach-bar (dica, opcional) , .table-wrap.table-modern (a MESA) , .play-tstatus (chips 22º/63 · 75/150) , .controls.controls-v2 (Fold/Call/Raise + slider) ]`
- **A MESA:** componente `src/ui/Table.tsx` (root `.table-wrap.table-modern`).
  - O feltro é um oval `position:absolute` (`.table-modern .felt`, `inset: 5% 3% 8%` no mobile).
  - Os 9 assentos são `position:absolute` por `%` — as posições estão em
    `SEAT_POS` no topo de `Table.tsx` (o **herói fica em `top: 86%`**, embaixo-centro).
    ⚠️ Se a mesa ficar muito alta, o herói (86%) pode cair atrás dos botões.
  - CSS da mesa: `src/ui/tableModern.css`.
- **Os botões:** `src/ui/Controls.tsx` (root `.controls.controls-v2`), CSS em
  `src/ui/controlsHierarchy.css`. Tem a linha de ação (Fold/Call/Raise) + o painel
  "DEFINA O TAMANHO DO RAISE" com slider (essa parte é alta, ~110px).

## 🧨 O que o Claude tentou (e o estado ATUAL no código)
No `src/ui/tableModern.css`, dentro do `@media (max-width: 640px)`, bloco imersivo atual:

```css
.app.nav-hidden .topbar,
.app.nav-hidden .hub-subnav,
.app.nav-hidden .session-progress-wrap { display: none; }  /* some com barra de cima + faixa de sessão */

.app.nav-hidden .play {
  position: fixed; inset: 0; z-index: 20;
  width: 100%; max-width: 100%; margin: 0;
  display: flex; flex-direction: column; gap: 4px;
  padding: 6px 7px calc(6px + env(safe-area-inset-bottom, 0px));
  background: #0b0e08; overflow: hidden;
}
.app.nav-hidden .play > .table-modern { flex: 1 1 auto; height: auto; min-height: 0; }
.app.nav-hidden .play-coach-bar,
.app.nav-hidden .play-tstatus,
.app.nav-hidden .play > .controls,
.app.nav-hidden .play > .action-row { flex: 0 0 auto; margin: 0; }
.app.nav-hidden .action-panel,
.app.nav-hidden .raise-control-panel { background: rgba(8,12,10,.9); }
```

A ideia: `.play` vira camada fixa de tela cheia; `.table-modern` (flex:1) enche o
espaço entre a dica e os botões. **Mesmo assim o Allan diz que "não ficou bom"** —
provavelmente a mesa ainda não preenche direito, e/ou algo corta (cartas do herói
atrás dos botões, controles altos demais, etc.).

Cuidado com regras que competem no mesmo arquivo:
- Base: `.table-wrap.table-modern { min-height: 560px }` (linha ~8) e, no `@media(max-width:640px)`,
  `.table-wrap.table-modern { height: clamp(360px, calc(100dvh - 268px), 700px) }`.
  No imersivo elas são sobrescritas por `height:auto; min-height:0; flex:1`.

## 📦 Entregável (o que fazer)
Ajustar **só o layout imersivo da mesa** (mexendo em `tableModern.css`, e se
precisar `Table.tsx` / `Controls.tsx` / `controlsHierarchy.css`) pra:
1. A **mesa preencher a tela** de verdade durante a mão (sem vão).
2. Os **botões inteiros e tocáveis** embaixo (Fold/Call/Raise + slider).
3. **Sua mão (herói) e os pods NÃO cortados** nem atrás dos botões.
4. (Bônus, se der) botões **flutuando** sobre o feltro (feltro aparece atrás), estilo GG.

Peça os **prints do Allan** a cada ajuste — é assim que dá pra acertar sem ver o aparelho.

## 🚧 Regras que NÃO podem quebrar (senão o deploy falha ou o app quebra)
- **A suíte de testes roda ANTES do deploy** (`.github/workflows/deploy.yml` faz
  `npm test` e só então `npm run build`). Se um teste falhar, **NÃO publica**.
  Rode `npx vitest run` antes de commitar (hoje ~3982 testes, 1 skip). **SELO GTO 61/61.**
- **Só apresentação/CSS.** NÃO toque no motor (ranges, decisão, ICM), nem em
  `src/ranges`, `src/bots`, `src/game`, `src/v3`.
- **Recompilar o `dist`** (`npx vite build`) e **commitar o `dist` junto** — o app é
  servido do `dist`. (O CI também rebuilda, mas mantenha o padrão do projeto.)
- **Registrar no `MUDANCAS.md`** (em cima, português, curto pro Allan).
- Fluxo de deploy: `git fetch origin main && git rebase origin/main && git push origin HEAD:main`. **Nunca force-push.**
- Depois de subir, o Allan fecha/reabre o app 2× (cache do PWA).
- Há um teste-contrato em `src/ui/mobilePolish.contract.test.ts` que fixa alguns
  valores de CSS da mesa — se mudar esses valores, **atualize o teste junto**.

## Contexto extra
- O Allan não é técnico e **só lê português** — fale com ele em português, simples.
- Toda a evolução recente da mesa está no `MUDANCAS.md` (topo).
