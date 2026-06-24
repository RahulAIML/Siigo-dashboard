import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import useAppStore from '../store'
import {
  AlertTriangle,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Users,
  BookOpen,
  Zap,
  CheckCircle,
  Clock,
  BarChart2,
  Star,
} from 'lucide-react'
import useDashboardData from '../hooks/useDashboardData'
import { PASS_THRESHOLD } from '../config/constants'
import type { UserStat, RoundStat, Simulation } from '../api/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const STRONG_SCORE = 85
const TOP_PERCENT   = 0.2
const FADE_UP = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals)
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr.slice(0, 10)
  }
}

function scoreColor(score: number): string {
  if (score >= STRONG_SCORE) return 'text-emerald-400'
  if (score >= PASS_THRESHOLD) return 'text-amber-400'
  return 'text-red-400'
}

function scoreBg(score: number): string {
  if (score >= STRONG_SCORE) return 'bg-emerald-500/10 border-emerald-500/30'
  if (score >= PASS_THRESHOLD) return 'bg-amber-500/10 border-amber-500/30'
  return 'bg-red-500/10 border-red-500/30'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  color = '#0066FF',
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  color?: string
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <h2 className="text-base font-semibold text-[var(--color-fg)]">{title}</h2>
        {subtitle && (
          <p className="text-xs text-[var(--color-muted)] mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

function TrendIcon({ direction }: { direction: 'up' | 'down' | 'flat' }) {
  if (direction === 'up')
    return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
  if (direction === 'down')
    return <TrendingDown className="w-3.5 h-3.5 text-red-400" />
  return <Minus className="w-3.5 h-3.5 text-[var(--color-muted)]" />
}

function NeedsAttentionBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-xs font-medium border border-red-500/25">
      <AlertTriangle className="w-3 h-3" />
      Needs attention
    </span>
  )
}

// ─── Section 2: At-Risk Advisors ──────────────────────────────────────────────

interface AtRiskAdvisor {
  name: string
  avgScore: number
  passRate: number
  count: number
  lastDate: string
  trend: 'up' | 'down' | 'flat'
  failStreak: number
}

function AtRiskSection({ advisors }: { advisors: AtRiskAdvisor[] }) {
  if (advisors.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-line)] p-5">
        <SectionHeader
          icon={AlertTriangle}
          title="At-Risk Advisors"
          subtitle={`Score below ${PASS_THRESHOLD} — require coaching intervention`}
          color="#EF4444"
        />
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <CheckCircle className="w-10 h-10 text-emerald-400 opacity-60" />
          <p className="text-sm text-[var(--color-muted)]">
            All advisors are above the pass threshold.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-line)] p-5">
      <SectionHeader
        icon={AlertTriangle}
        title="At-Risk Advisors"
        subtitle={`${advisors.length} advisor${advisors.length > 1 ? 's' : ''} below threshold (${PASS_THRESHOLD})`}
        color="#EF4444"
      />
      <div className="space-y-2">
        {advisors.map((a, i) => (
          <motion.div
            key={a.name}
            {...FADE_UP}
            transition={{ delay: i * 0.05 }}
            className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border ${scoreBg(a.avgScore)}`}
          >
            {/* Avatar + name */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[var(--color-bg-alt)] flex items-center justify-center flex-shrink-0 text-xs font-bold text-[var(--color-muted)] uppercase">
                {a.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-fg)] truncate">
                  {a.name}
                </p>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
                    <Clock className="w-3 h-3" />
                    {formatDate(a.lastDate)}
                  </span>
                  {a.failStreak >= 2 && <NeedsAttentionBadge />}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-center">
                <p className={`text-lg font-bold leading-none ${scoreColor(a.avgScore)}`}>
                  {fmt(a.avgScore, 0)}
                </p>
                <p className="text-[10px] text-[var(--color-muted)] mt-0.5">Avg score</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold leading-none text-[var(--color-fg)]">
                  {fmt(a.passRate, 0)}%
                </p>
                <p className="text-[10px] text-[var(--color-muted)] mt-0.5">Pass rate</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold leading-none text-[var(--color-fg)]">
                  {a.count}
                </p>
                <p className="text-[10px] text-[var(--color-muted)] mt-0.5">Sessions</p>
              </div>
              <div className="flex items-center gap-1">
                <TrendIcon direction={a.trend} />
                <span className="text-xs text-[var(--color-muted)] capitalize">
                  {a.trend === 'flat' ? 'Stable' : a.trend === 'up' ? 'Improving' : 'Declining'}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Section 3: Strong Performers ─────────────────────────────────────────────

interface StrongPerformer {
  name: string
  avgScore: number
  passRate: number
  count: number
  bestScore: number
}

function StrongPerformersSection({ performers }: { performers: StrongPerformer[] }) {
  if (performers.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-line)] p-5">
        <SectionHeader
          icon={Award}
          title="Strong Performers"
          subtitle="Top 20% — score ≥ 85, available as peer coaches"
          color="#10B981"
        />
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <Star className="w-10 h-10 text-amber-400 opacity-60" />
          <p className="text-sm text-[var(--color-muted)]">
            Not enough data to identify top performers yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-line)] p-5">
      <SectionHeader
        icon={Award}
        title="Strong Performers"
        subtitle={`${performers.length} advisor${performers.length > 1 ? 's' : ''} — score ≥ ${STRONG_SCORE}, available as peer coaches`}
        color="#10B981"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {performers.map((p, i) => (
          <motion.div
            key={p.name}
            {...FADE_UP}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20"
          >
            <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-emerald-400 uppercase">
                {p.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--color-fg)] truncate">{p.name}</p>
              <p className="text-xs text-[var(--color-muted)]">
                {p.count} sessions &middot; Best {fmt(p.bestScore, 0)}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-base font-bold text-emerald-400 leading-none">
                {fmt(p.avgScore, 0)}
              </p>
              <p className="text-[10px] text-[var(--color-muted)] mt-0.5">
                {fmt(p.passRate, 0)}% pass
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Section 4: Weakness Analysis ─────────────────────────────────────────────

interface RoundWeakness {
  round: number
  label: string
  avg: number
  passRate: number
  recommendation: string
  severity: 'critical' | 'warning' | 'ok'
}

function WeaknessAnalysisSection({ weaknesses }: { weaknesses: RoundWeakness[] }) {
  const severityColor = (s: RoundWeakness['severity']) => {
    if (s === 'critical') return { bar: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/8 border-red-500/20' }
    if (s === 'warning') return { bar: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/8 border-amber-500/20' }
    return { bar: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/8 border-emerald-500/20' }
  }

  if (weaknesses.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-line)] p-5">
        <SectionHeader
          icon={BarChart2}
          title="Activity Weakness Analysis"
          subtitle="Round-by-round performance breakdown"
          color="#8B5CF6"
        />
        <p className="text-sm text-[var(--color-muted)] py-6 text-center">
          No round data available yet. Run simulations to see per-round breakdowns.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-line)] p-5">
      <SectionHeader
        icon={BarChart2}
        title="Activity Weakness Analysis"
        subtitle="Round-by-round performance — focus coaching on lowest-scoring interactions"
        color="#8B5CF6"
      />
      <div className="space-y-3">
        {weaknesses.map((w, i) => {
          const colors = severityColor(w.severity)
          return (
            <motion.div
              key={w.round}
              {...FADE_UP}
              transition={{ delay: i * 0.04 }}
              className={`p-3 rounded-lg border ${colors.bg}`}
            >
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
                    Round {w.round}
                  </span>
                  <span className="text-xs text-[var(--color-muted)] truncate max-w-[200px]">
                    {w.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-sm font-bold ${colors.text}`}>
                    {fmt(w.avg, 0)}/100
                  </span>
                  <span className="text-xs text-[var(--color-muted)]">
                    {fmt(w.passRate, 0)}% pass
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full bg-[var(--color-bg-alt)] rounded-full mb-2">
                <div
                  className={`h-full rounded-full ${colors.bar}`}
                  style={{ width: `${Math.min(w.avg, 100)}%` }}
                />
              </div>
              {/* Recommendation */}
              <p className="text-xs text-[var(--color-muted)]">
                <span className="font-medium text-[var(--color-fg-sub)]">Recommendation: </span>
                {w.recommendation}
              </p>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Section 5: Coaching Action Cards ─────────────────────────────────────────

interface CoachingAction {
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

function CoachingActionsSection({ actions }: { actions: CoachingAction[] }) {
  const priorityStyle = (p: CoachingAction['priority']) => {
    if (p === 'high') return { badge: 'bg-red-500/15 text-red-400 border-red-500/25', dot: 'bg-red-500' }
    if (p === 'medium') return { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25', dot: 'bg-amber-500' }
    return { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/25', dot: 'bg-blue-400' }
  }

  if (actions.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-line)] p-5">
        <SectionHeader
          icon={Zap}
          title="Coaching Action Plan"
          subtitle="Priority-ordered interventions"
          color="#F59E0B"
        />
        <p className="text-sm text-[var(--color-muted)] py-6 text-center">
          No immediate actions required. Keep monitoring performance trends.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-line)] p-5">
      <SectionHeader
        icon={Zap}
        title="Coaching Action Plan"
        subtitle={`${actions.length} recommended action${actions.length > 1 ? 's' : ''} — prioritized by impact`}
        color="#F59E0B"
      />
      <div className="space-y-2">
        {actions.map((action, i) => {
          const style = priorityStyle(action.priority)
          const ActionIcon = action.icon
          return (
            <motion.div
              key={i}
              {...FADE_UP}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-bg-alt)] border border-[var(--color-line)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--color-card)] border border-[var(--color-line)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <ActionIcon className="w-4 h-4 text-[var(--color-muted)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="text-sm font-medium text-[var(--color-fg)]">{action.title}</p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${style.badge}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {action.priority}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-muted)]">{action.description}</p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Section 6: Progress Tracking ─────────────────────────────────────────────

interface ProgressEntry {
  name: string
  scoreDelta: number
  prevAvg: number
  currAvg: number
  sessions7d: number
}

function ProgressTrackingSection({ entries }: { entries: ProgressEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-line)] p-5">
        <SectionHeader
          icon={TrendingUp}
          title="Progress Tracking"
          subtitle="Most improved in last 7 days vs previous period"
          color="#06B6D4"
        />
        <p className="text-sm text-[var(--color-muted)] py-6 text-center">
          Not enough data for comparison. Requires sessions in at least two time periods.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-line)] p-5">
      <SectionHeader
        icon={TrendingUp}
        title="Progress Tracking"
        subtitle="Score delta: last 7 days vs prior period"
        color="#06B6D4"
      />
      <div className="space-y-2">
        {entries.map((e, i) => {
          const improved = e.scoreDelta > 0
          const deltaColor = improved ? 'text-emerald-400' : e.scoreDelta < 0 ? 'text-red-400' : 'text-[var(--color-muted)]'
          const DeltaIcon = improved ? TrendingUp : e.scoreDelta < 0 ? TrendingDown : Minus
          return (
            <motion.div
              key={e.name}
              {...FADE_UP}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg-alt)] border border-[var(--color-line)]"
            >
              <div className="w-7 h-7 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-bold text-cyan-400 uppercase">
                  {e.name.charAt(0)}
                </span>
              </div>
              <p className="flex-1 text-sm font-medium text-[var(--color-fg)] truncate">{e.name}</p>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-center hidden sm:block">
                  <p className="text-xs text-[var(--color-muted)]">
                    {fmt(e.prevAvg, 0)} → {fmt(e.currAvg, 0)}
                  </p>
                  <p className="text-[10px] text-[var(--color-fg-sub)]">Avg score</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-[var(--color-muted)]">{e.sessions7d}</p>
                  <p className="text-[10px] text-[var(--color-fg-sub)]">Sessions</p>
                </div>
                <div className="flex items-center gap-1">
                  <DeltaIcon className={`w-3.5 h-3.5 ${deltaColor}`} />
                  <span className={`text-sm font-bold ${deltaColor}`}>
                    {improved ? '+' : ''}{fmt(e.scoreDelta, 1)}
                  </span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Data Computation ─────────────────────────────────────────────────────────

function useCoachingData(
  userStats: UserStat[],
  roundStats: RoundStat[],
  simulations: Simulation[],
  kpisPassRate: number,
) {
  return useMemo(() => {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    // ── Last session per user ─────────────────────────────────────────────────
    const lastSessionMap: Record<string, string> = {}
    for (const sim of simulations) {
      const key = sim.Usuario_Nombre || sim.Usuario || 'Unknown'
      if (!lastSessionMap[key] || sim.Fecha_y_Hora > lastSessionMap[key]) {
        lastSessionMap[key] = sim.Fecha_y_Hora
      }
    }

    // ── Trend per user: compare last 7d vs 14d-7d ────────────────────────────
    const userScores7d: Record<string, number[]> = {}
    const userScoresPrev: Record<string, number[]> = {}

    for (const sim of simulations) {
      const score = sim.Calificacion
      if (score === null) continue
      const key = sim.Usuario_Nombre || sim.Usuario || 'Unknown'
      const simDate = new Date(sim.Fecha_y_Hora)
      if (simDate >= sevenDaysAgo) {
        if (!userScores7d[key]) userScores7d[key] = []
        userScores7d[key].push(score)
      } else if (simDate >= fourteenDaysAgo) {
        if (!userScoresPrev[key]) userScoresPrev[key] = []
        userScoresPrev[key].push(score)
      }
    }

    function avg(arr: number[]): number {
      if (!arr || arr.length === 0) return 0
      return arr.reduce((a, b) => a + b, 0) / arr.length
    }

    function trendOf(name: string): 'up' | 'down' | 'flat' {
      const curr = avg(userScores7d[name] ?? [])
      const prev = avg(userScoresPrev[name] ?? [])
      if (curr === 0 || prev === 0) return 'flat'
      const delta = curr - prev
      if (delta > 3) return 'up'
      if (delta < -3) return 'down'
      return 'flat'
    }

    // ── Fail streak per user ──────────────────────────────────────────────────
    const failStreakMap: Record<string, number> = {}
    const sortedSims = [...simulations].sort(
      (a, b) => new Date(b.Fecha_y_Hora).getTime() - new Date(a.Fecha_y_Hora).getTime(),
    )
    for (const sim of sortedSims) {
      const key = sim.Usuario_Nombre || sim.Usuario || 'Unknown'
      if (failStreakMap[key] === undefined) failStreakMap[key] = 0
      const passed =
        sim.Diagnostico_Final === 'si' ||
        (sim.Calificacion !== null && sim.Calificacion >= PASS_THRESHOLD)
      if (!passed) {
        failStreakMap[key] += 1
      }
    }

    // ── At-risk advisors ──────────────────────────────────────────────────────
    const atRisk: AtRiskAdvisor[] = userStats
      .filter((u) => u.avgScore < PASS_THRESHOLD)
      .sort((a, b) => a.avgScore - b.avgScore)
      .map((u) => ({
        name: u.name,
        avgScore: u.avgScore,
        passRate: u.passRate,
        count: u.count,
        lastDate: lastSessionMap[u.name] ?? '',
        trend: trendOf(u.name),
        failStreak: failStreakMap[u.name] ?? 0,
      }))

    // ── Strong performers ─────────────────────────────────────────────────────
    const qualifiedStrongAll = userStats
      .filter((u) => u.avgScore >= STRONG_SCORE && u.count >= 1)
      .sort((a, b) => b.avgScore - a.avgScore)

    const topN = Math.max(1, Math.ceil(userStats.length * TOP_PERCENT))
    const strongPerformers: StrongPerformer[] = qualifiedStrongAll
      .slice(0, topN)
      .map((u) => ({
        name: u.name,
        avgScore: u.avgScore,
        passRate: u.passRate,
        count: u.count,
        bestScore: u.bestScore,
      }))

    // ── Round weaknesses ──────────────────────────────────────────────────────
    const roundWeaknessRecommendations: Record<number, string> = {
      1: 'Practice opening statements and rapport-building questions.',
      2: 'Reinforce discovery and needs-identification techniques.',
      3: 'Focus on value proposition articulation and objection anticipation.',
      4: 'Train on objection handling frameworks (LAER, FOSA, etc.).',
      5: 'Drill closing techniques and call-to-action scripts.',
    }

    const weaknesses: RoundWeakness[] = roundStats
      .map((r) => {
        let severity: RoundWeakness['severity'] = 'ok'
        if (r.avg < 40) severity = 'critical'
        else if (r.avg < 60) severity = 'warning'
        return {
          round: r.round,
          label: r.label,
          avg: r.avg,
          passRate: r.passRate,
          recommendation:
            roundWeaknessRecommendations[r.round] ??
            'Review interaction patterns and apply structured feedback.',
          severity,
        }
      })
      .sort((a, b) => a.avg - b.avg)

    // ── Coaching actions ──────────────────────────────────────────────────────
    const actions: CoachingAction[] = []

    const criticalRounds = weaknesses.filter((w) => w.severity === 'critical')
    for (const r of criticalRounds) {
      actions.push({
        priority: 'high',
        title: `Schedule extra practice for Round ${r.round}`,
        description: `Average score is ${fmt(r.avg, 0)}/100 (${fmt(r.passRate, 0)}% pass rate). ${r.recommendation}`,
        icon: Target,
      })
    }

    const warningRounds = weaknesses.filter((w) => w.severity === 'warning')
    for (const r of warningRounds) {
      actions.push({
        priority: 'medium',
        title: `Reinforce Round ${r.round} — ${r.label}`,
        description: `Score at ${fmt(r.avg, 0)}/100. ${r.recommendation}`,
        icon: BookOpen,
      })
    }

    if (kpisPassRate < 0.5 && simulations.length > 0) {
      actions.push({
        priority: 'high',
        title: 'Review closing technique across the team',
        description: `Overall pass rate is ${fmt(kpisPassRate, 0)}% — below 50%. Focus coaching sessions on closing frameworks and commitment language.`,
        icon: AlertTriangle,
      })
    }

    if (atRisk.length > 0) {
      actions.push({
        priority: atRisk.some((a) => a.failStreak >= 2) ? 'high' : 'medium',
        title: `Assign 1-on-1 coaching to ${atRisk.length} at-risk advisor${atRisk.length > 1 ? 's' : ''}`,
        description: `Advisors below score ${PASS_THRESHOLD} need individual support plans. ${atRisk.filter((a) => a.failStreak >= 2).length > 0 ? 'Some show consecutive failures — escalate immediately.' : 'Consider pairing with strong performers as peer coaches.'}`,
        icon: Users,
      })
    }

    if (strongPerformers.length > 0 && atRisk.length > 0) {
      actions.push({
        priority: 'low',
        title: 'Activate peer coaching program',
        description: `${strongPerformers.length} strong performer${strongPerformers.length > 1 ? 's' : ''} can mentor at-risk advisors. Pair by activity or territory for maximum relevance.`,
        icon: Award,
      })
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    // ── Progress tracking ─────────────────────────────────────────────────────
    const progressEntries: ProgressEntry[] = userStats
      .map((u) => {
        const curr7d = avg(userScores7d[u.name] ?? [])
        const prevAvg = avg(userScoresPrev[u.name] ?? [])
        if (curr7d === 0) return null
        const delta = curr7d - (prevAvg > 0 ? prevAvg : u.avgScore)
        return {
          name: u.name,
          scoreDelta: delta,
          prevAvg: prevAvg > 0 ? prevAvg : u.avgScore,
          currAvg: curr7d,
          sessions7d: (userScores7d[u.name] ?? []).length,
        }
      })
      .filter((e): e is ProgressEntry => e !== null)
      .sort((a, b) => b.scoreDelta - a.scoreDelta)
      .slice(0, 10)

    return { atRisk, strongPerformers, weaknesses, actions, progressEntries }
  }, [userStats, roundStats, simulations, kpisPassRate])
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CoachingPage() {
  const language = useAppStore((s) => s.language)
  const { userStats, roundStats, simulations, kpis, isLoading } = useDashboardData()

  const { atRisk, strongPerformers, weaknesses, actions, progressEntries } =
    useCoachingData(userStats, roundStats, simulations, kpis.passRate)

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 animate-pulse">
        <div className="h-8 w-64 rounded bg-[var(--color-bg-alt)]" />
        <div className="h-4 w-80 rounded bg-[var(--color-line)]" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-[var(--color-bg-alt)]" />
        ))}
      </div>
    )
  }

  // ── KPI summary bar ─────────────────────────────────────────────────────────
  const summaryItems = [
    {
      label: language === 'es' ? 'Asesores en Riesgo' : 'At-Risk Advisors',
      value: atRisk.length,
      icon: AlertTriangle,
      color: atRisk.length > 0 ? 'text-red-400' : 'text-emerald-400',
    },
    {
      label: language === 'es' ? 'Alto Rendimiento' : 'Strong Performers',
      value: strongPerformers.length,
      icon: Award,
      color: 'text-emerald-400',
    },
    {
      label: language === 'es' ? 'Rondas Débiles' : 'Weak Rounds',
      value: weaknesses.filter((w) => w.severity !== 'ok').length,
      icon: BarChart2,
      color: weaknesses.filter((w) => w.severity === 'critical').length > 0 ? 'text-red-400' : 'text-amber-400',
    },
    {
      label: language === 'es' ? 'Acciones Pendientes' : 'Pending Actions',
      value: actions.filter((a) => a.priority === 'high').length,
      icon: Zap,
      color: actions.filter((a) => a.priority === 'high').length > 0 ? 'text-amber-400' : 'text-[var(--color-muted)]',
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <motion.div {...FADE_UP} transition={{ duration: 0.3 }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-fg)]">{language === 'es' ? 'Insights de Coaching' : 'Coaching Insights'}</h1>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">
              {language === 'es'
                ? 'Identifica oportunidades de coaching, reconoce los mejores asesores y prioriza intervenciones.'
                : 'Identify coaching opportunities, recognize top performers, and prioritize interventions based on simulation data.'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Summary KPI bar ───────────────────────────────────────────────────── */}
      <motion.div
        {...FADE_UP}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {summaryItems.map((item) => {
          const ItemIcon = item.icon
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-line)] shadow-sm"
            >
              <ItemIcon className={`w-5 h-5 flex-shrink-0 ${item.color}`} />
              <div>
                <p className={`text-xl font-bold leading-none ${item.color}`}>
                  {item.value}
                </p>
                <p className="text-[11px] text-[var(--color-muted)] mt-0.5">{item.label}</p>
              </div>
            </div>
          )
        })}
      </motion.div>

      {/* ── Section 2: At-Risk Advisors ───────────────────────────────────────── */}
      <motion.div {...FADE_UP} transition={{ duration: 0.3, delay: 0.08 }}>
        <AtRiskSection advisors={atRisk} />
      </motion.div>

      {/* ── Section 3: Strong Performers ─────────────────────────────────────── */}
      <motion.div {...FADE_UP} transition={{ duration: 0.3, delay: 0.11 }}>
        <StrongPerformersSection performers={strongPerformers} />
      </motion.div>

      {/* ── Sections 4 + 5: two-column on large screens ───────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <motion.div {...FADE_UP} transition={{ duration: 0.3, delay: 0.14 }}>
          <WeaknessAnalysisSection weaknesses={weaknesses} />
        </motion.div>
        <motion.div {...FADE_UP} transition={{ duration: 0.3, delay: 0.17 }}>
          <CoachingActionsSection actions={actions} />
        </motion.div>
      </div>

      {/* ── Section 6: Progress Tracking ──────────────────────────────────────── */}
      <motion.div {...FADE_UP} transition={{ duration: 0.3, delay: 0.2 }}>
        <ProgressTrackingSection entries={progressEntries} />
      </motion.div>
    </div>
  )
}
