# ⚠️ LEIA ANTES DE COMMITAR / SUBIR — Call ou Fold

Este projeto é tocado por **duas IAs** (Claude e Manus) + o Allan. Para não
atrapalhar um ao outro nem quebrar o deploy, siga estas regras **sempre**.

---

## 🟢 REGRA Nº 1 — FALE SEMPRE EM PORTUGUÊS COM O ALLAN
O Allan **não é técnico e não lê inglês**. Toda mensagem, resumo, pergunta e
explicação para ele é **em português**. (Código e termos de poker podem ficar
como estão.)

---

## 🔴 REGRA Nº 2 — RODE `npm run build` ANTES DO PUSH (mas NÃO commite o `dist`)

> ⚠️ **MUDOU EM 10/09/2026.** A regra antiga dizia "o app é servido do `dist`
> COMMITADO". **Isso não é verdade** e foi verificado no
> `.github/workflows/deploy.yml`: o robô roda `npm install` → `npm test` →
> `npm run build` e publica o `dist` **gerado no CI**. O `dist` commitado nunca
> chegava ao ar — só engordava o histórico (e trocava inteiro a cada build).
> Por isso o `dist/` agora está no `.gitignore`.

**O build continua obrigatório antes do push** — por outro motivo: `npm run
build` roda o `tsc`, e o `tsc` pega erro de tipo que a suíte de testes **não**
pega. Já barrou um deploy uma vez.

**Antes de todo push:**
```bash
npx vitest run          # 1) suíte verde (hoje ~4023 testes, SELO GTO 61/61)
npm run build           # 2) roda tsc + vite build (NÃO commite o dist)
git add -A              # 3) só fonte, docs e MUDANCAS.md
git commit -m "..."     # 4) commit
git fetch origin main && git rebase origin/main
git push origin HEAD:main
```

Depois de subir, **confirme que o deploy terminou com sucesso** (Actions) antes
de dizer ao Allan que está pronto. Ele precisa **fechar e reabrir o app 2×**
(cache do PWA).

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

## 🟣 REGRA Nº 5 — ANOTE O QUE MUDOU NO `MUDANCAS.md`
**Todo push que muda o app** (UI, motor, site ou textos) tem que vir com uma
entrada nova no arquivo **`MUDANCAS.md`** (na raiz), escrita **em português**
pro Allan entender — o que mudou, por que, e em qual tela. Mais novo em cima.
É assim que o Allan acompanha quem mexeu no quê e um agente não atrapalha o
outro. **Não subir sem anotar.**

---

## 🟠 REGRA Nº 6 — O OUTRO AGENTE TAMBÉM PUBLICA. CONFIRA ANTES E DEPOIS.

> **Nasceu de um erro real (10/09/2026).** O Claude publicou às 16:51; o outro
> agente publicou às 18:27. Quando o Allan mandou um print do app, o Claude
> comparou com a **própria** última publicação e concluiu, errado, que o celular
> dele estava travado numa versão velha. O app estava certo — o diagnóstico é
> que estava errado, e o Allan perdeu tempo atrás de um problema que não existia.

### 1. Antes de começar a mexer
```bash
git fetch origin main
git log --oneline HEAD..origin/main    # o que o outro agente subiu
head -40 MUDANCAS.md                   # e o que ele contou pro Allan
```
Dois agentes editando o mesmo arquivo no mesmo dia é o jeito mais fácil de um
desfazer o trabalho do outro sem perceber.

### 2. Se o rebase trouxe commits novos, RODE A SUÍTE DE NOVO
O outro agente pode ter adicionado testes que o **seu** código precisa passar.
Suíte verde **antes** do rebase não vale — o que conta é depois.

### 3. Para saber o que está NO AR, não chute
A versão publicada é a do **último deploy verde do `origin/main`**, seja de quem
for — **não** a sua última publicação.
```bash
git fetch origin main && git log -1 --format='%h %cI %s' origin/main
```
E confirme nas Actions que aquele run terminou `success`.

### 4. Quando o Allan mandar print perguntando "chegou?"
Peça o **código de 7 letras** que aparece no Perfil (ex.: `609ebe6`).
**Data e hora não servem para isso**: elas são convertidas pelo relógio do
celular dele e não dizem quem publicou.
```bash
git log -1 --format='%cI %s' <código>   # identifica a versão sem ambiguidade
```
Lembre também que **o próprio app já responde sozinho** na linha Versão do
Perfil ("✓ Seu app está atualizado" / "⬇️ Existe uma versão nova").

### 5. Push recusado = o outro agente subiu algo
`git fetch origin main && git rebase origin/main`, e sobe de novo.
**Nunca** `--force`. Se der conflito e você não tiver certeza do que é de quem,
**pare e fale com o Allan** — é melhor esperar do que apagar o trabalho dele.

---

Dúvida de fluxo? Fale com o Allan. O registro completo do projeto está no
`CLAUDE.md`.
