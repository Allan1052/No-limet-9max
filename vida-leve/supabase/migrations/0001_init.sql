-- Vida Leve — schema completo
-- Recálculo adaptativo 100% no banco: ao inserir/apagar um weight_log, o
-- peso_atual do perfil é atualizado e o trigger BEFORE de profiles recalcula
-- TMB, água, proteína e calorias. Espelha src/lib/calculations.ts.

create extension if not exists pgcrypto;

-- ─────────────────────────────── profiles ───────────────────────────────
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  nome              text        not null check (char_length(nome) between 1 and 80),
  idade             int         not null check (idade between 18 and 100),
  sexo              text        not null check (sexo in ('masculino', 'feminino')),
  altura_cm         numeric(5,1) not null check (altura_cm between 120 and 230),
  peso_inicial      numeric(5,1) not null check (peso_inicial between 30 and 350),
  peso_atual        numeric(5,1) not null check (peso_atual between 30 and 350),
  nivel_atividade   text        not null default 'sedentario'
                    check (nivel_atividade in ('sedentario','leve','moderado','intenso','muito_intenso')),
  -- rotina
  transporte        text        not null default 'onibus'
                    check (transporte in ('carro','moto','onibus','metro','bicicleta','a_pe','home_office')),
  horas_sentado     numeric(4,1) not null default 8 check (horas_sentado between 0 and 18),
  sobe_escadas      boolean     not null default false,
  pratica_atividade boolean     not null default false,
  -- segurança
  gestante_lactante boolean     not null default false,
  condicao_saude    boolean     not null default false,
  -- recálculo adaptativo (gravado pelo app; o trigger aplica)
  ajuste_kcal       int         not null default 0 check (ajuste_kcal between -300 and 300),
  ultimo_ajuste_em  date,
  -- metas (preenchidas pelo trigger — o cliente não precisa enviar)
  tmb               int,
  meta_agua_ml      int,
  meta_proteina_g   int,
  calorias_meta     int,
  -- modo dupla
  codigo_convite    text        not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  resumo_publico    jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─────────────────────────────── weight_logs ────────────────────────────
create table if not exists public.weight_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  peso_kg       numeric(5,1) not null check (peso_kg between 30 and 350),
  data_registro date not null default current_date,
  created_at    timestamptz not null default now()
);
create index if not exists weight_logs_user_data_idx on public.weight_logs (user_id, data_registro desc, created_at desc);

-- ─────────────────────────────── water_logs ─────────────────────────────
create table if not exists public.water_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  quantidade_ml int  not null check (quantidade_ml between 1 and 5000),
  data          date not null default current_date,
  created_at    timestamptz not null default now()
);
create index if not exists water_logs_user_data_idx on public.water_logs (user_id, data);

-- ─────────────────────────────── routine_habits ─────────────────────────
-- Uma linha por missão POR DIA (as missões mudam todo dia). O histórico
-- alimenta as sequências, as conquistas e o nível de cada missão.
create table if not exists public.routine_habits (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  data             date not null default current_date,
  missao_id        text not null check (char_length(missao_id) between 1 and 60),
  nivel            int  not null default 1 check (nivel between 1 and 4),
  descricao_habito text not null check (char_length(descricao_habito) between 1 and 200),
  tipo             text not null check (tipo in ('movimento','transporte','postura','hidratacao','alimentacao','sono')),
  concluido_hoje   boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (user_id, data, missao_id)
);
create index if not exists routine_habits_user_data_idx on public.routine_habits (user_id, data);

-- ─────────────────────────────── food_logs ──────────────────────────────
create table if not exists public.food_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  data        date not null default current_date,
  nome        text not null check (char_length(nome) between 1 and 80),
  proteina_g  numeric(5,1) not null check (proteina_g between 0 and 300),
  calorias    int  not null check (calorias between 0 and 5000),
  created_at  timestamptz not null default now()
);
create index if not exists food_logs_user_data_idx on public.food_logs (user_id, data);

-- ─────────────────────────────── body_measurements ──────────────────────
create table if not exists public.body_measurements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  data        date not null default current_date,
  cintura_cm  numeric(5,1) not null check (cintura_cm between 40 and 250),
  quadril_cm  numeric(5,1) check (quadril_cm between 50 and 250),
  created_at  timestamptz not null default now()
);
create index if not exists body_measurements_user_idx on public.body_measurements (user_id, data);

-- ─────────────────────────────── parcerias (modo dupla) ─────────────────
create table if not exists public.parcerias (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  parceiro_id uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, parceiro_id),
  check (user_id <> parceiro_id)
);

-- ─────────────────────────────── cálculo ────────────────────────────────
-- Tudo em numeric (não float) para arredondar igual ao Math.round do front.
create or replace function public.calcular_metas_profile()
returns trigger
language plpgsql
as $$
declare
  v_tmb    numeric;
  v_fator  numeric;
  v_gasto  numeric;
  v_piso   numeric;
  v_imc    numeric;
  v_base   numeric;
