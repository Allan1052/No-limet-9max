# 🎨 FEEDBACK do Allan pro ChatGPT — mesa tela cheia (rodada 2)

> Melhorou bastante com sua última rodada (mesa premium, controles no feltro)! 🙌
> Mas ainda não está como o Allan quer. Abaixo a **lista exata** de ajustes.
> Contexto técnico completo continua em `docs/handoff/2026-09-07-BRIEF-mesa-tela-cheia.md`
> (arquivos, mecanismo `nav-hidden`, regras que não podem quebrar, fluxo de deploy).
> Referência = **layout do GGPoker, MAS com a NOSSA cara** — sem usar marca/arte do
> GG/WSOP (nada de versos "WSOP", logo GG ou o fundo de acampamento deles).

## ✅ Ajustes pedidos pelo Allan (2026-09-08)

1. **Centralizar a mesa.** Hoje a mesa/feltro não está centralizada na tela — ela
   precisa ficar **no centro** (horizontal e vertical) da área de jogo.

2. **Pod (quadradão de info do jogador) está GRANDE demais.** Deixar **menor e mais
   enxuto, estilo GG** — e continuar **mostrando as cartas** do jogador. Hoje o pod
   ocupa espaço demais.

3. **Avatar (o círculo com a 1ª letra do vilão) está GRANDE e TAMPA as cartas.**
   Diminuir o avatar. **Regra dura: NADA pode tampar as cartas** — nem avatar, nem
   plaquinha, nem badge. As cartas sempre 100% visíveis.

4. **Barra de apostas igual à do GGPoker** (mantendo nosso estilo): a **pilha de
   aumentos à direita** — "Pote / 4BB / 3BB / 2BB · Aumentar" empilhados — e
   **Desistir / Pagar** embaixo à esquerda (como na foto de referência do GG que o
   Allan mandou). Hoje está diferente disso.

5. **Centro da mesa: escrever "Call ou Fold"** (nossa marca, marca d'água no feltro)
   **e trazer as informações do torneio pra dentro da mesa** (posição, blinds, prêmio,
   pontos). Com isso, **pode tirar essas infos de cima** — o topo fica limpo.

6. **Botão "Ver dicas" tem que APARECER na tela cheia.** Hoje ele some no modo
   imersivo — ele precisa continuar visível/acessível durante a mão em tela cheia
   (pode ser flutuante, discreto, sobre o feltro).

7. **Tela cheia SEMPRE ao abrir a mesa.** Qualquer ação que abra a mesa de jogo
   (entrar numa mão, Torneio, Treino, Review) deve **já abrir em tela cheia** — não
   só durante a mão. O Allan quer a experiência imersiva o tempo todo que a mesa
   estiver aberta.

## 🚧 Lembretes (pra não travar o deploy)
- A **suíte roda antes do deploy** (`npm test` no `.github/workflows/deploy.yml`); se
  falhar, **não publica**. Rode `npx vitest run` antes de commitar (SELO GTO 61/61).
- **Só apresentação/CSS/layout.** Não toque em motor (`src/ranges`, `src/bots`,
  `src/game`, `src/v3`).
- **Rebuild do `dist`** (`npx vite build`) + commit do `dist`; entrada no `MUDANCAS.md`
  (português, curto). Fluxo: `git fetch origin main && git rebase origin/main && git push origin HEAD:main`. **Nunca force-push.**
- Se mexer em valores fixados no `src/ui/mobilePolish.contract.test.ts`, **atualize o teste**.
- **Trabalhe pelos prints do Allan** — ele testa no celular e te mostra.
- Fale com o Allan em **português** (ele não lê inglês).
