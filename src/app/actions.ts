"use server";

import { revalidatePath } from "next/cache";
import { saveOrder, updateStatus, deleteOrder, getSettings, getBrendKorisnice, updateSettings, updateCustomer, uploadBrendLogo, removeBrendLogo } from "@/lib/data";
import { pbUserOrNull } from "@/lib/pb/server";
import type { AppSettings, CustomerInput, OrderInput, OrderItemInput, Status } from "@/lib/types";
import { KorisnickaGreska, razumljivaPoruka, type Rezultat } from "@/lib/greske";

// Izvrši akciju i vrati Rezultat umesto bacanja greške — u produkciji Next.js
// sakriva poruku bačene greške, pa korisnik ne bi znao šta nije u redu.
// Puna greška ide u serverski log (Vercel → Logs) radi dijagnoze.
async function pokusaj<T>(naziv: string, fn: () => Promise<T>): Promise<Rezultat<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    console.error(`[${naziv}]`, e);
    return { ok: false, greska: razumljivaPoruka(e) };
  }
}

function num(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).replace(",", ".").trim();
  if (s === "") return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}
function str(v: FormDataEntryValue | null): string {
  return v == null ? "" : String(v).trim();
}
function bool(v: FormDataEntryValue | null): boolean {
  const s = String(v ?? "").toLowerCase();
  return s === "1" || s === "true" || s === "on";
}

function parseItems(v: FormDataEntryValue | null): OrderItemInput[] {
  if (v == null) return [];
  try {
    const arr = JSON.parse(String(v));
    if (!Array.isArray(arr)) return [];
    return arr
      .map((i) => ({
        naziv: str(i?.naziv),
        tezina_kg: num(i?.tezina_kg != null ? String(i.tezina_kg) : null),
        cena_po_kg: num(i?.cena_po_kg != null ? String(i.cena_po_kg) : null),
        total: num(i?.total != null ? String(i.total) : null),
      }))
      .filter((i) => i.naziv);
  } catch {
    return [];
  }
}

export async function saveOrderAction(formData: FormData): Promise<Rezultat<{ id: string }>> {
  return pokusaj("saveOrder", async () => {
    const items = parseItems(formData.get("items"));

    const input: OrderInput = {
      id: str(formData.get("id")) || undefined,
      kupac_ime: str(formData.get("kupac_ime")),
      kupac_telefon: str(formData.get("kupac_telefon")) || null,
      datum_porudzbine: str(formData.get("datum_porudzbine")),
      datum_isporuke: str(formData.get("datum_isporuke")),
      vreme_isporuke: str(formData.get("vreme_isporuke")) || null,
      proizvod: items.map((i) => i.naziv).join(", "),
      opis: str(formData.get("opis")) || null,
      napomena: str(formData.get("napomena")) || null,
      slika: str(formData.get("slika")) || null,
      adresa: str(formData.get("adresa")) || null,
      grad: str(formData.get("grad")) || null,
      dekoracija_cena: num(formData.get("dekoracija_cena")),
      licno_preuzimanje: bool(formData.get("licno_preuzimanje")),
      transport_km: num(formData.get("transport_km")),
      transport_putarina: num(formData.get("transport_putarina")),
      transport_cena: num(formData.get("transport_cena")),
      status: (str(formData.get("status")) || "primljena") as Status,
      items,
    };

    if (!input.kupac_ime) throw new KorisnickaGreska("Ime kupca je obavezno.");
    if (items.length === 0) throw new KorisnickaGreska("Dodaj bar jedan proizvod (kolač).");
    if (!input.datum_isporuke) throw new KorisnickaGreska("Datum isporuke je obavezan.");

    const order = await saveOrder(input);
    revalidatePath("/");
    revalidatePath("/porudzbine");
    revalidatePath("/kalendar");
    revalidatePath("/kupci");
    revalidatePath("/statistika");
    return { id: order.id };
  });
}

