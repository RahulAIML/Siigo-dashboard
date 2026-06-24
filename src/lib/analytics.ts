// src/lib/analytics.ts — SIIGO Dashboard
// All KPI computations live here. Never compute KPIs inside React components.

import type {
  Simulation,
  Activity,
  Member,
  QuickKPIs,
  DashboardKPIs,
  TrendPoint,
  RoundStat,
  ScoreBucket,
  UserStat,
  ActivityStat,
} from '../api/types'

import {
  PASS_THRESHOLD,
  MAX_TREND_POINTS,
  TEST_USER_PATTERNS,
  TEST_EMAIL_PATTERNS,
} from '../config/constants'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeMean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((acc, v) => acc + v, 0) / values.length
}

function parseScore(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw))
  return isNaN(n) ? null : n
}

function toDateStr(raw: string | null | undefined): string {
  if (!raw) return ''
  // Accept ISO datetime strings or plain YYYY-MM-DD
  return raw.slice(0, 10)
}

// ---------------------------------------------------------------------------
// isTestUser / filterTestUsers
// ---------------------------------------------------------------------------

export function isTestUser(name: string, email: string): boolean {
  const n = (name ?? '').trim()
  const e = (email ?? '').trim()
  for (const pat of TEST_USER_PATTERNS) {
    if (pat.test(n)) return true
  }
  for (const pat of TEST_EMAIL_PATTERNS) {
    if (pat.test(e)) return true
  }
  return false
}

export function filterTestUsers(sims: Simulation[]): Simulation[] {
  return sims.filter(
    (s) => !isTestUser(s.Usuario_Nombre ?? '', s.Usuario ?? ''),
  )
}

// ---------------------------------------------------------------------------
// computeQuickKPIs
// ---------------------------------------------------------------------------

export function computeQuickKPIs(sims: Simulation[]): QuickKPIs {
  if (!sims || sims.length === 0) {
    return {
      totalSimulations: 0,
      averageScore:     0,
      passRate:         0,
      activeAdvisors:   0,
      passCount:        0,
      failCount:        0,
      bestScore:        0,
      worstScore:       0,
    }
  }

  const numericScores: number[] = []
  let passCount = 0
  let failCount = 0
  const userSet = new Set<string>()

  for (const s of sims) {
    // Active users
    if (s.Usuario_ID) userSet.add(String(s.Usuario_ID))

    // Pass / fail based on Diagnostico_Final
    const passed =
      typeof s.Diagnostico_Final === 'string' &&
      s.Diagnostico_Final.trim().toLowerCase() === 'si'
    if (passed) passCount++
    else failCount++

    // Scores
    const score = parseScore(s.Puntos_Totales ?? s.Calificacion ?? null)
    if (score !== null) numericScores.push(score)
  }

  const avgScore = safeMean(numericScores)
  const passRate = sims.length > 0 ? (passCount / sims.length) * 100 : 0
  const bestScore = numericScores.length > 0 ? Math.max(...numericScores) : 0
  const worstScore = numericScores.length > 0 ? Math.min(...numericScores) : 0

  return {
    totalSimulations: sims.length,
    averageScore:     avgScore,
    passRate,
    activeAdvisors:   userSet.size,
    passCount,
    failCount,
    bestScore,
    worstScore,
  }
}

// ---------------------------------------------------------------------------
// computeDashboardKPIs
// ---------------------------------------------------------------------------

export function computeDashboardKPIs(
  sims: Simulation[],
  activities: Activity[],
  members: Member[],
): DashboardKPIs {
  const quick = computeQuickKPIs(sims)
  return {
    ...quick,
    totalActivities: activities?.length ?? 0,
    totalMembers: members?.length ?? 0,
  }
}

// ---------------------------------------------------------------------------
// computeTrend
// ---------------------------------------------------------------------------

export function computeTrend(
  sims: Simulation[],
  maxPoints: number = MAX_TREND_POINTS,
): TrendPoint[] {
  if (!sims || sims.length === 0) return []

  // Group by date
  const byDate = new Map<
    string,
    { scores: number[]; passCount: number; total: number }
  >()

  for (const s of sims) {
    const date = toDateStr(s.Fecha_y_Hora)
    if (!date) continue

    if (!byDate.has(date)) {
      byDate.set(date, { scores: [], passCount: 0, total: 0 })
    }
    const bucket = byDate.get(date)!
    bucket.total++

    const score = parseScore(s.Puntos_Totales ?? s.Calificacion ?? null)
    if (score !== null) bucket.scores.push(score)

    const passed =
      typeof s.Diagnostico_Final === 'string' &&
      s.Diagnostico_Final.trim().toLowerCase() === 'si'
    if (passed) bucket.passCount++
  }

  // Sort ascending
  const sorted = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { scores, passCount, total }]): TrendPoint => ({
      date,
      avgScore: safeMean(scores),
      count: total,
      passRate: total > 0 ? (passCount / total) * 100 : 0,
    }))

  if (sorted.length <= maxPoints) return sorted

  // Downsample: keep first, last, and evenly distributed middle points
  const result: TrendPoint[] = [sorted[0]]
  const innerCount = maxPoints - 2
  const step = (sorted.length - 2) / (innerCount + 1)

  for (let i = 1; i <= innerCount; i++) {
    const idx = Math.round(i * step)
    if (idx > 0 && idx < sorted.length - 1) {
      result.push(sorted[idx])
    }
  }

  result.push(sorted[sorted.length - 1])

  // Deduplicate by date (in case rounding caused duplicates)
  const seen = new Set<string>()
  return result.filter((p) => {
    if (seen.has(p.date)) return false
    seen.add(p.date)
    return true
  })
}

