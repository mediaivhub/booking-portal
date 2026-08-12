export default function BookingCardSkeleton() {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="shimmer h-3.5 w-20 rounded" />
        <div className="shimmer h-5 w-20 rounded-full" />
      </div>
      <div className="space-y-2.5">
        <div className="shimmer h-3.5 w-3/5 rounded" />
        <div className="shimmer h-3.5 w-4/5 rounded" />
        <div className="shimmer h-3.5 w-2/3 rounded" />
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <div className="shimmer w-7 h-7 rounded-full" />
          <div className="shimmer h-3 w-16 rounded" />
        </div>
        <div className="shimmer h-6 w-16 rounded-lg" />
      </div>
    </div>
  );
}

export function BookingListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <BookingCardSkeleton key={i} />
      ))}
    </div>
  );
}
