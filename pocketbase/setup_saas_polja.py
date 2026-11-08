#!/usr/bin/env python3
"""
Dodaje SaaS polja na `users` kolekciju (bez diranja naloga) i postavlja
razumne podrazumevane vrednosti na postojeće korisnice.

ZAŠTO ovako a ne kroz pb_schema.json: `users` je PocketBase SISTEMSKA auth
kolekcija. Uvoz kroz glavni schema import je rizičan (pogrešan Merge može da
obriše naloge — vidi CLAUDE.md). Ova skripta menja SAMO definiciju polja preko
superuser API-ja; ne dira nijedan postojeći red osim da popuni podrazumevane.

DODAJE polja na `users`:
  - plan          select: "free" | "paid"   (podrazumevano: "free")
  - trial_do      text (YYYY-MM-DD)          prazan = bez trial roka
  - blokiran      bool                       (podrazumevano: false)
  - ime_biznisa   text                       za prikaz u admin konzoli

POSTOJEĆE naloge postavlja na plan="paid", blokiran=false (konzervativno —
niko ko već koristi app ne sme da ostane zaključan). Ružica time ostaje
netaknuta. Nove korisnice (faza 4, self-signup) kreiraju se kao "free" + trial.

Pokretanje (JEDNOM):
  PB_URL=... PB_ADMIN_EMAIL=... PB_ADMIN_PASSWORD=... python3 pocketbase/setup_saas_polja.py
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

# Polja koja dodajemo (PocketBase field definicije).
NOVA_POLJA = [
    {"name": "plan", "type": "select", "maxSelect": 1, "values": ["free", "paid"]},
    {"name": "trial_do", "type": "text", "max": 0, "pattern": r"^\d{4}-\d{2}-\d{2}$"},
    {"name": "blokiran", "type": "bool"},
    {"name": "ime_biznisa", "type": "text", "max": 0},
]


def main():
    s = requests.Session()
    r = s.post(
        f"{PB_URL}/api/collections/_superusers/auth-with-password",
        json={"identity": EMAIL, "password": PASSWORD},
        timeout=30,
    )
    r.raise_for_status()
    s.headers["Authorization"] = r.json()["token"]

    # 1) Učitaj `users` kolekciju i dodaj polja koja fale.
    col = s.get(f"{PB_URL}/api/collections/users", timeout=30).json()
    postojeca = {f["name"] for f in col.get("fields", [])}
    dodata = []
    for f in NOVA_POLJA:
        if f["name"] not in postojeca:
            col["fields"].append(f)
            dodata.append(f["name"])
    if dodata:
        up = s.patch(
            f"{PB_URL}/api/collections/users",
            json={"fields": col["fields"]},
            timeout=30,
        )
        up.raise_for_status()
        print(f"Dodata polja na users: {', '.join(dodata)}")
    else:
        print("Sva polja već postoje na users — preskačem izmenu šeme.")

    # 2) Postavi podrazumevane na postojeće naloge (konzervativno: paid, ne blokiran).
    page, azurirano = 1, 0
    while True:
        res = s.get(
            f"{PB_URL}/api/collections/users/records",
            params={"page": page, "perPage": 200},
            timeout=30,
        ).json()
        for rec in res.get("items", []):
            patch = {}
            if not rec.get("plan"):
                patch["plan"] = "paid"  # postojeće korisnice su plaćene/aktivne
            if rec.get("blokiran") is None:
                patch["blokiran"] = False
            if patch:
                s.patch(
                    f"{PB_URL}/api/collections/users/records/{rec['id']}",
                    json=patch,
                    timeout=30,
                ).raise_for_status()
                azurirano += 1
        if page >= res.get("totalPages", 1):
            break
        page += 1

    print(f"Postojećih naloga postavljeno na paid/aktivan: {azurirano}.")
    print("Gotovo. Nove korisnice (self-signup, faza 4) idu kao free + trial_do.")


if __name__ == "__main__":
    main()
