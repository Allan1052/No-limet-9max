# Backlog — ajustes futuros rastreados

Itens de melhoria registrados para não se perderem. Não são bugs que quebram o
app; são dívidas de higiene/consistência para uma passada futura.

## Banco de dados

### Renomear coluna `hands_correct` → `decisions_correct` (tabela `tournament_scores`)
- **O quê:** a coluna `hands_correct` na verdade guarda o número de **decisões
  corretas** (notas boa+ok), não de mãos corretas. Como uma mão tem várias
  decisões (pré-flop/flop/turn/river), esse valor pode passar de `hands_played`
  — o que parece impossível, mas é esperado.
- **Por que não é bug:** o app calcula "% decisões corretas" a partir das notas
  (boa/ok sobre o total avaliado), **nunca** dividindo `hands_correct` por
  `hands_played`. O leaderboard também não usa esses campos. Então nenhum número
  errado chega ao usuário — é só o **nome da coluna** que engana.
- **Ação futura (precisa de migração no Supabase + ajuste no código):**
  1. No Supabase: `ALTER TABLE tournament_scores RENAME COLUMN hands_correct TO decisions_correct;`
  2. No código: renomear `hands_correct`/`handsCorrect` em `src/lib/ranking.ts`
     e no call site `src/ui/TournamentSummary.tsx` (`handsCorrect: ratings.boa + ratings.ok`).
  3. Coordenar deploy (o código novo tem que sair junto com a migração).
- **Prioridade:** baixa (cosmético/dados; sem impacto no usuário).
- **Origem:** auditoria de correção do app (sessão 17/08), ao validar o rank Elite.
