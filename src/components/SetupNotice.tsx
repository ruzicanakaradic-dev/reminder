export function SetupNotice() {
  return (
    <div className="card p-6 sm:p-8 animate-in">
      <div className="text-4xl mb-2">🔧</div>
      <h1 className="display text-2xl font-semibold text-ink">Još samo jedan korak</h1>
      <p className="text-muted mt-1">
        Baza podataka nije povezana. Popuni Supabase ključeve pa se sve odmah aktivira.
      </p>

      <ol className="mt-5 space-y-3 text-sm">
        <li className="flex gap-3">
          <span className="shrink-0 grid place-items-center w-6 h-6 rounded-full bg-rose-100 text-rose-600 font-bold text-xs">1</span>
          <span>
            Napravi projekat u Supabase organizaciji <b>„Ružini domaći kolači"</b>.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 grid place-items-center w-6 h-6 rounded-full bg-rose-100 text-rose-600 font-bold text-xs">2</span>
          <span>
            U <b>SQL Editor</b> nalepi i pokreni fajl <code className="bg-sand px-1.5 py-0.5 rounded">supabase/schema.sql</code>.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 grid place-items-center w-6 h-6 rounded-full bg-rose-100 text-rose-600 font-bold text-xs">3</span>
          <span>
            U <code className="bg-sand px-1.5 py-0.5 rounded">.env.local</code> popuni:
            <code className="block bg-sand px-2 py-1.5 rounded mt-1 text-xs leading-relaxed">
              NEXT_PUBLIC_SUPABASE_URL<br />
              NEXT_PUBLIC_SUPABASE_ANON_KEY<br />
              SUPABASE_SERVICE_ROLE_KEY
            </code>
            <span className="text-muted">(Supabase → Project Settings → API)</span>
          </span>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 grid place-items-center w-6 h-6 rounded-full bg-rose-100 text-rose-600 font-bold text-xs">4</span>
          <span>Restartuj server (<code className="bg-sand px-1.5 py-0.5 rounded">npm run dev</code>) i osveži stranicu.</span>
        </li>
      </ol>
    </div>
  );
}
