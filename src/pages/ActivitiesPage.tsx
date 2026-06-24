import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import useAppStore from '../store'
import { t } from '../lib/i18n'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import {
  LayoutGrid,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Activity,
  BarChart2,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import useDashboardData from '../hooks/useDashboardData'
import type { ActivityStat, TrendPoint } from '../api/types'
import { PASS_THRESHOLD } from '../config/constants'

// ─── Design tokens ────────────────────────────────────────────────────────────

const SIIGO_BLUE  = '#0061ff'
const GREEN       = '#22c55e'
const AMBER       = '#F59E0B'
const RED         = '#EF4444'
const MUTED       = 'var(--color-muted)'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function performanceColor(passRate: number): string {
  if (passRate >= 80) return GREEN
  if (passRate >= PASS_THRESHOLD) return SIIGO_BLUE
  if (passRate >= 40) return AMBER
  return RED
}

function performanceLabel(passRate: number, lang: 'es' | 'en' = 'en'): string {
  if (passRate >= 80) return t('strongStatus', lang)
  if (passRate >= PASS_THRESHOLD) return t('onTrackStatus', lang)
  if (passRate >= 40) return t('developingStatus', lang)
  return t('atRiskStatus', lang)
}

function fmt1(n: number): string {
  return n.toFixed(1)
}

function truncate(str: string, max = 28): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string
  subtitle?: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-line)',
        borderRadius: 16,
        padding: '20px 24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'rgba(0,97,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon style={{ width: 18, height: 18, color: SIIGO_BLUE }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-fg)' }}>
            {title}
          </p>
          {subtitle && (
            <p style={{ margin: 0, fontSize: 12, color: '#64748b', marginTop: 1 }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </motion.div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        height: 220,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        color: MUTED,
        fontSize: 14,
      }}
    >
      <BarChart2 style={{ width: 36, height: 36, opacity: 0.4 }} />
      <span>{message}</span>
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-line)',
        borderRadius: 16,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{ height: 14, width: '40%', borderRadius: 6, background: 'var(--color-line)', animation: 'pulse 1.5s infinite' }}
      />
      <div
        style={{ height: 32, width: '60%', borderRadius: 6, background: 'var(--color-line)', animation: 'pulse 1.5s infinite' }}
      />
      <div
        style={{ height: 8, width: '80%', borderRadius: 6, background: 'var(--color-line)', animation: 'pulse 1.5s infinite' }}
      />
    </div>
  )
}

// ─── Activity summary card ────────────────────────────────────────────────────

function ActivitySummaryCard({ stat, language }: { stat: ActivityStat; language: 'es' | 'en' }) {
  const color = performanceColor(stat.passRate ?? 0)
  const label = performanceLabel(stat.passRate ?? 0, language)
  const passRatePct = Math.min(100, Math.max(0, stat.passRate ?? 0))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-line)',
        borderRadius: 16,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-fg)',
              lineHeight: 1.35,
              wordBreak: 'break-word',
            }}
          >
            {stat.name ?? ''}
          </p>
          {stat.activityType && (
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {stat.activityType}
            </p>
          )}
        </div>
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            background: `${color}22`,
            color,
            flexShrink: 0,
            border: `1px solid ${color}44`,
          }}
        >
          {label}
        </span>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
        }}
      >
        <StatBox label={t('sessionsLabel', language)} value={String(stat.count ?? 0)} color="#94a3b8" />
        <StatBox label={t('avgScoreLabel', language)} value={fmt1(stat.avgScore ?? 0)} color={(stat.avgScore ?? 0) >= PASS_THRESHOLD ? SIIGO_BLUE : AMBER} />
        <StatBox label={t('passRateLabel', language)} value={`${fmt1(stat.passRate ?? 0)}%`} color={color} />
      </div>

      {/* Pass/Fail counts */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
          <CheckCircle2 style={{ width: 14, height: 14, color: GREEN }} />
          <span style={{ color: '#94a3b8' }}>{t('passLabel', language)}:</span>
          <span style={{ fontWeight: 700, color: GREEN }}>{stat.passCount ?? 0}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
          <XCircle style={{ width: 14, height: 14, color: RED }} />
          <span style={{ color: '#94a3b8' }}>{t('failLabel', language)}:</span>
          <span style={{ fontWeight: 700, color: RED }}>{stat.failCount ?? 0}</span>
        </div>
      </div>

      {/* Pass rate progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>{t('passRateLabel', language)}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color }}>{fmt1(passRatePct)}%</span>
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 4,
            background: 'var(--color-line)',
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${passRatePct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
            style={{
              height: '100%',
              borderRadius: 4,
              background: color,
            }}
          />
        </div>
        {/* Threshold marker */}
        <div style={{ position: 'relative', height: 12, marginTop: 2 }}>
          <div
            style={{
              position: 'absolute',
              left: `${PASS_THRESHOLD}%`,
              top: 0,
              width: 1,
              height: 8,
              background: MUTED,
              transform: 'translateX(-50%)',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: `${PASS_THRESHOLD}%`,
              top: 8,
              fontSize: 9,
              color: MUTED,
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
            }}
          >
            {PASS_THRESHOLD}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        background: 'var(--color-bg)',
        border: '1px solid var(--color-line)',
        borderRadius: 10,
        padding: '8px 10px',
        textAlign: 'center',
      }}
    >
      <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color }}>{value}</p>
      <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </p>
    </div>
  )
}

