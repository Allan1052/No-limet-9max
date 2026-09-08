# Regra permanente — acompanhamento do trabalho do ChatGPT

> Regra aprovada pelo Allan em 2026-09-08. Deve ser relida junto dos handoffs antes de iniciar ou retomar trabalho no Call ou Fold.

## Objetivo
O Allan não deve precisar mandar “como estamos?” para descobrir se uma tarefa avançou, terminou, falhou ou já foi publicada.

## Regra de comunicação
1. Ao iniciar uma tarefa relevante, informar claramente **INICIADO** e o que será trabalhado.
2. Durante a mesma execução, dar retornos nos marcos importantes, sem esperar o Allan perguntar: código/ajuste aplicado, testes iniciados, testes concluídos, build concluído e deploy iniciado/concluído.
3. Se houver erro, bloqueio, conflito, teste vermelho ou risco de publicação, avisar imediatamente e dizer o estado real.
4. Não encerrar uma resposta apenas com “vou seguir”, “estou fazendo” ou equivalente quando ainda houver trabalho que possa ser executado naquela resposta. Continuar até um marco concreto.
5. Ao finalizar, usar um estado inequívoco:
   - **PRONTO PARA TESTAR** — somente depois de verificar a publicação real;
   - **AINDA NÃO ESTÁ PRONTO** — quando houver qualquer etapa pendente ou falha.
6. Nunca dizer que está pronto com base apenas em intenção, alteração de código ou commit. Confirmar testes/build/deploy exigidos pelo projeto.
7. Antes de começar nova sessão de trabalho no Call ou Fold, reler esta regra e os handoffs ativos.

## Limitação do chat
O ChatGPT não consegue enviar espontaneamente uma nova mensagem depois que uma execução já terminou, salvo quando existir uma automação/agendamento apropriado. Por isso, enquanto estiver executando uma tarefa na resposta atual, deve manter o Allan informado e não parar artificialmente no meio do fluxo.

## Regra de continuidade
Quando Allan disser **“seguir”** ou **“seguir sempre”**, isso significa continuar a execução já aprovada sem pedir autorização para cada microajuste. As regras de segurança do projeto (testes, escopo, revisão e deploy) continuam valendo.
