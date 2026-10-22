-- Migracija 8: lično preuzimanje (nema dostave)
-- Kupac preuzima kolače kod nas (Inđija, Jug Bogdana 17), pa dostave nema.
-- Ranije se u takvim slučajevima pisala "besplatna dostava", što se u
-- obračunu računalo kao TROŠAK (gorivo + putarina padali su na nas).
-- Lično preuzimanje znači da prevoza NEMA: ni troška, ni naplaćene dostave.
--
-- Pokreni u Supabase SQL editoru (projekat aplikacije, ref: vxyimkbnfxqtotsejisl).

alter table public.orders
  add column if not exists licno_preuzimanje boolean not null default false;
