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
import { resolvePreset } from '../lib/dateUtils'
import { TrendChart } from '../components/charts/TrendChart'
import { PassFailDonut } from '../components/charts/PassFailDonut'

type PresetOption = {
  id: 'all' | 'last90' | 'last30'
  label: string
}

const presetOptions: PresetOption[] = [
  { id: 'all', label: 'All' },
  { id: 'last90', label: '3M' },
  { id: 'last30', label: '12M' },
]

function formatDateInput(value: string) {
  return value
}

function formatDisplayDate(value: string) {
  try {
    return format(parseISO(value), 'MMM d, yyyy')
  } catch {
    return value
  }
}

function rankGradient(index: number) {
  if (index === 0) return 'from-[#ffbe55] to-[#ff7f36]'
  if (index === 1) return 'from-[#d7dce7] to-[#a9b4c8]'
  return 'from-[#f3a85d] to-[#ef7f3b]'
}

function InsightCard({
  title,
  children,
  action,
}: {
  title: string
  children: React.ReactNode
  action?: string
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-[1.15rem] font-extrabold tracking-[-0.02em] text-slate-900">{title}</h3>
        {action && <button className="text-sm font-semibold text-[#ff2138]">{action}</button>}
      </div>
      {children}
    </section>
  )
}

function KpiCard({
  title,
  value,
  icon,
  footer,
}: {
  title: string
  value: string
  icon: React.ReactNode
  footer: string
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 text-[1.02rem] font-bold text-slate-900">{title}</div>
          <div className="text-[3.35rem] font-black leading-none tracking-[-0.05em] text-slate-950">{value}</div>
        </div>
        <div className="mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff1f2] text-[#ff2138]">
          {icon}
        </div>
      </div>
      <div className="mt-5 text-[1rem]">
        <span className="font-bold text-[#10b836]">12%</span>
        <span className="ml-2 font-semibold text-slate-400">{footer}</span>
      </div>
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
  const averageScore = kpis.averageScore ?? 0
  const passRate = kpis.passRate ?? 0
  const activeAdvisors = kpis.activeAdvisors ?? 0
  const totalActivities = kpis.totalActivities ?? 0
  const totalMembers = kpis.totalMembers ?? 0

  const topActivities = useMemo(
    () => [...activityStats].sort((a, b) => b.passRate - a.passRate).slice(0, 5),
    [activityStats],
  )

  const topAdvisors = useMemo(
    () => [...userStats].sort((a, b) => b.avgScore - a.avgScore).slice(0, 3),
    [userStats],
  )

  const weakestActivity = topActivities[topActivities.length - 1]
  const approved = kpis.passCount ?? 0
  const disapproved = kpis.failCount ?? 0

  function handleExport() {
    const rows = filteredSims.map((simulation) => ({
      ID: simulation.ID_Sim,
      Usuario: simulation.Usuario_Nombre,
      Email: simulation.Usuario ?? '',
      Actividad: simulation.Actividad,
      Puntaje: simulation.Calificacion ?? simulation.Puntos_Totales ?? 0,
      Diagnostico: simulation.Diagnostico_Final ?? '',
      Fecha: simulation.Fecha_y_Hora,
    }))

    exportSimulationsCSV(rows, `siigo-dashboard-${effectiveDateFrom}-${effectiveDateTo}.csv`)
  }

  function handlePresetClick(option: PresetOption['id']) {
    setDatePreset(option)
  }

  function handleDateChange(kind: 'from' | 'to', value: string) {
    setDateRange(
      kind === 'from' ? value : (dateFrom ?? effectiveDateFrom),
      kind === 'to' ? value : (dateTo ?? effectiveDateTo),
    )
  }

  const filterSummary =
    language === 'es'
      ? `Tu equipo ha completado ${totalSimulations.toLocaleString()} simulaciones en este periodo.`
      : `Your team has completed ${totalSimulations.toLocaleString()} simulations in this period.`

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-8 rounded-[34px] bg-[#f7f9fc]">
        <div className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="pt-3">
            <h2 className="text-[3rem] font-black tracking-[-0.06em] text-slate-950">Welcome your dashboard</h2>
            <p className="mt-2 text-[2rem] font-medium tracking-[-0.04em] text-slate-300">{filterSummary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            <div className="flex items-center gap-3 rounded-full">
              {presetOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handlePresetClick(option.id)}
                  className={[
                    'rounded-xl px-5 py-3 text-sm font-bold transition',
                    datePreset === option.id
                      ? 'bg-[#ff2138] text-white shadow-[0_14px_32px_rgba(255,33,56,0.28)]'
                      : 'bg-white text-slate-400 shadow-[0_8px_24px_rgba(15,23,42,0.03)]',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
              <CalendarRange className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={formatDateInput(dateFrom ?? effectiveDateFrom)}
                onChange={(event) => handleDateChange('from', event.target.value)}
                className="border-none bg-transparent text-sm font-semibold text-slate-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
              <CalendarRange className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={formatDateInput(dateTo ?? effectiveDateTo)}
                onChange={(event) => handleDateChange('to', event.target.value)}
                className="border-none bg-transparent text-sm font-semibold text-slate-500 outline-none"
              />
            </div>

            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-400 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
              Advisors
            </div>

            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff2138] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(255,33,56,0.25)] transition hover:brightness-105"
            >
              <Download className="h-4 w-4" />
              Export All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard title="Total Simulations" value={totalSimulations.toLocaleString()} icon={<LineChart className="h-6 w-6" />} footer="vs previos month" />
          <KpiCard title="Average Score" value={`${averageScore.toFixed(0)}%`} icon={<LineChart className="h-6 w-6" />} footer="vs previos month" />
          <KpiCard title="Approval Rate" value={`${passRate.toFixed(0)}`} icon={<CheckCircle2 className="h-6 w-6" />} footer="vs previos month" />
          <KpiCard title="Active Advisors" value={activeAdvisors.toLocaleString()} icon={<Users className="h-6 w-6" />} footer="vs previos month" />
          <KpiCard title="Avaible Activities" value={totalActivities.toLocaleString()} icon={<Grid2X2 className="h-6 w-6" />} footer="vs previos month" />
          <KpiCard title="Members" value={totalMembers.toLocaleString()} icon={<UserRound className="h-6 w-6" />} footer="vs previos month" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.65fr_0.95fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[1.15rem] font-extrabold tracking-[-0.02em] text-slate-900">Score Trend</h3>
            <div className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500">
              Daily
            </div>
          </div>
          <TrendChart data={trend} height={320} />
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
          <div className="mb-4 text-[1.15rem] font-extrabold tracking-[-0.02em] text-slate-900">
            Approval vs. Disapproval
          </div>
          <div className="grid gap-4 xl:grid-cols-[0.95fr_0.85fr] xl:items-center">
            <PassFailDonut passCount={approved} failCount={disapproved} />
            <div className="space-y-4">
              <div className="rounded-[22px] border border-slate-200 p-5">
                <div className="flex items-start gap-3">
                  <CircleCheck className="mt-0.5 h-5 w-5 text-[#ff2138]" />
                  <div className="flex-1">
                    <div className="text-[1.02rem] font-bold text-slate-700">Approved</div>
                    <div className="mt-2 flex items-end justify-between">
                      <div className="text-[2rem] font-black tracking-[-0.04em] text-slate-950">{approved}</div>
                      <div className="text-sm font-bold text-slate-400">{passRate.toFixed(0)}%</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-200 p-5">
                <div className="flex items-start gap-3">
                  <CircleX className="mt-0.5 h-5 w-5 text-[#ff9aa6]" />
                  <div className="flex-1">
                    <div className="text-[1.02rem] font-bold text-slate-700">Disapproved</div>
                    <div className="mt-2 flex items-end justify-between">
                      <div className="text-[2rem] font-black tracking-[-0.04em] text-slate-950">{disapproved}</div>
                      <div className="text-sm font-bold text-slate-400">{(100 - passRate).toFixed(0)}%</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-center text-[1.02rem] font-semibold text-slate-500">
                Total: {totalSimulations.toLocaleString()} simulations
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <InsightCard title="Activity Breakdown">
          <div className="space-y-4">
            {topActivities.map((activity) => (
              <div key={`${activity.id}-${activity.name}`}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="truncate text-[1rem] font-semibold text-slate-700">{activity.name}</div>
                  <div className="text-sm font-bold text-slate-500">{activity.passRate.toFixed(0)}%</div>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-[linear-gradient(90deg,#ff1e35,#ff5066)]"
                    style={{ width: `${Math.min(100, activity.passRate)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button className="mt-6 w-full rounded-2xl border border-[#ffb7c0] px-4 py-3 text-sm font-bold text-[#ff2138] transition hover:bg-[#fff5f6]">
            View all activities
          </button>
        </InsightCard>

        <InsightCard title="Top Advisors" action="View all">
          <div className="space-y-5">
            {topAdvisors.map((advisor, index) => (
              <div key={`${advisor.userId ?? advisor.name}-${index}`} className="flex items-center gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${rankGradient(index)} text-base font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.12)]`}>
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[1rem] font-bold text-slate-900">{advisor.name}</div>
                  <div className="text-sm font-medium text-slate-400">{advisor.count} simulations</div>
                </div>
                <div className="text-right">
                  <div className="text-[1.8rem] font-black tracking-[-0.04em] text-slate-950">{advisor.avgScore.toFixed(0)}%</div>
                  <div className="text-sm font-semibold text-[#10b836]">↑ {advisor.passRate.toFixed(0)}% Approved</div>
                </div>
              </div>
            ))}
          </div>
        </InsightCard>

        <InsightCard title="AI Insights" action="View all">
          <div className="space-y-4">
            <div className="rounded-[20px] bg-[#fff3f4] p-5">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 rounded-2xl bg-white p-2 text-[#ff2138] shadow-sm">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-700">
                    73% of advisors struggle with
                  </div>
                  <div className="mt-1 text-[1.45rem] font-black tracking-[-0.03em] text-[#ff2138]">
                    {weakestActivity?.name ?? 'Handling Objections'}.
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[20px] bg-[#fffaf4] p-5">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 rounded-2xl bg-white p-2 text-[#ffb01d] shadow-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-500">Recommendation</div>
                  <div className="mt-2 text-[1.05rem] font-semibold leading-7 text-slate-700">
                    Assign simulation "{weakestActivity?.name ?? 'Objections Level 2'}" to your team.
                  </div>
                </div>
              </div>

              <button className="mt-5 rounded-2xl border border-[#ffb7c0] px-5 py-3 text-sm font-bold text-[#ff2138] transition hover:bg-white">
                View recommendation
              </button>
            </div>
          </div>
        </InsightCard>
      </div>

      {!isLoading && (
        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-slate-500 shadow-[0_14px_40px_rgba(15,23,42,0.03)]">
          Showing data from {formatDisplayDate(effectiveDateFrom)} to {formatDisplayDate(effectiveDateTo)}
        </div>
      )}
    </div>
  )
}
