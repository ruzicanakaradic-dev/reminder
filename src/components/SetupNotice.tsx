export function SetupNotice() {
  return (
    <div className="card p-6 sm:p-8 animate-in">
      <div className="text-4xl mb-2">🔧</div>
      <h1 className="display text-2xl font-semibold text-ink">Još samo jedan korak</h1>
      <p className="text-muted mt-1">
        Baza podataka nije povezana. Podesi PocketBase pa se sve odmah aktivira.
      </p>

      <ol className="mt-5 space-y-3 text-sm">
        <li className="flex gap-3">
          <span className="shrink-0 grid place-items-center w-6 h-6 rounded-full bg-[var(--accent-100)] text-[var(--brand-plum)] font-bold text-xs">1</span>
          <span>
            Pokreni PocketBase server (npr. na Railway-u) i napravi superuser nalog.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 grid place-items-center w-6 h-6 rounded-full bg-[var(--accent-100)] text-[var(--brand-plum)] font-bold text-xs">2</span>
          <span>
            U admin panelu: <b>Settings → Import collections</b>, nalepi{" "}
            <code className="bg-[var(--surface)] px-1.5 py-0.5 rounded">pocketbase/pb_schema.json</code> i uključi <b>Merge</b>.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 grid place-items-center w-6 h-6 rounded-full bg-[var(--accent-100)] text-[var(--brand-plum)] font-bold text-xs">3</span>
          <span>
            U <code className="bg-[var(--surface)] px-1.5 py-0.5 rounded">.env.local</code> popuni:
            <code className="block bg-[var(--surface)] px-2 py-1.5 rounded mt-1 text-xs leading-relaxed">
              POCKETBASE_URL<br />
              POCKETBASE_ADMIN_EMAIL<br />
              POCKETBASE_ADMIN_PASSWORD
            </code>
          </span>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 grid place-items-center w-6 h-6 rounded-full bg-[var(--accent-100)] text-[var(--brand-plum)] font-bold text-xs">4</span>
          <span>Restartuj server (<code className="bg-[var(--surface)] px-1.5 py-0.5 rounded">npm run dev</code>) i osveži stranicu.</span>
        </li>
      </ol>
    </div>
  );
}
