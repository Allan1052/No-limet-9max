# Notas extraídas de `Ranges_PLO_Solver.pdf`

Fonte: `/home/ubuntu/upload/Ranges_PLO_Solver.pdf`

## Escopo do material

Guia de referência para **PLO 6-max, 100bb, sem rake, sem ação anterior**, baseado na lógica de solvers como PioSolver / GTO Wizard aplicada a PLO.

## Principais conceitos estratégicos úteis para o projeto

### 1. PLO não usa lógica de range fixa como Hold'em

O documento reforça que a força de uma mão em PLO depende da **sinergia entre as 4 cartas**, e não apenas da presença de ases ou broadways. Isso sugere que o projeto deve evitar classificações simplistas demais, especialmente para mãos como `AAxx` sem conectividade ou sem suitedness relevante.

### 2. Quatro pilares de avaliação pré-flop

O PDF destaca quatro critérios centrais para avaliar mãos de PLO:

1. **Conectividade**: rundowns e wraps têm grande valor.
2. **Double-suited**: duas possibilidades de flush aumentam bastante a equidade.
3. **Pares e nut potential**: pares valem mais quando conectados ao resto da mão.
4. **Ausência de danglers**: cartas mortas reduzem muito a qualidade da mão.

### 3. Hierarquia útil de categorias

A hierarquia apresentada, do topo para a base, é aproximadamente:

1. Nut rundowns double-suited
2. AAxx premium conectados / double-suited
3. Rundowns single-suited
4. AAxx médios
5. Broadways double-suited sem par
6. Pares médios/altos double-suited conectados
7. Rundowns rainbow
8. Pares baixos com conectores
9. Suited aces com conectores baixos
10. Gappers double-suited especulativos
11. Mãos marginais com danglers

### 4. Faixas de open por posição em 6-max, 100bb

O documento traz faixas aproximadas de abertura:

| Posição | Open aproximado |
|---|---:|
| UTG / EP | 12%–15% |
| MP | 17%–20% |
| CO | 24%–28% |
| BTN | 34%–40% |
| SB (open) | 20%–26% |

### 5. Direções sobre 3-bet e defesa

O material sugere que:

- contra **EP/MP**, a 3-bet deve ser mais concentrada no topo;
- contra **CO/BTN**, a 3-bet pode expandir com mais rundowns double-suited e mãos com boa jogabilidade;
- **BB defende bem mais amplo**, incluindo mãos especulativas adequadas para realização de equidade.

### 6. Ajustes por profundidade

- **< 40bb**: reduzir mãos especulativas e priorizar mãos com nut potential imediato.
- **100bb**: usar a estrutura base.
- **150–200bb+**: rundowns double-suited e mãos conectadas ganham valor; `AAxx` desconectado perde valor relativo.

### 7. Heurísticas incorretas vindas do Hold'em

O documento alerta para erros importantes que o projeto deve evitar:

- superestimar `AAxx` sem sinergia;
- subestimar rundowns baixos;
- ignorar danglers;
- achar que um único naipe já torna a mão muito forte.

### 8. Conceitos pós-flop relevantes para futura expansão

Mesmo que a implementação atual seja pré-flop, o PDF traz ideias úteis para evolução futura:

- valor altíssimo de **wraps**;
- importância de **nut peddling** em PLO;
- ajuste em **pots multiway**;
- uso de **blockers** em spots de 4-bet/all-in.

## Sugestões objetivas para incorporar no projeto

### Curto prazo

1. Refinar `getOmahaHandType()` para classificar melhor:
   - double-suited vs single-suited;
   - rundown / gap / broadway-connected;
   - par premium / par médio / par baixo;
   - presença de dangler.
2. Substituir listas muito planas de `open/call/threeBet` por **categorias ponderadas**.
3. Ajustar ranges por posição para ficarem próximos das faixas do PDF.
4. Aplicar ajuste por stack depth nas decisões Omaha.

### Médio prazo

1. Criar um **score de sinergia Omaha** em vez de depender só de strings de mão.
2. Usar esse score para decidir entre open / call / 3-bet.
3. Diferenciar lógica de defesa contra EP/MP versus CO/BTN.
4. Ampliar defesa do BB em Omaha.

### O que não vale incorporar de imediato

1. Pós-flop detalhado, wraps e blockers de 4-bet, porque isso exige arquitetura adicional.
2. Percentuais exatos como se fossem solver output completo; o próprio documento os apresenta como **faixas aproximadas**, não como tabela fechada.

## Conclusão prática

O PDF é útil e coerente com o objetivo do módulo Omaha. O principal valor para o projeto está em:

- melhorar a **classificação estrutural das mãos**;
- organizar ranges por **categoria e posição**;
- evitar transplante direto de heurísticas de Hold'em;
- preparar a base para ranges mais realistas de open, call e 3-bet.

A melhor incorporação imediata é usar este material para refatorar a camada de avaliação pré-flop Omaha, antes de tentar ampliar ainda mais o número de combos listados manualmente.

## Observação

O PDF parece ser um material-resumo / guia heurístico, não uma exportação bruta de solver. Portanto, deve ser tratado como **referência estratégica**, e não como verdade matemática exata.

