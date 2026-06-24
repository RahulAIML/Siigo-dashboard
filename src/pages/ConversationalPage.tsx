import { useMemo } from 'react'
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
  Legend,
  Cell,
} from 'recharts'
import {
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  AlertTriangle,
  Zap,
  Users,
} from 'lucide-react'
import useDashboardData from '../hooks/useDashboardData'
import { RoundRadar } from '../components/charts/RoundRadar'
import type { RoundStat } from '../api/types'
import { STRONG_TIER, DEVELOPING_TIER } from '../config/constants'

// ─── Color constants ──────────────────────────────────────────────────────────

const SIIGO_BLUE  = '#0061ff'
const GREEN       = '#22c55e'
const AMBER       = '#f59e0b'
const RED         = '#ef4444'
const ROUND_COLORS = [
  SIIGO_BLUE, '#6366f1', '#8b5cf6', '#06b6d4', GREEN,
  '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#84cc16',
  '#3b82f6', '#a855f7', '#f97316', '#10b981', '#e11d48',
  '#0ea5e9', '#d946ef', '#fb923c', '#4ade80', '#facc15',
]

// ─── Tier helpers ─────────────────────────────────────────────────────────────

type Tier = 'strong' | 'developing' | 'needs'

function rLabel(round: number, lang: 'es' | 'en'): string {
  return `${t('roundWord', lang)} ${round}`
}

function getTier(avg: number): Tier {
  if (avg >= STRONG_TIER)    return 'strong'
  if (avg >= DEVELOPING_TIER) return 'developing'
  return 'needs'
}

function tierColor(tier: Tier): string {
  if (tier === 'strong')     return GREEN
  if (tier === 'developing') return AMBER
  return RED
}

function tierBg(tier: Tier): string {
  if (tier === 'strong')     return 'rgba(34,197,94,0.10)'
  if (tier === 'developing') return 'rgba(245,158,11,0.10)'
  return 'rgba(239,68,68,0.10)'
}

function tierLabel(tier: Tier, lang: 'es' | 'en' = 'es'): string {
  if (tier === 'strong')     return lang === 'es' ? 'Sólido' : 'Strong'
  if (tier === 'developing') return lang === 'es' ? 'En desarrollo' : 'Developing'
  return lang === 'es' ? 'Necesita coaching' : 'Needs Coaching'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-xl bg-card border border-border/50 shadow-sm p-5"
    >
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </motion.div>
  )
}

// ─── Round stat card ──────────────────────────────────────────────────────────

