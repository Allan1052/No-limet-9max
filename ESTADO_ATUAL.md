# CALL OU FOLD — ESTADO ATUAL

> **REGRA PERMANENTE DE CONTINUIDADE**
>
> Este arquivo é o ponto oficial de retomada do projeto entre conversas do ChatGPT.
> Antes de continuar trabalho no Call ou Fold em uma conversa nova, **ler este arquivo primeiro** e conferir o estado real no GitHub.
> Ao terminar um bloco relevante de trabalho ou antes de encerrar/trocar uma conversa longa, **atualizar este arquivo** com o ponto exato em que o trabalho parou.
> Não inferir o próximo passo apenas pelo último commit: registrar aqui também o contexto da conversa e as decisões do Allan.

## Última atualização

29/08/2026 — pacote de sessão/Anatomia/resumo integrado ao `main`; retomada do Motor V2 autorizada pelo Allan.

## O que acabou de ser concluído

- O pacote de correções foi separado com segurança do PR #19 do Motor V2.
- PR #20 foi usado para validação e fechou GREEN no CI #39, mas permaneceu draft por uma falha da integração do GitHub ao mudar o status.
- O mesmo conteúdo foi reaberto como PR #21, não-draft, e integrado ao `main` por squash.
- Commit no `main`: `9f119937d7fda0bbda6c81c51d0f97c40688e641` (`9f11993`).
- Entraram somente as correções de produto/UI/sessão:
  1. persistência de mãos, decisões e precisão ao trocar de aba;
  2. clareza da Anatomia sobre o denominador analisado;
  3. diagnóstico de call contextual, sem generalizações absolutas;
  4. remoção do compartilhamento duplicado no resumo do torneio;
  5. testes de regressão correspondentes.
- Validação do pacote: **CI #39 GREEN**, **3.719 testes passaram**, **1 skipped**, `tsc` aprovado, build de produção aprovado e **SELO GTO 61/61**.
- O funil/Umami **já foi feito** e não deve ser retomado como etapa atual.

## Estado do Motor V2

- O Allan confirmou novamente autorização total para continuar mexendo no Motor V2.
- PR #19: **Motor V2: realismo MTT por buy-in e decisão**.
- Branch: `motor-v2-realismo`.
- Head atual: `ae9894e6d3d00ebf7f8a693b4fb475dfc95b0ef5`.
- O PR continua aberto e draft.
- Depois da integração do pacote no `main`, a branch do Motor V2 ficou **divergida**: 20 commits à frente e 2 commits atrás do `main`.
- O GitHub marca o PR #19 como **não mergeável neste momento**; isso é esperado porque o `main` avançou e há sobreposição nos arquivos de sessão/Anatomia/resumo que já existiam na branch do V2.
- Não fazer merge do PR #19 enquanto essa sincronização e a verificação do V2 não forem concluídas.

## Próximo passo exato

Sincronizar com segurança o trabalho do Motor V2 com o `main` atual, preservando as correções que já foram publicadas e mantendo apenas as mudanças reais de motor no PR #19. Depois continuar a sequência do V2: field por buy-in, ICM/all-in incremental, pós-flop, pré-flop/re-raises, range propagation, sizing e benchmark V1 x V2, sempre em TDD e com validação completa antes de merge.

## Guardrails permanentes

- O Allan autorizou mudanças de engine/lógica no Motor V2; fora desse escopo, confirmar antes de mudanças de produto que não estejam combinadas.
- Preservar o posicionamento humilde de estudo/recreação, sem dinheiro real.
- Manter o **SELO GTO 61/61**.
- Antes de liberar alteração: testes, TypeScript, build, `dist` recompilado e conferido, paridade dos arquivos do site quando aplicável e validação do deploy/CI.
- Nunca usar `git push --force`.
- Não declarar que algo está publicado no APP até confirmar que chegou ao `main`/deploy e que a versão nova está realmente sendo servida.

## Como atualizar este arquivo

Ao final de cada bloco importante, manter pelo menos:

1. **O que acabou de ser concluído**.
2. **O que está em andamento**.
3. **Qual é o próximo passo exato**.
4. **Branch/PR/commit relevante**.
5. **Validações executadas e resultado**.
6. **Decisões do Allan que não podem ser perdidas**.
7. **Itens já concluídos que não devem ser refeitos**.

O `CALL_OU_FOLD_PROJETO_MASTER.md` continua sendo o histórico amplo do projeto. Este `ESTADO_ATUAL.md` deve permanecer curto, operacional e atualizado para permitir retomada imediata quando uma conversa atingir o limite.