# 🎨 FEEDBACK do Allan pro ChatGPT — mesa tela cheia (rodada 3)

> Melhorou de novo com a rodada 2 (#43)! 🙌 Faltam uns ajustes que o Allan apontou.
> Referência = layout do GGPoker, **com a NOSSA cara** (sem marca/arte do GG/WSOP).
> Contexto técnico nos briefs anteriores:
> `docs/handoff/2026-09-07-BRIEF-mesa-tela-cheia.md` e
> `docs/handoff/2026-09-08-FEEDBACK-mesa-tela-cheia.md`.

## ✅ Ajustes da rodada 3 (2026-09-08)

1. **Dica DENTRO da mesa.** Hoje a dica (💡 do coach) aparece **em cima**, fora da
   mesa. A mesa ficou grande e **cabe a dica dentro dela** — mova a dica pra dentro do
   feltro (topo/centro do feltro), não numa barra acima da mesa.

2. **"Call ou Fold" em DOURADO, destacado, dentro do feltro.** O Allan quer um
   **escrito dourado "Call ou Fold" no centro da mesa** (marca, chamativo/destaque) —
   hoje não está aparecendo direito. É a nossa identidade no feltro (bom pros vídeos).

3. **NADA pode tampar os oponentes nem a área de ação do herói.** O Allan relatou que
   algo (provavelmente a barra de apostas / os controles flutuantes) está **cobrindo os
   pods dos oponentes e a região das ações dele**. Reposicionar pra que os controles
   **não sobreponham** nenhum pod, nem as cartas, nem a área de ação. Cartas e ações
   sempre 100% visíveis.

4. **Barra de aumentos: vertical estilo GG, MAS COLAPSADA (economia de espaço).**
   - Por padrão, a pilha de aumentos (Pote/4BB/3BB/2BB) **fica escondida** — aparece só
     uma **setinha** (chevron) pra abrir.
   - Ao tocar na setinha, a pilha **sobe/expande** no **sentido vertical** (igual GG).
   - Se o Allan não for usar, ela **não fica ocupando espaço** na tela.
   - (Fold/Call/Raise principais continuam sempre visíveis; só a lista de tamanhos de
     aumento é que colapsa atrás da setinha.)

5. **Centralizar a mesa.** Ainda **não está centralizada** — a mesa/feltro precisa
   ficar no **centro** da área de jogo (horizontal e vertical).

## 🚧 Lembretes (pra não travar o deploy) — MUITO IMPORTANTE
- A **suíte roda antes do deploy** (`npm test`); se falhar, **NÃO publica**. Rode
  `npx vitest run` antes de commitar (SELO GTO 61/61, ~3982 testes).
- **Só apresentação/CSS/layout.** Não toque no motor (`src/ranges`, `src/bots`,
  `src/game`, `src/v3`).
- **Rebuild do `dist`** (`npx vite build`) + commit do `dist`; entrada no `MUDANCAS.md`.
- Fluxo: `git fetch origin main && git rebase origin/main && git push origin HEAD:main`. **Nunca force-push.**
- Se mudar valores fixados em `src/ui/mobilePolish.contract.test.ts`, **atualize o teste**.
- **Trabalhe pelos PRINTS do Allan** (ele testa no celular). Fale em **português**.
