// MetricsEngine.ts — SIIGO Dashboard
// Single entry point for all metric computation. Coordinates validation + analytics.

import {
  computeQuickKPIs,
  computeDashboardKPIs,
  computeTrend,
  computeRoundStats,
  computeScoreDistribution,
  computeUserStats,
  computeActivityStats,
} from '../lib/analytics'
import { validationService } from './ValidationService'
import type { ValidationResult, Simulation } from './ValidationService'
import { TEST_USER_PATTERNS, TEST_EMAIL_PATTERNS } from '../config/constants'

// ---------------------------------------------------------------------------
// Domain types (expected from analytics lib / upstream)
// ---------------------------------------------------------------------------

export interface Activity {
  activity_id: string | number
  name: string
  date?: string
  [key: string]: unknown
}

export interface Member {
  user_id: string | number
  name: string
  email?: string
  [key: string]: unknown
}

export interface QuickKPIs {
  totalSimulations: number
  averageScore: number
  passRate: number
  activeAdvisors: number
  [key: string]: unknown
}

export interface DashboardKPIs extends QuickKPIs {
  [key: string]: unknown
}

export interface TrendPoint {
  date: string
  count: number
  avgScore: number
  [key: string]: unknown
}

export interface RoundStat {
  round: number | string
  count: number
  avgScore: number
  [key: string]: unknown
}

export interface ScoreBucket {
  label: string
  min: number
  max: number
  count: number
  [key: string]: unknown
}

export interface UserStat {
  user_name: string
  count: number
  avgScore: number
  bestScore: number
  [key: string]: unknown
}

export interface ActivityStat {
  activity_id: string | number
  name: string
  count: number
  avgScore: number
  [key: string]: unknown
}

export interface GrowthResult {
  value: number
  direction: 'up' | 'down' | 'flat'
}

export interface DailyMetric {
  date: string
  count: number
  avgScore: number
}

export interface WeeklyMetric {
  week: string
  count: number
  avgScore: number
}

export interface MonthlyMetric {
  month: string
  count: number
  avgScore: number
}

export interface ProcessSimulationsResult {
  simulations: Simulation[]
  validation: ValidationResult
  kpis: QuickKPIs
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTestUser(sim: Simulation): boolean {
  const name = sim.user_name ?? ''
  for (const pattern of TEST_USER_PATTERNS) {
    if (pattern.test(name)) return true
  }
  return false
}

function parseLocalDate(dateStr: string): Date {
  // Treat YYYY-MM-DD as local midnight to avoid off-by-one UTC shifts
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function isoWeek(date: Date): string {
  // ISO 8601 week: Monday-based
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayOfWeek = tmp.getUTCDay() || 7 // Sunday → 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayOfWeek)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function aggregateByKey(
  sims: Simulation[],
  keyFn: (sim: Simulation) => string,
): { key: string; count: number; avgScore: number }[] {
  const map = new Map<string, { sum: number; count: number; scored: number }>()

  for (const sim of sims) {
    const key = keyFn(sim)
    const entry = map.get(key) ?? { sum: 0, count: 0, scored: 0 }
    entry.count += 1
    if (sim.score !== null && sim.score !== undefined) {
      entry.sum += sim.score
      entry.scored += 1
    }
    map.set(key, entry)
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, { sum, count, scored }]) => ({
      key,
      count,
      avgScore: scored > 0 ? Math.round((sum / scored) * 10) / 10 : 0,
    }))
}

// ---------------------------------------------------------------------------
// MetricsEngine
// ---------------------------------------------------------------------------

class MetricsEngine {
  // -------------------------------------------------------------------------
  // processSimulations
  // -------------------------------------------------------------------------
  processSimulations(rawSims: Simulation[]): ProcessSimulationsResult {
    const validation = validationService.validateSimulations(rawSims)

    const filtered = (rawSims ?? []).filter((s) => !isTestUser(s))

    const kpis = computeQuickKPIs(filtered) as QuickKPIs

    return { simulations: filtered, validation, kpis }
  }

