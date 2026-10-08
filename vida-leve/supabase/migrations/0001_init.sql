-- Vida Leve — schema inicial
-- Recálculo adaptativo 100% no banco: ao inserir/apagar um weight_log, o
-- peso_atual do perfil é atualizado e o trigger BEFORE de profiles recalcula
-- TMB, água, proteína e calorias. Espelha src/lib/calculations.ts.

create extension if not exists pgcrypto;

-- ─────────────────────────────── profiles ───────────────────────────────
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  nome              text        not null check (char_length(nome) between 1 and 80),
  idade             int         not null check (idade between 16 and 100),
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
  -- metas (preenchidas pelo trigger — o cliente não precisa enviar)
  tmb               int,
  meta_agua_ml      int,
  meta_proteina_g   int,
  calorias_meta     int,
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
create table if not exists public.routine_habits (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  descricao_habito text not null check (char_length(descricao_habito) between 1 and 200),
  tipo             text not null check (tipo in ('movimento','transporte','postura','hidratacao','alimentacao','sono')),
  concluido_hoje   boolean not null default false,
  data_conclusao   date,
  created_at       timestamptz not null default now()
);
create index if not exists routine_habits_user_idx on public.routine_habits (user_id);

-- ─────────────────────────────── cálculo ────────────────────────────────
-- Tudo em numeric (não float) para arredondar igual ao Math.round do front.
create or replace function public.calcular_metas_profile()
returns trigger
language plpgsql
as $$
declare
  v_tmb     numeric;
  v_fator   numeric;
  v_gasto   numeric;
  v_piso    numeric;
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

  new.tmb             := v_tmb;
  new.calorias_meta   := greatest(v_piso, v_gasto - 450);  -- déficit padrão 450 kcal
  new.meta_agua_ml    := round(new.peso_atual * 35);
  new.meta_proteina_g := round(new.peso_atual * 1.8);
  new.updated_at      := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_metas on public.profiles;
create trigger trg_profiles_metas
  before insert or update of peso_atual, altura_cm, idade, sexo, nivel_atividade on public.profiles
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

  if v_peso is null then
    -- sem registros: volta ao peso inicial
    update public.profiles set peso_atual = peso_inicial where id = v_user;
  else
    update public.profiles set peso_atual = v_peso where id = v_user;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_weight_logs_sync on public.weight_logs;
create trigger trg_weight_logs_sync
  after insert or update or delete on public.weight_logs
  for each row execute function public.sincronizar_peso_atual();

-- ─────────────────────────────── RLS ────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.weight_logs    enable row level security;
alter table public.water_logs     enable row level security;
alter table public.routine_habits enable row level security;

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
