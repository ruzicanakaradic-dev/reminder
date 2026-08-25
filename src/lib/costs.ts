// Gruba procena troška i zarade po porudžbini.
// Trošak materijala i izrade ≈ 30% naplaćene (prodajne) cene, zarada je ostatak.

export const COST_RATE = 0.3;

// Proizvodna cena (trošak) — grubo 30% od prodajne cene
export function proizvodnaCena(total: number | null | undefined): number | null {
  if (total == null || isNaN(total)) return null;
  return Math.round(total * COST_RATE);
}

// Zarada = prodajna cena − proizvodna cena
export function zarada(total: number | null | undefined): number | null {
  if (total == null || isNaN(total)) return null;
  return total - (proizvodnaCena(total) ?? 0);
}