begin
  v_tmb := round(
    10 * new.peso_atual + 6.25 * new.altura_cm - 5 * new.idade
    + case when new.sexo = 'masculino' then 5 else -161 end
  );

  v_fator := case new.nivel_atividade
    when 'sedentario'    then 1.2
    when 'leve'          then 1.375
    when 'moderado'      then 1.55
    when 'intenso'       then 1.725
    when 'muito_intenso' then 1.9
  end;

  v_gasto := round(v_tmb * v_fator);
  v_piso  := case when new.sexo = 'feminino' then 1200 else 1500 end;
  v_imc   := round(new.peso_atual / ((new.altura_cm / 100) ^ 2), 1);

  if new.gestante_lactante or v_imc < 18.5 then
    -- manutenção: sem déficit e sem ajuste
    v_base := v_gasto;
  else
    -- déficit padrão 450 kcal + ajuste adaptativo (±300)
    v_base := v_gasto - 450 + greatest(-300, least(300, new.ajuste_kcal));
  end if;

  new.tmb             := v_tmb;
  new.calorias_meta   := greatest(v_piso, v_base);
  new.meta_agua_ml    := round(new.peso_atual * 35);
  new.meta_proteina_g := round(new.peso_atual * 1.8);
  new.updated_at      := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_metas on public.profiles;
create trigger trg_profiles_metas
  -- em QUALQUER update: as metas nunca ficam "fora" da fórmula
  before insert or update on public.profiles
  for each row execute function public.calcular_metas_profile();

-- Novo check-in → o registro mais recente vira o peso atual (dispara o recálculo).
create or replace function public.sincronizar_peso_atual()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := coalesce(new.user_id, old.user_id);
  v_peso numeric;
begin
  select w.peso_kg into v_peso
    from public.weight_logs w
   where w.user_id = v_user
   order by w.data_registro desc, w.created_at desc
   limit 1;

  update public.profiles
     set peso_atual = coalesce(v_peso, peso_inicial)
   where id = v_user;
  return null;
end;
$$;

drop trigger if exists trg_weight_logs_sync on public.weight_logs;
create trigger trg_weight_logs_sync
  after insert or update or delete on public.weight_logs
  for each row execute function public.sincronizar_peso_atual();

-- ─────────────────────────────── RLS ────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.weight_logs       enable row level security;
alter table public.water_logs        enable row level security;
alter table public.routine_habits    enable row level security;
alter table public.food_logs         enable row level security;
alter table public.body_measurements enable row level security;
alter table public.parcerias         enable row level security;

drop policy if exists "perfil próprio" on public.profiles;
create policy "perfil próprio" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "pesos próprios" on public.weight_logs;
create policy "pesos próprios" on public.weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "água própria" on public.water_logs;
create policy "água própria" on public.water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "hábitos próprios" on public.routine_habits;
create policy "hábitos próprios" on public.routine_habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "comida própria" on public.food_logs;
create policy "comida própria" on public.food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "medidas próprias" on public.body_measurements;
create policy "medidas próprias" on public.body_measurements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Parcerias: só leitura direta; criar/desfazer passa pelas funções abaixo.
drop policy if exists "minhas parcerias" on public.parcerias;
create policy "minhas parcerias" on public.parcerias
  for select using (auth.uid() = user_id);

-- ─────────────────────────────── funções (RPC) ──────────────────────────
-- Conecta por código de convite. A parceria é mútua (as duas pessoas se veem).
create or replace function public.conectar_parceiro(p_codigo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_eu uuid := auth.uid();
  v_outro uuid;
begin
  if v_eu is null then raise exception 'Não autenticado'; end if;
  select id into v_outro from public.profiles where codigo_convite = upper(trim(p_codigo));
  if v_outro is null then raise exception 'Código não encontrado'; end if;
  if v_outro = v_eu then raise exception 'Esse é o seu próprio código'; end if;
  insert into public.parcerias (user_id, parceiro_id) values (v_eu, v_outro), (v_outro, v_eu)
    on conflict do nothing;
end;
$$;

-- O parceiro só enxerga nome e o resumo que a pessoa publicou — nada de peso
-- absoluto, medidas ou comida.
create or replace function public.listar_parceiros()
returns table (id uuid, nome text, resumo jsonb)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, split_part(p.nome, ' ', 1), p.resumo_publico
    from public.parcerias pa
    join public.profiles p on p.id = pa.parceiro_id
   where pa.user_id = auth.uid()
   order by p.nome;
$$;

create or replace function public.remover_parceiro(p_parceiro uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.parcerias
   where (user_id = auth.uid() and parceiro_id = p_parceiro)
      or (user_id = p_parceiro and parceiro_id = auth.uid());
$$;

-- LGPD: apaga a conta e, em cascata, todos os dados.
create or replace function public.apagar_minha_conta()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.conectar_parceiro(text)  from public, anon;
revoke all on function public.listar_parceiros()        from public, anon;
revoke all on function public.remover_parceiro(uuid)    from public, anon;
revoke all on function public.apagar_minha_conta()      from public, anon;
grant execute on function public.conectar_parceiro(text) to authenticated;
grant execute on function public.listar_parceiros()      to authenticated;
grant execute on function public.remover_parceiro(uuid)  to authenticated;
grant execute on function public.apagar_minha_conta()    to authenticated;
