"use server";

import { revalidatePath } from "next/cache";
import { saveOrder, updateStatus, deleteOrder } from "@/lib/data";
import type { OrderInput, OrderItemInput, Status } from "@/lib/types";

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

export async function saveOrderAction(formData: FormData): Promise<{ id: string }> {
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
    status: (str(formData.get("status")) || "primljena") as Status,
    items,
  };

  if (!input.kupac_ime) throw new Error("Ime kupca je obavezno.");
  if (items.length === 0) throw new Error("Dodaj bar jedan proizvod (kolač).");
  if (!input.datum_isporuke) throw new Error("Datum isporuke je obavezan.");

  const order = await saveOrder(input);
  revalidatePath("/");
  revalidatePath("/porudzbine");
  revalidatePath("/kalendar");
  revalidatePath("/kupci");
  revalidatePath("/statistika");
  return { id: order.id };
}

export async function setStatusAction(id: string, status: Status): Promise<void> {
  await updateStatus(id, status);
  revalidatePath("/");
  revalidatePath("/porudzbine");
  revalidatePath("/kalendar");
  revalidatePath(`/porudzbine/${id}`);
}

export async function deleteOrderAction(id: string): Promise<void> {
  await deleteOrder(id);
  revalidatePath("/");
  revalidatePath("/porudzbine");
  revalidatePath("/kalendar");
  revalidatePath("/statistika");
}
