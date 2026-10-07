// Razumljive poruke o greškama (srpski).
//
// U produkciji Next.js sakriva poruku svake greške BAČENE iz server akcije
// (korisnik vidi samo „Minified React error #441"). Zato server akcije ne
// bacaju grešku, nego vraćaju `Rezultat` sa porukom iz `razumljivaPoruka`.
//
// Modul je izomorfan — koristi ga i server (akcije) i klijent (kad sam poziv
// akcije ne uspe, npr. nema interneta).

// Greška čija je poruka namenjena korisniku — prikazuje se tačno kako je napisana.
export class KorisnickaGreska extends Error {
  constructor(poruka: string) {
    super(poruka);
    this.name = "KorisnickaGreska";
  }
}

export type Rezultat<T> = { ok: true; data: T } | { ok: false; greska: string };

const MIGRACIJA = "Treba pokrenuti najnoviju migraciju iz foldera supabase/.";

// Pretvara bilo koju grešku (validacija, Supabase/Postgres, mreža) u poruku
// koja kaže šta je problem. Kod greške baze ostaje na kraju, radi lakše dijagnoze.
export function razumljivaPoruka(e: unknown): string {
  if (e instanceof KorisnickaGreska) return e.message;

  const err = (e ?? {}) as { message?: unknown; code?: unknown };
  const poruka = typeof err.message === "string" ? err.message : typeof e === "string" ? e : "";
  const kod = typeof err.code === "string" ? err.code : "";
  const saKodom = (tekst: string) => (kod ? `${tekst} (kod ${kod})` : tekst);

  // Mreža — server ne dopire do baze, ili telefon ne dopire do servera
  if (/fetch failed|failed to fetch|load failed|networkerror|econnrefused|enotfound|etimedout|econnreset/i.test(poruka)) {
    return "Nema veze sa serverom ili bazom. Proveri internet i pokušaj ponovo.";
  }
  if (/body exceeded|too large|payload/i.test(poruka)) {
    return "Podaci su preveliki za slanje (verovatno slika). Probaj sa manjom slikom.";
  }
  if (/invalid api key|jwt/i.test(poruka)) {
    return "Server nema pristup bazi — Supabase ključ nije ispravan (proveri env promenljive na Vercelu).";
  }
  if (/nedostaju supabase env/i.test(poruka)) {
    return "Server nije povezan sa bazom — nedostaju Supabase env promenljive.";
  }

  // Greške baze (Postgres / PostgREST kodovi)
  switch (kod) {
    case "42703":
    case "PGRST204": {
      const kol = poruka.match(/column (?:\w+\.)?"?(\w+)"? does not exist/)?.[1] ?? poruka.match(/'(\w+)' column/)?.[1];
      return saKodom(`Baza nije ažurirana — nedostaje kolona${kol ? ` „${kol}“` : ""}. ${MIGRACIJA}`);
    }
    case "42P01":
    case "PGRST205": {
      const tab = poruka.match(/relation "?(?:\w+\.)?(\w+)"? does not exist/)?.[1] ?? poruka.match(/table '(?:\w+\.)?(\w+)'/)?.[1];
      return saKodom(`Baza nije ažurirana — nedostaje tabela${tab ? ` „${tab}“` : ""}. ${MIGRACIJA}`);
    }
    case "PGRST116":
      return "Porudžbina nije pronađena — možda je u međuvremenu obrisana. Osveži stranicu.";
    case "23505":
      return saKodom("Takav zapis već postoji (duplikat).");
    case "23502": {
      const kol = poruka.match(/column "(\w+)"/)?.[1];
      return saKodom(`Nedostaje obavezan podatak${kol ? ` („${kol}“)` : ""}.`);
    }
    case "23503":
      return saKodom("Podatak je povezan sa nečim što više ne postoji (npr. obrisan kupac). Osveži stranicu.");
    case "23514":
      return saKodom("Vrednost nije dozvoljena (npr. negativan broj).");
    case "22P02":
      return saKodom(`Neispravan format podatka — proveri brojeve i datume. Detalj: ${poruka}`);
    case "22003":
      return saKodom("Broj je prevelik.");
    case "22007":
    case "22008":
      return saKodom("Neispravan datum ili vreme.");
  }

  if (poruka) return saKodom(`Neočekivana greška: ${poruka}`);
  return "Neočekivana greška na serveru. Pokušaj ponovo.";
}
