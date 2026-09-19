/**
 * Loading skeleton — pulsing placeholder UI shown during decision switching.
 *
 * Mirrors the Builder layout so the transition feels smooth.
 * Uses aria-busy and aria-label for accessibility.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/45
 */

export function DecisionSkeleton() {
  return (
    <div
      className="space-y-6 animate-pulse"
      role="status"
      aria-busy="true"
      aria-label="Loading decision…"
    >
      {/* Title & Description skeleton */}
      <section>
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
        <div className="space-y-3">
          <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-md" />
          <div className="h-16 w-full bg-gray-200 dark:bg-gray-700 rounded-md" />
          <div className="flex gap-4">
            <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
            <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
          </div>
        </div>
      </section>

      {/* Options skeleton */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-8 w-28 bg-gray-100 dark:bg-gray-800 rounded-md" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-6 h-4 bg-gray-100 dark:bg-gray-800 rounded" />
              <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-md" />
            </div>
          ))}
        </div>
      </section>

      {/* Criteria skeleton */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-8 w-32 bg-gray-100 dark:bg-gray-800 rounded-md" />
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-md" />
              <div className="w-16 h-10 bg-gray-200 dark:bg-gray-700 rounded-md" />
              <div className="w-24 h-10 bg-gray-200 dark:bg-gray-700 rounded-md" />
            </div>
          ))}
        </div>
      </section>

      {/* Scores matrix skeleton */}
      <section>
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
        <div className="overflow-x-auto">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
