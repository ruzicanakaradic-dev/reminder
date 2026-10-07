"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteOrderAction } from "@/app/actions";
import { razumljivaPoruka } from "@/lib/greske";

export function DeleteOrderButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const onClick = () => {
    if (!confirm("Da li sigurno želiš da obrišeš ovu porudžbinu? Ovo se ne može poništiti.")) return;
    start(async () => {
      let greska: string | null = null;
      try {
        const res = await deleteOrderAction(id);
        if (!res.ok) greska = res.greska;
      } catch (err) {
        greska = razumljivaPoruka(err);
      }
      if (greska) {
        alert(`Porudžbina nije obrisana. ${greska}`);
        return;
      }
      router.push("/porudzbine");
      router.refresh();
    });
  };

  return (
    <button onClick={onClick} disabled={pending} className="btn btn-ghost text-[var(--accent)]">
      {pending ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
      Obriši
    </button>
  );
}
