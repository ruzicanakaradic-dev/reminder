"""
Generiše pocketbase/pb_schema.json — šemu RDK Reminder-a za PocketBase (v0.23+).

Prevod supabase/schema.sql + migracija 2–8 u PocketBase kolekcije, uz
multi-tenant izolaciju: svaka kolekcija ima obavezno polje `user` (relacija
na `users`), a API pravila dozvoljavaju korisniku pristup samo svojim redovima.

Import: PocketBase Admin → Settings → Import collections → nalepi JSON.

Pokretanje:  python3 pocketbase/build_schema.py
"""
import json
from pathlib import Path

USERS = "_pb_users_auth_"  # podrazumevani id kolekcije "users"

C_CUSTOMERS = "rdkcustomers001"
C_ORDERS = "rdkorders000001"
C_ITEMS = "rdkorderitems01"
C_PUSH = "rdkpushsubs0001"
C_SETTINGS = "rdksettings0001"
for cid in (C_CUSTOMERS, C_ORDERS, C_ITEMS, C_PUSH, C_SETTINGS):
    assert len(cid) == 15, cid

# ── pravila pristupa ────────────────────────────────────────────────
OWNER = '@request.auth.id != "" && user = @request.auth.id'
CREATE = '@request.auth.id != "" && @request.body.user = @request.auth.id'
UPDATE = OWNER + ' && (@request.body.user:isset = false || @request.body.user = @request.auth.id)'

DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"  # datumi kao "YYYY-MM-DD" (kao u Supabase-u, bez UTC pomeranja)

_counter = 0


def _fid(prefix):
    global _counter
    _counter += 1
    return f"{prefix}{_counter:07d}"


def base(name, typ, required=False, **extra):
    f = {
        "id": _fid(typ),
        "name": name,
        "type": typ,
        "system": False,
        "hidden": False,
        "presentable": False,
        "required": required,
    }
    f.update(extra)
    return f


def id_field():
    return {
        "id": "text3208210256",
        "name": "id",
        "type": "text",
        "system": True,
        "hidden": False,
        "presentable": False,
        "required": True,
        "primaryKey": True,
        "min": 15,
        "max": 15,
        "pattern": "^[a-z0-9]+$",
        "autogeneratePattern": "[a-z0-9]{15}",
    }


def text(name, required=False, max_len=0, pattern=""):
    return base(name, "text", required, min=0, max=max_len, pattern=pattern,
                autogeneratePattern="", primaryKey=False)


def number(name, required=False, only_int=False, min_val=None):
    return base(name, "number", required, min=min_val, max=None, onlyInt=only_int)


def boolean(name):
    return base(name, "bool")


def relation(name, collection_id, required=False, cascade=False):
    return base(name, "relation", required, collectionId=collection_id,
                cascadeDelete=cascade, minSelect=0, maxSelect=1)


def select(name, values, required=False):
    return base(name, "select", required, values=values, maxSelect=1)


def file_field(name):
    return base(name, "file", False, maxSelect=1, maxSize=5 * 1024 * 1024,
                mimeTypes=["image/webp", "image/jpeg", "image/png"],
                thumbs=[], protected=False)


def autodates():
    return [
        base("created", "autodate", onCreate=True, onUpdate=False),
        base("updated", "autodate", onCreate=True, onUpdate=True),
    ]


def owner():
    # vlasnik reda; brisanjem korisnika brišu se i svi njegovi podaci
    return relation("user", USERS, required=True, cascade=True)


def collection(cid, name, fields, indexes, create=CREATE):
    return {
        "id": cid,
        "name": name,
        "type": "base",
        "system": False,
        "listRule": OWNER,
        "viewRule": OWNER,
        "createRule": create,
        "updateRule": UPDATE,
        "deleteRule": OWNER,
        "fields": [id_field(), *fields, *autodates()],
        "indexes": indexes,
    }


customers = collection(C_CUSTOMERS, "customers", [
    owner(),
    number("redni_broj", required=True, only_int=True, min_val=1),  # po korisniku: 1, 2, 3…
    text("ime", required=True),
    text("telefon"),
    text("napomena"),
    text("grad"),
    text("adresa"),
], [
    "CREATE INDEX `idx_customers_user` ON `customers` (`user`)",
    "CREATE UNIQUE INDEX `idx_customers_user_rb` ON `customers` (`user`, `redni_broj`)",
])

