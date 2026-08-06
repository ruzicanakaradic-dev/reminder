# 🌹 Ružini domaći kolači — Dnevnik porudžbina

PWA aplikacija (radi na **webu i telefonu**) za vođenje porudžbina domaćih kolača:
kupci, kalendar, statistika i **zvučni podsetnici** 2 dana i dan pre isporuke.

## Šta aplikacija ima

- **Unos porudžbine**: ime kupca, kontakt, datum porudžbine i isporuke, šta je porudžbina (+ opis/dodatak), težina (kg), cena po kg i automatski **total**, adresa i grad.
- **Baza kupaca** — svaki kupac dobija jedinstveni ID i redni broj; automatski se pamti istorija (kad je kupio, šta, koliko).
- **Statusi**: `U radu` → `Završeno` → `Isporučeno` (menja se jednim tapom).
- **Podsetnici**:
  - *U aplikaciji*: alarm sa zvukom + poruka koja se **mora potvrditi** (2 dana, dan pre i na dan isporuke).
  - *Na telefonu*: push notifikacija sa zvukom/vibracijom (2 dana i dan pre) — radi i kad je aplikacija zatvorena.
- **Kalendar**: pregled po **danu / nedelji / mesecu**, sa bojama po statusu i brojem porudžbina po danu.
- **Statistika**: prihod, kg i broj porudžbina — po **kupcu, gradu i proizvodu**.
- **PWA**: instalira se na početni ekran telefona; radi kao prava aplikacija.

---

## 1. Poveži Supabase bazu

1. U Supabase organizaciji **„Ružini domaći kolači"** napravi novi projekat (npr. `ruzini-kolaci`), region **EU**.
2. Otvori **SQL Editor → New query**, nalepi ceo sadržaj fajla [`supabase/schema.sql`](supabase/schema.sql) i klikni **Run**.
3. Otvori **Project Settings → API** i prekopiraj vrednosti u fajl `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...        # "anon public"
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...            # "service_role" (TAJNO)
```

> `.env.local` već sadrži VAPID ključeve za notifikacije i `APP_PASSWORD` (podrazumevano `ruzice` — **promeni ga**).

## 2. Pokreni lokalno

```bash
npm install
npm run dev
```

Otvori http://localhost:3000 → uđi lozinkom iz `APP_PASSWORD`.

## 3. Objavi na internetu (Vercel) — da radi na telefonu

Push notifikacije i „dodaj na početni ekran" rade samo preko **HTTPS**, pa aplikaciju treba objaviti:

```bash
npm i -g vercel
vercel
vercel --prod
```

U Vercel-u (**Project → Settings → Environment Variables**) dodaj **iste** varijable iz `.env.local`
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`APP_PASSWORD`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`).

Dnevni podsetnik (Vercel **Cron**) je već podešen u [`vercel.json`](vercel.json) na **07:00 UTC** (~9h ujutru).

## 4. Instalacija na telefon

- **Android (Chrome):** meni ⋮ → *Dodaj na početni ekran*.
- **iPhone (Safari):** Podeli → *Add to Home Screen*. Na iPhone-u notifikacije rade **tek** kad se aplikacija doda na početni ekran.

Zatim u aplikaciji: **Podešavanja → Uključi notifikacije** (i „Pošalji test").

---

## Tehnologije

Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (Postgres) · Web Push (VAPID) · PWA.

## Struktura

| Putanja | Opis |
|---|---|
| `src/app/` | Stranice: Danas, Porudžbine, Kalendar, Kupci, Statistika, Podešavanja, Prijava |
| `src/app/api/` | `reminders`, `push/*`, `cron/reminders`, `prijava` |
| `src/lib/data.ts` | Sav pristup bazi (server, service_role) |
| `src/components/` | UI: forma, kartice, kalendar, alarm, push |
| `supabase/schema.sql` | Šema baze — pokreni u Supabase SQL editoru |
