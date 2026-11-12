export function CarCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#1A1A24] rounded-[14px] border border-[#E4E4EE] dark:border-[#2A2A38] shadow-sm overflow-hidden animate-shimmer flex flex-col">
      <div className="aspect-[16/10] w-full bg-slate-200/80 dark:bg-zinc-800/80 relative" />
      <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-20 bg-slate-200 dark:bg-zinc-800 rounded-full" />
            <div className="h-4 w-12 bg-slate-200 dark:bg-zinc-800 rounded-full" />
          </div>
          <div className="h-5 w-3/4 bg-slate-200 dark:bg-zinc-800 rounded-md" />
          <div className="h-6 w-1/2 bg-slate-200 dark:bg-zinc-800 rounded-md" />
        </div>
        <div className="pt-3 border-t border-[#E4E4EE] dark:border-[#2A2A38] flex items-center justify-between">
          <div className="h-5 w-20 bg-slate-200 dark:bg-zinc-800 rounded-md" />
          <div className="h-5 w-20 bg-slate-200 dark:bg-zinc-800 rounded-md" />
          <div className="h-5 w-20 bg-slate-200 dark:bg-zinc-800 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function CarListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CarCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function SegmentTabsSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden py-1 animate-shimmer">
      <div className="h-10 w-28 bg-slate-200 dark:bg-zinc-800 rounded-xl flex-shrink-0" />
      <div className="h-10 w-32 bg-slate-200 dark:bg-zinc-800 rounded-xl flex-shrink-0" />
      <div className="h-10 w-28 bg-slate-200 dark:bg-zinc-800 rounded-xl flex-shrink-0" />
    </div>
  );
}
