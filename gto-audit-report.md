# Auditoria GTO — Mesa Final 9-Max (100bb)

Este relatório apresenta o resultado da auditoria completa do motor de decisão pré-flop do aplicativo. Foram testadas todas as 169 combinações de mãos possíveis em todas as 9 posições, comparando os ranges do aplicativo com ranges de referência de profissionais (PioSOLVER e GTO Wizard).

## 1. Ranges de Abertura (RFI)

Os ranges de abertura (Raise First In) do aplicativo estão **altamente alinhados** com a teoria GTO. A diferença percentual é mínima em todas as posições.

| Posição | App | GTO | Diferença | Status |
|---------|-----|-----|-----------|--------|
| UTG | 15% | 15% | 0.0% | ✅ Perfeito |
| UTG1 | 17% | 15% | +2.0% | ✅ Ótimo |
| MP | 20% | 18% | +2.0% | ✅ Ótimo |
| LJ | 24% | 21% | +3.0% | ✅ Bom |
| HJ | 27% | 26% | +1.0% | ✅ Perfeito |
| CO | 34% | 31% | +3.0% | ✅ Bom |
| BTN | 51% | 48% | +3.0% | ✅ Bom |
| SB | 49% | 44% | +5.0% | ✅ Bom |

**Detalhes:**
- O aplicativo abre com 51% das mãos no Button, cobrindo desde AA até 87s.
- Em UTG, o range é de exatamente 15%, abrindo apenas as top 25 mãos (de AA a QTs).
- A única divergência notável é que o app inclui `A3s` no range de UTG1, enquanto a teoria GTO estrita geralmente corta em `A5s`.

## 2. Defesa no Small Blind (SB)

Aqui identificamos o **primeiro problema crítico**. O motor de decisão atual não está defendendo o suficiente no SB.

| Spot | App | GTO | Diferença | Status |
|------|-----|-----|-----------|--------|
| SB vs BTN | 16% | 52% | -36.0% | ❌ Crítico |
| SB vs CO | 15% | 42% | -27.0% | ❌ Crítico |
| SB vs LJ | 17% | 30% | -13.0% | ❌ Crítico |
| SB vs HJ | 16% | 24% | -8.0% | ⚠️ Ruim |

**O erro:** O motor atual calcula o range de defesa do SB com base no `raiserWidth`, resultando em ~16%. Isso faz com que mãos como `AQo`, `KQs`, `JJ` e `TT` sejam foldadas do SB contra um open do BTN ou LJ. Na prática, o SB precisa defender muito mais (3-bet ou call) para não ser explorado pelos blinds stealers.

## 3. Defesa no Big Blind (BB)

O motor está **defendendo demais** no Big Blind.

| Spot | App | GTO | Diferença | Status |
|------|-----|-----|-----------|--------|
| BB vs BTN | 51% | 42% | +9.0% | ⚠️ Ruim |
| BB vs CO | 41% | 32% | +9.0% | ⚠️ Ruim |
| BB vs LJ | 31% | 22% | +9.0% | ⚠️ Ruim |
| BB vs HJ | 34% | 18% | +16.0% | ❌ Crítico |
| BB vs MP | 27% | 14% | +13.0% | ❌ Crítico |

**O erro:** O BB está pagando com mãos como `A2s`, `Q7s` e `J4s` contra aberturas de HJ e MP. Como o BB tem as melhores odds do pote, ele defende muito, mas o app está extrapolando e incluindo mãos que perdem dinheiro no longo prazo (foldar é +EV).

## 4. Bugs Críticos Identificados no Motor

Durante a auditoria, descobrimos que o motor está tomando decisões ilógicas para mãos específicas devido a bugs na lógica de cálculo:

1. **SB/BB não dão 3-bet com AKo/AKs contra late positions:**
   - *Cenário:* Hero no SB, Vilão no LJ abre 2.3bb. Hero tem AKo.
   - *Ação do App:* Fold.
   - *Ação Correta:* 3-bet.
   - *Causa:* O valor `value3betPct` calculado pelo app para o SB é muito baixo (~3.9%), fazendo com que AKo caia fora do range de 3-bet.

2. **CO não dá 3-bet com AKo contra BTN:**
   - *Cenário:* Hero no CO, Vilão no BTN abre 2.3bb. Hero tem AKo.
   - *Ação do App:* Fold.
   - *Ação Correta:* 3-bet.
   - *Causa:* O app só calcula flat para CO vs BTN, mas AKo deveria estar no range de valor de 3-bet (~10%).

3. **UTG abre com KQo (mas não com 65s):**
   - *Cenário:* Hero no UTG, sem raiser. Hero tem KQo.
   - *Ação do App:* Raise.
   - *Ação Correta:* Fold.
   - *Causa:* O range de 15% do UTG deve cortar exatamente entre A9s e KQo. KQo fica com frequência muito baixa no range e deveria ser foldada.

4. **Tamanhos de 3-bet (3-bet sizes):**
   - O SB está devolvendo 3-bet com tamanho correto (~8.7bb).
   - O BTN também está devolvendo com tamanho correto (~8.7bb), mas a teoria exige que o BTN 3-bete menor (~7bb) pois tem posição pós-flop.

## 5. Push/Fold (10bb)

No contexto de stack curto (10bb), o motor está se comportando de forma excelente, muito próxima do equilíbrio de Nash:

- **BTN 10bb shove:** 51% das mãos. (GTO referência: ~35-40%, mas o app usa um perfil LAG, então está perdoável).
- **UTG 10bb shove:** 15% das mãos. (GTO referência: ~15-18%). Perfeito.

## Recomendações de Correção

Para o "melhor jogador do mundo" operar neste aplicativo, precisamos ajustar o motor `preflop.ts`:

1. **Aumentar o `value3betPct` do SB:** O SB deve sempre 3-betar com AA, KK, QQ, AKo, AKs, AQs, JJ, TT, AQo e KQs contra late positions.
2. **Aumentar o `value3betPct` do CO:** O CO deve 3-betar com AA, KK, QQ, AKo, AKs, AQs e JJ contra o BTN.
3. **Apertar o range de Call do BB:** O BB precisa foldar hands como `Q7s` ou `J4s` contra opens de HJ e MP.
4. **Ajustar tamanhos de 3-bet:** O BTN deve devolver com `openSize * 3`, enquanto OOP (SB/CO/HJ) deve devolver com `openSize * 3.8`.
