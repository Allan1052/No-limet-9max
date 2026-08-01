# Diagnóstico: Bug dos Ranges GTO

## Problema Reportado
- UTG abrindo QJo (deveria ser fold)
- UTG abrindo 53o (deveria ser fold)
- Grade mostrando "todas as opções" para UTG

## Diagnóstico Técnico

### Causa Raiz 1: `freqIn(range, handType) > 0` não basta
- `buildTopRange` cria ranges fracionárias (ex: QJo entra com freq 0.01 na fronteira)
- O check `> 0` considera QUALQUER freq positiva como "abre"
- Solução parcial: adicionei threshold `>= 0.1` (10%) — MAS o bug persiste

### Causa Raiz 2: O range base de UTG (11%) está correto, mas o bug persiste
- Isso significa que QJo está DENTRO do range de UTG com freq >= 0.1
- Possível causa: o `widthFactor` do perfil multiplica demais
- Possível causa 2: a função `rfiRange` usa `RFI_BASE_PERCENT` por posição + widthFactor

### Investigação Pendente
1. Verificar qual a freq de QJo no range de UTG com widthFactor 1.0 (baseline)
2. Verificar qual a freq de QJo no range de UTG com widthFactor 1.28 (O Certinho)
3. Se QJo está no range base de UTG → o `RFI_BASE_PERCENT` de UTG está errado
4. Se QJo NÃO está no range base → o widthFactor está inflando demais

### Próximos Passos
- Adicionar logging temporário para ver a freq exata de QJo no range
- Verificar o RFI_BASE_PERCENT de cada posição
- Possível fix: reduzir RFI_BASE_PERCENT de UTG ou aumentar threshold para 0.3
