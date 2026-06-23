import { useMemo } from 'react'
import {
  CheckCircle2,
  Download,
  Grid2X2,
  LineChart,
  Users,
  UserRound,
  CalendarRange,
  CircleCheck,
  CircleX,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import useDashboardData from '../hooks/useDashboardData'
import { useAppStore } from '../store/index'
import { exportSimulationsCSV } from '../lib/csvExport'
import { TrendChart } from '../components/charts/TrendChart'
import { PassFailDonut } from '../components/charts/PassFailDonut'
import { t } from '../lib/i18n'

type PresetId = 'all' | 'last90' | 'last30'

const PRESET_LABELS: Record<PresetId, { es: string; en: string }> = {
  all:    { es: 'Todo',  en: 'All' },
  last90: { es: '3M',   en: '3M'  },
  last30: { es: '30D',  en: '30D' },
}

function formatDisplayDate(value: string) {
  try { return format(parseISO(value), 'MMM d, yyyy') }
  catch { return value }
}

function rankGradient(index: number) {
  if (index === 0) return 'from-[#ffbe55] to-[#ff7f36]'
  if (index === 1) return 'from-[#d7dce7] to-[#a9b4c8]'
  return 'from-[#f3a85d] to-[#ef7f3b]'
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={[
        'rounded-[28px] border border-[var(--color-line)] bg-[var(--color-card)]',
        'p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.25)]',
        className,
      ].join(' ')}
    >
      {children}
    </section>
  )
}

function KpiCard({
  title,
  value,
  icon,
  sub,
}: {
  title: string
  value: string
  icon: React.ReactNode
  sub?: string
}) {
  return (
    <div className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-card)] px-5 py-4 shadow-[0_8px_32px_rgba(15,23,42,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</div>
          <div className="text-[2.4rem] font-black leading-none tracking-[-0.05em] text-slate-950 dark:text-white">{value}</div>
        </div>
        <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff1f2] dark:bg-[#3b0d13] text-[#ff2138]">
          {icon}
        </div>
      </div>
      {sub && (
        <div className="mt-3 text-xs font-medium text-slate-400 dark:text-slate-500">{sub}</div>
      )}
    </div>
  )
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h3>
      {action && (
        <button
          onClick={onAction}
          className="text-xs font-semibold text-[#0066FF] dark:text-blue-400 hover:underline"
        >
          {action}
        </button>
      )}
    </div>
  )
}

function EmptyInsight({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-slate-400 dark:text-slate-500">
      <Sparkles className="mb-3 h-8 w-8 opacity-30" />
      {message}
    </div>
  )
}

