"use server";

import { revalidatePath } from "next/cache";
import { saveOrder, updateStatus, deleteOrder } from "@/lib/data";
import type { OrderInput, Status } from "@/lib/types";

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

export async function saveOrderAction(formData: FormData): Promise<{ id: string }> {
  const tezina = num(formData.get("tezina_kg"));
  const cena = num(formData.get("cena_po_kg"));
  const totalRaw = num(formData.get("total"));

  const input: OrderInput = {
    id: str(formData.get("id")) || undefined,
    kupac_ime: str(formData.get("kupac_ime")),
    kupac_telefon: str(formData.get("kupac_telefon")) || null,
    datum_porudzbine: str(formData.get("datum_porudzbine")),
    datum_isporuke: str(formData.get("datum_isporuke")),
    proizvod: str(formData.get("proizvod")),
    opis: str(formData.get("opis")) || null,
    tezina_kg: tezina,
    cena_po_kg: cena,
    total: totalRaw ?? (tezina != null && cena != null ? Number((tezina * cena).toFixed(2)) : null),
    adresa: str(formData.get("adresa")) || null,
    grad: str(formData.get("grad")) || null,
    status: (str(formData.get("status")) || "u_radu") as Status,
  };

  if (!input.kupac_ime) throw new Error("Ime kupca je obavezno.");
  if (!input.proizvod) throw new Error("Proizvod je obavezan.");
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
