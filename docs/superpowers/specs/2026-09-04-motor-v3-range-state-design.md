# Motor V3 — Range State e Validação Externa

## Objetivo

Evoluir o Call ou Fold de um motor predominantemente heurístico/calibrado para um motor educacional baseado em estado de ranges, validado externamente contra spots reais e certificados de GTO Wizard/HRC.

O V3 deve preservar as bases matemáticas que já funcionam — equity Monte Carlo, pot odds, side pots, ICM fold/win/lose e testes antigos — enquanto corrige limitações estruturais já demonstradas por benchmarks externos, principalmente Blind War, coverage, PKO, propagação de ranges, blockers, multiway, sizing e frequências mistas.

## Princípios obrigatórios

1. Referência solver certificada tem prioridade sobre range antigo conflitante quando o contexto for comparável.
2. Coach/comentário qualitativo não conta como ground truth.
3. Benchmarks HRC não convergidos ou contexto incompleto são PARCIAIS, nunca definitivos.
4. Node-lock/exploit fica separado de baseline GTO.
5. O motor não receberá patches específicos por mão; correções devem ser estruturais.
6. O V2 permanece disponível como fallback e regressão durante a migração.
7. O selo 61/61 permanece como cobertura de regressão antiga, mas não será tratado como prova de fidelidade GTO global.
8. Um percentual global correto não é suficiente: a composição das 169 mãos e seus mixes também devem ser validados.

## Níveis de evidência

### CERTIFICADO
Solver visual, contexto reproduzível e ação/frequência legíveis. Pode substituir comportamento V2 conflitante no mesmo domínio de contexto.

### PARCIAL
Há solver real, mas falta convergência completa, contexto exato, branch exato ou identificação inequívoca de combo/posição. Serve para direção e tolerância, não para sobrescrever automaticamente o V2.

### CALIBRADO
Modelo consistente com evidência adjacente e princípios observados, mas sem benchmark direto naquele ponto.

### FALLBACK_V2
Região ainda não migrada ou sem evidência suficiente.

## Arquitetura-alvo

Fluxo conceitual:

Contexto do torneio -> Range inicial por jogador -> Atualização por ação -> Range state por jogador -> Blockers/card removal -> Equity/EV -> Árvore de sizings -> Frequências baseline -> Camada exploit/perfil

### 1. TournamentContextV3

Estado mínimo:
- formato: Vanilla | PKO | Mystery Bounty;
- fase do torneio / percentual restante quando disponível;
- payouts/ICM quando disponíveis;
- stacks individuais;
- stack efetivo;
- bounty por jogador quando aplicável;
- coverage identity: quem cobre quem;
- posições e número de jogadores ativos.

Coverage é variável de primeira classe e não pode ser reduzida a stack efetivo.

### 2. PlayerRangeState

Cada jogador ativo carrega uma distribuição handType -> frequência [0..1], com metadados:
- origem do range;
- nível de evidência;
- contexto usado;
- histórico de transformações;
- peso total em combos;
- timestamp/versionamento do modelo.

O estado deve permitir 169 classes e, quando necessário, expansão para combos exatos para card removal.

### 3. Atualização de range por ação

Cada ação observada transforma o range anterior em vez de construir um novo top-X do zero.

Ações mínimas pré-flop:
- fold;
- limp;
- raise por sizing;
- call;
- 3bet;
- 4bet+;
- shove;
- check no BB.

Ações mínimas pós-flop:
- check;
- bet por sizing bucket;
- call;
- raise por sizing bucket;
- shove;
- fold.

A atualização deve considerar board, sizing, posição, SPR, contexto de torneio, coverage e ação anterior.

## Primeira implementação: Blind War V3

Blind War será a primeira região promovida porque já possui benchmarks externos fortes e demonstra uma falha estrutural clara do V2: ausência de SB limp como ação de RFI.

### Benchmark BW1 — PKO, 50% restantes, SB33 cobre BB20
Referência certificada:
- shove 20bb: 18.0%
- raise 3bb: 25.0%
- limp: 43.9%
- fold: 13.1%

### Benchmark BW2 — BB20 coberto vs limp de SB33
Referência certificada:
- shove 20bb: 10.3%
- raise 3bb: 33.2%
- check: 56.5%

### Benchmark BW3 — coverage invertido, SB27 coberto por BB53
BB vs limp:
- iso 3bb: 42.4%
- jam 27bb: 3.2%
- check: 54.4%

