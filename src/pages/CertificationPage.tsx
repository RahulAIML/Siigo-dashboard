import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Award,
  Users,
  TrendingUp,
  Star,
  CheckCircle2,
  Clock,
  CalendarRange,
  ShieldCheck,
} from 'lucide-react'
import { KPICard } from '../components/ui/KPICard'
import useDashboardData from '../hooks/useDashboardData'
import useAppStore from '../store/index'
import { t } from '../lib/i18n'
import {
  computeCertification,
  getActivityCertStats,
  CERT_WINDOW,
  CERT_PASS_SCORE,
  SIIGO_ACTIVITIES,
} from '../lib/certification'
import type { Simulation as ApiSimulation } from '../api/types'
import type { Simulation as ValSimulation } from '../services/ValidationService'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTIVITY_ID = 3200

/** Map an api/types Simulation → ValidationService.Simulation for certification logic */
function toValSim(s: ApiSimulation): ValSimulation {
  return {
    session_id:   s.ID_Sim,
    score:        s.Calificacion ?? null,
    date_created: s.Fecha_y_Hora?.substring(0, 10) ?? '',
    user_name:    s.Usuario_Nombre ?? null,
  }
}

/** Format a date string (YYYY-MM-DD or ISO) into a locale-friendly display */
function fmtDate(iso: string | undefined | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-CO', {
    year:  'numeric',
    month: 'short',
    day:   '2-digit',
  })
}

