# Testes do banco

Testa os triggers de recálculo, o ajuste adaptativo, o modo manutenção, o modo
dupla, o apagar conta e o RLS num Postgres puro (16+), sem precisar de Supabase:

```bash
createdb vida_leve_teste
psql -d vida_leve_teste -f 00_stub_auth.sql \
     -f ../migrations/0001_init.sql \
     -f 10_triggers.sql
```

`00_stub_auth.sql` imita o schema `auth` do Supabase — **não rode no Supabase**.
