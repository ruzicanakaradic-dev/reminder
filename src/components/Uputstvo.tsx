"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  PlusCircle,
  ClipboardList,
  CalendarDays,
  Users,
  BarChart3,
  Settings,
  ArrowRight,
  ArrowLeft,
  X,
  type LucideIcon,
} from "lucide-react";
import { TrustLogo } from "@/components/TrustLogo";

// Verzija: promeni sufiks da se uputstvo ponovo prikaže svima posle veće izmene.
const KLJUC = "trust_uputstvo_v1";
// Događaj kojim Podešavanja (ili bilo šta) ponovo otvori uputstvo.
export const UPUTSTVO_EVENT = "trust:uputstvo";

type Korak = {
  slika?: string; // ime fajla u /public/uputstvo bez ekstenzije
  ikona?: LucideIcon;
  naslov: string;
  tekst: string;
  hero?: boolean; // intro/kraj — Trust znak umesto screenshot-a
};

// Jezik: jednostavno, za nekog ko prvi put koristi aplikaciju. Ženski rod
// (korisnice su uglavnom poslastičarke), isti ton kao ostatak aplikacije.
const KORACI: Korak[] = [
  {
    hero: true,
    naslov: "Dobrodošla u Trust",
    tekst:
      "Tvoj mali pomoćnik za porudžbine kolača. Za jedan minut ću ti pokazati celu aplikaciju — korak po korak. Možeš da preskočiš kad god, a uputstvo se uvek vraća iz Podešavanja.",
  },
  {
    slika: "danas",
    ikona: Home,
    naslov: "Početna strana — „Danas”",
    tekst:
      "Čim se uloguješ, ovde vidiš sve najvažnije na prvi pogled: šta se isporučuje danas, šta je u radu, koliko porudžbina imaš ove nedelje i koliko si zaradila ovaj mesec.",
  },
  {
    slika: "nova",
    ikona: PlusCircle,
    naslov: "Dodaj porudžbinu",
    tekst:
      "Kad ti neko naruči kolač, ovde uneseš ko je naručio, šta, za koji dan i po kojoj ceni. Polja sa zvezdicom (*) su obavezna — sve ostalo je po želji. Dugme „+” ti je uvek pri ruci.",
  },
  {
    slika: "porudzbine",
    ikona: ClipboardList,
    naslov: "Sve porudžbine na jednom mestu",
    tekst:
      "Spisak svih tvojih porudžbina. Gore biraš status — primljena, u radu, završena, isporučena — i menjaš ga jednim dodirom kako posao napreduje.",
  },
  {
    slika: "kalendar",
    ikona: CalendarDays,
    naslov: "Kalendar isporuka",
    tekst:
      "Vidiš koji dan šta treba da bude gotovo. Tačkica na danu znači da tog dana imaš porudžbinu, a boja tačkice pokazuje status. Tako ti ništa ne promakne.",
  },
  {
    slika: "kupci",
    ikona: Users,
    naslov: "Tvoji kupci",
    tekst:
      "Svaki kupac se sam zapamti. Kad sledeći put naruči, samo izabereš njegovo ime — telefon, grad i adresa se popune sami.",
  },
  {
    slika: "statistika",
    ikona: BarChart3,
    naslov: "Koliko zarađuješ",
    tekst:
      "Promet, troškovi i zarada — sve se računa automatski. Gore biraš period (6 meseci, godina, ili sve) da vidiš kako ti posao ide.",
  },
  {
    slika: "podesavanja",
    ikona: Settings,
    naslov: "Tvoj brend i podsetnici",
    tekst:
      "Postavi svoj logo, naziv i boju — aplikacija postaje tvoja. Ovde uključuješ i podsetnike koji stižu na telefon pre svake isporuke, čak i kad je zaključan.",
  },
  {
    hero: true,
    naslov: "Spremna si! 🎉",
    tekst:
      "To je sve što treba za početak. Dodaj svoju prvu porudžbinu i kreni. Uputstvo možeš ponovo da otvoriš bilo kada — u Podešavanjima, dugme „Pogledaj uputstvo”.",
  },
];

