-- ============================================================
-- VolleyTech — Schema de Assinaturas (Mercado Pago)
-- Aplique este SQL no Supabase (SQL Editor) antes de usar o app.
-- ============================================================

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null unique,
  status text not null default 'trialing'
    check (status in ('trialing','active','past_due','canceled','expired')),
  plan_amount numeric(10,2) not null default 19.90,
  currency text not null default 'BRL',
  trial_start timestamptz not null default now(),
  trial_end timestamptz not null default (now() + interval '7 days'),
  current_period_end timestamptz,
  mp_preapproval_id text,
  mp_payer_id text,
  -- rastreamento de pagamentos para o painel administrativo
  last_payment_status text,           -- approved | rejected | pending | refunded
  last_payment_amount numeric(10,2),
  last_payment_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists subscriptions_status_idx on public.subscriptions(status);

-- colunas extras (idempotente para bancos já existentes)
alter table public.subscriptions add column if not exists last_payment_status text;
alter table public.subscriptions add column if not exists last_payment_amount numeric(10,2);
alter table public.subscriptions add column if not exists last_payment_at timestamptz;
alter table public.subscriptions add column if not exists canceled_at timestamptz;

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own" on public.subscriptions
  for update using (auth.uid() = user_id);

-- mantém updated_at atualizado
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- cria automaticamente um trial de 7 dias no primeiro acesso do email
create or replace function public.handle_new_user_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (user_id, email, status, trial_start, trial_end)
  values (new.id, new.email, 'trialing', now(), now() + interval '7 days')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_subscription on auth.users;
create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute function public.handle_new_user_subscription();

-- backfill: cria assinatura/trial para usuários já existentes sem registro
insert into public.subscriptions (user_id, email, status, trial_start, trial_end)
select u.id, u.email, 'trialing', u.created_at, u.created_at + interval '7 days'
from auth.users u
left join public.subscriptions s on s.user_id = u.id
where s.id is null and u.email is not null
on conflict do nothing;
