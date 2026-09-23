# Segunda Chance — Etapas 7–9 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar revisão de mãos importadas em uma experiência interativa “Segunda Chance”, somar um resumo confiável dos últimos 7 dias e conectar erros recorrentes ao treino já existente.

**Architecture:** Reaproveitar `ParsedHand`, `ImportReplayer`, `handHistoryLog` e `leakTraining`. A lógica nova fica em módulos puros/testáveis; a UI apenas consome os resultados. Nenhuma alteração em ranges, ICM, engine ou lógica de decisão.

**Tech Stack:** React, TypeScript, Vitest, localStorage existente.

**Spec:** conceito aprovado na conversa: replay congela antes da decisão do Hero, coleta nova decisão, revela Original × Agora × Referência; resumo de 7 dias usa somente dados registrados; treino recomendado só aponta para capacidades existentes.

## Global Constraints

- Não alterar ranges, ICM, engine ou lógica de decisão.
- Não inventar EV, frequência, sizing ou referência ausente.
- Manter tudo local e sem dados pessoais novos.
- Reutilizar importadores PokerStars/GGPoker e treino dirigido existentes.
- TDD: teste falhando antes da implementação.

---

### Task 1: Modelo puro da Segunda Chance
**Files:** Create `src/import/secondChance.test.ts`; Create `src/import/secondChance.ts`.
**Produces:** detecção de decisões do Hero, família Original/Agora/Referência e comparação segura.
- [ ] Escrever testes para detectar decisão do Hero e comparar as três famílias.
- [ ] Executar CI e confirmar RED por módulo inexistente.
- [ ] Implementar o mínimo para GREEN.
- [ ] Executar testes e build.

### Task 2: UI interativa no ImportReplayer
**Files:** Modify `src/ui/ImportReplayer.tsx`; Create `src/ui/secondChance.css` se necessário.
**Consumes:** helpers de `secondChance.ts`.
- [ ] Congelar antes da ação do Hero sem revelar a ação original.
- [ ] Exibir Fold/Check/Call/Raise conforme a rua.
- [ ] Depois da escolha, revelar Original × Agora × Referência.
- [ ] Não exibir Referência quando o feedback não existir.
- [ ] Permitir continuar o replay original após a comparação.

### Task 3: Seu jogo em 7 dias
**Files:** Create `src/app/sevenDayReview.test.ts`; Create `src/app/sevenDayReview.ts`; Modify `src/ui/HandHistoryPanel.tsx`.
**Consumes:** `HandHistoryEntry[]` de `handHistoryLog`.
**Produces:** volume, distribuição por nota, recorrência de erro e comparação com período anterior quando houver amostra.
- [ ] Testar janela de 7 dias e exclusão de dados antigos.
- [ ] Testar ausência de afirmação de evolução sem amostra anterior suficiente.
- [ ] Implementar agregador puro.
- [ ] Mostrar resumo compacto no histórico.

### Task 4: Treino recomendado
**Files:** Extend `src/app/sevenDayReview.ts`; Modify `src/ui/HandHistoryPanel.tsx` e somente integração já existente necessária.
**Consumes:** padrão recorrente de erro e capacidades de treino existentes.
- [ ] Recomendar somente quando houver recorrência mínima.
- [ ] Classificar recomendação como pré-flop/pós-flop sem inventar spot específico.
- [ ] Direcionar para o treino existente quando a integração já suportar isso; caso contrário, mostrar a recomendação sem forçar mudança no motor.

### Task 5: Verificação e entrega
- [ ] Rodar `npm test` no CI.
- [ ] Rodar `npm run build` no CI.
- [ ] Revisar diff para confirmar ausência de arquivos de engine/ranges/ICM.
- [ ] Merge somente após CI verde.
- [ ] Verificar workflow de publicação no GitHub Pages após merge.
