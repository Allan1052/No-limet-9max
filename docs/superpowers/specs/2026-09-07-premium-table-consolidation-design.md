# Call ou Fold — Consolidação Premium da Mesa

## Objetivo
Transformar a mesa mobile já fullscreen em uma experiência visual única, coerente e premium, inspirada na clareza operacional do GGPoker sem copiar marca, logos ou assets.

## Base já aprovada e preservada
- Modo imersivo durante a mão com `.play` ocupando 100dvh.
- Feltro praticamente preenchendo a viewport.
- Controles flutuantes na parte inferior, respeitando safe-area.
- Herói reposicionado para não ficar atrás dos controles.
- Baralho de 4 cores, cartas maiores e índice no canto.
- Avatares/monogramas, stacks em BB, cartas dos vilões atrás do avatar.
- Feltro premium, popup de range modernizado e Review em tela cheia.

## Problema atual
As melhorias existem, mas foram adicionadas em etapas diferentes. O resultado precisa ganhar uma hierarquia única: a mesa deve dominar a tela, os jogadores precisam parecer parte do feltro e não cartões independentes, e os controles devem parecer uma barra profissional integrada ao jogo, sem esconder informação relevante.

## Direção escolhida
### 1. Mesa como palco principal
Manter a arquitetura fullscreen atual. Não criar uma segunda implementação de tela cheia. Reduzir ruído visual periférico e usar contraste apenas onde há ação ou decisão.

### 2. Pods mais leves
Diminuir a sensação de “caixas” nos assentos. Preservar avatar, nome, posição, stack e cartas, porém com fundo mais transparente, bordas mais discretas e foco luminoso somente no jogador ativo/herói.

### 3. Centro da mesa mais legível
Preservar board, pote e marca d'água, mas reforçar a separação visual entre board/pote e o restante. A marca deve permanecer discreta para não competir com as cartas.

### 4. Herói como âncora
O assento do herói continua elevado no modo imersivo e passa a ter prioridade visual clara. Não pode ser cortado nem encoberto pelos controles em portrait ou landscape.

### 5. Controles como cockpit
Manter Fold / Call / Raise e slider existentes. Melhorar integração visual com o feltro: menos painel sólido, gradiente/blur mais controlado, botões principais mais fortes e painel de raise visualmente secundário. Nenhuma nova regra ou ação será criada.

### 6. Mobile first
Portrait é a referência principal. Landscape recebe compactação específica. Safe-area deve continuar respeitada.

## Arquivos permitidos
- `src/ui/tableModern.css`
- `src/ui/controlsHierarchy.css`
- `src/ui/mobilePolish.contract.test.ts`
- `src/ui/Table.tsx` somente se CSS não for suficiente para a hierarquia visual.
- `MUDANCAS.md`
- `dist/` após build, seguindo o padrão do projeto.

## Fora de escopo
Não alterar ranges, decisões, ICM, bots, game state, V3 ou qualquer arquivo do motor (`src/ranges`, `src/bots`, `src/game`, `src/v3`). Não copiar assets ou branding do GGPoker.

## Critérios de aceite
1. Mesa permanece fullscreen sem vão no modo imersivo.
2. Controles continuam inteiros, tocáveis e sobrepostos ao feltro.
3. Herói e pods não ficam atrás dos controles.
4. Pods têm menor peso visual; jogador ativo e herói continuam claramente destacados.
5. Board/pote permanecem legíveis e centralizados.
6. Portrait e landscape mantêm usabilidade.
7. Contratos CSS atualizados antes da implementação final.
8. `npm test` e `npm run build` verdes.
9. `MUDANCAS.md` atualizado em português simples.
10. PR criado a partir de branch dedicada; sem force-push.