export async function updateCustomerAction(formData: FormData): Promise<Rezultat<{ id: string }>> {
  return pokusaj("updateCustomer", async () => {
    const input: CustomerInput = {
      id: str(formData.get("id")),
      ime: str(formData.get("ime")),
      telefon: str(formData.get("telefon")) || null,
      grad: str(formData.get("grad")) || null,
      adresa: str(formData.get("adresa")) || null,
      napomena: str(formData.get("napomena")) || null,
      primeni_adresu_na_porudzbine: bool(formData.get("primeni_adresu_na_porudzbine")),
    };
    if (!input.id) throw new KorisnickaGreska("Nedostaje ID kupca.");
    if (!input.ime) throw new KorisnickaGreska("Ime kupca je obavezno.");

    const kupac = await updateCustomer(input);
    revalidatePath("/kupci");
    revalidatePath(`/kupci/${input.id}`);
    revalidatePath("/");
    revalidatePath("/porudzbine");
    revalidatePath("/kalendar");
    revalidatePath("/statistika");
    return { id: kupac.id };
  });
}

export async function setStatusAction(id: string, status: Status): Promise<Rezultat<null>> {
  return pokusaj("setStatus", async () => {
    await updateStatus(id, status);
    revalidatePath("/");
    revalidatePath("/porudzbine");
    revalidatePath("/kalendar");
    revalidatePath(`/porudzbine/${id}`);
    return null;
  });
}

// ── Podešavanja troškova prevoza ────────────────────────────────────
export async function getSettingsAction(): Promise<AppSettings> {
  return getSettings();
}

// Brend korisnice (nivo 2) — boja/naziv/logo za radni prostor.
export async function getBrendAction() {
  return getBrendKorisnice();
}

// Upload logoa korisnice (nivo 2). Prima FormData sa poljem "logo".
export async function uploadBrendLogoAction(formData: FormData) {
  return pokusaj("uploadBrendLogo", async () => {
    const file = formData.get("logo");
    if (!(file instanceof File) || file.size === 0) throw new KorisnickaGreska("Izaberi sliku.");
    if (!file.type.startsWith("image/")) throw new KorisnickaGreska("Dozvoljene su samo slike.");
    if (file.size > 2 * 1024 * 1024) throw new KorisnickaGreska("Slika mora biti manja od 2 MB.");
    return uploadBrendLogo(file);
  });
}

// Uklanjanje logoa korisnice.
export async function removeBrendLogoAction() {
  return pokusaj("removeBrendLogo", () => removeBrendLogo());
}

// Status probnog perioda za baner u aplikaciji (faza 4). Čita sopstveni red
// (korisnica sme da vidi sebe). paid (Ružica) → bez banera.
export async function getTrialStatusAction(): Promise<{
  trial: boolean;
  danaLeft: number;
  istice_danas: boolean;
}> {
  const prazno = { trial: false, danaLeft: 0, istice_danas: false };
  const ctx = await pbUserOrNull();
  if (!ctx) return prazno;
  try {
    const u = await ctx.pb.collection("users").getOne(ctx.userId, { fields: "plan,trial_do" });
    const rec = u as unknown as { plan?: string; trial_do?: string };
    if (rec.plan === "paid" || !rec.trial_do) return prazno;
    const danas = new Date();
    danas.setHours(0, 0, 0, 0);
    const kraj = new Date(`${rec.trial_do}T00:00:00`);
    const diff = Math.floor((kraj.getTime() - danas.getTime()) / 86_400_000);
    if (diff < 0) return { trial: true, danaLeft: 0, istice_danas: true };
    return { trial: true, danaLeft: diff, istice_danas: diff === 0 };
  } catch {
    return prazno;
  }
}

export async function saveSettingsAction(patch: Partial<AppSettings>): Promise<Rezultat<AppSettings>> {
  return pokusaj("saveSettings", async () => {
    const saved = await updateSettings(patch);
    // Nove porudžbine koriste nove vrednosti; postojeći snapshot ostaje.
    revalidatePath("/porudzbine/nova");
    revalidatePath("/statistika");
    return saved;
  });
}

export async function deleteOrderAction(id: string): Promise<Rezultat<null>> {
  return pokusaj("deleteOrder", async () => {
    await deleteOrder(id);
    revalidatePath("/");
    revalidatePath("/porudzbine");
    revalidatePath("/kalendar");
    revalidatePath("/statistika");
    return null;
  });
}
