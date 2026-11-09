#!/usr/bin/env python3
"""
Jednokratna migracija app_settings pri prelasku:
  dizel_cena_rsd  →  gorivo_cena_rsd   (+ tip_goriva = "dizel")

KADA: pokrenuti JEDNOM, PRE importa nove šeme (pb_schema.json). Čita staru
vrednost `dizel_cena_rsd` i upisuje je u NOVO polje. Pošto import sa Merge
uklanja staru kolonu, redosled je:

  1. Dodaj NOVA polja u app_settings (import pb_schema.json sa „Merge" — to
     doda gorivo_cena_rsd, tip_goriva; staro dizel_cena_rsd još postoji).
  2. Pokreni OVU skriptu → prepiše dizel_cena_rsd → gorivo_cena_rsd po redu.
  3. (Opciono) obriši staru kolonu dizel_cena_rsd iz PB admina.

Bez spoljnih zavisnosti osim `requests` (pip install requests).

Varijable okruženja:
  PB_URL             npr. https://pocketbase-production-ec14.up.railway.app
  PB_ADMIN_EMAIL     superuser email
  PB_ADMIN_PASSWORD  superuser lozinka

Pokretanje:
  PB_URL=... PB_ADMIN_EMAIL=... PB_ADMIN_PASSWORD=... python3 pocketbase/migrate_gorivo.py
"""
import os
import sys

try:
    import requests
except ImportError:
    sys.exit("Treba `requests`: pip install requests")

PB_URL = os.environ.get("PB_URL", "").rstrip("/")
EMAIL = os.environ.get("PB_ADMIN_EMAIL", "")
PASSWORD = os.environ.get("PB_ADMIN_PASSWORD", "")

if not (PB_URL and EMAIL and PASSWORD):
    sys.exit("Postavi PB_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD.")


def main():
    s = requests.Session()
    # superuser prijava (PocketBase v0.23+)
    r = s.post(
        f"{PB_URL}/api/collections/_superusers/auth-with-password",
        json={"identity": EMAIL, "password": PASSWORD},
        timeout=30,
    )
    r.raise_for_status()
    s.headers["Authorization"] = r.json()["token"]

    # svi app_settings redovi (po korisnici)
    page, migrirano, preskoceno = 1, 0, 0
    while True:
        res = s.get(
            f"{PB_URL}/api/collections/app_settings/records",
            params={"page": page, "perPage": 200},
            timeout=30,
        ).json()
        for rec in res.get("items", []):
            staro = rec.get("dizel_cena_rsd")
            novo = rec.get("gorivo_cena_rsd")
            patch = {}
            # Prenesi cenu samo ako novo polje još nije popunjeno a staro ima vrednost.
            if (not novo) and staro:
                patch["gorivo_cena_rsd"] = staro
            # Podrazumevani tip goriva ako nije postavljen.
            if not rec.get("tip_goriva"):
                patch["tip_goriva"] = "dizel"
            if patch:
                s.patch(
                    f"{PB_URL}/api/collections/app_settings/records/{rec['id']}",
                    json=patch,
                    timeout=30,
                ).raise_for_status()
                migrirano += 1
            else:
                preskoceno += 1
        if page >= res.get("totalPages", 1):
            break
        page += 1

    print(f"Gotovo. Migrirano redova: {migrirano}, preskočeno: {preskoceno}.")
    print("Sada možeš (opciono) obrisati staru kolonu `dizel_cena_rsd` iz PB admina.")


if __name__ == "__main__":
    main()
