# Ružini domaći kolači — Dnevnik porudžbina

PWA (Next.js 16 App Router, React 19, Tailwind v4) + **PocketBase** (Railway). UI je na **srpskom (latinica)**.
Aplikacija za vođenje porudžbina domaćih kolača: porudžbine, kupci, kalendar, statistika, podsetnici.
**Više korisnica (multi-tenant):** svaka poslastičarka ima svoj nalog i vidi samo svoje podatke.

## Ključno
- **Sav pristup bazi ide kroz server** (`src/lib/data.ts`). Upiti idu sa tokenom PRIJAVLJENE korisnice
  (`pbUser()` u `src/lib/pb/server.ts`), pa izolaciju podataka garantuju PocketBase API pravila
  (`user = @request.auth.id`) — ne kod aplikacije.
- **Superuser klijent** (`pbAdmin()`) samo za pozadinske poslove preko svih korisnica: cron podsetnici i
  slanje push-a vlasnici porudžbine. Gde god se `userId` koristi sa superuser klijentom, token mora biti
  proveren kod PocketBase-a (`pbUserVerified()`), jer PocketBase lažan token tiho tretira kao gosta.
- **Prijava**: email + lozinka iz PocketBase kolekcije `users` → `/api/prijava` → httpOnly kolačić sa PB tokenom.
  `src/middleware.ts` proverava/osvežava token kod PocketBase-a najviše jednom u 10 min (`rdk_checked`).
- **Nalozi**: samo superuser pravi i briše naloge (PocketBase admin → `users` → New record).
  Javna registracija je isključena (Create/Delete rule = Superusers only).
- **Podsetnici**: in-app alarm (`ReminderWatcher` → `/api/reminders`) i web push
  (`/api/cron/reminders`, Vercel Cron + GitHub Actions, `CRON_SECRET`). Push ide samo na uređaje vlasnice porudžbine.
- **Slika primera** na porudžbini je PocketBase fajl (polje `slika`); forma i dalje šalje data URL.
- PocketBase ne čuva NULL (prazan tekst = "", prazan broj = 0); `toOrder()`/`toCustomer()` u `data.ts`
  vraćaju null gde "prazno" znači "nije uneto". Datumi su tekst `YYYY-MM-DD` (kao ranije), bez UTC pomeranja.

## Env (`.env.local` / Vercel)
- `POCKETBASE_URL` — adresa PocketBase servera
- `POCKETBASE_ADMIN_EMAIL`, `POCKETBASE_ADMIN_PASSWORD` — superuser (za cron i push)
- `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`
- Bez `POCKETBASE_URL`, data stranice prikazuju `SetupNotice` umesto pada.

## Šema baze
- `pocketbase/pb_schema.json` — uvoz: PocketBase admin → Settings → Import collections, **Merge uključen**
  (bez Merge-a briše `users` i `_superusers`!).
- Generiše se iz `pocketbase/build_schema.py` (`python3 pocketbase/build_schema.py`) — menjaj skriptu, ne JSON.
- Kolekcije: `customers`, `orders`, `order_items`, `push_subscriptions`, `app_settings` (jedan red po korisnici).
  Svaka ima obavezno `user` (relacija na `users`, cascade delete). Redni brojevi su po korisnici.
- `supabase/` — stara šema (istorija + izvor za prenos Ružičinih podataka).

## Transport po korisnici (app_settings)
Polazište, gorivo (tip + cena), potrošnja i prag besplatne dostave su podesivi
po korisnici u `app_settings`, UI na stranici Podešavanja (`TransportSettings`).
- `getSettings()`/`updateSettings()` u `data.ts` čitaju/čuvaju sva polja.
- Gorivo je neutralno: `gorivo_cena_rsd` + `tip_goriva` (dizel/benzin). Ranije
  `dizel_cena_rsd` — migracija `pocketbase/migrate_gorivo.py` (pokrenuti jednom).
- Prag: `besplatnaDostavaPoPravilu(total, prag)` čita `besplatna_dostava_od`.
- Polazište: `/api/geokod` geokodira adresu → lat/lon; `/api/rastojanje` računa
  km (OSRM) od polazišta korisnice.
- **Auto-putarina** (`src/lib/putarina.ts`): ugrađena tabela naplatnih stanica
  (K1 cene, zvanični cenovnik Puteva Srbije, važi od 1.7.2026) za E-75, E-70,
  E-80, E-763. Van pokrivenih magistrala → 0 + `proveri` flag.
- **Ružica netaknuta**: ugrađena tabela rastojanja (`RASTOJANJA`, `POLAZISTE`,
  Inđija) i dalje važi SAMO kad je polazište Inđija (`jePolazisteIndjija`).
  Druge korisnice uvek idu na auto-km + auto-putarinu.

## Komande
- `npm run dev` · `npm run build`

## Statusi porudžbine
`primljena` → `u_radu` → `zavrseno` → `isporuceno` (tip `Status` u `src/lib/types.ts`).
