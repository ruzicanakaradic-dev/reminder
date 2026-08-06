-- ═══════════════════════════════════════════════════════════════════
--  RUŽINI DOMAĆI KOLAČI — šema baze
--  Kopiraj CEO ovaj fajl u Supabase → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════

-- Kupci ---------------------------------------------------------------
create table if not exists public.customers (
  id          uuid primary key default gen_random_uuid(),
  redni_broj  bigint generated always as identity,
  ime         text not null,
  telefon     text,
  napomena    text,
  created_at  timestamptz not null default now()
);

-- Porudžbine ----------------------------------------------------------
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  redni_broj        bigint generated always as identity,
  customer_id       uuid references public.customers(id) on delete set null,
  -- snapshot podataka o kupcu (za slučaj brisanja/istoriju)
  kupac_ime         text not null,
  kupac_telefon     text,

  datum_porudzbine  date not null default current_date,
  datum_isporuke    date not null,

  proizvod          text not null,          -- šta je porudžbina (slobodan unos)
  opis              text,                   -- opcioni opis / dodatak

  tezina_kg         numeric(10,2),
  cena_po_kg        numeric(10,2),
  total             numeric(12,2),          -- može auto (tezina*cena) ili ručno

  adresa            text,
  grad              text,

  status            text not null default 'u_radu'
                    check (status in ('u_radu','zavrseno','isporuceno')),

  -- kontrola slanja podsetnika (da se ne šalje dva puta)
  reminded_2d       boolean not null default false,
  reminded_1d       boolean not null default false,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists orders_datum_isporuke_idx on public.orders (datum_isporuke);
create index if not exists orders_status_idx          on public.orders (status);
create index if not exists orders_customer_idx        on public.orders (customer_id);
create index if not exists orders_grad_idx            on public.orders (grad);

-- Stavke porudžbine (više vrsta kolača/torti po jednoj porudžbini) --------
create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  redosled    int  not null default 0,
  naziv       text not null,
  tezina_kg   numeric(10,2),
  cena_po_kg  numeric(10,2),
  total       numeric(12,2),
  created_at  timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- auto-update updated_at ----------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- Push pretplate (za notifikacije na telefonu) ------------------------
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

-- ── Sigurnost ────────────────────────────────────────────────────────
-- Aplikaciji se pristupa preko servera (service_role), koji zaobilazi RLS.
-- Uključujemo RLS i NE dajemo prava anon/authenticated ulozi,
-- tako da tabele nisu javno dostupne preko anon ključa.
alter table public.customers          enable row level security;
alter table public.orders             enable row level security;
alter table public.order_items        enable row level security;
alter table public.push_subscriptions enable row level security;

-- (namerno bez policy-ja za anon — sav pristup ide kroz server)
