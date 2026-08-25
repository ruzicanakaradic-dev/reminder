-- Migracija 4: dodatni podsetnici (na dan isporuke + 2 sata pre)
-- Pokreni u Supabase SQL editoru.

alter table public.orders add column if not exists reminded_0d boolean not null default false;
alter table public.orders add column if not exists reminded_2h boolean not null default false;