/** Find the date of the first session that hit >= CERT_PASS_SCORE for a user */
function certificationDate(
  userName: string,
  allSims: ApiSimulation[],
): string | null {
  const userSims = allSims
    .filter(
      (s) =>
        s.ID_Caso_de_Uso === ACTIVITY_ID &&
        (s.Usuario_Nombre ?? '').trim().toLowerCase() ===
          userName.trim().toLowerCase() &&
        (s.Calificacion ?? 0) >= CERT_PASS_SCORE,
    )
    .sort((a, b) =>
      (a.Fecha_y_Hora ?? '').localeCompare(b.Fecha_y_Hora ?? ''),
    )

  return userSims[0]?.Fecha_y_Hora?.substring(0, 10) ?? null
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ProgressBarProps {
  value: number   // 0–100
  color?: string  // tailwind bg class or hex
  label?: string
}

function ProgressBar({ value, color = 'bg-emerald-500', label }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        {label && (
          <span className="text-xs text-muted-foreground">{label}</span>
        )}
        <span className="text-xs font-semibold text-foreground ml-auto">
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CertificationPage() {
  const lang = useAppStore((s) => s.language)

  const { simulations, isLoading, isError } = useDashboardData()

  // Filter simulations to certification window and activity 3200
  const certSims: ApiSimulation[] = useMemo(() => {
    return simulations.filter((s) => {
      if (s.ID_Caso_de_Uso !== ACTIVITY_ID) return false
      const dateStr = s.Fecha_y_Hora?.substring(0, 10) ?? ''
      return dateStr >= CERT_WINDOW.from && dateStr <= CERT_WINDOW.to
    })
  }, [simulations])

  // Map to ValidationService.Simulation for certification functions
  const valSims: ValSimulation[] = useMemo(
    () => certSims.map(toValSim),
    [certSims],
  )

  // Aggregate stats
  const stats = useMemo(
    () => getActivityCertStats(valSims, ACTIVITY_ID),
    [valSims],
  )

  // Per-user certification list
  const userCerts = useMemo(
    () => computeCertification(valSims, ACTIVITY_ID),
    [valSims],
  )

  const certifiedUsers = useMemo(
    () => userCerts.filter((u) => u.certified),
    [userCerts],
  )

  const pendingUsers = useMemo(
    () => userCerts.filter((u) => !u.certified),
    [userCerts],
  )

  const activity = SIIGO_ACTIVITIES.find((a) => a.ID === ACTIVITY_ID)!

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6 w-full animate-pulse">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-40 rounded-xl bg-muted" />
        <div className="h-64 rounded-xl bg-muted" />
        <div className="h-64 rounded-xl bg-muted" />
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
        {t('error', lang)}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6 w-full max-w-screen-xl mx-auto">

      {/* ── Section 1: Page header ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              {t('certification', lang)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {activity.name}
            </p>
          </div>
        </div>

        {/* Certification window badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border/60 bg-card shadow-sm">
          <CalendarRange className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-medium text-muted-foreground">
            {lang === 'es' ? 'Ventana de certificación' : 'Certification window'}
            {': '}
          </span>
          <span className="text-xs font-semibold text-foreground">
            {fmtDate(CERT_WINDOW.from)} — {fmtDate(CERT_WINDOW.to)}
          </span>
        </div>
      </motion.div>

      {/* ── Section 2: Summary KPI cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title={lang === 'es' ? 'Asesores inscritos' : 'Enrolled advisors'}
          value={stats.total}
          icon={Users}
          color="blue"
          subtitle={
            lang === 'es'
              ? `${certSims.length} simulaciones en ventana`
              : `${certSims.length} simulations in window`
          }
        />
        <KPICard
          title={t('certified', lang)}
          value={stats.certified}
          icon={Award}
          color="green"
          subtitle={
            lang === 'es'
              ? `de ${stats.total} asesores`
              : `of ${stats.total} advisors`
          }
        />
        <KPICard
          title={lang === 'es' ? 'Tasa de certificación' : 'Certification rate'}
          value={`${stats.certRate.toFixed(1)}%`}
          icon={TrendingUp}
          color={stats.certRate >= 80 ? 'green' : stats.certRate >= 50 ? 'amber' : 'red'}
        />
        <KPICard
          title={lang === 'es' ? 'Promedio mejor puntaje' : 'Avg best score'}
          value={stats.avgBestScore > 0 ? stats.avgBestScore.toFixed(1) : '—'}
          icon={Star}
          color="violet"
          subtitle={`${lang === 'es' ? 'Umbral' : 'Threshold'}: ${CERT_PASS_SCORE}%`}
        />
      </div>

      {/* ── Section 3: Activity certification card ────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-xl bg-card border border-border/50 shadow-sm p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <h2 className="text-base font-semibold text-foreground">
            {lang === 'es' ? 'Simulador de certificación' : 'Certification simulator'}
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Activity info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {activity.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              ID {activity.ID} &middot; {activity.category} &middot; {activity.lang}
            </p>
          </div>

          {/* Threshold badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {lang === 'es' ? 'Umbral' : 'Threshold'}: {CERT_PASS_SCORE}%
            </span>
          </div>

          {/* Certified / total counter */}
          <div className="text-right min-w-[80px]">
            <span className="text-lg font-bold text-foreground">
              {stats.certified}
            </span>
            <span className="text-sm text-muted-foreground">
              /{stats.total}
            </span>
            <p className="text-xs text-muted-foreground">
              {lang === 'es' ? 'asesores' : 'advisors'}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <ProgressBar
            value={stats.certRate}
            color={
              stats.certRate >= 80
                ? 'bg-emerald-500'
                : stats.certRate >= 50
                ? 'bg-amber-500'
                : 'bg-red-500'
            }
            label={lang === 'es' ? 'Progreso de certificación' : 'Certification progress'}
          />
        </div>
      </motion.div>

      {/* ── Sections 4 & 5: Certified + Pending lists ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Section 4: Certified advisors */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-xl bg-card border border-border/50 shadow-sm p-5 flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h2 className="text-base font-semibold text-foreground">
                {t('certified', lang)}
              </h2>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {certifiedUsers.length}
            </span>
          </div>

          {certifiedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('noData', lang)}
            </p>
          ) : (
            <ul className="flex flex-col gap-2 overflow-y-auto max-h-[420px] pr-1">
              {certifiedUsers.map((u, i) => {
                const certDate = certificationDate(u.userName, simulations)
                return (
                  <motion.li
                    key={u.userId ?? u.userName}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15 hover:bg-emerald-500/10 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />

                    {/* Name */}
                    <span className="flex-1 text-sm font-medium text-foreground truncate">
                      {u.userName}
                    </span>

                    {/* Best score */}
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {u.overallBestScore !== null
                        ? `${u.overallBestScore.toFixed(1)}%`
                        : '—'}
                    </span>

                    {/* Certification date */}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(certDate)}
                    </span>
                  </motion.li>
                )
              })}
            </ul>
          )}
        </motion.div>

        {/* Section 5: Pending advisors */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-xl bg-card border border-border/50 shadow-sm p-5 flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-semibold text-foreground">
                {t('notCertified', lang)}
              </h2>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              {pendingUsers.length}
            </span>
          </div>

          {pendingUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {lang === 'es'
                ? 'Todos los asesores están certificados'
                : 'All advisors are certified'}
            </p>
          ) : (
            <ul className="flex flex-col gap-2 overflow-y-auto max-h-[420px] pr-1">
              {pendingUsers.map((u, i) => {
                const actStatus = u.activities[0]
                const scoreLabel =
                  actStatus?.bestScore !== null && actStatus?.bestScore !== undefined
                    ? `${actStatus.bestScore.toFixed(1)}%`
                    : lang === 'es'
                    ? 'Sin intentos'
                    : 'Not attempted'

                return (
                  <motion.li
                    key={u.userId ?? u.userName}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/10 transition-colors"
                  >
                    <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />

                    {/* Name */}
                    <span className="flex-1 text-sm font-medium text-foreground truncate">
                      {u.userName}
                    </span>

                    {/* Best score or "Not attempted" */}
                    <span
                      className={[
                        'text-sm font-semibold tabular-nums',
                        actStatus?.attempted
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-muted-foreground italic',
                      ].join(' ')}
                    >
                      {scoreLabel}
                    </span>

                    {/* Attempts count */}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {actStatus?.attempts ?? 0}{' '}
                      {t('attempts', lang).toLowerCase()}
                    </span>
                  </motion.li>
                )
              })}
            </ul>
          )}
        </motion.div>
      </div>
    </div>
  )
}
