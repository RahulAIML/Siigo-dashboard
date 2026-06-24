import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useAppStore from '../store'
import {
  Trophy,
  Medal,
  Search,
  Users,
  TrendingUp,
  Award,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react'
import useDashboardData from '../hooks/useDashboardData'
import { cn } from '../lib/cn'
import type { UserStat } from '../api/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

type SortKey = 'avgScore' | 'bestScore' | 'count'
type TopNFilter = 10 | 25 | 'all'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-500'
  if (score >= 70) return 'text-amber-500'
  return 'text-red-500'
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500/10 text-emerald-500'
  if (score >= 70) return 'bg-amber-500/10 text-amber-500'
  return 'bg-red-500/10 text-red-500'
}

function fmtScore(n: number): string {
  return n.toFixed(1)
}

function fmtPct(n: number): string {
  return `${n.toFixed(0)}%`
}

// ─── Medal config ─────────────────────────────────────────────────────────────

const MEDAL_CONFIG = [
  {
    rank: 1,
    label: 'Gold',
    icon: '🥇',
    ring: 'ring-yellow-400',
    bg: 'bg-yellow-400/10',
    text: 'text-yellow-400',
    border: 'border-yellow-400/40',
    glow: '0 0 24px rgba(250,204,21,0.35)',
    size: 'w-24 h-24',
    avatarSize: 'text-3xl',
    podiumH: 'h-32',
  },
  {
    rank: 2,
    label: 'Silver',
    icon: '🥈',
    ring: 'ring-slate-400',
    bg: 'bg-slate-400/10',
    text: 'text-slate-400',
    border: 'border-slate-400/40',
    glow: '0 0 18px rgba(148,163,184,0.30)',
    size: 'w-20 h-20',
    avatarSize: 'text-2xl',
    podiumH: 'h-24',
  },
  {
    rank: 3,
    label: 'Bronze',
    icon: '🥉',
    ring: 'ring-amber-700',
    bg: 'bg-amber-700/10',
    text: 'text-amber-700',
    border: 'border-amber-700/40',
    glow: '0 0 14px rgba(180,83,9,0.25)',
    size: 'w-20 h-20',
    avatarSize: 'text-2xl',
    podiumH: 'h-20',
  },
]

// ─── Avatar initials ──────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ─── Rank badge ───────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-base">🥇</span>
  if (rank === 2) return <span className="text-base">🥈</span>
  if (rank === 3) return <span className="text-base">🥉</span>
  return (
    <span className="text-sm font-semibold text-[var(--color-muted)] tabular-nums w-6 text-center inline-block">
      {rank}
    </span>
  )
}

// ─── Podium card ──────────────────────────────────────────────────────────────

interface PodiumCardProps {
  stat: UserStat
  position: number
  delay: number
}

function PodiumCard({ stat, position, delay }: PodiumCardProps) {
  const cfg = MEDAL_CONFIG[position]

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'flex flex-col items-center gap-3 p-5 rounded-2xl border',
        'bg-[var(--color-card)] backdrop-blur-sm',
        cfg.border,
        position === 0 ? 'md:-mt-4 z-10' : '',
      )}
      style={{ boxShadow: cfg.glow }}
    >
      {/* Avatar */}
      <div
        className={cn(
          'rounded-full flex items-center justify-center ring-2 font-bold',
          cfg.size,
          cfg.ring,
          cfg.bg,
          cfg.text,
          cfg.avatarSize,
        )}
      >
        {getInitials(stat.name)}
      </div>

      {/* Medal icon */}
      <span className="text-2xl leading-none">{cfg.icon}</span>

      {/* Name */}
      <div className="text-center">
        <p className="font-semibold text-[var(--color-fg)] text-sm leading-tight max-w-[120px] truncate">
          {stat.name}
        </p>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">{cfg.label}</p>
      </div>

      {/* Score */}
      <div className="text-center">
        <p className={cn('text-2xl font-bold tabular-nums', cfg.text)}>
          {fmtScore(stat.avgScore)}
        </p>
        <p className="text-xs text-[var(--color-muted)]">avg score</p>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 text-center">
        <div>
          <p className="text-xs font-semibold text-[var(--color-fg)]">{stat.count}</p>
          <p className="text-[10px] text-[var(--color-muted)]">sims</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--color-fg)]">
            {fmtScore(stat.bestScore)}
          </p>
          <p className="text-[10px] text-[var(--color-muted)]">best</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--color-fg)]">
            {fmtPct(stat.passRate)}
          </p>
          <p className="text-[10px] text-[var(--color-muted)]">pass</p>
        </div>
      </div>

      {/* Podium base */}
      <div
        className={cn(
          'w-full rounded-lg mt-1',
          cfg.bg,
          cfg.podiumH,
          'flex items-end justify-center pb-2',
        )}
      >
        <span className={cn('text-4xl font-black opacity-20', cfg.text)}>
          {cfg.rank}
        </span>
      </div>
    </motion.div>
  )
}

// ─── Sort button ──────────────────────────────────────────────────────────────

interface SortButtonProps {
  label: string
  active: boolean
  onClick: () => void
}

