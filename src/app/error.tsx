"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[60vh] grid place-items-center px-6 text-center">
      <div className="card p-8 max-w-md">
        <div className="text-4xl mb-2">🍰</div>
        <h1 className="display text-xl font-semibold text-ink">Ups, nešto je zapelo</h1>
        <p className="text-muted text-sm mt-1">
          Najčešće je u pitanju veza sa bazom. Proveri da je Supabase povezan i da je{" "}
          <code className="bg-sand px-1 rounded">supabase/schema.sql</code> pokrenut.
        </p>
        {error?.message && (
          <p className="text-xs text-rose-600 mt-3 bg-rose-50 rounded-lg p-2 break-words">
            {error.message}
          </p>
        )}
        <button onClick={reset} className="btn btn-primary mt-5">
          Pokušaj ponovo
        </button>
      </div>
    </div>
  );
}