// ---------------------------------------------------------------------------
// computeRoundStats
// ---------------------------------------------------------------------------

export function computeRoundStats(sims: Simulation[]): RoundStat[] {
  const rounds = [1, 2, 3, 4, 5] as const
  const roundLabels = ['Round 1', 'Round 2', 'Round 3', 'Round 4', 'Round 5']

  return rounds.map((n, idx) => {
    // Use presence of a response in round N + overall session score as proxy
    const responseKey = `Respuesta_${n}` as keyof Simulation
    const scores: number[] = []

    for (const s of sims) {
      const response = s[responseKey] as string | null | undefined
      if (!response || String(response).trim().length === 0) continue
      // Use overall session score as the performance metric for this round
      const sessionScore = parseScore(s.Calificacion ?? s.Puntos_Totales ?? null)
      if (sessionScore !== null) scores.push(sessionScore)
    }

    const avg      = safeMean(scores)
    const passRate = scores.length > 0
      ? (scores.filter(v => v >= PASS_THRESHOLD).length / scores.length) * 100
      : 0

    return {
      round:    n,
      label:    roundLabels[idx],
      avg,
      passRate,
      count:    scores.length,
    }
  })
}

// ---------------------------------------------------------------------------
// computeScoreDistribution
// ---------------------------------------------------------------------------

export function computeScoreDistribution(sims: Simulation[]): ScoreBucket[] {
  const buckets: ScoreBucket[] = [
    { label: '0-20', min: 0, max: 20, count: 0 },
    { label: '21-40', min: 21, max: 40, count: 0 },
    { label: '41-60', min: 41, max: 60, count: 0 },
    { label: '61-80', min: 61, max: 80, count: 0 },
    { label: '81-100', min: 81, max: 100, count: 0 },
  ]

  for (const s of sims) {
    const score = parseScore(s.Puntos_Totales ?? s.Calificacion ?? null)
    if (score === null) continue

    for (const bucket of buckets) {
      if (score >= bucket.min && score <= bucket.max) {
        bucket.count++
        break
      }
    }
  }

  return buckets
}

// ---------------------------------------------------------------------------
// computeUserStats
// ---------------------------------------------------------------------------

export function computeUserStats(sims: Simulation[]): UserStat[] {
  if (!sims || sims.length === 0) return []

  const userMap = new Map<
    string,
    {
      userId: string
      name: string
      email: string
      scores: number[]
      passCount: number
      total: number
    }
  >()

  for (const s of sims) {
    // Skip test users
    if (isTestUser(s.Usuario_Nombre ?? '', s.Usuario ?? '')) continue

    // Use Usuario_Nombre as primary key, with Usuario_ID as tiebreaker suffix
    const userId = String(s.Usuario_ID ?? '')
    const name = (s.Usuario_Nombre ?? '').trim() || `User-${userId}`
    const mapKey = `${name}__${userId}`

    if (!userMap.has(mapKey)) {
      userMap.set(mapKey, {
        userId,
        name,
        email: s.Usuario ?? '',
        scores: [],
        passCount: 0,
        total: 0,
      })
    }

    const entry = userMap.get(mapKey)!
    entry.total++

    const score = parseScore(s.Puntos_Totales ?? s.Calificacion ?? null)
    if (score !== null) entry.scores.push(score)

    const passed =
      typeof s.Diagnostico_Final === 'string' &&
      s.Diagnostico_Final.trim().toLowerCase() === 'si'
    if (passed) entry.passCount++
  }

  const stats: UserStat[] = Array.from(userMap.values()).map(
    ({ userId, name, email, scores, passCount, total }): UserStat => ({
      userId,
      name,
      email,
      count: total,
      avgScore: safeMean(scores),
      passRate: total > 0 ? (passCount / total) * 100 : 0,
      bestScore: scores.length > 0 ? Math.max(...scores) : 0,
      passCount,
    }),
  )

  // Sort descending by avgScore
  return stats.sort((a, b) => b.avgScore - a.avgScore)
}

// ---------------------------------------------------------------------------
// computeActivityStats
// ---------------------------------------------------------------------------

