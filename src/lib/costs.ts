// Gruba procena troška i zarade po porudžbini.
//
// Ukupna cena za naplatu = proizvodi (kolači/torte po kg) + dekoracija/toper + dostava.
// Trošak                 = proizvodnja (~30% cene proizvoda) + dekoracija + gorivo + putarina.
// Zarada                 = ukupna cena − trošak.
//
// Dekoracija, gorivo i putarina se naplaćuju kupcu, ali su izdatak za tu
// porudžbinu — zato idu u trošak, a ne u zaradu.

import type { Order } from "@/lib/types";

export const COST_RATE = 0.3;

// Proizvodna cena (materijal + izrada) — grubo 30% od cene proizvoda
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

// Trošak prevoza (gorivo + putarina; amortizacija se ne računa — vidi transport.ts)
export function trosakPrevoza(o: FinPolja): number {
  return (o.transport_gorivo ?? 0) + (o.transport_putarina ?? 0);
}

// Ukupan trošak porudžbine: proizvodnja + dekoracija + gorivo + putarina
export function trosak(o: FinPolja): number {
  return (proizvodnaCena(o.total) ?? 0) + (o.dekoracija_cena ?? 0) + trosakPrevoza(o);
}

// Zarada = ukupna cena − ukupan trošak
export function zarada(o: FinPolja): number {
  return ukupnaCena(o) - trosak(o);
}