function RoundCard({ stat, index, language }: { stat: RoundStat; index: number; language: 'es' | 'en' }) {
  const tier  = getTier(stat.avg)
  const color = tierColor(tier)
  const bg    = tierBg(tier)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="rounded-xl border border-border/50 bg-card p-4 flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: `${ROUND_COLORS[index % ROUND_COLORS.length]}20`, color: ROUND_COLORS[index % ROUND_COLORS.length] }}
          >
            {stat.round}
          </div>
          <span className="text-sm font-medium text-foreground">{rLabel(stat.round, language)}</span>
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ color, backgroundColor: bg }}
        >
          {tierLabel(tier, language)}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground mb-0.5">{t('avgScoreCol', language)}</span>
          <span className="text-lg font-bold" style={{ color }}>
            {stat.avg.toFixed(1)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground mb-0.5">{t('passRateCol', language)}</span>
          <span className="text-lg font-bold text-foreground">
            {stat.passRate.toFixed(1)}%
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground mb-0.5">{t('responsesCol', language)}</span>
          <span className="text-lg font-bold text-foreground">
            {stat.count.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(stat.avg, 100)}%`, backgroundColor: color }}
        />
      </div>
    </motion.div>
  )
}

// ─── Grouped bar chart tooltip ────────────────────────────────────────────────

function GroupedBarTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div
      style={{
        background: '#1e2535',
        border: '1px solid #2d3a52',
        borderRadius: 8,
        padding: '10px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
        fontSize: 13,
        color: '#e2e8f0',
        minWidth: 160,
      }}
    >
      <p
        style={{
          margin: '0 0 8px',
          fontWeight: 600,
          color: '#94a3b8',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </p>
      {payload.map((entry: any, i: number) => (
        <div
          key={i}
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: i > 0 ? 4 : 0 }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: entry.fill,
              flexShrink: 0,
            }}
          />
          <span style={{ color: '#94a3b8', flex: 1 }}>{entry.name}</span>
          <span style={{ fontWeight: 700, color: '#f1f5f9' }}>
            {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
            {entry.name === 'Pass Rate' ? '%' : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Feedback highlight card ──────────────────────────────────────────────────

function FeedbackCard({
  icon: Icon,
  label,
  roundLabel,
  value,
  color,
  description,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  roundLabel: string
  value: string
  color: string
  description: string
}) {
  return (
    <div
      className="rounded-xl border border-border/50 bg-card p-4 flex flex-col gap-2"
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-foreground">{roundLabel}</span>
        <span className="text-sm font-semibold" style={{ color }}>{value}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

// ─── Tier table ───────────────────────────────────────────────────────────────

function TierTableRow({ stat, language }: { stat: RoundStat; language: 'es' | 'en' }) {
  const tier  = getTier(stat.avg)
  const color = tierColor(tier)
  const bg    = tierBg(tier)

  return (
    <tr className="border-t border-border/30 hover:bg-muted/30 transition-colors">
      <td className="py-2.5 px-3 text-sm text-foreground font-medium">{rLabel(stat.round, language)}</td>
      <td className="py-2.5 px-3 text-sm text-foreground text-right font-mono">
        {stat.avg.toFixed(1)}
      </td>
      <td className="py-2.5 px-3 text-sm text-foreground text-right font-mono">
        {stat.passRate.toFixed(1)}%
      </td>
      <td className="py-2.5 px-3 text-sm text-right font-mono text-muted-foreground">
        {stat.count.toLocaleString()}
      </td>
      <td className="py-2.5 px-3 text-right">
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ color, backgroundColor: bg }}
        >
          {tierLabel(tier, language)}
        </span>
      </td>
    </tr>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ language }: { language: 'es' | 'en' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${SIIGO_BLUE}15` }}
      >
        <MessageSquare className="w-7 h-7" style={{ color: SIIGO_BLUE }} />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-foreground">{t('noInteractionData', language)}</p>
        <p className="text-sm mt-1 max-w-xs text-center">
          {t('noInteractionSub', language)}
        </p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ConversationalPage() {
  const language = useAppStore((s) => s.language)
  const { roundStats, filteredSims, isLoading } = useDashboardData()

  // ── Derived metrics ──────────────────────────────────────────────────────────

  const bestRound = useMemo(
    () =>
      roundStats.length > 0
        ? roundStats.reduce((a, b) => (b.avg > a.avg ? b : a))
        : null,
    [roundStats],
  )

  const worstRound = useMemo(
    () =>
      roundStats.length > 0
        ? roundStats.reduce((a, b) => (b.avg < a.avg ? b : a))
        : null,
    [roundStats],
  )

  const mostImprovedRound = useMemo(() => {
    if (roundStats.length < 2) return null
    let bestDelta = -Infinity
    let bestStat: RoundStat | null = null
    for (let i = 1; i < roundStats.length; i++) {
      const delta = roundStats[i].avg - roundStats[i - 1].avg
      if (delta > bestDelta) {
        bestDelta = delta
        bestStat  = roundStats[i]
      }
    }
    return bestStat && bestDelta > 0 ? { stat: bestStat, delta: bestDelta } : null
  }, [roundStats])

  // Tiers split
  const strongRounds     = useMemo(() => roundStats.filter(r => getTier(r.avg) === 'strong'),     [roundStats])
  const developingRounds = useMemo(() => roundStats.filter(r => getTier(r.avg) === 'developing'), [roundStats])
  const needsRounds      = useMemo(() => roundStats.filter(r => getTier(r.avg) === 'needs'),      [roundStats])

  // Chart data — grouped bars: avg score + pass rate per round
  const groupedBarData = useMemo(
    () =>
      roundStats.map(r => ({
        name:     rLabel(r.round, language),
        'Avg Score': Math.round(r.avg * 10) / 10,
        'Pass Rate': Math.round(r.passRate * 10) / 10,
      })),
    [roundStats, language],
  )

  // ── Empty state ──────────────────────────────────────────────────────────────

  const hasData = roundStats.length > 0 && filteredSims.length > 0

  if (!isLoading && !hasData) {
    return (
      <div className="flex flex-col gap-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${SIIGO_BLUE}18` }}
          >
            <MessageSquare className="w-5 h-5" style={{ color: SIIGO_BLUE }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{t('interactionAnalysis', language)}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('roundByRoundPerf', language)}
            </p>
          </div>
        </div>
        <EmptyState language={language} />
      </div>
    )
  }

  // ── Loading skeletons ─────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 w-64 rounded-lg bg-muted" />
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-muted" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-80 rounded-xl bg-muted" />
          <div className="h-80 rounded-xl bg-muted" />
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* ── 1. Page header ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${SIIGO_BLUE}18` }}
          >
            <MessageSquare className="w-5 h-5" style={{ color: SIIGO_BLUE }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{t('interactionAnalysis', language)}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('roundPerformanceIn', language)} {filteredSims.length.toLocaleString()} {t('simulationSingular', language)}
              {filteredSims.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Summary badges */}
        <div className="hidden md:flex items-center gap-2">
          {strongRounds.length > 0 && (
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ color: GREEN, backgroundColor: 'rgba(34,197,94,0.10)' }}
            >
              {strongRounds.length} {t('strongPerformers', language)}
            </span>
          )}
          {developingRounds.length > 0 && (
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ color: AMBER, backgroundColor: 'rgba(245,158,11,0.10)' }}
            >
              {developingRounds.length} {t('developingLabel', language)}
            </span>
          )}
          {needsRounds.length > 0 && (
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ color: RED, backgroundColor: 'rgba(239,68,68,0.10)' }}
            >
              {needsRounds.length} {t('needsCoachingLabel', language)}
            </span>
          )}
        </div>
      </motion.div>

      {/* ── 2. Round performance stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3">
        {roundStats.map((stat, i) => (
          <RoundCard key={stat.round} stat={stat} index={i} language={language} />
        ))}
      </div>

      {/* ── 3. Radar chart + grouped bar chart ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Radar */}
        <SectionCard
          title={t('roundComparisonRadar', language)}
          subtitle={`${t('radarSubtitle', language)} (${roundStats.length})`}
        >
          <RoundRadar data={roundStats} loading={isLoading} />
        </SectionCard>

        {/* Grouped bar chart */}
        <SectionCard
          title={t('roundByRoundBreakdown', language)}
          subtitle={t('breakdownSubtitle', language)}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={groupedBarData}
              margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
              barCategoryGap="24%"
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#475569', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}`}
                width={32}
              />
              <Tooltip content={<GroupedBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }}
              />
              <Bar dataKey="Avg Score" radius={[3, 3, 0, 0]}>
                {groupedBarData.map((_, i) => (
                  <Cell key={i} fill={ROUND_COLORS[i % ROUND_COLORS.length]} />
                ))}
              </Bar>
              <Bar dataKey="Pass Rate" radius={[3, 3, 0, 0]} fill={GREEN} fillOpacity={0.65} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* ── 4. Performance tier table ────────────────────────────────────────── */}
      <SectionCard
        title={t('perfTierClass', language)}
        subtitle={`${t('strongPerformers', language)} ≥${STRONG_TIER}  |  ${t('developingLabel', language)} ${DEVELOPING_TIER}–${STRONG_TIER - 1}  |  ${t('needsCoachingLabel', language)} <${DEVELOPING_TIER}`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          {/* Strong */}
          <div
            className="rounded-lg p-3 flex items-center gap-3"
            style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.20)' }}
          >
            <Award className="w-5 h-5 flex-shrink-0" style={{ color: GREEN }} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: GREEN }}>
                {t('strongPerformers', language)}
              </p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {strongRounds.length} {strongRounds.length !== 1 ? t('roundsWord', language) : t('roundWord', language)}
              </p>
              <p className="text-xs text-muted-foreground">
                {strongRounds.map(r => rLabel(r.round, language)).join(', ') || t('noneLabel', language)}
              </p>
            </div>
          </div>

          {/* Developing */}
          <div
            className="rounded-lg p-3 flex items-center gap-3"
            style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}
          >
            <Zap className="w-5 h-5 flex-shrink-0" style={{ color: AMBER }} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: AMBER }}>
                {t('developingLabel', language)}
              </p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {developingRounds.length} {developingRounds.length !== 1 ? t('roundsWord', language) : t('roundWord', language)}
              </p>
              <p className="text-xs text-muted-foreground">
                {developingRounds.map(r => rLabel(r.round, language)).join(', ') || t('noneLabel', language)}
              </p>
            </div>
          </div>

          {/* Needs coaching */}
          <div
            className="rounded-lg p-3 flex items-center gap-3"
            style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: RED }} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: RED }}>
                {t('needsCoachingLabel', language)}
              </p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {needsRounds.length} {needsRounds.length !== 1 ? t('roundsWord', language) : t('roundWord', language)}
              </p>
              <p className="text-xs text-muted-foreground">
                {needsRounds.map(r => rLabel(r.round, language)).join(', ') || t('noneLabel', language)}
              </p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-border/40">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30">
                <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('roundCol', language)}
                </th>
                <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
                  {t('avgScoreCol', language)}
                </th>
                <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
                  {t('passRateCol', language)}
                </th>
                <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
                  {t('responsesCol', language)}
                </th>
                <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
                  {t('tierCol', language)}
                </th>
              </tr>
            </thead>
            <tbody>
              {roundStats.map(stat => (
                <TierTableRow key={stat.round} stat={stat} language={language} />
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ── 5. Feedback highlights ───────────────────────────────────────────── */}
      <SectionCard
        title={t('feedbackHighlights', language)}
        subtitle={t('feedbackSubtitle', language)}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Best round */}
          {bestRound ? (
            <FeedbackCard
              icon={TrendingUp}
              label={t('bestRound', language)}
              roundLabel={rLabel(bestRound.round, language)}
              value={`${bestRound.avg.toFixed(1)} ${t('avgLabel', language)}`}
              color={GREEN}
              description={`${t('highestAvgScore', language)} ${bestRound.passRate.toFixed(1)}% ${t('passRateCol', language).toLowerCase()} — ${bestRound.count.toLocaleString()} ${t('responsesCol', language).toLowerCase()}. ${t('performMostConf', language)}`}
            />
          ) : (
            <div className="rounded-xl border border-border/40 bg-muted/20 p-4 flex items-center justify-center text-xs text-muted-foreground">
              {t('noBestRoundData', language)}
            </div>
          )}

          {/* Worst round */}
          {worstRound ? (
            <FeedbackCard
              icon={TrendingDown}
              label={t('weakestRound', language)}
              roundLabel={rLabel(worstRound.round, language)}
              value={`${worstRound.avg.toFixed(1)} ${t('avgLabel', language)}`}
              color={RED}
              description={`${t('lowestAvgScore', language)} ${worstRound.passRate.toFixed(1)}% ${t('passRateCol', language).toLowerCase()}. ${t('priorityCoaching', language)}`}
            />
          ) : (
            <div className="rounded-xl border border-border/40 bg-muted/20 p-4 flex items-center justify-center text-xs text-muted-foreground">
              {t('noWeakestRoundData', language)}
            </div>
          )}

          {/* Most improved */}
          {mostImprovedRound ? (
            <FeedbackCard
              icon={Zap}
              label={t('mostImproved', language)}
              roundLabel={rLabel(mostImprovedRound.stat.round, language)}
              value={`+${mostImprovedRound.delta.toFixed(1)} pts`}
              color={AMBER}
              description={t('largestPositiveJump', language)}
            />
          ) : (
            <div
              className="rounded-xl border border-border/40 p-4 flex flex-col gap-2"
              style={{ borderLeftWidth: 3, borderLeftColor: '#475569' }}
            >
              <div className="flex items-center gap-2">
                <Minus className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('mostImproved', language)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('noUpwardTrend', language)}
              </p>
            </div>
          )}
        </div>

        {/* Footer summary */}
        <div className="mt-4 pt-4 border-t border-border/30 flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {t('analysisBasedOn', language)}{' '}
            <span className="font-semibold text-foreground">
              {filteredSims.length.toLocaleString()}
            </span>{' '}
            {t('simulationSingular', language)}{filteredSims.length !== 1 ? 's' : ''} {t('simulationsAcross', language)}{' '}
            <span className="font-semibold text-foreground">{roundStats.length}</span>{' '}
            {roundStats.length !== 1 ? t('interactionRounds', language) : t('interactionRound', language)}.
          </span>
        </div>
      </SectionCard>

    </div>
  )
}