SB vs iso 3bb:
- jam: 4.6%
- click/3bet 7.5bb: 8.4%
- call: 60.2%
- fold: 26.8%

### Benchmark BW4 — Vanilla vs PKO, 50% restantes, 20bb efetivos
Vanilla SB33 vs BB20:
- jam: 13.6%
- raise 3bb: 18.6%
- limp: 50.0%
- fold: 17.8%

O modelo deve capturar que o bounty/coverage altera a árvore desde a origem, não apenas o valor final de uma decisão.

### Benchmark BW5 — Vanilla, high ICM, SB40 vs BB40
SB RFI:
- jam: 0.0%
- raise 3bb: 11.9%
- limp: 76.3%
- fold: 11.7%

BB vs limp:
- check: 51.9%
- raise 7.5bb: 12.9%
- fold: 35.3%

Esse benchmark impede a heurística incorreta de que stack mais profundo implica necessariamente mais raise/agressão.

## Armazenamento dos benchmarks

Cada benchmark deverá ser representado por fixture estruturada, contendo:
- id estável;
- fonte;
- videoId;
- timestamp;
- solver;
- evidenceLevel;
- format;
- phase;
- stacks;
- coverage;
- positions;
- prior actions;
- action node;
- action frequencies;
- hand-level frequencies quando visualmente certificadas;
- sizing;
- EV quando visível;
- notas de divergência/coaching separadas da saída solver.

Fixtures certificadas não devem embutir inferências não visíveis.

## Interpolação e falsa precisão

O V3 não pode assumir que um spot certificado em 20bb representa automaticamente 25bb, 30bb ou 40bb.

Regras:
- CERTIFICADO vale para o domínio exato ou uma vizinhança explicitamente definida por evidência;
- interpolação entre dois pontos certificados só é permitida quando formato, fase, coverage e árvore de ação forem compatíveis;
- extrapolação não será marcada como certificada;
- quando não houver suporte suficiente, usar CALIBRADO ou FALLBACK_V2;
- a UI não precisa expor inicialmente esses rótulos, mas o motor/testes devem carregá-los.

## Composição das 169 mãos

A validação de range terá dois níveis obrigatórios:

### Frequência global
Compara o percentual total de fold/limp/raise/shove/call/check etc.

### Composição
Compara quais handTypes participam de cada ação e em qual frequência.

Um range de shove de 18% não passa por apenas totalizar 18%; deve conter aproximadamente as mãos e mixes certificados que compõem aquele 18%.

Quando o vídeo mostrar apenas frequência global e tendências parciais de combos, o teste de composição deve usar somente o subconjunto realmente visível e manter o restante como não certificado.

## Mixed strategies

Separar duas fontes de frequência:

1. baselineFrequency: frequência estratégica calibrada/certificada;
2. behaviorFrequency: modificação opcional de personalidade/exploit.

O baseline nunca deve ser alterado silenciosamente por perfil de bot em testes GTO.

Critério de comparação:
- não exigir igualdade exata de RNG;
- comparar distribuição/frequência dentro de tolerância;
- considerar ações de EV quase equivalente como mix aceitável quando o solver demonstrar isso.

## Sizing

O sizingV2 atual é heurístico e deve ser preservado como fallback inicial, não como referência solver.

V3 deve suportar uma árvore de sizings candidatos por nó, por exemplo:
- 25/33%;
- 40/50%;
- 66/75%;
- pot;
- overbet;
- shove;

A árvore real dependerá da rua e do contexto. Não é necessário gerar todas as opções em todos os spots.

Benchmarks externos devem calibrar seleção e frequência por sizing.

## ICM, PKO e coverage

O núcleo ICM existente deve ser reutilizado.

Mudança principal: ICM/PKO/coverage devem influenciar não apenas requiredEquity em all-ins, mas também:
- range inicial;
- frequência de limp/raise/call/fold;
- range que continua após cada sizing;
- agressão pós-flop;
- bluff-catching;
- sizing tree quando houver evidência.

## Blockers e card removal

Blockers devem operar sobre composição de range, não apenas força absoluta da mão.

Requisitos:
- remover combos impossíveis;
- medir bloqueio de value;
- medir bloqueio/desbloqueio de bluffs;
- suportar flush/straight/full-house/paired-board effects;
- influenciar river bluff-catch e bluff selection.

Benchmark obrigatório futuro: river 77 vs 33 onde 77 folda e 33 paga por composição/blockers.