orders = collection(C_ORDERS, "orders", [
    owner(),
    number("redni_broj", required=True, only_int=True, min_val=1),
    relation("customer", C_CUSTOMERS),  # brisanje kupca samo prazni vezu (snapshot ostaje)
    # snapshot podataka o kupcu
    text("kupac_ime", required=True),
    text("kupac_telefon"),
    text("datum_porudzbine", pattern=DATE_PATTERN),
    text("datum_isporuke", required=True, pattern=DATE_PATTERN),
    text("vreme_isporuke"),
    text("proizvod", required=True),
    text("opis"),
    text("napomena"),
    file_field("slika"),  # u Supabase-u je bio data URL; ovde pravi fajl (WebP)
    number("tezina_kg"),
    number("cena_po_kg"),
    number("total"),
    text("adresa"),
    text("grad"),
    select("status", ["primljena", "u_radu", "zavrseno", "isporuceno"], required=True),
    boolean("reminded_2d"),
    boolean("reminded_1d"),
    boolean("reminded_0d"),
    boolean("reminded_2h"),
    number("transport_km"),
    number("transport_litara"),
    number("transport_gorivo"),
    number("transport_amortizacija"),
    number("transport_putarina"),
    number("transport_predlog"),
    number("transport_cena"),
    number("dekoracija_cena"),
    boolean("licno_preuzimanje"),
], [
    "CREATE UNIQUE INDEX `idx_orders_user_rb` ON `orders` (`user`, `redni_broj`)",
    "CREATE INDEX `idx_orders_user_isporuka` ON `orders` (`user`, `datum_isporuke`)",
    "CREATE INDEX `idx_orders_user_status` ON `orders` (`user`, `status`)",
    "CREATE INDEX `idx_orders_customer` ON `orders` (`customer`)",
    "CREATE INDEX `idx_orders_grad` ON `orders` (`grad`)",
])

order_items = collection(C_ITEMS, "order_items", [
    owner(),
    relation("order", C_ORDERS, required=True, cascade=True),
    number("redosled", only_int=True, min_val=0),
    text("naziv", required=True),
    number("tezina_kg"),
    number("cena_po_kg"),
    number("total"),
], [
    "CREATE INDEX `idx_order_items_order` ON `order_items` (`order`)",
    "CREATE INDEX `idx_order_items_user` ON `order_items` (`user`)",
])

push_subscriptions = collection(C_PUSH, "push_subscriptions", [
    owner(),
    text("endpoint", required=True, max_len=2000),
    text("p256dh", required=True),
    text("auth", required=True),
], [
    "CREATE UNIQUE INDEX `idx_push_endpoint` ON `push_subscriptions` (`endpoint`)",
    "CREATE INDEX `idx_push_user` ON `push_subscriptions` (`user`)",
])

# Podešavanja: jedan red po korisniku (umesto app_settings id=1).
# Polja koja su u kodu bila zakucana za Ružicu (polazište, prag besplatne
# dostave) ovde postaju podešavanja svake poslastičarke.
app_settings = collection(C_SETTINGS, "app_settings", [
    owner(),
    text("naziv_biznisa"),
    text("polaziste_adresa"),  # npr. "Inđija, Jug Bogdana 17"
    number("polaziste_lat"),
    number("polaziste_lon"),
    number("dizel_cena_rsd", min_val=0),
    number("potrosnja_l_100km", min_val=0),
    number("amortizacija_rsd_km", min_val=0),
    number("besplatna_dostava_od", min_val=0),  # RSD; 0 = nema besplatne dostave
], [
    "CREATE UNIQUE INDEX `idx_app_settings_user` ON `app_settings` (`user`)",
])

schema = [customers, orders, order_items, push_subscriptions, app_settings]

out = Path(__file__).with_name("pb_schema.json")
out.write_text(json.dumps(schema, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# osnovne provere
for c in schema:
    names = [f["name"] for f in c["fields"]]
    ids = [f["id"] for f in c["fields"]]
    assert len(names) == len(set(names)), (c["name"], "duplikat imena polja")
    assert len(ids) == len(set(ids)), (c["name"], "duplikat id-a polja")
print(f"OK → {out}  ({len(schema)} kolekcija, "
      f"{sum(len(c['fields']) for c in schema)} polja)")
