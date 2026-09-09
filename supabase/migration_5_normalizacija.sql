-- Migracija 5: normalizacija POSTOJEĆIH unosa (jednokratno)
-- Usklađuje stare redove sa normalizacijom koju aplikacija sada radi pri upisu:
--   - ime/prezime, grad, adresa  ->  pravilna velika slova (initcap)
--   - telefon                    ->  +381 format bez razmaka i znakova
--   - napomena, opis, proizvod   ->  sentence-case (veliko prvo slovo + posle tačke),
--     (naziv proizvoda)              ostatak teksta ostaje kako je ukucan
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

-- Sentence-case: veliko prvo slovo + veliko posle tačke/uzvika/upitnika.
-- Ostatak teksta se NE dira. Ista logika kao toSentenceCase() u src/lib/data.ts.
create or replace function pg_temp.sentence_case(raw text) returns text as $$
declare
  result text := '';
  cap boolean := true;   -- da li sledeće slovo treba da bude veliko
  ch text;
  i int;
begin
  if raw is null then return raw; end if;
  for i in 1..length(raw) loop
    ch := substr(raw, i, 1);
    if cap and ch ~ '[[:alpha:]]' then
      result := result || upper(ch);
      cap := false;
    else
      result := result || ch;
      if ch ~ '[.!?]' then
        cap := true;                 -- kraj rečenice -> sledeće slovo veliko
      elsif ch ~ '[[:graph:]]' then
        cap := false;                -- vidljiv znak (ne razmak) -> više nismo na početku
      end if;
    end if;
  end loop;
  return result;
end;
$$ language plpgsql immutable;

-- KUPCI
update public.customers set
  ime     = initcap(btrim(ime)),
  grad    = case when btrim(coalesce(grad,   '')) = '' then grad   else initcap(btrim(grad))   end,
  adresa  = case when btrim(coalesce(adresa, '')) = '' then adresa else initcap(btrim(adresa)) end,
  telefon = pg_temp.norm_phone(telefon),
  napomena = case when btrim(coalesce(napomena, '')) = '' then napomena else pg_temp.sentence_case(btrim(napomena)) end
where ime is not null;

-- PORUDŽBINE
update public.orders set
  kupac_ime     = initcap(btrim(kupac_ime)),
  grad          = case when btrim(coalesce(grad,   '')) = '' then grad   else initcap(btrim(grad))   end,
  adresa        = case when btrim(coalesce(adresa, '')) = '' then adresa else initcap(btrim(adresa)) end,
  kupac_telefon = pg_temp.norm_phone(kupac_telefon),
  opis          = case when btrim(coalesce(opis,     '')) = '' then opis     else pg_temp.sentence_case(btrim(opis))     end,
  napomena      = case when btrim(coalesce(napomena, '')) = '' then napomena else pg_temp.sentence_case(btrim(napomena)) end,
  proizvod      = case when btrim(coalesce(proizvod, '')) = '' then proizvod
                       else (select string_agg(pg_temp.sentence_case(btrim(p)), ', ')
                             from unnest(string_to_array(proizvod, ',')) as p
                             where btrim(p) <> '') end
where kupac_ime is not null;

-- STAVKE PORUDŽBINE (naziv proizvoda)
update public.order_items set
  naziv = pg_temp.sentence_case(btrim(naziv))
where btrim(coalesce(naziv, '')) <> '';

commit;

-- ────────────────────────────────────────────────────────────────────
-- PREGLED (read-only) — pokreni OVO PRVO, zasebno, da vidiš šta će se promeniti.
-- Prikazuje samo redove koje bi migracija zaista izmenila (pre -> posle).
--
-- (prvo iskopiraj obe pg_temp funkcije odozgo: norm_phone i sentence_case)
--
-- select 'customers' as tabela, id::text, ime  as pre, initcap(btrim(ime))  as posle from public.customers where ime is distinct from initcap(btrim(ime))
-- union all
-- select 'customers.grad', id::text, grad,     initcap(btrim(grad))          from public.customers where grad is not null and grad is distinct from initcap(btrim(grad))
-- union all
-- select 'customers.adresa', id::text, adresa, initcap(btrim(adresa)) from public.customers where adresa is not null and adresa is distinct from initcap(btrim(adresa))
-- union all
-- select 'customers.tel',  id::text, telefon,  pg_temp.norm_phone(telefon)   from public.customers where telefon is distinct from pg_temp.norm_phone(telefon)
-- union all
-- select 'orders.ime',     id::text, kupac_ime, initcap(btrim(kupac_ime))    from public.orders where kupac_ime is distinct from initcap(btrim(kupac_ime))
-- union all
-- select 'orders.grad',    id::text, grad,      initcap(btrim(grad))         from public.orders where grad is not null and grad is distinct from initcap(btrim(grad))
-- union all
-- select 'orders.adresa',  id::text, adresa,    initcap(btrim(adresa)) from public.orders where adresa is not null and adresa is distinct from initcap(btrim(adresa))
-- union all
-- select 'orders.tel',     id::text, kupac_telefon, pg_temp.norm_phone(kupac_telefon) from public.orders where kupac_telefon is distinct from pg_temp.norm_phone(kupac_telefon)
-- union all
-- select 'orders.opis',     id::text, opis,     pg_temp.sentence_case(btrim(opis))     from public.orders where opis is not null and opis is distinct from pg_temp.sentence_case(btrim(opis))
-- union all
-- select 'orders.napomena', id::text, napomena, pg_temp.sentence_case(btrim(napomena)) from public.orders where napomena is not null and napomena is distinct from pg_temp.sentence_case(btrim(napomena))
-- union all
-- select 'order_items.naziv', id::text, naziv,  pg_temp.sentence_case(btrim(naziv))    from public.order_items where naziv is not null and naziv is distinct from pg_temp.sentence_case(btrim(naziv));
