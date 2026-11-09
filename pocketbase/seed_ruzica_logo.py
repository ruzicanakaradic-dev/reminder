#!/usr/bin/env python3
"""
Postavlja Ružicin brend logo (public/logo.png) na njen `app_settings.brend_logo`,
da „Moj brend" prikazuje njen logo umesto obojenog inicijala. Jednokratno.

Ružica već ima nalog i podešavanja (njen `naziv_biznisa` je „Ružini domaći
kolači"); ovde se samo dodaje logo koji je oduvek bio u aplikaciji (public/logo.png).

Kako bira njen red (po prioritetu):
  1. RUZICA_EMAIL (ako je zadat) → app_settings tog korisnika
  2. inače: app_settings čiji `naziv_biznisa` sadrži „Ružini"
Diže logo SAMO ako je `brend_logo` prazan (ponovno pokretanje je bezbedno);
FORCE=1 prepisuje postojeći.

Pokretanje (JEDNOM):
  PB_URL=... PB_ADMIN_EMAIL=... PB_ADMIN_PASSWORD=... python3 pocketbase/seed_ruzica_logo.py
  # opciono: RUZICA_EMAIL=ruzica@primer.rs  FORCE=1
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
RUZICA_EMAIL = os.environ.get("RUZICA_EMAIL", "").strip().lower()
FORCE = os.environ.get("FORCE", "") in ("1", "true", "yes")
if not (PB_URL and EMAIL and PASSWORD):
    sys.exit("Postavi PB_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD.")

LOGO = os.path.join(os.path.dirname(__file__), "..", "public", "logo.png")
if not os.path.isfile(LOGO):
    sys.exit(f"Nema logoa: {LOGO}")


def auth() -> str:
    r = requests.post(
        f"{PB_URL}/api/collections/_superusers/auth-with-password",
        json={"identity": EMAIL, "password": PASSWORD},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["token"]


def main() -> None:
    token = auth()
    H = {"Authorization": token}

    # 1) Pronađi Ružicin app_settings red
    red = None
    if RUZICA_EMAIL:
        u = requests.get(
            f"{PB_URL}/api/collections/users/records",
            headers=H, params={"filter": f'email="{RUZICA_EMAIL}"', "perPage": 1}, timeout=30,
        )
        u.raise_for_status()
        items = u.json().get("items", [])
        if not items:
            sys.exit(f"Nema korisnika sa email-om {RUZICA_EMAIL}.")
        uid = items[0]["id"]
        s = requests.get(
            f"{PB_URL}/api/collections/app_settings/records",
            headers=H, params={"filter": f'user="{uid}"', "perPage": 1}, timeout=30,
        )
        s.raise_for_status()
        rows = s.json().get("items", [])
        red = rows[0] if rows else None
    else:
        s = requests.get(
            f"{PB_URL}/api/collections/app_settings/records",
            headers=H, params={"filter": 'naziv_biznisa~"Ružini"', "perPage": 2}, timeout=30,
        )
        s.raise_for_status()
        rows = s.json().get("items", [])
        if len(rows) > 1:
            sys.exit("Više redova sadrži „Ružini" — zadaj RUZICA_EMAIL da izabereš tačan nalog.")
        red = rows[0] if rows else None

    if not red:
        sys.exit("Nije pronađen Ružicin app_settings red (probaj RUZICA_EMAIL).")

    if red.get("brend_logo") and not FORCE:
        print(f"brend_logo već postoji ({red['brend_logo']}). FORCE=1 da prepišeš. Izlazim.")
        return

    # 2) Otpremi logo (multipart)
    with open(LOGO, "rb") as f:
        up = requests.patch(
            f"{PB_URL}/api/collections/app_settings/records/{red['id']}",
            headers=H, files={"brend_logo": ("logo.png", f, "image/png")}, timeout=60,
        )
    up.raise_for_status()
    print(f"Gotovo. brend_logo postavljen na red {red['id']} (naziv: {red.get('naziv_biznisa')!r}).")


if __name__ == "__main__":
    main()
