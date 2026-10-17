export function CarCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
      <div className="h-44 bg-slate-200" />
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 bg-slate-200 rounded-full" />
          <div className="h-4 w-12 bg-slate-200 rounded-full" />
        </div>
        <div className="h-5 w-3/4 bg-slate-200 rounded" />
        <div className="h-6 w-1/2 bg-slate-200 rounded" />
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div className="h-3 w-28 bg-slate-200 rounded" />
          <div className="h-3 w-16 bg-slate-200 rounded" />
        </div>
      </div>
    </div>
  );
}

export function CarListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CarCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function SegmentTabsSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden py-1 animate-pulse">
      <div className="h-10 w-28 bg-slate-200 rounded-xl flex-shrink-0" />
      <div className="h-10 w-32 bg-slate-200 rounded-xl flex-shrink-0" />
      <div className="h-10 w-28 bg-slate-200 rounded-xl flex-shrink-0" />
    </div>
  );
}
