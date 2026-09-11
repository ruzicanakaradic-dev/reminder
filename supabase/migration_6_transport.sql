-- Migracija 6: transport / dostava
-- Dodaje: (1) tabelu podešavanja za troškove prevoza (cena dizela, potrošnja,
--             amortizacija) — Ružica menja iz aplikacije,
--         (2) polja na porudžbini u koja se "zaključava" trošak prevoza u
--             trenutku čuvanja (gorivo, amortizacija, putarina) da bi
--             istorijska statistika ostala tačna i posle promene cene dizela.
--
-- Pokreni u Supabase SQL editoru (projekat aplikacije, ref: vxyimkbnfxqtotsejisl).

-- ── Podešavanja troškova prevoza (jedan red, id = 1) ──────────────────
create table if not exists public.app_settings (
  id                   int  primary key default 1 check (id = 1),
  dizel_cena_rsd       numeric(10,2) not null default 234,   -- RSD po litru
  potrosnja_l_100km    numeric(10,2) not null default 6.5,   -- l/100km (Octavia 1.9 TDI)
  amortizacija_rsd_km  numeric(10,2) not null default 8,     -- linearna amortizacija po km
  updated_at           timestamptz   not null default now()
);

-- Ubaci podrazumevani red ako ga nema
insert into public.app_settings (id) values (1)
on conflict (id) do nothing;

-- auto-update updated_at
drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

alter table public.app_settings enable row level security;
-- (namerno bez policy-ja za anon — pristup ide kroz server / service_role)

-- ── Polja prevoza na porudžbini (snapshot troška) ─────────────────────
alter table public.orders add column if not exists transport_km            numeric(10,2); -- povratna kilometraža (tamo-nazad)
alter table public.orders add column if not exists transport_litara        numeric(10,2); -- potrošeno goriva (l)
alter table public.orders add column if not exists transport_gorivo        numeric(12,2); -- trošak goriva (RSD)
alter table public.orders add column if not exists transport_amortizacija  numeric(12,2); -- amortizacija vozila (RSD)
alter table public.orders add column if not exists transport_putarina      numeric(12,2); -- putarina (RSD)
alter table public.orders add column if not exists transport_predlog       numeric(12,2); -- predložena cena dostave (RSD)
alter table public.orders add column if not exists transport_cena          numeric(12,2); -- naplaćena cena dostave (RSD, ručno ili = predlog)
