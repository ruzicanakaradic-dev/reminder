# Plan migracije na shadcn/ui (faza 3)

Status: **priprema** — shadcn instaliran, probni ekran napravljen, puna migracija
čeka Igorove dizajn-odluke. Grana `feat/shadcn-redizajn`.

## Šta je već urađeno na ovoj grani

- `npx shadcn@latest init` (preset Nova, base Radix, Tailwind v4 prepoznat)
- Kreirano: `components.json`, `src/lib/utils.ts` (`cn()`), `src/components/ui/`
  (`button`, `card`, `input`, `label`)
- `globals.css`: shadcn semantički tokeni dodati **uz** postojeće brend tokene;
  dodat **brend override blok** koji mapira shadcn tokene na plum/krem paletu
- `layout.tsx`: shadcn dodao Geist font kao `--font-sans` (vidi odluku #2)
- Probni ekran `/proba-shadcn` — shadcn Card/Input/Button/Label obojeni brendom
  + paleta uzoraka. Izuzet iz middleware-a (otvara se bez prijave, za pregled).
- Build i tsc prolaze; postojeći ekrani netaknuti.

## Ključno otkriće: migracija je lakša nego što izgleda

App **već koristi Tailwind v4 `@theme inline` sa CSS varijablama** — ista
arhitektura kao shadcn. Zato nije „rip & replace" nego **most**: brend boje
ostaju, shadcn tokeni pokazuju na njih. Mapiranje:

| shadcn token | brend izvor |
|---|---|
| `--primary` | `--accent` (plum #7a3785) |
| `--primary-foreground` | `--bg` (krem) |
| `--background` | `--bg` |
| `--foreground` | `--ink` (plum-ink) |
| `--card` | `--surface` |
| `--muted` / `--secondary` | `--accent-100` |
| `--border` | `--divider-1` |
| `--ring` | `--accent` |

## Odluke koje čekaju Igora (NE donosim ih sam)

### 1. Konflikt imena `--accent`
Brend koristi `--accent` kao **plum (primarna boja)**. shadcn očekuje `--accent`
kao **svetlu hover površinu**. Trenutno nisam dirao `--accent` da ne polomim
postojeće `.btn` klase. Pravo rešenje pri punoj migraciji: preimenovati brend
`--accent` → `--brand-plum` svuda, pa osloboditi `--accent` za shadcn. To dira
sve fajlove koji koriste `var(--accent)` (~15 mesta u globals + komponente).

### 2. Font tela teksta: Archivo vs Geist
shadcn init je uveo Geist kao `--font-sans`. Trenutno: naslovi Archivo (postojeće),
telo Geist (novo). Odluka: zadržati Geist za telo (modernije), ili vratiti sve
na Archivo (konzistentno sa postojećim brendom)? Tvoj poziv kao dizajnera.

### 3. Radius konflikt
Postojeći `--radius-sm/md/lg` (6/10/16px) vs shadcn `--radius` skala
(calc od 0.625rem). Treba uskladiti na jednu skalu. Predlog: zadržati shadcn
skalu, podesiti `--radius` da `md` ispadne 10px (trenutno postavljeno).

### 4. "Boje po klijentu" (vezano za fazu 4)
Brend override blok u `:root` je tačka gde se boje menjaju po korisnici:
runtime preko `element.style.setProperty('--primary', ...)` ili wrapper klase
`.tenant-x { --primary: ... }`. Vrednosti bi dolazile iz `app_settings`
(novo polje `brend_boja` po korisnici). Ovo radimo tek posle redizajna.

## Predloženi redosled pune migracije (kad se vratiš)

1. **Rešiti #1 (--accent rename)** — temelj, bez toga shadcn hover stanja ne rade
2. **Fiksirati tokene i font (#2, #3)** u globals.css — jedna odluka, ceo sistem
3. **Dodati preostale shadcn komponente**: `select`, `dialog`, `table`,
   `badge`, `tabs`, `checkbox`, `textarea`, `sonner` (toast)
4. **Migrirati ekran po ekran** (13 stranica, ~21 komponenta), redosledom po
   riziku — od najmanje do najkritičnije za Ružicu:
   - prvo: `/prijava`, `/statistika`, `/podesavanja` (retko se diraju)
   - zatim: `/kupci`, `/kalendar`
   - poslednje: `/porudzbine/*` i `OrderForm` (srce app-a, najosetljivije)
5. **Obrisati stari dizajn sistem** iz globals.css tek kad sve pređe
6. **Obrisati** `/proba-shadcn`

Procena: nekoliko dana rada, ekran-po-ekran, sa tvojim pregledom na svakom koraku.
Radi se zajedno — svaki ekran je dizajn-odluka, ne mehanička zamena.

## Rizici

- `OrderForm` je najkompleksniji (transport logika + stanja); migrirati ga
  poslednjeg i pažljivo, sa testom na realnoj porudžbini.
- Dark mode: shadcn očekuje `.dark` blok; app ga trenutno nema. Odluka: uvodimo
  li dark mode uz redizajn ili ne?
- PWA/offline: proveriti da novi fontovi i CSS ne razbiju offline keš.