## Multiway

Cada oponente deve manter range state independente.

A equity multiway existente pode ser preservada, mas os vilões não podem ser modelados automaticamente pelo mesmo top-X agregado.

Benchmark obrigatório futuro: spot 98s 3-way onde composição e underbluff determinam o fold.

## Baseline GTO vs exploit/node-lock

Node-lock nunca altera o baseline certificado.

Estrutura:
- baselineStrategy;
- exploitOverrides/nodeLocks;
- provenance explícita do override.

Benchmarks QJo e T9 devem testar que o baseline permanece uma ação e o node-lock produz outra sem contaminar a referência original.

## Estratégia de migração V2 -> V3

Fases:

1. Criar tipos e fixtures de benchmarks sem alterar comportamento de produção.
2. Implementar Range State V3 isolado.
3. Implementar Blind War V3 e seus testes.
4. Rodar comparação V2 vs V3 vs referência certificada.
5. Promover apenas a região Blind War aprovada.
6. Migrar ranges pré-flop gerais.
7. Integrar coverage/PKO/ICM ao range state.
8. Propagar ranges flop -> turn -> river.
9. Integrar blockers/card removal.
10. Integrar multiway por jogador.
11. Evoluir sizing e mixed frequencies.
12. Separar definitivamente baseline/exploit.

Nenhuma etapa deve exigir substituição total do motor de uma vez.

## Critério de promoção de um nó V3

Um nó só pode substituir o V2 se cumprir:
- ação tree compatível;
- frequência global dentro da tolerância definida pelo fixture;
- composição hand-level compatível onde certificada;
- mixes preservados onde visíveis;
- contexto de formato/stack/coverage/fase compatível;
- testes antigos relevantes continuam passando ou possuem justificativa documentada para alteração;
- nenhuma regressão grave em ICM, side pots, legalidade de ação ou engine de jogo.

## Testes

### Camada A — regressão histórica
Manter gtoAudit/61-61 e demais testes atuais como rede de segurança.

### Camada B — external benchmark suite
Fixtures certificadas de GTO Wizard/HRC com comparação V2/V3/referência.

### Camada C — structural invariants
Exemplos:
- inverter coverage altera estratégia quando benchmark demonstra isso;
- Vanilla e PKO não colapsam para a mesma estratégia;
- high ICM não é função monotônica simples de agressão;
- SB limp existe como ação de primeira classe;
- ranges por jogador divergem em multiway;
- blockers podem inverter ordenação por força absoluta;
- node-lock não contamina baseline.

## Tolerâncias

Tolerâncias serão definidas por fixture conforme qualidade visual e granularidade do solver.

Diretriz inicial:
- frequência global claramente visível: tolerância estreita;
- frequência combo-level arredondada/visualmente estimada: tolerância mais ampla;
- EV visível com arredondamento: comparar sinal e banda, não casas decimais artificiais;
- HRC parcial: teste informativo/tolerance-band, não gate de promoção.

Nenhum teste deve fabricar precisão maior que a fonte.

## Não objetivos da primeira entrega

- Não reconstruir um solver completo em tempo real.
- Não reproduzir integralmente toda a árvore GTO Wizard.
- Não migrar toda a UI.
- Não alterar funil/Instagram/painel Seu Jogo.
- Não substituir todos os ranges pré-flop no primeiro PR.
- Não implementar exploit avançado antes de baseline/range-state confiável.

## Métrica de sucesso da primeira entrega

A primeira entrega é considerada bem-sucedida quando:
- RangeStateV3 existe e é testável isoladamente;
- SB limp é ação nativa;
- BW1-BW5 existem como fixtures estruturadas;
- o V3 reproduz as frequências globais dos nós Blind War dentro das tolerâncias dos fixtures;
- composição certificada de combos é testada onde houver evidência visual suficiente;
- coverage inversion e Vanilla vs PKO produzem estratégias distintas nas direções certificadas;
- V2 continua disponível como fallback;
- regressões matemáticas críticas existentes continuam protegidas.

## Sequência depois da primeira entrega

Após Blind War:
1. ranges pré-flop gerais por posição/stack/contexto;
2. coverage + PKO + ICM em todos os nós pré-flop;
3. propagação pós-flop;
4. blockers/card removal;
5. multiway;
6. sizing/mixed strategies;
7. baseline vs exploit;
8. expansão contínua da suíte com novos benchmarks certificados.
