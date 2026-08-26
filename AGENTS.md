# ⚠️ LEIA ANTES DE COMMITAR / SUBIR — Call ou Fold

Este projeto é tocado por **duas IAs** (Claude e Manus) + o Allan. Para não
atrapalhar um ao outro nem quebrar o deploy, siga estas regras **sempre**.

---

## 🟢 REGRA Nº 1 — FALE SEMPRE EM PORTUGUÊS COM O ALLAN
O Allan **não é técnico e não lê inglês**. Toda mensagem, resumo, pergunta e
explicação para ele é **em português**. (Código e termos de poker podem ficar
como estão.)

---

## 🔴 REGRA Nº 2 — DEPOIS DE MEXER NO CÓDIGO, RECOMPILE O `dist`
**O app e o site são servidos a partir da pasta `dist/` COMMITADA.**
Se você mudar o código-fonte (`src/`, `index.html`, `site/`, `public/site/`) e
**não** recompilar o `dist`, sua mudança **NÃO chega no celular do Allan** — o
código novo fica no repositório, mas o que é publicado continua o antigo.

**Antes de todo push que muda a UI ou o site, rode:**
```bash
npx vitest run          # 1) testes passando (hoje ~3660+)
npx vite build          # 2) recompila o dist com o seu source
git add -A              # 3) inclui src + dist (+ index.html/site)
git commit -m "..."     # 4) commit
git fetch origin main && git rebase origin/main
git push origin HEAD:main
```
Confirme que `git status dist` fica **limpo** depois do build — se aparecerem
arquivos mudados no `dist` que você não commitou, o deploy vai sair velho.

Depois de subir, o Allan precisa **fechar e reabrir o app 2×** (cache do PWA).

---

## 🟡 REGRA Nº 3 — RESPEITE AS RAIAS
- **Claude** = motor/lógica: `src/ranges`, `src/feedback`, `src/bots`,
  `src/import`, `src/engine`, `src/train/stage.ts`, ICM, testes.
- **Manus** = visual/UI/site/produto: landing, `src/ui/*`, layout, cópia, fluxos.

Se precisar cruzar a raia, avise pelo Allan primeiro. Nunca mexa no motor sem
combinar (risco de quebrar a calibração).

---

## 🔵 REGRA Nº 4 — NÃO QUEBRE OS GUARDRAILS
- **SELO GTO tem que continuar 61/61** — rode
  `npx vitest run src/ranges/_calibration/gtoBenchmark.test.ts`.
- **Landings sincronizadas**: `public/site/index.html` e `site/index.html`
  precisam ter o mesmo conteúdo.
- **Claims honestas**: nada de número inventado (contador de jogadores,
  avaliação sem fonte) nem selo que prometa mais do que o teste mede.
- **Nunca** `git push --force`.

---

Dúvida de fluxo? Fale com o Allan. O registro completo do projeto está no
`CLAUDE.md`.