// ─── Activity Bar chart (sessions per activity) ───────────────────────────────

function SessionsBarTooltip({ active, payload, label, language }: any) {
  if (!active || !payload?.length) return null
  const stat = payload[0]?.payload as ActivityStat & { shortName: string }
  const lang: 'es' | 'en' = language ?? 'es'
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 13,
        color: 'var(--color-fg)',
        maxWidth: 220,
      }}
    >
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--color-fg)', fontSize: 13 }}>
        {stat?.name ?? label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <TooltipRow color="#94a3b8" label={t('sessionsLabel', lang)}  value={String(stat?.count ?? 0)} />
        <TooltipRow color={SIIGO_BLUE} label={t('avgScoreLabel', lang)} value={fmt1(stat?.avgScore ?? 0)} />
        <TooltipRow color={GREEN}      label={t('passRateLabel', lang)} value={`${fmt1(stat?.passRate ?? 0)}%`} />
      </div>
    </div>
  )
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
      <span style={{ color: '#94a3b8', flex: 1 }}>{label}</span>
      <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{value}</span>
    </div>
  )
}

function SessionsBarChart({ data, isDark, language }: { data: ActivityStat[]; isDark: boolean; language: 'es' | 'en' }) {
  if (!data || !data.length) return <EmptyState message={t('noSessionData', language)} />

  const sorted = [...data].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, 10)
  const chartData = sorted.map((d) => ({ ...d, shortName: truncate(d.name ?? '', 24) }))
  const barHeight = 40
  const chartHeight = Math.max(200, chartData.length * barHeight + 60)

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 52, bottom: 4, left: 4 }}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e2d3d' : '#e4e8f0'} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="shortName"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={150}
        />
        <Tooltip content={<SessionsBarTooltip language={language} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="count" name={t('sessionsLabel', language)} radius={[0, 4, 4, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.passRate >= PASS_THRESHOLD ? SIIGO_BLUE : '#1e40af'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Activity detail table ─────────────────────────────────────────────────────

const TH_STYLE: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--color-muted)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  borderBottom: '1px solid var(--color-line)',
  whiteSpace: 'nowrap',
}

const TD_STYLE: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 13,
  color: 'var(--color-fg)',
  borderBottom: '1px solid var(--color-line)',
  verticalAlign: 'middle',
}

