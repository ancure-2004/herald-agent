import React from "react";
import { cn } from "@/lib/utils/cn";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-slate-200/80 dark:bg-white/[0.08]", className)}
      {...props}
    />
  );
}

/**
 * Layout-matched skeleton for tabular views (e.g. LeadsTableView, LeadDataTable).
 */
export function TableSkeleton({
  rows = 8,
  columns = 8,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Top action/filters skeleton strip */}
      <div className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-xl" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      </div>

      {/* Table rows skeleton */}
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-white/[0.08]">
        {/* Header row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/70 dark:bg-white/[0.02]">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={`th-${i}`}
              className={cn("h-4 rounded-md", i === 0 ? "w-8" : i === 1 ? "w-44" : "flex-1")}
            />
          ))}
        </div>

        {/* Data rows */}
        <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
          {Array.from({ length: rows }).map((_, rIdx) => (
            <div
              key={`tr-${rIdx}`}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors"
            >
              {Array.from({ length: columns }).map((_, cIdx) => (
                <div
                  key={`td-${rIdx}-${cIdx}`}
                  className={cn(
                    cIdx === 0
                      ? "w-8 shrink-0"
                      : cIdx === 1
                      ? "w-44 shrink-0 flex items-center gap-2"
                      : "flex-1 min-w-0"
                  )}
                >
                  {cIdx === 1 ? (
                    <>
                      <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <Skeleton className="h-3.5 w-3/4 rounded-md" />
                        <Skeleton className="h-2.5 w-1/2 rounded-md" />
                      </div>
                    </>
                  ) : (
                    <Skeleton
                      className={cn(
                        "h-3.5 rounded-md",
                        cIdx % 2 === 0 ? "w-4/5" : "w-3/5"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Layout-matched skeleton for KanbanBoardView.
 */
export function KanbanSkeleton({
  columns = 5,
  cardsPerColumn = 3,
  className,
}: {
  columns?: number;
  cardsPerColumn?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4 w-full", className)}>
      {/* Kanban Header & Filters Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-36 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-32 rounded-xl" />
        </div>
      </div>

      {/* Kanban Columns Grid */}
      <div className="flex gap-4 overflow-x-auto pb-6">
        {Array.from({ length: columns }).map((_, cIdx) => (
          <div
            key={`col-${cIdx}`}
            className="w-80 shrink-0 bg-slate-50/70 dark:bg-white/[0.03] rounded-2xl p-3 border border-slate-200/80 dark:border-white/[0.08] space-y-3"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-1 py-1">
              <div className="flex items-center gap-2">
                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-4 w-6 rounded-full" />
              </div>
              <Skeleton className="h-4 w-8 rounded-md" />
            </div>

            {/* Column Cards */}
            <div className="space-y-2.5">
              {Array.from({ length: cardsPerColumn }).map((_, cardIdx) => (
                <div
                  key={`card-${cIdx}-${cardIdx}`}
                  className="bg-white dark:bg-[#18181B] rounded-xl p-3.5 border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <Skeleton className="h-4 w-3/4 rounded-md" />
                      <Skeleton className="h-3 w-1/2 rounded-md" />
                    </div>
                    <Skeleton className="h-5 w-12 rounded-full shrink-0" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-20 rounded-md" />
                    <Skeleton className="h-3 w-16 rounded-md" />
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                    <Skeleton className="h-6 w-16 rounded-lg" />
                    <Skeleton className="h-6 w-20 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Layout-matched skeleton for DiscoveryTab.
 */
export function DiscoverySkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 w-full", className)}>
      {/* 1. Top Bento Row Skeleton */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Card Skeleton */}
        <div className="col-span-12 lg:col-span-7 bg-zinc-900 rounded-2xl p-5 border border-zinc-800 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-28 bg-zinc-800" />
              <Skeleton className="h-3 w-40 bg-zinc-800" />
            </div>
            <Skeleton className="h-6 w-32 rounded-full bg-zinc-800" />
          </div>
          <div className="grid grid-cols-4 gap-2 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={`bento-sub-${i}`} className="h-14 rounded-xl bg-zinc-800" />
            ))}
          </div>
        </div>

        {/* Right Card Skeleton */}
        <div className="col-span-12 lg:col-span-5 bg-zinc-900 rounded-2xl p-5 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32 bg-zinc-800" />
            <Skeleton className="h-4 w-20 bg-zinc-800" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-xl bg-zinc-800" />
            <div className="flex gap-2">
              <Skeleton className="h-8 flex-1 rounded-xl bg-zinc-800" />
              <Skeleton className="h-8 flex-1 rounded-xl bg-zinc-800" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Controls & Search Bar Skeleton */}
      <div className="flex items-center justify-between gap-3 p-3.5 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-8 w-32 rounded-xl" />
        </div>
        <Skeleton className="h-8 w-48 rounded-xl" />
      </div>

      {/* 3. Table Rows Skeleton */}
      <TableSkeleton rows={6} columns={6} />
    </div>
  );
}
