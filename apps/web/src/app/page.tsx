export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground">
        Bootstrap · Fase 1 · Foundation
      </div>
      <h1 className="font-sans text-6xl font-bold tracking-tight">
        Source<span className="text-accent">.</span>Authority
      </h1>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        Plataforma SaaS B2B brasileira de proteção de marca e atribuição de
        tracking. Página placeholder — Supabase + auth no próximo chunk.
      </p>
    </main>
  );
}
