# CALL OU FOLD — ESTADO ATUAL

> **REGRA PERMANENTE DE CONTINUIDADE**
>
> Este arquivo é o ponto oficial de retomada do projeto entre conversas do ChatGPT.
> Antes de continuar trabalho no Call ou Fold em uma conversa nova, **ler este arquivo primeiro** e conferir o estado real no GitHub.
> Ao terminar um bloco relevante de trabalho ou antes de encerrar/trocar uma conversa longa, **atualizar este arquivo** com o ponto exato em que o trabalho parou.
> Não inferir o próximo passo apenas pelo último commit: registrar aqui também o contexto da conversa e as decisões do Allan.
> Ler também `PROTOCOLO_EXECUCAO_CONTINUA.md` e seguir sua autorização operacional durante atualizações já aprovadas.

## Última atualização

29/08/2026 — protocolo de execução contínua criado; Motor V2 sendo reconstruído em branch limpa sobre o `main` atual.

## Concluído

- O funil/Umami **já foi feito** e não deve ser tratado como etapa atual.
- O pacote de sessão/Anatomia/resumo foi separado do Motor V2 e integrado ao `main` pelo PR #21, commit `9f119937d7fda0bbda6c81c51d0f97c40688e641`.
- Esse pacote inclui persistência da sessão entre abas, clareza da Anatomia, diagnóstico de call contextual e remoção do compartilhamento duplicado.
- Validação do pacote: CI #39 GREEN, 3.719 testes passaram, 1 skipped, TypeScript e build aprovados, SELO GTO 61/61.
- Foi criado `PROTOCOLO_EXECUCAO_CONTINUA.md`, autorizando o agente a resolver problemas técnicos solucionáveis e seguir sem pedir confirmações repetidas.

## Em andamento

- **Motor V2**.
- A branch antiga `motor-v2-realismo` / PR #19 ficou divergida e teve uma tentativa de sincronização inadequada; não será usada como base de continuação.
- Estratégia ativa: branch limpa `motor-v2-realismo-clean`, criada a partir do `main` atual.
- Já foram portados para a branch limpa os componentes reais do V2 `src/bots/field.ts` e `src/bots/profiles.ts`.
- Allan autorizou explicitamente correções técnicas seguras e continuidade até o fim sem interrupções desnecessárias.

## Próximo passo exato

1. Portar para `motor-v2-realismo-clean` os demais arquivos reais do Motor V2, sem reintroduzir os arquivos de produto que já estão no `main`.
2. Conferir o diff da branch limpa contra `main`.
3. Rodar baseline e retomar a sequência TDD respeitando o que já estiver concluído: field por buy-in, ICM/all-in incremental, pós-flop, pré-flop/re-raises, range propagation, sizing e benchmark V1 x V2.
4. Corrigir automaticamente conflitos/testes/build solucionáveis dentro do escopo autorizado.
5. Rodar validação completa: testes, SELO GTO 61/61, TypeScript, build, `dist`, paridade do site, CI.
6. Integrar somente quando verificado e confirmar o deploy/versão realmente servida.

## Git / PR relevante

- Repositório: `Allan1052/No-limet-9max`
- Branch ativa nova: `motor-v2-realismo-clean`.
- Branch antiga: `motor-v2-realismo` / PR #19, mantida apenas como fonte histórica durante a reconstrução.
- Não usar force-push.

## Guardrails permanentes

- Allan autorizou explicitamente o trabalho no Motor V2 e correções técnicas necessárias dentro dessa atualização.
- Seguir `PROTOCOLO_EXECUCAO_CONTINUA.md`.
- Preservar o posicionamento humilde de estudo/recreação, sem dinheiro real.
- Manter o **SELO GTO 61/61**.
- Antes de liberar alteração: testes, TypeScript, build, `dist` recompilado e conferido, paridade dos arquivos do site quando aplicável e validação do deploy/CI.
- Nunca usar `git push --force`.
- Não declarar que algo está publicado no APP até confirmar que chegou ao `main`/deploy e que a versão nova está realmente sendo servida.

## Regra de comunicação com Allan

- **INICIANDO AGORA** = execução começa na mesma resposta.
- **EM EXECUÇÃO** = já houve ação concreta e o trabalho continua no mesmo bloco.
- **CONCLUÍDO E VALIDADO** = etapa executada e conferida.
- **PRECISO DA SUA DECISÃO** = somente quando houver decisão real de produto/escopo, risco irreversível ou dependência externa.
- Quando Allan responder **“ok”, “seguir”, “pode continuar”** ou **“modo contínuo”**, executar imediatamente a próxima etapa definida; não responder apenas com confirmação.

O `CALL_OU_FOLD_PROJETO_MASTER.md` continua sendo o histórico amplo do projeto. Este `ESTADO_ATUAL.md` deve permanecer curto, operacional e atualizado para permitir retomada imediata quando uma conversa atingir o limite.