"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteOrderAction } from "@/app/actions";

export function DeleteOrderButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const onClick = () => {
    if (!confirm("Da li sigurno želiš da obrišeš ovu porudžbinu? Ovo se ne može poništiti.")) return;
    start(async () => {
      await deleteOrderAction(id);
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