export function computeActivityStats(
  sims: Simulation[],
  activities: Activity[],
): ActivityStat[] {
  if (!sims || sims.length === 0) return []

  const activityMap = new Map<
    string,
    { scores: number[]; passCount: number; failCount: number; total: number }
  >()

  for (const s of sims) {
    const key = String(s.Actividad ?? '')
    if (!key) continue

    if (!activityMap.has(key)) {
      activityMap.set(key, { scores: [], passCount: 0, failCount: 0, total: 0 })
    }

    const entry = activityMap.get(key)!
    entry.total++

    const score = parseScore(s.Puntos_Totales ?? s.Calificacion ?? null)
    if (score !== null) entry.scores.push(score)

    const passed =
      typeof s.Diagnostico_Final === 'string' &&
      s.Diagnostico_Final.trim().toLowerCase() === 'si'
    if (passed) entry.passCount++
    else entry.failCount++
  }

  // Build a quick lookup from activities metadata
  const activityMeta = new Map<string, Activity>()
  for (const a of activities ?? []) {
    activityMeta.set(String(a.name ?? a.ID ?? ''), a)
  }

  const stats: ActivityStat[] = Array.from(activityMap.entries()).map(
    ([key, { scores, passCount, failCount, total }]): ActivityStat => {
      const meta = activityMeta.get(key)
      const displayName = meta?.name ?? key
      return {
        id:           Number(meta?.ID ?? 0),
        name:         displayName,
        activityId:   key,
        activityName: displayName,
        activityType: '',
        count:        total,
        avgScore:     safeMean(scores),
        passRate:     total > 0 ? (passCount / total) * 100 : 0,
        passCount,
        failCount,
      }
    },
  )

  return stats.sort((a, b) => b.count - a.count)
}

// ---------------------------------------------------------------------------
// buildAIContext
// ---------------------------------------------------------------------------

export function buildAIContext(
  kpis: DashboardKPIs,
  sims: Simulation[],
  activities: Activity[],
  actStats: ActivityStat[],
  userStats: UserStat[],
): string {
  const MAX_CHARS = 8000

  const lines: string[] = []

  // KPI Summary
  lines.push('=== KPI SUMMARY ===')
  lines.push(`Total simulations: ${kpis.totalSimulations}`)
  lines.push(`Average score: ${(kpis.averageScore ?? 0).toFixed(1)}`)
  lines.push(`Pass rate: ${(kpis.passRate ?? 0).toFixed(1)}%`)
  lines.push(`Active users: ${kpis.activeAdvisors}`)
  lines.push(`Pass count: ${kpis.passCount}`)
  lines.push(`Fail count: ${kpis.failCount}`)
  lines.push(`Best score: ${(kpis.bestScore ?? 0).toFixed(1)}`)
  lines.push(`Worst score: ${(kpis.worstScore ?? 0).toFixed(1)}`)
  lines.push(`Total activities: ${kpis.totalActivities}`)
  lines.push(`Total members: ${kpis.totalMembers}`)
  lines.push('')

  // Top 10 performers
  lines.push('=== TOP 10 PERFORMERS (highest pass rate) ===')
  const top10 = userStats.slice(0, 10)
  for (const u of top10) {
    lines.push(
      `${u.name} | pass rate: ${u.passRate.toFixed(1)}% | avg: ${u.avgScore.toFixed(1)} | sessions: ${u.count}`,
    )
  }
  lines.push('')

  // Bottom 10 — needs coaching
  lines.push('=== BOTTOM 10 PERFORMERS (needs coaching, lowest pass rate) ===')
  const bottom10 = [...userStats].sort((a, b) => a.passRate - b.passRate).slice(0, 10)
  for (const u of bottom10) {
    lines.push(
      `${u.name} | pass rate: ${u.passRate.toFixed(1)}% | avg: ${u.avgScore.toFixed(1)} | sessions: ${u.count}`,
    )
  }
  lines.push('')

  // Activity breakdown
  lines.push('=== ACTIVITY BREAKDOWN ===')
  for (const a of actStats) {
    lines.push(
      `${a.activityName} (id:${a.activityId}) | sessions: ${a.count} | avg: ${a.avgScore.toFixed(1)} | pass rate: ${a.passRate.toFixed(1)}%`,
    )
  }
  lines.push('')

  // Recent 10 sessions
  lines.push('=== RECENT 10 SESSIONS ===')
  const recent = [...sims]
    .sort((a, b) => {
      const da = toDateStr(a.Fecha_y_Hora)
      const db = toDateStr(b.Fecha_y_Hora)
      return db.localeCompare(da)
    })
    .slice(0, 10)

  for (const s of recent) {
    const score = parseScore(s.Puntos_Totales ?? s.Calificacion ?? null)
    const date = toDateStr(s.Fecha_y_Hora)
    const user = s.Usuario_Nombre ?? 'Unknown'
    const passed = s.Diagnostico_Final?.trim().toLowerCase() === 'si' ? 'PASS' : 'FAIL'
    lines.push(
      `${date} | ${user} | score: ${score !== null ? score.toFixed(1) : 'N/A'} | ${passed}`,
    )
  }

  const result = lines.join('\n')
  return result.length > MAX_CHARS ? result.slice(0, MAX_CHARS) + '\n...[truncated]' : result
}
