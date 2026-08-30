# CALL OU FOLD — PROTOCOLO DE EXECUÇÃO CONTÍNUA

> Regra permanente aprovada por Allan em 29/08/2026 para reduzir interrupções e concluir atualizações com mais velocidade e segurança.

## Objetivo

Permitir que o trabalho técnico avance de ponta a ponta sem depender de confirmações repetidas para problemas que podem ser resolvidos com segurança pelo agente.

## Autorização operacional

Enquanto estiver executando uma atualização já aprovada pelo Allan, o agente pode, sem pedir nova confirmação:

- corrigir conflitos de Git;
- criar branch limpa quando a branch atual estiver divergida ou contaminada;
- criar, fechar, substituir ou retargetar PRs de trabalho quando isso for necessário para manter a atualização segura;
- portar mudanças válidas entre branches;
- corrigir testes, TypeScript, build e problemas de integração causados pela atualização;
- reconstruir e conferir `dist`;
- corrigir paridade entre arquivos do site quando aplicável;
- atualizar documentação operacional e `ESTADO_ATUAL.md`;
- aplicar correções técnicas de baixo risco necessárias para que a atualização prossiga;
- repetir validações até ficarem verdes;
- continuar para a etapa técnica seguinte assim que a anterior estiver comprovadamente concluída.

## Quando NÃO parar para pedir confirmação

Não interromper Allan apenas porque:

- surgiu um conflito de merge;
- um teste falhou por causa da própria atualização;
- uma branch ficou atrás do `main`;
- um PR ficou inutilizável e precisa ser substituído por outro equivalente;
- o build ou TypeScript precisa de ajuste técnico compatível com o escopo aprovado;
- for necessário refazer a estratégia de sincronização sem perder trabalho;
- o CI precisar ser corrigido ou repetido.

Nesses casos: diagnosticar, corrigir com segurança, validar e seguir.

## Quando realmente pedir decisão ao Allan

Parar somente se ocorrer pelo menos uma destas situações:

1. mudança de produto/UX que altere uma decisão já tomada pelo Allan;
2. mudança de escopo relevante fora da atualização aprovada;
3. risco real de perda irreversível de dados ou histórico;
4. necessidade de usar operação destrutiva proibida, como force-push;
5. dependência externa que exija credencial, pagamento ou ação manual do Allan;
6. duas soluções tecnicamente válidas com impacto de produto significativamente diferente.

## Regras de segurança

- Nunca usar `git push --force`.
- Nunca sobrescrever `main` diretamente para contornar conflito.
- Preservar V1 até o V2 estar verificado.
- Manter o SELO GTO 61/61.
- Antes de liberar qualquer atualização: testes completos, TypeScript, build, `dist`, paridade do site quando aplicável, CI e deploy conferidos.
- Não declarar o APP atualizado até confirmar que a versão nova está realmente sendo servida.

## Fluxo padrão até o fim

1. Ler `ESTADO_ATUAL.md`.
2. Conferir `main`, branch ativa e PR no GitHub.
3. Trabalhar em branch segura.
4. Escrever/ajustar teste antes da lógica quando a mudança for de comportamento (TDD).
5. Corrigir a implementação.
6. Rodar validações focadas.
7. Rodar validação completa.
8. Confirmar SELO GTO 61/61.
9. Rodar TypeScript e build.
10. Recompilar/conferir `dist` e paridade do site.
11. Abrir/atualizar PR limpo.
12. Conferir CI.
13. Integrar ao `main` somente quando verificado.
14. Conferir deploy e versão servida.
15. Atualizar `ESTADO_ATUAL.md` com o ponto final real.

## Regra de comunicação

Durante execução ativa, usar apenas estes estados:

- **INICIANDO AGORA** — a execução começou nesta mesma resposta.
- **EM EXECUÇÃO** — já houve ação concreta e o trabalho segue no mesmo bloco.
- **CONCLUÍDO E VALIDADO** — etapa terminada com evidência.
- **PRECISO DA SUA DECISÃO** — somente para uma das exceções listadas acima.

Não usar mensagens vagas como “vou fazer”, “posso seguir” ou “próximo passo seria” quando a autorização já existe.

## Prioridade de hoje — 29/08/2026

Objetivo operacional: levar a atualização corrente do Call ou Fold até uma versão integrada, validada e conferida no APP ainda hoje, desde que nenhuma dependência externa fora do controle do projeto impeça tecnicamente a publicação.

A frente ativa é o **Motor V2**. A estratégia aprovada é reconstruí-lo sobre o `main` atual em branch limpa, portar apenas as mudanças reais de motor, validar por etapas e seguir até integração/deploy sem interromper Allan por problemas técnicos solucionáveis.
