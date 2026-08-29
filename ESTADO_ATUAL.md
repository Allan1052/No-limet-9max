# CALL OU FOLD — ESTADO ATUAL

> **REGRA PERMANENTE DE CONTINUIDADE**
>
> Este arquivo é o ponto oficial de retomada do projeto entre conversas do ChatGPT.
> Antes de continuar trabalho no Call ou Fold em uma conversa nova, **ler este arquivo primeiro** e conferir o estado real no GitHub.
> Ao terminar um bloco relevante de trabalho ou antes de encerrar/trocar uma conversa longa, **atualizar este arquivo** com o ponto exato em que o trabalho parou.
> Não inferir o próximo passo apenas pelo último commit: registrar aqui também o contexto da conversa e as decisões do Allan.

## Última atualização

29/08/2026 — pacote de produto integrado e Motor V2 retomado.

## Concluído

- O funil/Umami **já foi feito** e não deve ser tratado como etapa atual.
- O pacote de sessão/Anatomia/resumo foi separado do Motor V2 e integrado ao `main` pelo PR #21, commit `9f119937d7fda0bbda6c81c51d0f97c40688e641`.
- Esse pacote inclui persistência da sessão entre abas, clareza da Anatomia, diagnóstico de call contextual e remoção do compartilhamento duplicado.
- Validação do pacote: CI #39 GREEN, 3.719 testes passaram, 1 skipped, TypeScript e build aprovados, SELO GTO 61/61.
- O antigo PR #20 foi fechado sem merge apenas porque a integração falhou ao removê-lo de draft; o mesmo SHA validado foi integrado pelo PR #21.

## Em andamento

- **Motor V2** no PR #19 / branch `motor-v2-realismo`.
- Allan deu autorização explícita para continuar alterando o motor; não tratar engine/lógica como bloqueada por falta de autorização enquanto estivermos executando este plano aprovado.
- O PR #19 está aberto e draft. Após o merge do pacote de produto no `main`, a branch do Motor V2 ficou divergente e precisa ser sincronizada antes da continuação técnica.

## Próximo passo exato

1. Sincronizar `motor-v2-realismo` com o `main` atual sem force-push e sem perder os 20 commits existentes do V2.
2. Confirmar que as correções de produto já presentes no `main` não serão reintroduzidas como divergência no PR #19.
3. Rodar/confirmar baseline do Motor V2 após a sincronização.
4. Retomar a sequência TDD do plano `docs/superpowers/plans/2026-08-29-motor-v2-realismo.md`: field por buy-in, ICM/all-in incremental, pós-flop, pré-flop/re-raises, range propagation, sizing e benchmark V1 x V2, respeitando o que já estiver concluído.
5. Não fazer merge final do Motor V2 até a verificação completa.

## Git / PR relevante

- Repositório: `Allan1052/No-limet-9max`
- `main`: pacote de produto integrado em `9f119937d7fda0bbda6c81c51d0f97c40688e641` (há commit posterior apenas deste marcador de continuidade).
- PR #19: **Motor V2: realismo MTT por buy-in e decisão**
- Branch: `motor-v2-realismo`
- Head antes da sincronização: `ae9894e6d3d00ebf7f8a693b4fb475dfc95b0ef5`.
- Estado observado antes da sincronização: 20 commits à frente e 2 atrás do `main`, `mergeable: false`.

## Guardrails permanentes

- Allan autorizou explicitamente o trabalho no Motor V2.
- Preservar o posicionamento humilde de estudo/recreação, sem dinheiro real.
- Manter o **SELO GTO 61/61**.
- Antes de liberar alteração: testes, TypeScript, build, `dist` recompilado e conferido, paridade dos arquivos do site quando aplicável e validação do deploy/CI.
- Nunca usar `git push --force`.
- Não declarar que algo está publicado no APP até confirmar que chegou ao `main`/deploy e que a versão nova está realmente sendo servida.

## Regra de comunicação com Allan

- **“Estou iniciando agora…”** significa que a execução começa na mesma resposta.
- **“Concluído…”** significa que a etapa foi executada e conferida.
- **“Preciso da sua decisão…”** significa que existe uma escolha real que exige Allan.
- Quando Allan responder **“ok”, “seguir” ou “pode continuar”**, executar imediatamente a próxima etapa já definida; não responder apenas com confirmação.

O `CALL_OU_FOLD_PROJETO_MASTER.md` continua sendo o histórico amplo do projeto. Este `ESTADO_ATUAL.md` deve permanecer curto, operacional e atualizado para permitir retomada imediata quando uma conversa atingir o limite.