  // -------------------------------------------------------------------------
  // getDashboardKPIs
  // -------------------------------------------------------------------------
  getDashboardKPIs(
    sims: Simulation[],
    activities: Activity[],
    members: Member[],
  ): DashboardKPIs {
    return computeDashboardKPIs(sims, activities, members) as DashboardKPIs
  }

  // -------------------------------------------------------------------------
  // getTrend
  // -------------------------------------------------------------------------
  getTrend(sims: Simulation[], maxPoints?: number): TrendPoint[] {
    if (!sims || sims.length === 0) return []
    return computeTrend(sims, maxPoints) as TrendPoint[]
  }

  // -------------------------------------------------------------------------
  // getRoundStats
  // -------------------------------------------------------------------------
  getRoundStats(sims: Simulation[]): RoundStat[] {
    return computeRoundStats(sims) as RoundStat[]
  }

  // -------------------------------------------------------------------------
  // getScoreDistribution
  // -------------------------------------------------------------------------
  getScoreDistribution(sims: Simulation[]): ScoreBucket[] {
    return computeScoreDistribution(sims) as ScoreBucket[]
  }

  // -------------------------------------------------------------------------
  // getUserStats
  // -------------------------------------------------------------------------
  getUserStats(sims: Simulation[]): UserStat[] {
    return computeUserStats(sims) as UserStat[]
  }

  // -------------------------------------------------------------------------
  // getActivityStats
  // -------------------------------------------------------------------------
  getActivityStats(sims: Simulation[], activities: Activity[]): ActivityStat[] {
    return computeActivityStats(sims, activities) as ActivityStat[]
  }

  // -------------------------------------------------------------------------
  // computeGrowth
  // -------------------------------------------------------------------------
  computeGrowth(current: number, previous: number): GrowthResult {
    if (previous === 0) {
      if (current === 0) return { value: 0, direction: 'flat' }
      return { value: 100, direction: 'up' }
    }

    const pct = ((current - previous) / Math.abs(previous)) * 100
    const rounded = Math.round(pct * 10) / 10

    let direction: 'up' | 'down' | 'flat'
    if (Math.abs(rounded) <= 5) {
      direction = 'flat'
    } else if (rounded > 0) {
      direction = 'up'
    } else {
      direction = 'down'
    }

    return { value: rounded, direction }
  }

  // -------------------------------------------------------------------------
  // computeDailyMetrics
  // -------------------------------------------------------------------------
  computeDailyMetrics(sims: Simulation[]): DailyMetric[] {
    if (!sims || sims.length === 0) return []

    const rows = aggregateByKey(sims, (s) => {
      // Normalise to YYYY-MM-DD (drop time component if present)
      return s.date_created.slice(0, 10)
    })

    return rows.map(({ key, count, avgScore }) => ({ date: key, count, avgScore }))
  }

  // -------------------------------------------------------------------------
  // computeWeeklyMetrics
  // -------------------------------------------------------------------------
  computeWeeklyMetrics(sims: Simulation[]): WeeklyMetric[] {
    if (!sims || sims.length === 0) return []

    const rows = aggregateByKey(sims, (s) => {
      const d = parseLocalDate(s.date_created.slice(0, 10))
      return isoWeek(d)
    })

    return rows.map(({ key, count, avgScore }) => ({ week: key, count, avgScore }))
  }

  // -------------------------------------------------------------------------
  // computeMonthlyMetrics
  // -------------------------------------------------------------------------
  computeMonthlyMetrics(sims: Simulation[]): MonthlyMetric[] {
    if (!sims || sims.length === 0) return []

    const rows = aggregateByKey(sims, (s) => {
      return s.date_created.slice(0, 7) // YYYY-MM
    })

    return rows.map(({ key, count, avgScore }) => ({ month: key, count, avgScore }))
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const metricsEngine = new MetricsEngine()
export default MetricsEngine
