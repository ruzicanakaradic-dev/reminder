// Javni VAPID ključ je JAVAN po dizajnu — ugrađuje se u klijentski bundle i šalje
// se push servisu. Zato ga držimo kao konstantu u kodu, umesto kroz (lomljivu)
// NEXT_PUBLIC_ env promenljivu koja se ranije kvarila u produkciji.
//
// VAŽNO: privatni ključ NIKAD ne ide u kod — ostaje isključivo u env-u
// (VAPID_PRIVATE_KEY). Ovaj javni ključ je par sa tim privatnim ključem.
export const VAPID_PUBLIC_KEY =
  "BGdId99GmchIyjnIUsex0JFKdWSlO--gSnerSZmJOQlWfn3dE93U-zFuQ--hvrPh96vxcr6L8P0xex08sxBhl4Q";
