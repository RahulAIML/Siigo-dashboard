// certification.ts — SIIGO Dashboard
// Certification logic for the SIIGO Gastrobar simulator programme.

import type { Simulation } from '../services/ValidationService'

// ---------------------------------------------------------------------------
// Activity catalogue
// ---------------------------------------------------------------------------

export interface Activity {
  ID: number
  name: string
  category: string
  interactions: number
  lang: string
  available: number
}

export const SIIGO_ACTIVITIES: Activity[] = [
  {
    ID: 3200,
    name: 'Simulador Siigo Gastrobar',
    category: 'SIM',
    interactions: 0,
    lang: 'es_MX',
    available: 1,
  },
]

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CERT_WINDOW = { from: '2026-06-01', to: '2026-12-31' }
export const CERT_PASS_SCORE = 80

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface CertStatus {
  activityId: number
  activityName: string
  attempted: boolean
  bestScore: number | null
  passed: boolean
  attempts: number
}

export interface UserCertification {
  userName: string
  userId: string | null
  certified: boolean
  activities: CertStatus[]
  overallBestScore: number | null
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Extended simulation shape that may carry an optional user_id field. */
type SimWithUserId = Simulation & { user_id?: string | number | null }

function resolveActivityName(activityId: number): string {
  const activity = SIIGO_ACTIVITIES.find((a) => a.ID === activityId)
  return activity ? activity.name : `Activity ${activityId}`
}

/**
 * Build a grouping key for a simulation. Prefers user_id when present,
 * falls back to user_name (lowercased and trimmed).
 */
function userKey(sim: SimWithUserId): string {
  if (sim.user_id != null && String(sim.user_id).trim() !== '') {
    return `id:${sim.user_id}`
  }
  return `name:${(sim.user_name ?? 'unknown').trim().toLowerCase()}`
}

// ---------------------------------------------------------------------------
// computeCertification
// ---------------------------------------------------------------------------

/**
 * Group simulations by user, compute certification status for the given
 * activity, and return users sorted by certified (desc), then overallBestScore (desc).
 */
export function computeCertification(
  sims: Simulation[],
  activityId = 3200,
): UserCertification[] {
  const activityName = resolveActivityName(activityId)

  // Group sims by user key
  const groups = new Map<
    string,
    { userName: string; userId: string | null; activitySims: SimWithUserId[] }
  >()

  for (const raw of sims) {
    const sim = raw as SimWithUserId
    const key = userKey(sim)

    if (!groups.has(key)) {
      const userId =
        sim.user_id != null && String(sim.user_id).trim() !== ''
          ? String(sim.user_id)
          : null
      const userName = (sim.user_name ?? 'Unknown').trim() || 'Unknown'
      groups.set(key, { userName, userId, activitySims: [] })
    }

    groups.get(key)!.activitySims.push(sim)
  }

  // Build UserCertification records
  const results: UserCertification[] = []

  for (const { userName, userId, activitySims } of groups.values()) {
    const validScores = activitySims
      .map((s) => s.score)
      .filter((s): s is number => s !== null && s !== undefined && !isNaN(s))

    const attempted = activitySims.length > 0
    const bestScore = validScores.length > 0 ? Math.max(...validScores) : null
    const passed = bestScore !== null && bestScore >= CERT_PASS_SCORE

    const certStatus: CertStatus = {
      activityId,
      activityName,
      attempted,
      bestScore,
      passed,
      attempts: activitySims.length,
    }

    const overallBestScore = bestScore

    results.push({
      userName,
      userId,
      certified: passed,
      activities: [certStatus],
      overallBestScore,
    })
  }

  // Sort: certified desc, then overallBestScore desc (nulls last)
  results.sort((a, b) => {
    if (a.certified !== b.certified) {
      return a.certified ? -1 : 1
    }
    const scoreA = a.overallBestScore ?? -Infinity
    const scoreB = b.overallBestScore ?? -Infinity
    return scoreB - scoreA
  })

  return results
}

// ---------------------------------------------------------------------------
// getActivityCertStats
// ---------------------------------------------------------------------------

export interface ActivityCertStats {
  total: number
  certified: number
  certRate: number
  avgBestScore: number
}

/**
 * Aggregate certification statistics across all users for the given activity.
 */
export function getActivityCertStats(
  sims: Simulation[],
  activityId = 3200,
): ActivityCertStats {
  const certifications = computeCertification(sims, activityId)

  const total = certifications.length
  const certified = certifications.filter((u) => u.certified).length
  const certRate = total > 0 ? (certified / total) * 100 : 0

  const bestScores = certifications
    .map((u) => u.overallBestScore)
    .filter((s): s is number => s !== null)

  const avgBestScore =
    bestScores.length > 0
      ? bestScores.reduce((sum, s) => sum + s, 0) / bestScores.length
      : 0

  return {
    total,
    certified,
    certRate: Math.round(certRate * 100) / 100,
    avgBestScore: Math.round(avgBestScore * 100) / 100,
  }
}
