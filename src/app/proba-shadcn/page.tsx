"use client";

// PROBNI EKRAN za fazu 3 (shadcn migracija). Nije deo pravog toka — služi da
// Igor uživo vidi shadcn komponente obojene brend bojama (plum + krem) pre
// nego što se odluči na punu migraciju. Briše se kad migracija krene za ozbiljno.

import { useState } from "react";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProbaShadcnPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-dvh grid place-items-center px-5 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="text-xs font-bold uppercase tracking-widest text-primary">
            Proba · shadcn/ui
          </div>
          <p className="text-sm text-muted-foreground">
            shadcn komponente obojene brend bojama
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Prijava</CardTitle>
            <CardDescription>Knjiga porudžbina</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" placeholder="milka@primer.rs" className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lozinka">Lozinka</Label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="lozinka" type="password" className="pl-9" />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 900);
              }}
            >
              {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              Prijavi se
            </Button>
          </CardContent>
        </Card>

        {/* Paleta — da se uživo vidi kako brend boje legnu na shadcn tokene */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Paleta (brend → shadcn tokeni)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Uzorak klasa="bg-primary text-primary-foreground" ime="primary (plum)" />
            <Uzorak klasa="bg-secondary text-secondary-foreground" ime="secondary" />
            <Uzorak klasa="bg-muted text-muted-foreground" ime="muted" />
            <Uzorak klasa="bg-card text-card-foreground border" ime="card" />
            <Uzorak klasa="bg-destructive text-white" ime="destructive" />
            <Uzorak klasa="bg-background text-foreground border" ime="background" />
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="default" size="sm">Default</Button>
          <Button variant="secondary" size="sm">Secondary</Button>
          <Button variant="outline" size="sm">Outline</Button>
          <Button variant="ghost" size="sm">Ghost</Button>
        </div>
      </div>
    </div>
  );
}

function Uzorak({ klasa, ime }: { klasa: string; ime: string }) {
  return (
    <div className={`rounded-md px-3 py-4 text-xs font-medium ${klasa}`}>{ime}</div>
  );
}
