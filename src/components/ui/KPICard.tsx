import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: { value: number; direction: 'up' | 'down' | 'flat' }
  color?: 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'cyan'
  loading?: boolean
  onClick?: () => void
}

const colorMap = {
  blue: '#0066FF',
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  violet: '#8B5CF6',
  cyan: '#06B6D4',
}

const colorAlphaMap = {
  blue: 'rgba(0, 102, 255, 0.12)',
  green: 'rgba(16, 185, 129, 0.12)',
  amber: 'rgba(245, 158, 11, 0.12)',
  red: 'rgba(239, 68, 68, 0.12)',
  violet: 'rgba(139, 92, 246, 0.12)',
  cyan: 'rgba(6, 182, 212, 0.12)',
}

function SkeletonLine({ width, height = 'h-4' }: { width: string; height?: string }) {
  return (
    <div
      className={`${height} ${width} rounded-md bg-gradient-to-r from-muted via-muted/60 to-muted animate-pulse`}
    />
  )
}

function TrendBadge({ trend }: { trend: NonNullable<KPICardProps['trend']> }) {
  if (trend.direction === 'up') {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium">
        <TrendingUp className="w-3 h-3" />
        <span>+{trend.value}%</span>
      </div>
    )
  }

  if (trend.direction === 'down') {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-medium">
        <TrendingDown className="w-3 h-3" />
        <span>-{trend.value}%</span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
      <Minus className="w-3 h-3" />
      <span>{trend.value}%</span>
    </div>
  )
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  loading = false,
  onClick,
}: KPICardProps) {
  const isClickable = typeof onClick === 'function'
  const accentColor = colorMap[color]
  const accentBg = colorAlphaMap[color]

  if (loading) {
    return (
      <div className="rounded-xl bg-card border border-border/50 shadow-sm p-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-muted animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-3 pt-0.5">
            <SkeletonLine width="w-24" height="h-3" />
            <SkeletonLine width="w-16" height="h-7" />
            <SkeletonLine width="w-32" height="h-3" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={
        isClickable
          ? { scale: 1.025, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }
          : undefined
      }
      whileTap={isClickable ? { scale: 0.985 } : undefined}
      onClick={onClick}
      className={[
        'rounded-xl bg-card border border-border/50 shadow-sm p-5 select-none',
        isClickable ? 'cursor-pointer' : 'cursor-default',
      ].join(' ')}
      style={{ transition: 'box-shadow 0.2s ease' }}
    >
      <div className="flex items-start gap-4">
        {/* Icon circle */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: accentBg }}
        >
          <Icon
            className="w-5 h-5"
            style={{ color: accentColor } as React.CSSProperties}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate mb-1">
            {title}
          </p>

          {/* Value + Trend row */}
          <div className="flex items-end gap-2 flex-wrap">
            <span className="text-2xl font-bold text-foreground leading-none">
              {value}
            </span>
            {trend && <TrendBadge trend={trend} />}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Bottom accent bar */}
      <div
        className="mt-4 h-0.5 rounded-full opacity-40"
        style={{ backgroundColor: accentColor }}
      />
    </motion.div>
  )
}

export default KPICard
