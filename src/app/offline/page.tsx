export default function OfflinePage() {
  return (
    <div className="min-h-[60vh] grid place-items-center text-center px-6">
      <div>
        <div className="text-5xl mb-3">📶</div>
        <h1 className="display text-2xl font-semibold text-ink">Nema internet veze</h1>
        <p className="text-muted mt-1 max-w-xs mx-auto">
          Proveri konekciju pa osveži stranicu. Podsetnici i porudžbine se čuvaju u bazi.
        </p>
      </div>
    </div>
  );
}
