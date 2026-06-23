import React from 'react';
import { cn } from '../../lib/cn';

export function Skeleton({ className }: { className?: string }): JSX.Element {
  return (
    <div
      className={cn(
        'animate-pulse bg-line/50 dark:bg-line/30 rounded',
        className
      )}
    />
  );
}

export function KPICardSkeleton(): JSX.Element {
  return (
    <div className="bg-card border border-line rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-36 mt-1" />
      <div className="flex items-center gap-2 mt-1">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 6 }: { cols?: number }): JSX.Element {
  return (
    <tr className="border-b border-line">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton({ height = 300 }: { height?: number }): JSX.Element {
  return (
    <div
      className="w-full animate-pulse bg-line/50 dark:bg-line/30 rounded-xl"
      style={{ height }}
    />
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex items-start justify-between pb-4 border-b border-line mb-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-white tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 ml-4 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