export default function OverviewPage() {
  const language = useAppStore((state) => state.language)
  const datePreset = useAppStore((state) => state.datePreset)
  const setDatePreset = useAppStore((state) => state.setDatePreset)
  const dateFrom = useAppStore((state) => state.dateFrom)
  const dateTo = useAppStore((state) => state.dateTo)
  const setDateRange = useAppStore((state) => state.setDateRange)

  const {
    kpis,
    trend,
    activityStats,
    userStats,
    filteredSims,
    effectiveDateFrom,
    effectiveDateTo,
    isLoading,
  } = useDashboardData()

  const totalSimulations = kpis.totalSimulations ?? 0
  const averageScore    = kpis.averageScore ?? 0
  const passRate        = kpis.passRate ?? 0
  const activeAdvisors  = kpis.activeAdvisors ?? 0
  const totalActivities = kpis.totalActivities ?? 0
  const totalMembers    = kpis.totalMembers ?? 0
  const approved        = kpis.passCount ?? 0
  const disapproved     = kpis.failCount ?? 0

  const topActivities = useMemo(
    () => [...activityStats].sort((a, b) => b.passRate - a.passRate).slice(0, 5),
    [activityStats],
  )

  const topAdvisors = useMemo(
    () => [...userStats].sort((a, b) => b.avgScore - a.avgScore).slice(0, 3),
    [userStats],
  )

  const weakestActivity = topActivities.length > 0
    ? topActivities[topActivities.length - 1]
    : null

  function handleExport() {
    const rows = filteredSims.map((simulation) => ({
      ID:         simulation.ID_Sim,
      Usuario:    simulation.Usuario_Nombre,
      Email:      simulation.Usuario ?? '',
      Actividad:  simulation.Actividad,
      Puntaje:    simulation.Calificacion ?? simulation.Puntos_Totales ?? 0,
      Diagnostico:simulation.Diagnostico_Final ?? '',
      Fecha:      simulation.Fecha_y_Hora,
    }))
    exportSimulationsCSV(rows, `siigo-dashboard-${effectiveDateFrom}-${effectiveDateTo}.csv`)
  }

  function handleDateChange(kind: 'from' | 'to', value: string) {
    setDateRange(
      kind === 'from' ? value : (dateFrom ?? effectiveDateFrom),
      kind === 'to'   ? value : (dateTo   ?? effectiveDateTo),
    )
  }

  const filterSummary = totalSimulations > 0
    ? `${t('teamCompletedPre', language)} ${totalSimulations.toLocaleString()} ${t('teamCompletedPost', language)}`
    : t('noDataPeriod', language)

  const hasData = totalSimulations > 0

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="rounded-[28px] border border-[var(--color-line)] bg-[var(--color-card)] p-6 shadow-[0_8px_32px_rgba(15,23,42,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              {t('welcomeTitle', language)}
            </h2>
            <p className="mt-1.5 text-sm font-medium text-slate-400 dark:text-slate-500">{filterSummary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Preset buttons */}
            {(['all', 'last90', 'last30'] as PresetId[]).map((id) => (
              <button
                key={id}
                onClick={() => setDatePreset(id)}
                className={[
                  'rounded-xl px-4 py-2 text-xs font-bold transition',
                  datePreset === id
                    ? 'bg-[#0066FF] text-white shadow-[0_8px_20px_rgba(0,102,255,0.3)]'
                    : 'border border-[var(--color-line)] bg-[var(--color-bg-alt)] text-slate-500 dark:text-slate-400',
                ].join(' ')}
              >
                {PRESET_LABELS[id][language]}
              </button>
            ))}

            {/* Date range pickers */}
            <div className="flex items-center gap-1.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-alt)] px-3 py-2">
              <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={dateFrom ?? effectiveDateFrom}
                onChange={(e) => handleDateChange('from', e.target.value)}
                className="border-none bg-transparent text-xs font-semibold text-slate-600 dark:text-slate-300 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-alt)] px-3 py-2">
              <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={dateTo ?? effectiveDateTo}
                onChange={(e) => handleDateChange('to', e.target.value)}
                className="border-none bg-transparent text-xs font-semibold text-slate-600 dark:text-slate-300 outline-none"
              />
            </div>

            {/* Export */}
            <button
              onClick={handleExport}
              disabled={!hasData}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-4 py-2 text-xs font-bold text-white shadow-[0_8px_20px_rgba(0,102,255,0.25)] transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="h-3.5 w-3.5" />
              {t('exportAll', language)}
            </button>
          </div>
        </div>

        {/* ── KPI Grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            title={t('totalSimulations', language)}
            value={totalSimulations.toLocaleString()}
            icon={<LineChart className="h-5 w-5" />}
            sub={hasData ? undefined : t('noDataPeriod', language)}
          />
          <KpiCard
            title={t('averageScore', language)}
            value={hasData ? `${averageScore.toFixed(1)}%` : '—'}
            icon={<LineChart className="h-5 w-5" />}
          />
          <KpiCard
            title={t('passRate', language)}
            value={hasData ? `${passRate.toFixed(1)}%` : '—'}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <KpiCard
            title={t('activeAdvisors', language)}
            value={activeAdvisors.toLocaleString()}
            icon={<Users className="h-5 w-5" />}
          />
          <KpiCard
            title={t('totalActivities', language)}
            value={totalActivities.toLocaleString()}
            icon={<Grid2X2 className="h-5 w-5" />}
          />
          <KpiCard
            title={t('totalMembers', language)}
            value={totalMembers.toLocaleString()}
            icon={<UserRound className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* ── Charts row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.65fr_0.95fr]">
        <Card>
          <SectionHeader
            title={t('scoreTrend', language)}
            action={t('daily', language)}
          />
          {hasData ? (
            <TrendChart data={trend} height={300} />
          ) : (
            <EmptyInsight message={t('noDataPeriod', language)} />
          )}
        </Card>

        <Card>
          <SectionHeader title={t('approvalVsDisapproval', language)} />
          {hasData ? (
            <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr] xl:items-center">
              <PassFailDonut passCount={approved} failCount={disapproved} />
              <div className="space-y-3">
                <div className="rounded-[18px] border border-[var(--color-line)] bg-[var(--color-bg-alt)] p-4">
                  <div className="flex items-start gap-3">
                    <CircleCheck className="mt-0.5 h-4 w-4 text-[#10B981]" />
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('approved', language)}</div>
                      <div className="mt-1.5 flex items-end justify-between">
                        <div className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{approved}</div>
                        <div className="text-xs font-bold text-slate-400">{passRate.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[18px] border border-[var(--color-line)] bg-[var(--color-bg-alt)] p-4">
                  <div className="flex items-start gap-3">
                    <CircleX className="mt-0.5 h-4 w-4 text-[#EF4444]" />
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('disapproved', language)}</div>
                      <div className="mt-1.5 flex items-end justify-between">
                        <div className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{disapproved}</div>
                        <div className="text-xs font-bold text-slate-400">{(100 - passRate).toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-1 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                  {t('totalLabel', language)}: {totalSimulations.toLocaleString()} {t('simulationsWord', language)}
                </div>
              </div>
            </div>
          ) : (
            <EmptyInsight message={t('noDataPeriod', language)} />
          )}
        </Card>
      </div>

      {/* ── Bottom row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Activity Breakdown */}
        <Card>
          <SectionHeader title={t('activityBreakdown', language)} />
          {topActivities.length > 0 ? (
            <div className="space-y-3">
              {topActivities.map((activity) => (
                <div key={`${activity.id}-${activity.name}`}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{activity.name}</div>
                    <div className="shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400">{activity.passRate.toFixed(0)}%</div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-[var(--color-line)]">
                    <div
                      className="h-2 rounded-full bg-[linear-gradient(90deg,#0066FF,#3b82f6)]"
                      style={{ width: `${Math.min(100, Math.max(0, activity.passRate))}%` }}
                    />
                  </div>
                </div>
              ))}
              <button className="mt-4 w-full rounded-2xl border border-[var(--color-line)] px-4 py-2.5 text-xs font-bold text-[#0066FF] dark:text-blue-400 transition hover:bg-[var(--color-bg-alt)]">
                {t('viewAllActivities', language)}
              </button>
            </div>
          ) : (
            <EmptyInsight message={t('noDataAnalysis', language)} />
          )}
        </Card>

        {/* Top Advisors */}
        <Card>
          <SectionHeader title={t('topPerformers', language)} action={t('viewAll', language)} />
          {topAdvisors.length > 0 ? (
            <div className="space-y-4">
              {topAdvisors.map((advisor, index) => (
                <div key={`${advisor.userId ?? advisor.name}-${index}`} className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${rankGradient(index)} text-sm font-black text-white shadow`}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{advisor.name}</div>
                    <div className="text-xs font-medium text-slate-400">{advisor.count} {t('simulationsWord', language)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{advisor.avgScore.toFixed(0)}%</div>
                    <div className="text-xs font-semibold text-[#10B981]">↑ {advisor.passRate.toFixed(0)}%</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyInsight message={t('noDataPeriod', language)} />
          )}
        </Card>

        {/* AI Insights */}
        <Card>
          <SectionHeader title={t('aiInsights', language)} />
          {weakestActivity ? (
            <div className="space-y-3">
              <div className="rounded-[16px] bg-[#fff3f4] dark:bg-[#3b0d13]/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-white dark:bg-[#3b0d13] p-1.5 text-[#ff2138] shadow-sm">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      {language === 'es'
                        ? `La actividad con menor aprobación es:`
                        : `Lowest approval rate activity:`}
                    </div>
                    <div className="mt-1 text-base font-black tracking-tight text-[#ff2138]">
                      {weakestActivity.name}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {weakestActivity.passRate.toFixed(0)}% {t('passRate', language).toLowerCase()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[16px] bg-[#fffaf4] dark:bg-[#2a1f00]/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-white dark:bg-[#2a1f00] p-1.5 text-[#ffb01d] shadow-sm">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-400">{t('recommendation', language)}</div>
                    <div className="mt-1 text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-200">
                      {language === 'es'
                        ? `Asigna más práctica de "${weakestActivity.name}" al equipo para mejorar la tasa de aprobación.`
                        : `Assign more practice of "${weakestActivity.name}" to the team to improve the pass rate.`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyInsight message={t('waitingInsights', language)} />
          )}
        </Card>
      </div>

      {/* ── Footer date range ──────────────────────────────────────────────── */}
      {!isLoading && (
        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-card)] px-5 py-3 text-xs font-medium text-slate-400 dark:text-slate-500">
          {t('showingDataFrom', language)} {formatDisplayDate(effectiveDateFrom)} {t('showingDataTo', language)} {formatDisplayDate(effectiveDateTo)}
        </div>
      )}
    </div>
  )
}
