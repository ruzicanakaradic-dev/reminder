import { listaKorisnica } from "@/lib/admin";
import { AdminKonzola } from "@/components/AdminKonzola";

// /admin — glavna konzola. pbAdminSession() unutar listaKorisnica() preusmerava
// na /admin/prijava kad nema superuser sesije, pa je stranica zaštićena.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const korisnice = await listaKorisnica();
  return <AdminKonzola pocetne={korisnice} />;
}
