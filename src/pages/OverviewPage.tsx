import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlayCircle,
  TrendingUp,
  CheckCircle,
  Users,
  ThumbsUp,
  ThumbsDown,
  Star,
  Download,
  BarChart2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertCircle,
} from 'lucide-react'

import useDashboardData from '../hooks/useDashboardData'
import { useAppStore } from '../store/index'
import { t } from '../lib/i18n'
import { KPICard } from '../components/ui/KPICard'
import { ChartSkeleton, KPICardSkeleton } from '../components/ui/Skeleton'
import { TrendChart } from '../components/charts/TrendChart'
import { PassFailDonut } from '../components/charts/PassFailDonut'
import { ScoreHistogram } from '../components/charts/ScoreHistogram'
import { ActivityBar } from '../components/charts/ActivityBar'
import { exportSimulationsCSV } from '../lib/csvExport'
import type { UserStat } from '../api/types'

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// ─── Date preset config ───────────────────────────────────────────────────────

type DatePresetId = 'today' | 'last7' | 'last30' | 'last90' | 'all'

interface DatePill {
  id: DatePresetId
  labelKey: string
}

const DATE_PILLS: DatePill[] = [
  { id: 'today',  labelKey: 'today' },
  { id: 'last7',  labelKey: 'lastWeek' },
  { id: 'last30', labelKey: 'lastMonth' },
  { id: 'last90', labelKey: 'last3Months' },
  { id: 'all',    labelKey: 'allTime' },
]

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type SortField = 'name' | 'count' | 'avgScore' | 'passRate' | 'bestScore' | 'passCount'
type SortDir   = 'asc' | 'desc'

