/**
 * Skeleton de /relatorios mostrado durante o Suspense da Server Component
 * (queries Supabase + agregação). Match visual aproximado do final state
 * pra evitar layout shift quando o conteúdo entra.
 */
export default function Loading() {
  return (
    <div className="container py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <div className="h-8 w-40 animate-pulse rounded bg-secondary" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-secondary/60" />
        </div>

        <div className="h-12 animate-pulse rounded-lg bg-secondary" />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-secondary"
            />
          ))}
        </div>

        <div className="h-72 animate-pulse rounded-lg bg-secondary" />
        <div className="h-72 animate-pulse rounded-lg bg-secondary" />
        <div className="h-96 animate-pulse rounded-lg bg-secondary" />
      </div>
    </div>
  );
}
