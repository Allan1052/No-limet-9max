# ⚠️ REGRA DO LAYOUT DA MESA — leia antes de mexer (ChatGPT e Claude)

## Por que esta regra existe
A mesa acumulou **4 camadas de CSS** brigando pelo mesmo espaço
(`tableModern.css` → `tableFullscreenRound2.css` → `tableRound4.css` →
`controlsHierarchy.css`), cada rodada adicionando regras `position:fixed/absolute`
e `!important`. O resultado, no celular do Allan, foi:

- a **dica do coach cobrindo os pods** dos jogadores;
- o **painel de aumento cobrindo a mão do herói** e o pod do UTG;
- o **"Ver dicas" grudado no jogador da vez**, tapando os pods;
- a **mesa cortada** num cantinho em algumas telas.

## A regra (obrigatória a partir de agora)
1. **`src/ui/tableFinalLayout.css` é o arquivo AUTORITÁRIO do layout da mesa.**
   Ele é carregado por último (importado no fim de `Controls.tsx`) e define a
   estrutura. **Ajuste de layout da mesa se faz NELE**, não criando camada nova.
2. **NÃO crie mais um arquivo `tableRoundN.css`.** Se precisar mudar o layout,
   **edite o `tableFinalLayout.css`**.
3. **A estrutura é UMA COLUNA, tudo em FLUXO** (nada de `position:fixed` além do
   container `.play`):

   ```
   .play (tela cheia, flex column)
     ├── .play-coach-bar   (dica — faixa fina no topo)
     ├── .table-modern     (MESA: feltro + assentos) ← flex:1, ocupa o resto
     ├── .play-tstatus     (faixa fina de status)
     └── .controls         (barra de ações embaixo: 3 botões + coluna de atalhos)
   ```
   Enquanto essa estrutura for respeitada, **é impossível um elemento cobrir o outro**.
4. **Nada pode cobrir as cartas** (nem avatar, nem dica, nem painel, nem badge).
5. **"Ver dicas" fica FIXO no canto superior direito** do feltro. **Não** o
   posicione seguindo o jogador da vez (foi exatamente o que tapava os pods).
6. Referência visual = **GGPoker**, mas com a **nossa marca "Call ou Fold"**
   (marca d'água no centro do feltro). **Não** usar arte/marca do GG/WSOP.

## Antes de subir (senão o deploy falha)
- `npx vitest run` tem que passar (SELO GTO 61/61).
- Só apresentação/CSS. **Não** tocar em `src/ranges`, `src/bots`, `src/game`, `src/v3`.
- `npx vite build` + commitar o `dist`; anotar no `MUDANCAS.md` (português).
- `git fetch origin main && git rebase origin/main && git push origin HEAD:main`. **Nunca force-push.**
