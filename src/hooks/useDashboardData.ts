import { useMemo } from 'react'
import useAppStore from '../store/index'
import { useSimulations, useActivities, useMembers } from '../api/queries'
import { resolveEffectiveDates } from '../lib/dateUtils'
import { metricsEngine } from '../services/MetricsEngine'
import { buildAIContext } from '../lib/analytics'
import type {
  Simulation,
  Activity,
  Member,
  DashboardKPIs,
  TrendPoint,
  RoundStat,
  ScoreBucket,
  UserStat,
  ActivityStat,
} from '../api/types'

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface DashboardData {
  // Raw
  simulations: Simulation[]
  activities: Activity[]
  members: Member[]

  // Computed
  kpis: DashboardKPIs
  trend: TrendPoint[]
  roundStats: RoundStat[]
  scoreDistribution: ScoreBucket[]
  userStats: UserStat[]
  activityStats: ActivityStat[]
  aiContext: string

  // Filtered
  filteredSims: Simulation[]

  // Loading states
  isLoading: boolean
  isError: boolean
  error: Error | null

  // Dates
  effectiveDateFrom: string
  effectiveDateTo: string
}

// ---------------------------------------------------------------------------
// Empty/fallback values so every field is always defined
// ---------------------------------------------------------------------------

const EMPTY_KPIs: DashboardKPIs = {
  totalSimulations: 0,
  averageScore: 0,
  passRate: 0,
  activeAdvisors: 0,
  passCount: 0,
  failCount: 0,
  bestScore: 0,
  worstScore: 0,
  totalActivities: 0,
  totalMembers: 0,
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export default function useDashboardData(): DashboardData {
  // ── 1. Read filter state from Zustand store ──────────────────────────────
  const dateFrom        = useAppStore((s) => s.dateFrom)
  const dateTo          = useAppStore((s) => s.dateTo)
  const selectedMember  = useAppStore((s) => s.selectedMember)
  const selectedActivity = useAppStore((s) => s.selectedActivity)

  // ── 2. Resolve effective date range ──────────────────────────────────────
  const { from: effectiveDateFrom, to: effectiveDateTo } = useMemo(
    () => resolveEffectiveDates(dateFrom ?? null, dateTo ?? null),
    [dateFrom, dateTo],
  )

  // ── 3. Query all data ─────────────────────────────────────────────────────
  const simsQuery       = useSimulations(effectiveDateFrom, effectiveDateTo)
  const activitiesQuery = useActivities()
  const membersQuery    = useMembers()

  const simulations: Simulation[]  = simsQuery.data       ?? []
  const activities:  Activity[]    = activitiesQuery.data ?? []
  const members:     Member[]      = membersQuery.data    ?? []

  const isLoading =
    simsQuery.isLoading || activitiesQuery.isLoading || membersQuery.isLoading

  const isError =
    simsQuery.isError || activitiesQuery.isError || membersQuery.isError

  const error: Error | null =
    (simsQuery.error as Error | null) ??
    (activitiesQuery.error as Error | null) ??
    (membersQuery.error as Error | null)

  // ── 4a. Filter simulations by member / activity ───────────────────────────
  const filteredSims: Simulation[] = useMemo(() => {
    let result = simulations

    if (selectedMember) {
      result = result.filter(
        (s) =>
          String(s.Usuario_ID ?? '') === String(selectedMember) ||
          (s.Usuario ?? '') === String(selectedMember),
      )
    }

    if (selectedActivity) {
      result = result.filter(
        (s) =>
          String(s.ID_Caso_de_Uso ?? '') === String(selectedActivity) ||
          (s.Actividad ?? '') === String(selectedActivity),
      )
    }

    return result
  }, [simulations, selectedMember, selectedActivity])

  // ── 4b. Analytics computations (each has isolated deps) ──────────────────

  const kpis: DashboardKPIs = useMemo(() => {
    if (filteredSims.length === 0 && activities.length === 0 && members.length === 0) {
      return EMPTY_KPIs
    }
    return metricsEngine.getDashboardKPIs(
      filteredSims as Parameters<typeof metricsEngine.getDashboardKPIs>[0],
      activities   as Parameters<typeof metricsEngine.getDashboardKPIs>[1],
      members      as Parameters<typeof metricsEngine.getDashboardKPIs>[2],
    ) as DashboardKPIs
  }, [filteredSims, activities, members])

  const trend: TrendPoint[] = useMemo(() => {
    if (filteredSims.length === 0) return []
    return metricsEngine.getTrend(
      filteredSims as Parameters<typeof metricsEngine.getTrend>[0],
    ) as TrendPoint[]
  }, [filteredSims])

  const roundStats: RoundStat[] = useMemo(() => {
    if (filteredSims.length === 0) return []
    return metricsEngine.getRoundStats(
      filteredSims as Parameters<typeof metricsEngine.getRoundStats>[0],
    ) as RoundStat[]
  }, [filteredSims])

  const scoreDistribution: ScoreBucket[] = useMemo(() => {
    if (filteredSims.length === 0) return []
    return metricsEngine.getScoreDistribution(
      filteredSims as Parameters<typeof metricsEngine.getScoreDistribution>[0],
    ) as ScoreBucket[]
  }, [filteredSims])

  const userStats: UserStat[] = useMemo(() => {
    if (filteredSims.length === 0) return []
    return metricsEngine.getUserStats(
      filteredSims as Parameters<typeof metricsEngine.getUserStats>[0],
    ) as UserStat[]
  }, [filteredSims])

  const activityStats: ActivityStat[] = useMemo(() => {
    if (filteredSims.length === 0) return []
    return metricsEngine.getActivityStats(
      filteredSims as Parameters<typeof metricsEngine.getActivityStats>[0],
      activities   as Parameters<typeof metricsEngine.getActivityStats>[1],
    ) as ActivityStat[]
  }, [filteredSims, activities])

  const aiContext: string = useMemo(() => {
    if (filteredSims.length === 0) return ''
    return buildAIContext(kpis, filteredSims, activities, activityStats, userStats)
  }, [kpis, filteredSims, activities, activityStats, userStats])

  // ── 5. Return clean data object ───────────────────────────────────────────
  return {
    // Raw
    simulations,
    activities,
    members,

    // Computed
    kpis,
    trend,
    roundStats,
    scoreDistribution,
    userStats,
    activityStats,
    aiContext,

    // Filtered
    filteredSims,

    // Loading states
    isLoading,
    isError,
    error,

    // Dates
    effectiveDateFrom,
    effectiveDateTo,
  }
}
