// Gruba procena troška i zarade po porudžbini.
//
// Ukupna cena za naplatu = proizvodi (kolači/torte po kg) + dekoracija/toper + dostava.
// Trošak                 = sastojci (~30% cene proizvoda)
//                          + deo troška dostave koji naplata NE pokriva (besplatna dostava).
// Zarada                 = cena proizvoda − sastojci + (naplaćena dostava − gorivo − putarina).
//
// Toper kupac plaća, a time pokriva kupljeni toper — nije ni trošak ni zarada.
// Dostava pokriva gorivo i putarinu: ako je naplaćena više, razlika ide u
// zaradu; ako je besplatna, gorivo i putarina padaju na nas (trošak).

import type { Order } from "@/lib/types";

export const COST_RATE = 0.3;

// Sastojci za proizvodnju — grubo 30% od cene proizvoda
export function proizvodnaCena(total: number | null | undefined): number | null {
  if (total == null || isNaN(total)) return null;
  return Math.round(total * COST_RATE);
}

// Polja porudžbine potrebna za finansijski obračun. `dekoracija_cena` je
// opciono jer kolona postoji tek posle migracije 7.
export type FinPolja = Pick<Order, "total" | "transport_cena" | "transport_gorivo" | "transport_putarina"> & {
  dekoracija_cena?: number | null;
};

// Ukupna cena za naplatu: proizvodi + dekoracija + dostava
export function ukupnaCena(o: FinPolja): number {
  return (o.total ?? 0) + (o.dekoracija_cena ?? 0) + (o.transport_cena ?? 0);
}

// Naplaćena dostava − stvarni trošak puta (gorivo + putarina; amortizacija se
// ne računa — vidi transport.ts). Pozitivno = zarada na dostavi, negativno =
// dostava ne pokriva put (npr. besplatna dostava).
export function razlikaDostave(o: FinPolja): number {
  return (o.transport_cena ?? 0) - (o.transport_gorivo ?? 0) - (o.transport_putarina ?? 0);
}

// Trošak puta koji naplata ne pokriva (kod besplatne dostave: gorivo + putarina)
export function trosakPrevoza(o: FinPolja): number {
  return Math.max(0, -razlikaDostave(o));
}

// Zarada na dostavi: koliko je naplaćeno više od stvarnog troška puta
export function zaradaOdDostave(o: FinPolja): number {
  return Math.max(0, razlikaDostave(o));
}

// Ukupan trošak porudžbine: sastojci + nepokriven trošak puta
export function trosak(o: FinPolja): number {
  return (proizvodnaCena(o.total) ?? 0) + trosakPrevoza(o);
}

// Zarada = cena proizvoda − trošak + zarada na dostavi (toper je prolazna stavka)
export function zarada(o: FinPolja): number {
  return (o.total ?? 0) - trosak(o) + zaradaOdDostave(o);
}