function SortButton({ label, active, onClick }: SortButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
        active
          ? 'bg-[#0066FF] text-white'
          : 'bg-[var(--color-bg-alt)] text-[var(--color-muted)] hover:bg-[var(--color-line)]',
      )}
    >
      {label}
    </button>
  )
}

// ─── Stats summary card ───────────────────────────────────────────────────────

interface SummaryCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  color: string
  delay: number
}

function SummaryCard({ icon: Icon, label, value, color, delay }: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-line)] shadow-sm"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-[var(--color-muted)] font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="text-xl font-bold text-[var(--color-fg)] leading-tight">{value}</p>
      </div>
    </motion.div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const language = useAppStore((s) => s.language)
  const { userStats, kpis, isLoading } = useDashboardData()

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('avgScore')
  const [topN, setTopN] = useState<TopNFilter>('all')
  const [page, setPage] = useState(1)

  // ── Sort + filter pipeline ─────────────────────────────────────────────────

  const sorted: UserStat[] = useMemo(() => {
    return [...userStats].sort((a, b) => b[sortKey] - a[sortKey])
  }, [userStats, sortKey])

  const withRank = useMemo(() => {
    return sorted.map((s, i) => ({ ...s, rank: i + 1 }))
  }, [sorted])

  const afterTopN = useMemo(() => {
    if (topN === 'all') return withRank
    return withRank.slice(0, topN)
  }, [withRank, topN])

  const afterSearch = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return afterTopN
    return afterTopN.filter((s) => s.name.toLowerCase().includes(q))
  }, [afterTopN, search])

  const totalPages = Math.max(1, Math.ceil(afterSearch.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return afterSearch.slice(start, start + PAGE_SIZE)
  }, [afterSearch, safePage])

  // ── Top 3 podium ───────────────────────────────────────────────────────────
  const podium = withRank.slice(0, 3)

  // ── Summary stats ──────────────────────────────────────────────────────────
  const certRate = useMemo(() => {
    if (userStats.length === 0) return 0
    const passed = userStats.filter((u) => u.passRate >= 70).length
    return (passed / userStats.length) * 100
  }, [userStats])

  // ── Reset page when filters change ─────────────────────────────────────────
  const handleSearch = (v: string) => {
    setSearch(v)
    setPage(1)
  }
  const handleTopN = (v: TopNFilter) => {
    setTopN(v)
    setPage(1)
  }
  const handleSort = (v: SortKey) => {
    setSortKey(v)
    setPage(1)
  }

  // ─── Loading skeleton ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-[var(--color-bg-alt)]" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-[var(--color-bg-alt)]" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-[var(--color-bg-alt)]" />
      </div>
    )
  }

  // ─── Empty state ───────────────────────────────────────────────────────────

  if (userStats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-[var(--color-muted)]">
        <Trophy className="w-12 h-12 opacity-30" />
        <p className="text-lg font-medium">{language === 'es' ? 'Sin datos de simulaciones' : 'No simulation data available'}</p>
        <p className="text-sm">{language === 'es' ? 'Completa simulaciones para ver el ranking.' : 'Run some simulations to see the leaderboard.'}</p>
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-fg)]">{language === 'es' ? 'Ranking' : 'Leaderboard'}</h1>
            <p className="text-sm text-[var(--color-muted)]">{language === 'es' ? 'Mejores Desempeños' : 'Top Performers'}</p>
          </div>
        </div>
      </motion.div>

      {/* ── Stats summary ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={Users}
          label={language === 'es' ? 'Total Asesores' : 'Total Advisors'}
          value={String(userStats.length)}
          color="#0066FF"
          delay={0.05}
        />
        <SummaryCard
          icon={TrendingUp}
          label={language === 'es' ? 'Prom. Puntaje' : 'Avg Score (All)'}
          value={fmtScore(kpis.averageScore ?? 0)}
          color="#10B981"
          delay={0.1}
        />
        <SummaryCard
          icon={Award}
          label={language === 'es' ? 'Tasa de Certificación' : 'Certification Rate'}
          value={fmtPct(certRate)}
          color="#8B5CF6"
          delay={0.15}
        />
      </div>

      {/* ── Top 3 podium ────────────────────────────────────────────────── */}
      {podium.length >= 1 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-4 flex items-center gap-2">
            <Medal className="w-4 h-4" />
            {language === 'es' ? 'Top 3 Podio' : 'Top 3 Podium'}
          </h2>
          {/* Order: 2nd | 1st | 3rd */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {podium.length >= 2 && (
              <PodiumCard stat={podium[1]} position={1} delay={0.15} />
            )}
            <PodiumCard stat={podium[0]} position={0} delay={0.05} />
            {podium.length >= 3 && (
              <PodiumCard stat={podium[2]} position={2} delay={0.25} />
            )}
          </div>
        </div>
      )}

      {/* ── Full leaderboard table ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-xl bg-[var(--color-card)] border border-[var(--color-line)] shadow-sm overflow-hidden"
      >
        {/* Toolbar */}
        <div className="p-4 border-b border-[var(--color-line)] flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={language === 'es' ? 'Buscar por nombre...' : 'Search by name...'}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--color-bg-alt)] border border-[var(--color-line)] text-sm text-[var(--color-fg)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Top N filter */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-[var(--color-muted)] mr-1">Show:</span>
              {([10, 25, 'all'] as TopNFilter[]).map((n) => (
                <button
                  key={String(n)}
                  onClick={() => handleTopN(n)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                    topN === n
                      ? 'bg-[#0066FF] text-white'
                      : 'bg-[var(--color-bg-alt)] text-[var(--color-muted)] hover:bg-[var(--color-line)]',
                  )}
                >
                  {n === 'all' ? 'All' : `Top ${n}`}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-[var(--color-muted)]" />
              <SortButton
                label="Avg Score"
                active={sortKey === 'avgScore'}
                onClick={() => handleSort('avgScore')}
              />
              <SortButton
                label="Best Score"
                active={sortKey === 'bestScore'}
                onClick={() => handleSort('bestScore')}
              />
              <SortButton
                label="Attempts"
                active={sortKey === 'count'}
                onClick={() => handleSort('count')}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] bg-[var(--color-bg-alt)]">
                <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide w-12">
                  {language === 'es' ? 'Puesto' : 'Rank'}
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
                  {language === 'es' ? 'Nombre' : 'Name'}
                </th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
                  {language === 'es' ? 'Simulaciones' : 'Simulations'}
                </th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
                  {language === 'es' ? 'Prom. Puntaje' : 'Avg Score'}
                </th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
                  {language === 'es' ? 'Tasa Aprobación' : 'Pass Rate'}
                </th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
                  {language === 'es' ? 'Mejor Puntaje' : 'Best Score'}
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--color-muted)] text-sm">
                      {language === 'es' ? 'Ningún asesor coincide con tu búsqueda.' : 'No advisors match your search.'}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row, idx) => {
                    const isMedal = row.rank <= 3
                    const medalCfg = isMedal ? MEDAL_CONFIG[row.rank - 1] : null

                    return (
                      <motion.tr
                        key={row.userId ?? row.name}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.02 }}
                        className={cn(
                          'border-b border-[var(--color-line)] transition-colors',
                          isMedal
                            ? medalCfg!.bg + ' hover:brightness-105'
                            : 'hover:bg-[var(--color-bg-alt)]',
                        )}
                      >
                        {/* Rank */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center w-8">
                            <RankBadge rank={row.rank} />
                          </div>
                        </td>

                        {/* Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                                isMedal
                                  ? cn(medalCfg!.bg, medalCfg!.text, 'ring-1', medalCfg!.ring)
                                  : 'bg-[var(--color-bg-alt)] text-[var(--color-muted)]',
                              )}
                            >
                              {getInitials(row.name)}
                            </div>
                            <span
                              className={cn(
                                'font-medium truncate max-w-[180px]',
                                isMedal ? medalCfg!.text : 'text-[var(--color-fg)]',
                              )}
                            >
                              {row.name}
                            </span>
                          </div>
                        </td>

                        {/* Simulations */}
                        <td className="py-3 px-4 text-right tabular-nums text-[var(--color-fg)]">
                          {row.count}
                        </td>

                        {/* Avg Score */}
                        <td className="py-3 px-4 text-right">
                          <span
                            className={cn(
                              'inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums',
                              scoreBg(row.avgScore),
                            )}
                          >
                            {fmtScore(row.avgScore)}
                          </span>
                        </td>

                        {/* Pass Rate */}
                        <td className="py-3 px-4 text-right">
                          <span
                            className={cn(
                              'tabular-nums font-medium text-sm',
                              scoreColor(row.passRate),
                            )}
                          >
                            {fmtPct(row.passRate)}
                          </span>
                        </td>

                        {/* Best Score */}
                        <td className="py-3 px-4 text-right">
                          <span
                            className={cn(
                              'tabular-nums font-semibold text-sm',
                              scoreColor(row.bestScore),
                            )}
                          >
                            {fmtScore(row.bestScore)}
                          </span>
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[var(--color-line)] flex items-center justify-between">
            <p className="text-xs text-[var(--color-muted)]">
              Showing{' '}
              <span className="font-medium text-[var(--color-fg)]">
                {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, afterSearch.length)}
              </span>{' '}
              of{' '}
              <span className="font-medium text-[var(--color-fg)]">
                {afterSearch.length}
              </span>{' '}
              advisors
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-bg-alt)] hover:bg-[var(--color-line)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-[var(--color-fg)]" />
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 7) {
                  pageNum = i + 1
                } else if (safePage <= 4) {
                  pageNum = i + 1
                } else if (safePage >= totalPages - 3) {
                  pageNum = totalPages - 6 + i
                } else {
                  pageNum = safePage - 3 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-medium transition-colors',
                      pageNum === safePage
                        ? 'bg-[#0066FF] text-white'
                        : 'bg-[var(--color-bg-alt)] text-[var(--color-muted)] hover:bg-[var(--color-line)]',
                    )}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-bg-alt)] hover:bg-[var(--color-line)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-[var(--color-fg)]" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