function sortUserStats(data: UserStat[], field: SortField, dir: SortDir): UserStat[] {
  return [...data].sort((a, b) => {
    const av = a[field] as string | number
    const bv = b[field] as string | number
    if (typeof av === 'string' && typeof bv === 'string') {
      return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    }
    const an = av as number
    const bn = bv as number
    return dir === 'asc' ? an - bn : bn - an
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={itemVariants}
      className={`rounded-xl bg-card border border-border/50 shadow-sm p-5 ${className}`}
    >
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        {title}
      </h2>
      {children}
    </motion.div>
  )
}

function SortIcon({
  field,
  active,
  dir,
}: {
  field: SortField
  active: SortField
  dir: SortDir
}) {
  if (field !== active) {
    return <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/40" />
  }
  return dir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-primary" />
    : <ChevronDown className="w-3.5 h-3.5 text-primary" />
}

function EmptyState({ lang }: { lang: 'es' | 'en' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-24 text-center gap-5"
    >
      {/* Simple illustration using SVG */}
      <svg
        width="96"
        height="96"
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="48" cy="48" r="48" fill="rgba(0,102,255,0.08)" />
        <rect x="28" y="36" width="40" height="28" rx="4" fill="rgba(0,102,255,0.15)" stroke="#0066FF" strokeWidth="1.5" />
        <rect x="34" y="44" width="16" height="3" rx="1.5" fill="#0066FF" opacity="0.6" />
        <rect x="34" y="51" width="28" height="3" rx="1.5" fill="#0066FF" opacity="0.4" />
        <rect x="34" y="58" width="20" height="3" rx="1.5" fill="#0066FF" opacity="0.3" />
        <circle cx="62" cy="34" r="10" fill="#0066FF" opacity="0.12" stroke="#0066FF" strokeWidth="1.5" />
        <line x1="62" y1="30" x2="62" y2="38" stroke="#0066FF" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="58" y1="34" x2="66" y2="34" stroke="#0066FF" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      <div className="flex flex-col gap-1.5">
        <p className="text-lg font-semibold text-foreground">
          {t('noSimulations', lang)}
        </p>
        <p className="text-sm text-muted-foreground max-w-xs">
          {lang === 'es'
            ? 'Las simulaciones aparecerán aquí una vez que los asesores comiencen a entrenar.'
            : 'Simulations will appear here once advisors start training.'}
        </p>
      </div>
    </motion.div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const language   = useAppStore((s) => s.language)
  const datePreset = useAppStore((s) => s.datePreset)
  const setDatePreset = useAppStore((s) => s.setDatePreset)

  const {
    kpis,
    trend,
    scoreDistribution,
    userStats,
    activityStats,
    filteredSims,
    isLoading,
    isError,
    error,
    effectiveDateFrom,
    effectiveDateTo,
  } = useDashboardData()

  // ── Sort state for top performers table ──────────────────────────────────
  const [sortField, setSortField] = useState<SortField>('avgScore')
  const [sortDir,   setSortDir]   = useState<SortDir>('desc')

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const top10 = useMemo(
    () => sortUserStats(userStats, sortField, sortDir).slice(0, 10),
    [userStats, sortField, sortDir],
  )

  // ── CSV export ────────────────────────────────────────────────────────────
  function handleExportCSV() {
    const rows = filteredSims.map(s => ({
      ID:                s.ID_Sim,
      Usuario_Nombre:    s.Usuario_Nombre,
      Usuario_Email:     s.Usuario ?? '',
      Actividad:         s.Actividad,
      Calificacion:      s.Calificacion,
      Diagnostico_Final: s.Diagnostico_Final,
      Fecha:             s.Fecha_y_Hora,
    }))
    exportSimulationsCSV(rows, `siigo-dashboard-${effectiveDateFrom}-${effectiveDateTo}.csv`)
  }

  // ── Derived trend for avg score (compare last two points) ────────────────
  const scoreTrend = useMemo(() => {
    if (trend.length < 2) return undefined
    const prev = trend[trend.length - 2].avgScore
    const curr = trend[trend.length - 1].avgScore
    const diff = Math.abs(curr - prev)
    return {
      value:     Math.round(diff),
      direction: curr > prev ? 'up' : curr < prev ? 'down' : 'flat',
    } as { value: number; direction: 'up' | 'down' | 'flat' }
  }, [trend])

  const passRateColor = kpis.passRate >= 70 ? 'green' : 'red'

  const isEmpty = !isLoading && filteredSims.length === 0

  // ── Date label for header subtitle ───────────────────────────────────────
  const dateLabel = useMemo(() => {
    const pill = DATE_PILLS.find(p => p.id === (datePreset as DatePresetId))
    return pill ? t(pill.labelKey, language) : `${effectiveDateFrom} — ${effectiveDateTo}`
  }, [datePreset, language, effectiveDateFrom, effectiveDateTo])

  // ── Error state ───────────────────────────────────────────────────────────
  if (isError && error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-base font-medium text-foreground">{t('error', language)}</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-10">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Dashboard SIIGO
          </h1>
          <p className="text-sm text-muted-foreground">
            {dateLabel}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Date filter pills */}
          <div className="flex items-center gap-1.5 bg-muted/60 rounded-lg p-1">
            {DATE_PILLS.map(pill => (
              <button
                key={pill.id}
                onClick={() => setDatePreset(pill.id)}
                className={[
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                  datePreset === pill.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/80',
                ].join(' ')}
              >
                {t(pill.labelKey, language)}
              </button>
            ))}
          </div>

          {/* CSV export button */}
          <button
            onClick={handleExportCSV}
            disabled={filteredSims.length === 0}
            className={[
              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium',
              'border border-border/70 bg-card hover:bg-muted/60 transition-colors duration-150',
              'text-muted-foreground hover:text-foreground',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            <Download className="w-3.5 h-3.5" />
            {t('exportCsv', language)}
          </button>
        </div>
      </motion.div>

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {isEmpty && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <EmptyState lang={language} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content (hidden when empty, shown when loading or has data) ───── */}
      {!isEmpty && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6"
        >

          {/* ── KPI row 1 (4 cards) ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <KPICardSkeleton key={i} />
              ))
            ) : (
              <>
                <motion.div variants={itemVariants}>
                  <KPICard
                    title={t('totalSimulations', language)}
                    value={kpis.totalSimulations.toLocaleString()}
                    icon={PlayCircle}
                    color="blue"
                    subtitle={`${kpis.totalActivities} ${t('activities', language).toLowerCase()}`}
                  />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <KPICard
                    title={t('averageScore', language)}
                    value={`${kpis.averageScore.toFixed(1)}%`}
                    icon={TrendingUp}
                    color="green"
                    trend={scoreTrend}
                    subtitle={trend.length > 1 ? `${t('trend', language)}` : undefined}
                  />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <KPICard
                    title={t('passRate', language)}
                    value={`${kpis.passRate.toFixed(1)}%`}
                    icon={CheckCircle}
                    color={passRateColor}
                    subtitle={`${kpis.passCount} ${t('pass', language).toLowerCase()} / ${kpis.failCount} ${t('fail', language).toLowerCase()}`}
                  />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <KPICard
                    title={t('activeAdvisors', language)}
                    value={kpis.activeAdvisors.toLocaleString()}
                    icon={Users}
                    color="violet"
                    subtitle={`${kpis.totalMembers} ${t('totalMembers', language).toLowerCase()}`}
                  />
                </motion.div>
              </>
            )}
          </div>

          {/* ── KPI row 2 (3 cards) ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <KPICardSkeleton key={i} />
              ))
            ) : (
              <>
                <motion.div variants={itemVariants}>
                  <KPICard
                    title={t('passCount', language)}
                    value={kpis.passCount.toLocaleString()}
                    icon={ThumbsUp}
                    color="green"
                  />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <KPICard
                    title={t('failCount', language)}
                    value={kpis.failCount.toLocaleString()}
                    icon={ThumbsDown}
                    color="red"
                  />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <KPICard
                    title={t('bestScore', language)}
                    value={`${kpis.bestScore.toFixed(0)}%`}
                    icon={Star}
                    color="amber"
                  />
                </motion.div>
              </>
            )}
          </div>

          {/* ── Trend chart (full width) ──────────────────────────────────── */}
          <SectionCard title={t('trend', language)}>
            {isLoading
              ? <ChartSkeleton height={260} />
              : <TrendChart data={trend} height={260} />
            }
          </SectionCard>

          {/* ── Two-column: donut + histogram ─────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title={t('passFailRatio', language)}>
              {isLoading
                ? <ChartSkeleton height={220} />
                : (
                  <PassFailDonut
                    passCount={kpis.passCount}
                    failCount={kpis.failCount}
                  />
                )
              }
            </SectionCard>

            <SectionCard title={t('scoreDistribution', language)}>
              {isLoading
                ? <ChartSkeleton height={220} />
                : <ScoreHistogram data={scoreDistribution} />
              }
            </SectionCard>
          </div>

          {/* ── Activity performance bar ──────────────────────────────────── */}
          <SectionCard title={t('activityBreakdown', language)}>
            {isLoading
              ? <ChartSkeleton height={300} />
              : <ActivityBar data={activityStats} />
            }
          </SectionCard>

          {/* ── Top performers table ───────────────────────────────────────── */}
          <SectionCard title={t('topPerformers', language)}>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-md bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : top10.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <BarChart2 className="w-8 h-8 opacity-40" />
                <p className="text-sm">{t('noData', language)}</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      {(
                        [
                          { key: 'rank',      label: t('rank', language),     field: null },
                          { key: 'name',      label: t('name', language),     field: 'name'      as SortField },
                          { key: 'count',     label: t('attempts', language), field: 'count'     as SortField },
                          { key: 'avgScore',  label: t('averageScore', language).split(' ')[0],  field: 'avgScore'  as SortField },
                          { key: 'passRate',  label: t('passRate', language).split(' ')[0],      field: 'passRate'  as SortField },
                          { key: 'bestScore', label: t('bestScore', language).split(' ')[0],     field: 'bestScore' as SortField },
                          { key: 'passCount', label: t('passCount', language), field: 'passCount' as SortField },
                        ] as { key: string; label: string; field: SortField | null }[]
                      ).map(col => (
                        <th
                          key={col.key}
                          onClick={() => col.field && handleSort(col.field)}
                          className={[
                            'px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap',
                            col.field ? 'cursor-pointer select-none hover:text-foreground transition-colors' : '',
                          ].join(' ')}
                        >
                          <div className="inline-flex items-center gap-1">
                            {col.label}
                            {col.field && (
                              <SortIcon field={col.field} active={sortField} dir={sortDir} />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {top10.map((user, idx) => {
                      const isTopThree = idx < 3
                      return (
                        <motion.tr
                          key={user.userId ?? user.name}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04, duration: 0.25 }}
                          className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                        >
                          {/* Rank */}
                          <td className="px-3 py-3 text-muted-foreground font-medium w-12">
                            {isTopThree ? (
                              <span
                                className={[
                                  'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                                  idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                                  idx === 1 ? 'bg-slate-400/20 text-slate-300' :
                                              'bg-amber-700/20 text-amber-600',
                                ].join(' ')}
                              >
                                {idx + 1}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">{idx + 1}</span>
                            )}
                          </td>

                          {/* Name */}
                          <td className="px-3 py-3 font-medium text-foreground max-w-[180px]">
                            <span className="block truncate">{user.name}</span>
                          </td>

                          {/* Attempts */}
                          <td className="px-3 py-3 text-muted-foreground tabular-nums">
                            {user.count}
                          </td>

                          {/* Avg score */}
                          <td className="px-3 py-3 tabular-nums">
                            <span
                              className={
                                user.avgScore >= 70
                                  ? 'text-green-500 font-semibold'
                                  : 'text-red-400 font-semibold'
                              }
                            >
                              {user.avgScore.toFixed(1)}
                            </span>
                          </td>

                          {/* Pass rate */}
                          <td className="px-3 py-3 tabular-nums">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${user.passRate >= 70 ? 'bg-green-500' : 'bg-red-400'}`}
                                  style={{ width: `${Math.min(100, user.passRate)}%` }}
                                />
                              </div>
                              <span className={user.passRate >= 70 ? 'text-green-500' : 'text-red-400'}>
                                {user.passRate.toFixed(0)}%
                              </span>
                            </div>
                          </td>

                          {/* Best score */}
                          <td className="px-3 py-3 text-amber-400 font-semibold tabular-nums">
                            {user.bestScore.toFixed(0)}
                          </td>

                          {/* Pass count */}
                          <td className="px-3 py-3 text-muted-foreground tabular-nums">
                            <span className="text-green-500">{user.passCount}</span>
                            <span className="text-muted-foreground/50 mx-0.5">/</span>
                            <span>{user.count}</span>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

        </motion.div>
      )}
    </div>
  )
}
