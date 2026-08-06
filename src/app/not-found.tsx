import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] grid place-items-center px-6 text-center">
      <div>
        <div className="text-5xl mb-2">🧁</div>
        <h1 className="display text-2xl font-semibold text-ink">Stranica nije pronađena</h1>
        <p className="text-muted mt-1">Možda je porudžbina obrisana ili link nije ispravan.</p>
        <Link href="/" className="btn btn-primary mt-5 inline-flex">
          Nazad na početnu
        </Link>
      </div>
    </div>
  );
}
