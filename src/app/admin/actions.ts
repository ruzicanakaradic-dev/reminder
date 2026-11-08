"use server";

import { revalidatePath } from "next/cache";
import {
  kreirajNalog,
  listaKorisnica,
  postaviBlokiran,
  postaviPlan,
  produziTrial,
} from "@/lib/admin";
import type { AdminUser, Plan } from "@/lib/types";
import { razumljivaPoruka, type Rezultat } from "@/lib/greske";

async function pokusaj<T>(naziv: string, fn: () => Promise<T>): Promise<Rezultat<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    console.error(`[${naziv}]`, e);
    return { ok: false, greska: razumljivaPoruka(e) };
  }
}

export async function listaKorisnicaAction(): Promise<AdminUser[]> {
  return listaKorisnica();
}

export async function kreirajNalogAction(input: {
  email: string;
  lozinka: string;
  ime_biznisa?: string;
  plan?: Plan;
  trial_dana?: number;
}): Promise<Rezultat<AdminUser>> {
  const r = await pokusaj("admin.kreirajNalog", () => kreirajNalog(input));
  if (r.ok) revalidatePath("/admin");
  return r;
}

export async function blokirajAction(userId: string, blokiran: boolean): Promise<Rezultat<true>> {
  const r = await pokusaj("admin.blokiraj", async () => {
    await postaviBlokiran(userId, blokiran);
    return true as const;
  });
  if (r.ok) revalidatePath("/admin");
  return r;
}

export async function planAction(userId: string, plan: Plan): Promise<Rezultat<true>> {
  const r = await pokusaj("admin.plan", async () => {
    await postaviPlan(userId, plan);
    return true as const;
  });
  if (r.ok) revalidatePath("/admin");
  return r;
}

export async function produziTrialAction(userId: string, dana: number): Promise<Rezultat<true>> {
  const r = await pokusaj("admin.produziTrial", async () => {
    await produziTrial(userId, dana);
    return true as const;
  });
  if (r.ok) revalidatePath("/admin");
  return r;
}
