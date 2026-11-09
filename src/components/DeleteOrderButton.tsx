"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteOrderAction } from "@/app/actions";
import { razumljivaPoruka } from "@/lib/greske";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export function DeleteOrderButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [greska, setGreska] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const potvrdi = () => {
    setGreska(null);
    start(async () => {
      let g: string | null = null;
      try {
        const res = await deleteOrderAction(id);
        if (!res.ok) g = res.greska;
      } catch (err) {
        g = razumljivaPoruka(err);
      }
      if (g) {
        setGreska(g);
        return;
      }
      setOpen(false);
      router.push("/porudzbine");
      router.refresh();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setGreska(null); }}>
      <AlertDialogTrigger
        render={
          <button className="btn btn-ghost text-[var(--brand)]">
            <Trash2 size={18} />
            Obriši
          </button>
        }
      />
      <AlertDialogContent>
        <AlertDialogTitle>Obriši porudžbinu?</AlertDialogTitle>
        <AlertDialogDescription>
          Ova porudžbina će biti trajno obrisana. Ovo se ne može poništiti.
        </AlertDialogDescription>
        {greska && (
          <p className="mt-3 text-sm font-semibold" style={{ color: "var(--brand)" }}>
            Porudžbina nije obrisana. {greska}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel render={<button className="btn btn-secondary">Otkaži</button>} />
          <button
            onClick={potvrdi}
            disabled={pending}
            className="btn btn-primary"
          >
            {pending ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            Obriši
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
