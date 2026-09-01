# Seu jogo + Leak → Treino — Design

## Objetivo
Transformar a tela **Hoje** em uma prova simples de evolução: mostrar dados reais do jogador, destacar a maior oportunidade recorrente e oferecer o próximo passo correto sem criar cálculo novo de poker.

## Escopo aprovado
- Adicionar na tela **Hoje** um bloco compacto **Seu jogo**.
- Mostrar somente métricas reais já registradas no app: precisão, tendência e histórico de treino por leak quando existir.
- Detectar a maior oportunidade a partir do histórico persistente de decisões relevantes já salvo no aparelho (`cof-hand-log`) e do detector existente (`detectLeaks`).
- Reaproveitar o fluxo existente `createLeakDrillSession` / `planForLeak` para o CTA quando o treino dirigido estiver liberado.
- Quando o treino dirigido estiver bloqueado pela regra atual `rua2026`, **não desbloquear** nem contornar a trava: o CTA abre o painel de pontos fracos para revisão.
- Manter o item #3 (feedback decisão → motivo → matemática) fora deste trabalho, porque a Claude acabou de publicá-lo na `main`.
- Não tocar em Card de quiz, Reels, geradores de Instagram ou motor de poker.

## Jornada
1. Usuário abre **Hoje**.
2. Resolve a Mão do Dia normalmente.
3. Abaixo do atalho de análise, vê **Seu jogo**.
4. O bloco mostra:
   - precisão atual baseada na semana quando há amostra suficiente; senão, precisão geral;
   - tendência quando há dados semanais suficientes;
   - maior leak recorrente apenas quando houver pelo menos 2 ocorrências do mesmo padrão;
   - evolução desse leak quando o usuário já o treinou (primeira precisão → última precisão, delta real).
5. CTA:
   - leak pré-flop + drill liberado: **Treinar esse ponto** → sessão dirigida existente;
   - drill bloqueado ou leak pós-flop: **Revisar esse ponto** → painel `Seus Pontos Fracos`.

## Regras de honestidade dos dados
- Não inventar PFR, 3-bet, EV, frequência ou nota composta.
- Não chamar uma ocorrência isolada de leak recorrente.
- Não mostrar tendência semanal com menos de 5 decisões na semana.
- Não chamar precisão de “nível GTO”.
- Se a amostra for insuficiente, mostrar instrução neutra para continuar jogando e coletar dados.

## Arquitetura
### `src/ui/yourGameSnapshot.ts`
Helper puro. Recebe `ProgressSummary`, `FeedbackItem[]` e opcionalmente um provedor de tendência de treino. Produz um modelo de exibição sem acessar DOM ou storage. Usa `detectLeaks`, `planForLeak` e `leakTrainingTrend` existentes.

### `src/ui/YourGameCard.tsx`
Componente visual pequeno e mobile-first. Recebe o snapshot e callbacks. Não calcula estratégia.

### `src/ui/HojeView.tsx`
Carrega o histórico persistente com `loadHandLog()`, constrói o snapshot e renderiza `YourGameCard` abaixo do fluxo da Mão do Dia.

### `src/app/App.tsx`
Extrai o callback já existente de treino de leak para uma função reutilizável e passa callbacks/estado de bloqueio para `HojeView` e `LeaksPanel`.

### `src/ui/hojeView.css`
Estilos do bloco dentro da linguagem atual: verde escuro, dourado como destaque, contraste alto e sem ocupar mais que um card de conteúdo no mobile.

## Compatibilidade e segurança
- Nenhuma mudança em `src/feedback/leaks.ts` ou `src/train/leakTraining.ts`.
- Nenhum desbloqueio de recurso experimental.
- Nenhuma mudança na lógica de decisão, ChipEV, ICM, FE ou ranges.
- Sem dependências novas.
- `MUDANCAS.md` deve receber uma entrada nova em português em todo push que alterar o app.

## Critérios de aceitação
- A Home mostra **Seu jogo** usando dados reais.
- Com menos de 5 decisões, não exibe porcentagens que aparentem diagnóstico robusto.
- Um leak só vira “maior oportunidade” com 2+ ocorrências.
- Histórico de treino mostra delta real quando existir.
- CTA não ignora a trava `rua2026`.
- O item #3 da Claude não é modificado.
- Testes, SELO interno, TypeScript e build permanecem verdes.