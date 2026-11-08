"use client";

// GALERIJA KOMPONENTI (shadcn migracija). Nije deo pravog toka — živi pregled
// shadcn komponenti u obe teme i sa brend bojama, radi provere tokom migracije
// ekrana. Javna ruta (samostalna u AppChrome), nije u navigaciji.

import { useState } from "react";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { StatusControl } from "@/components/StatusControl";

export default function ProbaShadcnPage() {
  const [loading, setLoading] = useState(false);
  const [mesec, setMesec] = useState("2026-11");

  return (
    // bg-background text-foreground = ČIST shadcn (gazi krem body sa stare teme)
    <div className="min-h-dvh bg-background text-foreground grid place-items-center px-5 py-10">
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
            <Uzorak klasa="bg-accent text-accent-foreground" ime="accent" />
            <Uzorak klasa="bg-card text-card-foreground border" ime="card" />
            <Uzorak klasa="bg-destructive text-white" ime="destructive" />
            <Uzorak klasa="bg-background text-foreground border" ime="background" />
          </CardContent>
        </Card>

        {/* Select — zamena native <select> (OS lista u dark temi je svetla) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select (padajući meni)</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={mesec}
              items={{ "2026-11": "Novembar 2026.", "2026-10": "Oktobar 2026.", "2026-09": "Septembar 2026." }}
              onValueChange={(v) => setMesec(String(v))}
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-11">Novembar 2026.</SelectItem>
                <SelectItem value="2026-10">Oktobar 2026.</SelectItem>
                <SelectItem value="2026-09">Septembar 2026.</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* StatusControl — aktivni pil po statusu (provera dark boja) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status pil (aktivni po statusu)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <StatusControl id="demo1" status="primljena" />
            <StatusControl id="demo2" status="u_radu" />
            <StatusControl id="demo3" status="zavrseno" />
            <StatusControl id="demo4" status="isporuceno" />
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
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
