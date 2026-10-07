-- Migracija 7: cena dekoracije / topera
-- Ružica ručno upisuje cenu dekoracije (toper, figurice, ukrasi…) na porudžbini.
-- Ta cena se dodaje na ukupnu cenu za naplatu, ali u obračunu ide u TROŠAK
-- (kupuje se za tu tortu), a ne u zaradu.
--
-- Pokreni u Supabase SQL editoru (projekat aplikacije, ref: vxyimkbnfxqtotsejisl).

alter table public.orders add column if not exists dekoracija_cena numeric(12,2); -- cena dekoracije/topera (RSD), prazno = nema