export function Uputstvo() {
  const router = useRouter();
  const [otvoreno, setOtvoreno] = useState(false);
  const [i, setI] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const poslednji = i === KORACI.length - 1;

  const zatvori = useCallback(() => {
    try {
      localStorage.setItem(KLJUC, "1");
    } catch {
      /* privatni režim — nema veze */
    }
    setOtvoreno(false);
  }, []);

  const otvori = useCallback(() => {
    setI(0);
    setOtvoreno(true);
  }, []);

  // Prvi put (nema zapisa) → prikaži automatski. Replay → preko događaja.
  useEffect(() => {
    let prviPut = true;
    try {
      prviPut = localStorage.getItem(KLJUC) !== "1";
    } catch {
      prviPut = false; // ako storage ne radi, ne gnjavi
    }
    if (prviPut) otvori();
    const naEvent = () => otvori();
    window.addEventListener(UPUTSTVO_EVENT, naEvent);
    return () => window.removeEventListener(UPUTSTVO_EVENT, naEvent);
  }, [otvori]);

  // Zaključaj skrol pozadine + tastatura (Esc, strelice) dok je otvoreno.
  useEffect(() => {
    if (!otvoreno) return;
    const prethodni = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cardRef.current?.focus();
    const naTipku = (e: KeyboardEvent) => {
      if (e.key === "Escape") zatvori();
      else if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, KORACI.length - 1));
      else if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", naTipku);
    return () => {
      document.body.style.overflow = prethodni;
      window.removeEventListener("keydown", naTipku);
    };
  }, [otvoreno, zatvori]);

  if (!otvoreno) return null;

  const k = KORACI[i];
  const Ikona = k.ikona;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-5"
      style={{ background: "color-mix(in srgb, #141216 62%, transparent)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Uputstvo za korišćenje"
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className="relative w-full sm:max-w-[460px] max-h-[94dvh] overflow-y-auto outline-none rounded-t-[26px] sm:rounded-[26px] border border-[var(--divider)] shadow-2xl animate-uput"
        style={{ background: "var(--surface)" }}
      >
        {/* Zaglavlje: korak + Preskoči */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <span className="text-xs font-semibold tracking-wide text-muted">
            {poslednji || i === 0 ? "Trust" : `Korak ${i} / ${KORACI.length - 2}`}
          </span>
          <button
            onClick={zatvori}
            className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink rounded-lg px-2 py-1"
            aria-label="Zatvori uputstvo"
          >
            {poslednji ? "Zatvori" : "Preskoči"} <X size={15} />
          </button>
        </div>

        {/* Vizuelni deo */}
        <div className="px-5">
          {k.hero ? (
            <div className="flex flex-col items-center justify-center py-10">
              <TrustLogo markSize={60} withTagline />
            </div>
          ) : (
            <div
              className="relative rounded-2xl border border-[var(--divider)] overflow-hidden"
              style={{ background: "var(--bg)", height: "min(42dvh, 320px)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/uputstvo/${k.slika}.webp`}
                alt={k.naslov}
                className="w-full object-cover object-top select-none pointer-events-none"
                draggable={false}
              />
              {/* blago stapanje donje ivice sa karticom */}
              <div
                className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
                style={{ background: "linear-gradient(to top, var(--surface), transparent)" }}
              />
            </div>
          )}
        </div>

        {/* Tekst */}
        <div className="px-5 pt-5 pb-2">
          {Ikona && (
            <div
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3"
              style={{ background: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--brand)" }}
            >
              <Ikona size={19} />
            </div>
          )}
          <h3 className="text-[22px] font-bold text-ink leading-tight m-0">{k.naslov}</h3>
          <p className="text-[15px] text-muted leading-relaxed mt-2">{k.tekst}</p>
        </div>

        {/* Progres tačkice */}
        <div className="flex items-center justify-center gap-1.5 py-3">
          {KORACI.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`Korak ${idx + 1}`}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: idx === i ? 20 : 7,
                background: idx === i ? "var(--brand)" : "var(--divider)",
              }}
            />
          ))}
        </div>

        {/* Navigacija */}
        <div className="flex items-center gap-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1">
          {i > 0 ? (
            <button onClick={() => setI((x) => x - 1)} className="btn btn-secondary">
              <ArrowLeft size={18} /> Nazad
            </button>
          ) : (
            <span className="flex-1" />
          )}
          <span className="flex-1" />
          {poslednji ? (
            <button
              onClick={() => {
                zatvori();
                router.push("/porudzbine/nova");
              }}
              className="btn btn-primary"
            >
              <PlusCircle size={18} /> Dodaj prvu porudžbinu
            </button>
          ) : (
            <button onClick={() => setI((x) => x + 1)} className="btn btn-primary">
              {i === 0 ? "Kreni" : "Dalje"} <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
