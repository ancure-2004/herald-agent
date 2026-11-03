export default function Loading() {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#FAF9F6] dark:bg-[#0B0C10] text-slate-900 dark:text-slate-100">
      {/* Top Header Skeleton */}
      <header className="h-16 shrink-0 border-b border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#0F1117]/95 px-6 flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="w-32 h-4 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="w-80 h-9 rounded-2xl bg-slate-200 dark:bg-slate-800 hidden md:block" />
        <div className="flex items-center gap-3">
          <div className="w-24 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="w-24 h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </header>

      {/* Main Layout Skeleton */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Skeleton */}
        <aside className="w-64 shrink-0 h-full border-r border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0F1117] p-4 flex flex-col justify-between animate-pulse">
          <div className="space-y-3">
            <div className="w-16 h-3 rounded bg-slate-200 dark:bg-slate-800 mb-4" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-full h-10 rounded-2xl bg-slate-200 dark:bg-slate-800/60" />
            ))}
          </div>
          <div className="w-full h-24 rounded-2xl bg-slate-200 dark:bg-slate-800/40" />
        </aside>

        {/* Center Workspace Skeleton */}
        <main className="flex-1 h-full overflow-y-auto p-6 space-y-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="w-32 h-3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="w-56 h-7 rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="w-48 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] p-5" />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-72 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08]" />
            <div className="h-72 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08]" />
          </div>
        </main>
      </div>
    </div>
  );
}
