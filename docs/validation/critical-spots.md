# Validação dos spots críticos — Call ou Fold

## Objetivo

Criar uma rotina de regressão matemática que caiba no orçamento atual do projeto e deixe claro o que está validado, o que ainda é apenas referência interna e o que continua sem validação independente suficiente.

## Cobertura atual

O banco existente contém 61 spots pré-flop curados. A Etapa 6 passa a separar esse placar agregado em quatro famílias: RFI com stack profundo, push/fold curto, defesa contra abertura e resposta a 3-bet. Cada família precisa manter pelo menos 95% de concordância para o build passar.

A suíte não altera ranges, decisões, ICM ou qualquer regra do motor. Se uma regressão aparecer, o teste deve falhar e a divergência deve ser investigada antes de qualquer mudança de estratégia.

## Limite da evidência

Este banco é um benchmark interno de regressão com referências curadas. Ele **não é certificação externa**, não transforma o Call ou Fold em solver e não prova precisão universal. O placar 61/61 deve ser entendido somente dentro dos 61 spots que fazem parte do banco.

Ainda ficam explicitamente fora da cobertura independente suficiente: ICM de bolha e mesa final, pós-flop com frequências mistas e sizings que dependem de árvore completa. Essas áreas devem receber referências adicionais gradualmente, sem inventar números para aumentar artificialmente o placar.

## Regra para próximas ampliações

Novos spots só entram no benchmark quando a referência e as premissas estiverem documentadas. Spots de fronteira, nos quais estratégias misturam ações, devem aceitar famílias/frequências compatíveis em vez de forçar uma única resposta. Qualquer possível correção de poker encontrada pela validação exige revisão separada antes de alterar o motor.