function DetailTable({ data, language }: { data: ActivityStat[]; language: 'es' | 'en' }) {
  if (!data || !data.length) return <EmptyState message={t('noActivityData', language)} />

  const sorted = [...data].sort((a, b) => (b.count ?? 0) - (a.count ?? 0))

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={TH_STYLE}>{t('activity', language)}</th>
            <th style={{ ...TH_STYLE, textAlign: 'center' }}>{t('sessionsLabel', language)}</th>
            <th style={{ ...TH_STYLE, textAlign: 'center' }}>{t('avgScoreLabel', language)}</th>
            <th style={{ ...TH_STYLE, textAlign: 'center' }}>{t('passRateLabel', language)}</th>
            <th style={{ ...TH_STYLE, textAlign: 'center' }}>{t('passLabel', language)}</th>
            <th style={{ ...TH_STYLE, textAlign: 'center' }}>{t('failLabel', language)}</th>
            <th style={{ ...TH_STYLE, textAlign: 'center' }}>{t('statusLabel', language)}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((stat, idx) => {
            const color = performanceColor(stat.passRate ?? 0)
            const label = performanceLabel(stat.passRate ?? 0, language)
            return (
              <motion.tr
                key={stat.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.25 }}
                style={{ transition: 'background 0.15s' }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLTableRowElement).style.background = 'rgba(0,97,255,0.06)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLTableRowElement).style.background = 'transparent'
                }}
              >
                <td style={TD_STYLE}>
                  <div>
                    <span style={{ color: 'var(--color-fg)', fontWeight: 500 }}>{stat.name ?? ''}</span>
                    {stat.activityType && (
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#475569' }}>
                        {stat.activityType}
                      </p>
                    )}
                  </div>
                </td>
                <td style={{ ...TD_STYLE, textAlign: 'center', fontWeight: 600, color: '#94a3b8' }}>
                  {stat.count ?? 0}
                </td>
                <td style={{ ...TD_STYLE, textAlign: 'center', fontWeight: 700, color: (stat.avgScore ?? 0) >= PASS_THRESHOLD ? SIIGO_BLUE : AMBER }}>
                  {fmt1(stat.avgScore ?? 0)}
                </td>
                <td style={{ ...TD_STYLE, textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontWeight: 700, color }}>{fmt1(stat.passRate ?? 0)}%</span>
                    <div
                      style={{
                        width: 60,
                        height: 4,
                        borderRadius: 2,
                        background: 'var(--color-line)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, stat.passRate ?? 0)}%`,
                          borderRadius: 2,
                          background: color,
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td style={{ ...TD_STYLE, textAlign: 'center', fontWeight: 700, color: GREEN }}>
                  {stat.passCount ?? 0}
                </td>
                <td style={{ ...TD_STYLE, textAlign: 'center', fontWeight: 700, color: (stat.failCount ?? 0) > 0 ? RED : '#64748b' }}>
                  {stat.failCount ?? 0}
                </td>
                <td style={{ ...TD_STYLE, textAlign: 'center' }}>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      background: `${color}22`,
                      color,
                      border: `1px solid ${color}44`,
                    }}
                  >
                    {label}
                  </span>
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Activity trend over time ─────────────────────────────────────────────────
// Derives per-activity session counts bucketed by week from the trend data.
// Since ActivityStat has no time series, we derive a simple usage trend by
// showing the global trend broken down by count, annotating each activity.

interface ActivityTrendPoint {
  date: string
  dateLabel: string
  count: number
}

function buildActivityTrend(trend: TrendPoint[]): ActivityTrendPoint[] {
  if (!trend || !trend.length) return []
  return trend.map((t) => {
    let label = t.date ?? ''
    try {
      label = format(parseISO(t.date ?? ''), 'MMM d')
    } catch {
      // keep raw
    }
    return { date: t.date ?? '', dateLabel: label, count: t.count ?? 0 }
  })
}

function ActivityTrendChart({ trend, isDark, language }: { trend: TrendPoint[]; isDark: boolean; language: 'es' | 'en' }) {
  const chartData = useMemo(() => buildActivityTrend(trend), [trend])

  if (!chartData.length) return <EmptyState message={t('noTrendData', language)} />

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e2d3d' : '#e4e8f0'} vertical={false} />
        <XAxis
          dataKey="dateLabel"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={28}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: isDark ? '#1e2535' : '#ffffff',
            border: '1px solid var(--color-line)',
            borderRadius: 8,
            fontSize: 13,
            color: isDark ? '#e2e8f0' : '#1e293b',
          }}
          labelStyle={{ color: '#94a3b8', fontSize: 12, marginBottom: 6 }}
          formatter={(value: number) => [value, t('sessionsLabel', language)]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }}
        />
        <Line
          type="monotone"
          dataKey="count"
          name={t('sessionsLabel', language)}
          stroke={SIIGO_BLUE}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: SIIGO_BLUE }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActivitiesPage() {
  const language = useAppStore((s) => s.language)
  const theme    = useAppStore((s) => s.theme)
  const isDark   = theme === 'dark'
  const { activityStats, trend, isLoading, isError, error } = useDashboardData()

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ height: 36, width: 260, borderRadius: 8, background: 'var(--color-line)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {[0, 1].map((i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div
        style={{
          padding: '40px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          color: RED,
          fontSize: 14,
        }}
      >
        <XCircle style={{ width: 40, height: 40 }} />
        <p style={{ margin: 0, fontWeight: 600 }}>{t('failedLoadActivity', language)}</p>
        {error && (
          <p style={{ margin: 0, fontSize: 12, color: MUTED }}>{error.message}</p>
        )}
      </div>
    )
  }

  // Ensure activityStats is always an array
  const safeActivityStats = activityStats ?? []

  const totalSessions   = safeActivityStats.reduce((sum, a) => sum + (a.count ?? 0), 0)
  const totalPass       = safeActivityStats.reduce((sum, a) => sum + (a.passCount ?? 0), 0)
  const totalFail       = safeActivityStats.reduce((sum, a) => sum + (a.failCount ?? 0), 0)
  const overallPassRate = totalSessions > 0 ? (totalPass / totalSessions) * 100 : 0
  const overallAvgScore =
    safeActivityStats.length > 0
      ? safeActivityStats.reduce((sum, a) => sum + (a.avgScore ?? 0) * (a.count ?? 0), 0) / Math.max(totalSessions, 1)
      : 0

  return (
    <div
      style={{
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        minHeight: '100%',
      }}
    >
      {/* ── 1. Page Header ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(0,97,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity style={{ width: 22, height: 22, color: SIIGO_BLUE }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--color-fg)' }}>
              {t('activitiesTitle', language)}
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b', marginTop: 1 }}>
              {t('activitiesSubtitle', language)}
            </p>
          </div>
        </div>

        {/* Global summary chips */}
        {safeActivityStats.length > 0 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            <Chip label={t('activitiesTitle', language)} value={String(safeActivityStats.length)} color={SIIGO_BLUE} />
            <Chip label={t('totalSessions', language)} value={String(totalSessions)} color="#94a3b8" />
            <Chip label={t('avgScoreLabel', language)} value={fmt1(overallAvgScore)} color={overallAvgScore >= PASS_THRESHOLD ? SIIGO_BLUE : AMBER} />
            <Chip label={t('overallPassRate', language)} value={`${fmt1(overallPassRate)}%`} color={performanceColor(overallPassRate)} />
            <Chip label={t('approved', language)} value={String(totalPass)} color={GREEN} />
            <Chip label={t('disapproved', language)} value={String(totalFail)} color={totalFail > 0 ? RED : MUTED} />
          </div>
        )}
      </motion.div>

      {/* ── 2. Activity summary cards ────────────────────────────────────── */}
      {safeActivityStats.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-line)',
            borderRadius: 16,
            padding: '48px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            color: MUTED,
          }}
        >
          <LayoutGrid style={{ width: 44, height: 44, opacity: 0.35 }} />
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#64748b' }}>
            {t('noActivityDataYet', language)}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: 380 }}>
            {t('noActivityDataYetSub', language)}
          </p>
        </motion.div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {safeActivityStats.map((stat) => (
            <ActivitySummaryCard key={stat.id} stat={stat} language={language} />
          ))}
        </div>
      )}

      {/* ── 3. Sessions per activity (horizontal bar) ────────────────────── */}
      <Section
        title={t('sessionsPerActivity', language)}
        subtitle={t('sessionsPerActivitySub', language)}
        icon={BarChart2}
      >
        <SessionsBarChart data={safeActivityStats} isDark={isDark} language={language} />
      </Section>

      {/* ── 4. Activity detail table ─────────────────────────────────────── */}
      <Section
        title={t('activityDetail', language)}
        subtitle={t('activityDetailSub', language)}
        icon={LayoutGrid}
      >
        <DetailTable data={safeActivityStats} language={language} />
      </Section>

      {/* ── 5. Activity trend over time ──────────────────────────────────── */}
      <Section
        title={t('activityTrendTitle', language)}
        subtitle={t('activityTrendSub', language)}
        icon={TrendingUp}
      >
        <ActivityTrendChart trend={trend ?? []} isDark={isDark} language={language} />
      </Section>
    </div>
  )
}

// ─── Chip helper ──────────────────────────────────────────────────────────────

function Chip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 12px',
        borderRadius: 20,
        background: `${color}16`,
        border: `1px solid ${color}33`,
      }}
    >
      <span style={{ fontSize: 11, color: '#64748b' }}>{label}:</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
    </div>
  )
}
