# CALL OU FOLD — ESTADO ATUAL

> **REGRA PERMANENTE DE CONTINUIDADE**
>
> Este arquivo é o ponto oficial de retomada do projeto entre conversas do ChatGPT.
> Antes de continuar trabalho no Call ou Fold em uma conversa nova, **ler este arquivo primeiro** e conferir o estado real no GitHub.
> Ao terminar um bloco relevante de trabalho ou antes de encerrar/trocar uma conversa longa, **atualizar este arquivo** com o ponto exato em que o trabalho parou.
> Não inferir o próximo passo apenas pelo último commit: registrar aqui também o contexto da conversa e as decisões do Allan.

## Última atualização

29/08/2026 — regra de continuidade criada após uma conversa atingir o limite de contexto.

## Estado da conversa / trabalho atual

- O funil/Umami **já foi feito** e não deve ser tratado como a etapa atual.
- O pacote mais recente trabalhado na conversa anterior foi:
  1. Persistir a sessão ao navegar/trocar de aba, preservando mãos, decisões e precisão.
  2. Reescrever a Anatomia para diferenciar claramente todas as mãos dos spots em que o jogador entrou no pote/tomou decisão.
  3. Tornar o diagnóstico de call menos absoluto e mais fiel aos spots analisados.
  4. Corrigir a duplicação do botão **Compartilhar resultado**.
  5. Validar tudo com testes e build.
- A validação registrada na conversa foi: **CI #38 GREEN**, **3.732 testes passaram**, **1 skipped** e **build de produção aprovado**.
- Essas alterações estavam validadas na branch do **PR #19**, mas ainda não estavam publicadas no APP naquele momento.

## Git / PR relevante

- Repositório: `Allan1052/No-limet-9max`
- PR #19: **Motor V2: realismo MTT por buy-in e decisão**
- Branch: `motor-v2-realismo`
- Base: `main`
- Em 29/08/2026 o PR estava aberto, draft, mergeável e ainda não integrado ao `main`.
- **Não fazer merge automático do PR #19 só para publicar as correções acima**, porque o PR contém trabalho do Motor V2 e o próprio PR determina que o V2 seja verificado antes do merge.

## Próximo passo exato

Continuar a partir do estado acima, conferindo o conteúdo atual do PR #19 e separando com segurança o que é correção de produto/UI/sessão do que pertence ao Motor V2 antes de qualquer integração ao `main`.

## Guardrails permanentes

- Não mexer em engine/lógica sem acordo explícito do Allan.
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