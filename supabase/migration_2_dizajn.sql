-- ═══════════════════════════════════════════════════════════════════
--  MIGRACIJA 2 — novi dizajn: 4. status "primljena" + nova polja
--  Pokreni u Supabase → SQL Editor → Run (bezbedno je pokrenuti više puta)
-- ═══════════════════════════════════════════════════════════════════

-- Novi status "primljena" (Primljena) + podrazumevani status
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders alter column status set default 'primljena';
alter table public.orders
  add constraint orders_status_check
  check (status in ('primljena','u_radu','zavrseno','isporuceno'));

-- Nova polja na porudžbini
alter table public.orders add column if not exists vreme_isporuke text;
alter table public.orders add column if not exists napomena       text;  -- posebna želja
alter table public.orders add column if not exists slika          text;  -- data URL slike primera

-- Kupac: grad i adresa (za istoriju/karticu kupca)
alter table public.customers add column if not exists grad   text;
alter table public.customers add column if not exists adresa text;
