-- Migracija 5: normalizacija POSTOJEĆIH unosa (jednokratno)
-- Usklađuje stare redove sa normalizacijom koju aplikacija sada radi pri upisu:
--   - ime/prezime, grad, adresa  ->  pravilna velika slova (initcap)
--   - telefon                    ->  +381 format bez razmaka i znakova
-- Nazivi proizvoda (proizvod / order_items.naziv) se NAMERNO NE diraju.
--
-- Pokreni u Supabase SQL editoru (projekat aplikacije, ref: vxyimkbnfxqtotsejisl).
-- Preporuka: prvo pokreni PREGLED (blok na dnu), pa tek onda ovaj transakcioni deo.

begin;

-- Privremena funkcija za telefon (živi samo za trajanje ove sesije).
-- Ista logika kao normalizePhone() u src/lib/data.ts.
create or replace function pg_temp.norm_phone(raw text) returns text as $$
declare
  d text;
begin
  if raw is null or btrim(raw) = '' then
    return raw;                       -- prazno ostaje prazno
  end if;
  d := regexp_replace(raw, '\D', '', 'g');   -- samo cifre
  if d = '' then
    return raw;                       -- nema cifara -> vrati original
  end if;
  if left(btrim(raw), 1) = '+' then
    return '+' || d;                  -- već međunarodni: poštuj pozivni, očisti
  end if;
  if left(d, 2) = '00' then
    d := substr(d, 3);                -- 00381... -> 381...
  end if;
  if left(d, 3) = '381' then
    return '+' || d;
  elsif left(d, 1) = '0' then
    return '+381' || substr(d, 2);    -- 064... -> +38164...
  else
    return '+381' || d;               -- 64... -> +38164...
  end if;
end;
$$ language plpgsql immutable;

-- KUPCI
update public.customers set
  ime     = initcap(btrim(ime)),
  grad    = case when btrim(coalesce(grad,   '')) = '' then grad   else initcap(btrim(grad))   end,
  adresa  = case when btrim(coalesce(adresa, '')) = '' then adresa else initcap(btrim(adresa)) end,
  telefon = pg_temp.norm_phone(telefon)
where ime is not null;

-- PORUDŽBINE
update public.orders set
  kupac_ime     = initcap(btrim(kupac_ime)),
  grad          = case when btrim(coalesce(grad,   '')) = '' then grad   else initcap(btrim(grad))   end,
  adresa        = case when btrim(coalesce(adresa, '')) = '' then adresa else initcap(btrim(adresa)) end,
  kupac_telefon = pg_temp.norm_phone(kupac_telefon)
where kupac_ime is not null;

commit;

-- ────────────────────────────────────────────────────────────────────
-- PREGLED (read-only) — pokreni OVO PRVO, zasebno, da vidiš šta će se promeniti.
-- Prikazuje samo redove koje bi migracija zaista izmenila (pre -> posle).
--
-- create or replace function pg_temp.norm_phone(raw text) returns text as $$
--   ... (isti kod kao gore) ...
-- $$ language plpgsql immutable;
--
-- select 'customers' as tabela, id::text, ime  as pre, initcap(btrim(ime))  as posle from public.customers where ime is distinct from initcap(btrim(ime))
-- union all
-- select 'customers.grad', id::text, grad,     initcap(btrim(grad))          from public.customers where grad is not null and grad is distinct from initcap(btrim(grad))
-- union all
-- select 'customers.tel',  id::text, telefon,  pg_temp.norm_phone(telefon)   from public.customers where telefon is distinct from pg_temp.norm_phone(telefon)
-- union all
-- select 'orders.ime',     id::text, kupac_ime, initcap(btrim(kupac_ime))    from public.orders where kupac_ime is distinct from initcap(btrim(kupac_ime))
-- union all
-- select 'orders.grad',    id::text, grad,      initcap(btrim(grad))         from public.orders where grad is not null and grad is distinct from initcap(btrim(grad))
-- union all
-- select 'orders.tel',     id::text, kupac_telefon, pg_temp.norm_phone(kupac_telefon) from public.orders where kupac_telefon is distinct from pg_temp.norm_phone(kupac_telefon);
