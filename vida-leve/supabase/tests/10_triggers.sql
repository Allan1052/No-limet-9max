-- Testes do recálculo no banco. Cada bloco falha com exceção se o valor divergir
-- de src/lib/calculations.ts. Rodar: ver supabase/tests/README.md
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned

create or replace function pg_temp.igual(rotulo text, obtido numeric, esperado numeric) returns void
language plpgsql as $$
begin
  if obtido is distinct from esperado then
    raise exception 'FALHOU %: obtido %, esperado %', rotulo, obtido, esperado;
  end if;
  raise notice 'ok  %', rotulo;
end $$;

insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'), ('00000000-0000-0000-0000-00000000000c');
insert into profiles (id, nome, idade, sexo, altura_cm, peso_inicial, peso_atual, nivel_atividade) values
  ('00000000-0000-0000-0000-00000000000a', 'Ana Souza', 30, 'feminino', 165, 70, 70, 'leve'),
  ('00000000-0000-0000-0000-00000000000b', 'Beto', 35, 'masculino', 175, 90, 90, 'sedentario');

-- Mesmos números dos testes TS
select pg_temp.igual('Ana tmb', tmb, 1420) from profiles where nome like 'Ana%';
select pg_temp.igual('Ana agua', meta_agua_ml, 2450) from profiles where nome like 'Ana%';
select pg_temp.igual('Ana proteina', meta_proteina_g, 126) from profiles where nome like 'Ana%';
select pg_temp.igual('Ana calorias', calorias_meta, 1503) from profiles where nome like 'Ana%';
select pg_temp.igual('Beto calorias', calorias_meta, 1739) from profiles where nome = 'Beto';

-- Check-ins → recálculo
insert into weight_logs (user_id, peso_kg, data_registro) values ('00000000-0000-0000-0000-00000000000a', 67, '2026-10-08');
insert into weight_logs (user_id, peso_kg, data_registro) values ('00000000-0000-0000-0000-00000000000a', 69, '2026-10-01');
select pg_temp.igual('peso atual = registro mais recente', peso_atual, 67) from profiles where nome like 'Ana%';
select pg_temp.igual('tmb recalculada', tmb, 1390) from profiles where nome like 'Ana%';
select pg_temp.igual('calorias recalculadas', calorias_meta, 1461) from profiles where nome like 'Ana%';
delete from weight_logs where peso_kg = 67;
select pg_temp.igual('apagar volta ao anterior', peso_atual, 69) from profiles where nome like 'Ana%';

-- Ajuste adaptativo
update profiles set ajuste_kcal = -100 where nome like 'Ana%';
select pg_temp.igual('ajuste -100', calorias_meta, 1489 - 100) from profiles where nome like 'Ana%';
update profiles set ajuste_kcal = -200 where nome = 'Beto';
select pg_temp.igual('ajuste -200 (Beto)', calorias_meta, 1739 - 200) from profiles where nome = 'Beto';
update profiles set ajuste_kcal = -300 where nome = 'Beto';
select pg_temp.igual('ajuste não fura o piso de 1500', calorias_meta, 1500) from profiles where nome = 'Beto';

-- Manutenção: gestante
update profiles set gestante_lactante = true where nome like 'Ana%';
select pg_temp.igual('gestante = gasto total', calorias_meta, round(round(10*69 + 6.25*165 - 150 - 161) * 1.375)) from profiles where nome like 'Ana%';
update profiles set gestante_lactante = false, ajuste_kcal = 0 where nome like 'Ana%';

-- Piso calórico
update profiles set peso_atual = 45, altura_cm = 150, idade = 60, nivel_atividade = 'sedentario' where nome like 'Ana%';
select pg_temp.igual('piso 1200', calorias_meta, 1200) from profiles where nome like 'Ana%';

-- Não dá para "trapacear" as metas: o trigger recalcula em qualquer update
update profiles set tmb = 9999 where nome = 'Beto';
select pg_temp.igual('tmb não editável', tmb, 1824) from profiles where nome = 'Beto';

-- Menor de idade é recusado
do $$ begin
  insert into auth.users values ('00000000-0000-0000-0000-0000000000ff');
  insert into profiles (id, nome, idade, sexo, altura_cm, peso_inicial, peso_atual)
    values ('00000000-0000-0000-0000-0000000000ff', 'Teen', 16, 'feminino', 160, 60, 60);
  raise exception 'FALHOU: aceitou idade 16';
exception when check_violation then raise notice 'ok  idade < 18 recusada';
end $$;

-- Modo dupla
select set_config('teste.uid', '00000000-0000-0000-0000-00000000000b', false);
select public.conectar_parceiro((select codigo_convite from profiles where nome like 'Ana%'));
select pg_temp.igual('parceria mútua', count(*), 2) from parcerias;
update profiles set resumo_publico = '{"pct_dia": 80}' where nome like 'Ana%';
select pg_temp.igual('vê resumo da parceira', (resumo->>'pct_dia')::numeric, 80) from public.listar_parceiros();
select pg_temp.igual('vê só o primeiro nome', count(*), 1) from public.listar_parceiros() where nome = 'Ana';
do $$ begin
  perform public.conectar_parceiro((select codigo_convite from profiles where nome = 'Beto'));
  raise exception 'FALHOU: conectou consigo mesmo';
exception when raise_exception then
  if sqlerrm like 'FALHOU%' then raise; end if;
  raise notice 'ok  não conecta consigo mesmo';
end $$;
select public.remover_parceiro('00000000-0000-0000-0000-00000000000a');
select pg_temp.igual('remover desfaz os dois lados', count(*), 0) from parcerias;

-- Apagar conta (LGPD) remove tudo em cascata
select public.apagar_minha_conta();
select pg_temp.igual('perfil apagado', count(*), 0) from profiles where nome = 'Beto';

-- RLS: como "authenticated", só enxerga o próprio perfil
grant usage on schema public to authenticated;
grant select on profiles to authenticated;
set role authenticated;
select set_config('teste.uid', '00000000-0000-0000-0000-00000000000a', false);
select pg_temp.igual('RLS: vê só o próprio perfil', count(*), 1) from profiles;
reset role;

\echo TODOS OS TESTES DO BANCO PASSARAM
