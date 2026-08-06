-- ═══════════════════════════════════════════════════════════════════
--  MIGRACIJA 3 — više vrsta kolača po porudžbini (stavke)
--  Pokreni u Supabase → SQL Editor → Run (bezbedno je pokrenuti više puta)
-- ═══════════════════════════════════════════════════════════════════

-- Stavke porudžbine: svaka porudžbina može imati više proizvoda (kolača/torti)
create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  redosled    int  not null default 0,               -- redosled prikaza
  naziv       text not null,                          -- naziv kolača/torte
  tezina_kg   numeric(10,2),
  cena_po_kg  numeric(10,2),
  total       numeric(12,2),                          -- cena za ovu stavku
  created_at  timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items (order_id);

alter table public.order_items enable row level security;
-- (namerno bez policy-ja za anon — sav pristup ide kroz server, service_role)

-- Backfill: postojeće porudžbine dobijaju jednu stavku iz starih polja,
-- ali samo ako još nemaju nijednu stavku.
insert into public.order_items (order_id, redosled, naziv, tezina_kg, cena_po_kg, total)
select o.id, 0, o.proizvod, o.tezina_kg, o.cena_po_kg, o.total
from public.orders o
where not exists (select 1 from public.order_items i where i.order_id = o.id);
