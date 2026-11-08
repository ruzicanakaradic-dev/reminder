"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

// Prebacivanje svetla/tamna tema. Primenjuje `.dark` klasu na <html> i pamti
// izbor u localStorage ("tema"). Početno stanje postavlja skripta u layout-u
// (bez treperenja), pa ovde samo čitamo i menjamo.
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const d = !dark;
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
    try {
      localStorage.setItem("tema", d ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={className ?? "btn btn-secondary btn-icon"}
      aria-label={dark ? "Svetla tema" : "Tamna tema"}
      title={dark ? "Svetla tema" : "Tamna tema"}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
