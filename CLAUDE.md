# Call ou Fold — registro do projeto

## ⚠️ REGRA Nº 1 — IDIOMA: SEMPRE PORTUGUÊS
O Allan **não é técnico e não lê inglês**. Ele gosta de ler e acompanhar tudo.
**TODAS** as respostas ao Allan são em **português** — sem exceção. Isso vale
para mensagens de chat, explicações, resumos, perguntas e qualquer texto que ele
vá ler. (Código, nomes de variável e termos consagrados de poker podem ficar
como estão; a comunicação com ele é em português.)

## Sobre o produto
Call ou Fold (calloufold.com.br) — app PWA **gratuito** de ESTUDO de poker
NLHE/MTT 9-max, para o jogador recreativo brasileiro. Sem dinheiro real.
Posicionamento humilde: "feito por um recreativo, uma mão por vez". NÃO se vende
como solver GTO profissional nem como diagnóstico estatístico definitivo.

## Como trabalhamos (2 agentes de IA)
- **Claude (eu)** = motor/lógica: ranges, feedback, ICM, decisão, testes.
- **Manus** = visual/UI/site/produto: landing, layout, cópia, fluxos.
Ao dividir tarefas, respeitar essas raias e coordenar pelo Allan.

## Deploy
O site/app publica a partir da branch **main** (é assim que a atualização chega
no celular do Allan). Fluxo: commitar fonte + `dist`, `git fetch origin main`,
`git rebase origin/main`, `git push origin HEAD:main`. **Nunca** force-push.
Depois de deployar, o Allan precisa fechar/reabrir o app 2× (cache do PWA).

⚠️ **SEMPRE recompilar o `dist` (`npx vite build`) depois de mexer no código e
commitar o `dist` junto** — o app é servido do `dist` commitado; sem rebuild, a
mudança fica no repo mas NÃO vai pro ar. Regras completas para os dois agentes
(Claude + Manus) no arquivo **`AGENTS.md`** na raiz.

## ⚠️ REGISTRO OBRIGATÓRIO — `MUDANCAS.md`
**Todo push que muda o app** (UI, motor, site ou textos) exige uma entrada nova
no arquivo **`MUDANCAS.md`** (na raiz), em **português**, curta, pro Allan
entender: o que mudou, por que e em qual tela. Mais novo em cima. É a forma de
o Allan acompanhar tudo e de os dois agentes não se atrapalharem. Regra completa
no `AGENTS.md` (Regra Nº 5).

## Guardrails de qualidade (não quebrar)
- **SELO GTO deve continuar 61/61** (src/ranges/_calibration/gtoBenchmark.test.ts).
- Rodar a suíte antes de deployar (`npx vitest run`) — hoje ~3660+ testes.
- Claims honestas: nada de número inventado, avaliação sem fonte ou selo que
  prometa mais do que o teste mede.
