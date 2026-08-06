# Ružini domaći kolači — Dnevnik porudžbina

PWA (Next.js 16 App Router, React 19, Tailwind v4) + Supabase (Postgres). UI je na **srpskom (latinica)**.
Aplikacija za vođenje porudžbina domaćih kolača: porudžbine, kupci, kalendar, statistika, podsetnici.

## Ključno
- **Sav pristup bazi ide kroz server** (`src/lib/data.ts`, `supabaseAdmin()` sa `service_role`). Nema anon pristupa iz browsera (RLS je uključen bez policy-ja).
- **Zaštita**: jedna lozinka `APP_PASSWORD` → `src/middleware.ts` + `/api/prijava`. Token = SHA-256(lozinka), httpOnly cookie.
- **Podsetnici**: in-app alarm (`ReminderWatcher` → `/api/reminders`, zvuk+potvrda) i web push (`/api/cron/reminders` preko Vercel Cron u `vercel.json`, VAPID ključevi u env).
- **Env**: `.env.local` (Supabase URL/anon/service_role, APP_PASSWORD, VAPID_*, CRON_SECRET). VAPID i APP_PASSWORD su već popunjeni; Supabase treba popuniti.
- Bez env-a, data stranice prikazuju `SetupNotice` umesto pada.

## Komande
- `npm run dev` · `npm run build`
- Šema baze: `supabase/schema.sql` (pokrenuti u Supabase SQL editoru).

## Statusi porudžbine
`u_radu` → `zavrseno` → `isporuceno` (tip `Status` u `src/lib/types.ts`).
