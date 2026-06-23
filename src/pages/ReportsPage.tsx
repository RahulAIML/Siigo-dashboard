// ReportsPage.tsx — SIIGO Dashboard
// Reports & Exports page: quick export cards, custom export config, coming-soon features.

import React, { useState, useCallback } from 'react'
import useAppStore from '../store'
import { motion } from 'framer-motion'
import {
  FileText,
  Download,
  Users,
  Trophy,
  Award,
  Calendar,
  Mail,
  BarChart2,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import useDashboardData from '../hooks/useDashboardData'
import {
  exportSummaryCSV,
  exportSimulationsCSV,
  exportLeaderboardCSV,
} from '../lib/csvExport'
import type { Simulation, UserStat, DashboardKPIs } from '../lib/csvExport'
import type { Simulation as ApiSim, UserStat as ApiUserStat, DashboardKPIs as ApiKPIs } from '../api/types'
import { DATA_EPOCH, PASS_THRESHOLD } from '../config/constants'

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  let counter = React.useRef(0)

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = ++counter.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  return { toasts, addToast }
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96 }}
          transition={{ duration: 0.25 }}
          className={[
            'flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
            t.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white',
          ].join(' ')}
        >
          {t.type === 'success' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {t.message}
        </motion.div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Adapters — map API types to csvExport types
// ---------------------------------------------------------------------------

function adaptSims(apiSims: ApiSim[]): Simulation[] {
  return apiSims.map((s) => ({
    ID: s.ID_Sim,
    Usuario_Nombre: s.Usuario_Nombre ?? '',
    Usuario_Email: s.Usuario ?? '',
    Actividad: s.Actividad ?? '',
    Calificacion: s.Calificacion,
    Diagnostico_Final: s.Diagnostico_Final,
    Fecha: s.Fecha_y_Hora ?? '',
  }))
}

function adaptUserStats(apiStats: ApiUserStat[]): UserStat[] {
  return apiStats.map((u) => ({
    nombre: u.name,
    simulaciones: u.count,
    avgScore: u.avgScore,
    passRate: u.passRate,
    bestScore: u.bestScore,
  }))
}

function adaptKPIs(apiKPIs: ApiKPIs): DashboardKPIs {
  const certifiedCount =
    'certifiedCount' in apiKPIs ? (apiKPIs as DashboardKPIs).certifiedCount : 0
  const inProgressCount =
    'inProgressCount' in apiKPIs ? (apiKPIs as DashboardKPIs).inProgressCount : 0
  const strongCount =
    'strongCount' in apiKPIs ? (apiKPIs as DashboardKPIs).strongCount : 0
  const developingCount =
    'developingCount' in apiKPIs ? (apiKPIs as DashboardKPIs).developingCount : 0
  const weakCount =
    'weakCount' in apiKPIs ? (apiKPIs as DashboardKPIs).weakCount : 0

  return {
    totalSimulations: apiKPIs.totalSimulations,
    activeAdvisors: apiKPIs.activeAdvisors,
    averageScore: apiKPIs.averageScore,
    passRate: apiKPIs.passRate,
    certifiedCount,
    inProgressCount,
    strongCount,
    developingCount,
    weakCount,
  }
}

// Build certification CSV rows from simulations
function buildCertificationRows(
  sims: ApiSim[],
  dateFrom: string,
  dateTo: string,
): string {
  const passScore = PASS_THRESHOLD

  const userMap = new Map<
    string,
    { name: string; email: string; attempts: number; bestScore: number | null; passed: boolean }
  >()

  for (const sim of sims) {
    const key = sim.Usuario ?? sim.Usuario_Nombre ?? 'unknown'
    const existing = userMap.get(key)
    const score = sim.Calificacion ?? null

    if (!existing) {
      userMap.set(key, {
        name: sim.Usuario_Nombre ?? '',
        email: sim.Usuario ?? '',
        attempts: 1,
        bestScore: score,
        passed: score !== null && score >= passScore,
      })
    } else {
      existing.attempts += 1
      if (score !== null) {
        if (existing.bestScore === null || score > existing.bestScore) {
          existing.bestScore = score
        }
        if (score >= passScore) existing.passed = true
      }
    }
  }

  const headers = [
    'Nombre',
    'Email',
    'Intentos',
    'Mejor_Puntaje',
    'Estado',
    'Desde',
    'Hasta',
  ]

  const rows = Array.from(userMap.values()).map((u) => [
    u.name,
    u.email,
    u.attempts,
    u.bestScore ?? '',
    u.passed ? 'Certificado' : 'Pendiente',
    dateFrom,
    dateTo,
  ])

  function esc(v: string | number): string {
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
  }

  const allRows = [headers, ...rows]
  return allRows.map((row) => row.map(esc).join(',')).join('\r\n')
}

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Quick Export Card
// ---------------------------------------------------------------------------

interface QuickExportCardProps {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: 'blue' | 'green' | 'amber' | 'violet'
  onExport: () => void
  loading?: boolean
  disabled?: boolean
  language?: 'es' | 'en'
}

const colorMap = {
  blue: {
    bg: 'rgba(0,102,255,0.10)',
    accent: '#0066FF',
    border: 'rgba(0,102,255,0.20)',
  },
  green: {
    bg: 'rgba(16,185,129,0.10)',
    accent: '#10B981',
    border: 'rgba(16,185,129,0.20)',
  },
  amber: {
    bg: 'rgba(245,158,11,0.10)',
    accent: '#F59E0B',
    border: 'rgba(245,158,11,0.20)',
  },
  violet: {
    bg: 'rgba(139,92,246,0.10)',
    accent: '#8B5CF6',
    border: 'rgba(139,92,246,0.20)',
  },
}

function QuickExportCard({
  title,
  description,
  icon: Icon,
  color,
  onExport,
  loading = false,
  disabled = false,
  language = 'es',
}: QuickExportCardProps) {
  const c = colorMap[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={!disabled ? { scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } : undefined}
      whileTap={!disabled ? { scale: 0.985 } : undefined}
      className="rounded-xl bg-card border border-border/50 shadow-sm p-5 flex flex-col gap-4"
      style={{ cursor: disabled ? 'default' : 'pointer' }}
      onClick={!disabled && !loading ? onExport : undefined}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}
        >
          <Icon className="w-5 h-5" style={{ color: c.accent }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>

      <button
        disabled={disabled || loading}
        onClick={(e) => {
          e.stopPropagation()
          if (!disabled && !loading) onExport()
        }}
        className={[
          'w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-150',
          disabled
            ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
            : 'text-white hover:opacity-90 active:scale-95',
        ].join(' ')}
        style={!disabled ? { backgroundColor: c.accent } : undefined}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        {loading ? (language === 'es' ? 'Generando...' : 'Generating...') : (language === 'es' ? 'Descargar CSV' : 'Download CSV')}
      </button>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Coming Soon Card
// ---------------------------------------------------------------------------

function ComingSoonCard({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-xl bg-card/50 border border-border/30 p-5 opacity-50 select-none">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <span className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full uppercase tracking-wide">
              Pronto
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="mt-4 w-full py-2 px-3 rounded-lg bg-muted/40 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3.5 h-3.5" />
        Disponible proximamente
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
      {children}
    </h2>
  )
}

// ---------------------------------------------------------------------------
// ReportsPage
// ---------------------------------------------------------------------------

const today = new Date().toISOString().slice(0, 10)

export default function ReportsPage() {
  const language = useAppStore((s) => s.language)
  const { filteredSims, kpis, userStats, isLoading, effectiveDateFrom, effectiveDateTo } =
    useDashboardData()

  const { toasts, addToast } = useToast()

  // Export config state
  const [configDateFrom, setConfigDateFrom] = useState<string>(DATA_EPOCH)
  const [configDateTo, setConfigDateTo] = useState<string>(today)
  const [generating, setGenerating] = useState(false)

  // Quick export handlers
  const handleExportSummary = useCallback(() => {
    try {
      const adapted = adaptKPIs(kpis)
      exportSummaryCSV(adapted, `siigo-resumen-${effectiveDateFrom}_${effectiveDateTo}.csv`)
      addToast('Resumen ejecutivo descargado correctamente.')
    } catch {
      addToast('Error al generar el archivo.', 'error')
    }
  }, [kpis, effectiveDateFrom, effectiveDateTo, addToast])

  const handleExportSimulations = useCallback(() => {
    try {
      const adapted = adaptSims(filteredSims)
      exportSimulationsCSV(
        adapted,
        `siigo-simulaciones-${effectiveDateFrom}_${effectiveDateTo}.csv`,
      )
      addToast('Detalle de simulaciones descargado correctamente.')
    } catch {
      addToast('Error al generar el archivo.', 'error')
    }
  }, [filteredSims, effectiveDateFrom, effectiveDateTo, addToast])

  const handleExportLeaderboard = useCallback(() => {
    try {
      const adapted = adaptUserStats(userStats)
      exportLeaderboardCSV(
        adapted,
        `siigo-ranking-${effectiveDateFrom}_${effectiveDateTo}.csv`,
      )
      addToast('Ranking de asesores descargado correctamente.')
    } catch {
      addToast('Error al generar el archivo.', 'error')
    }
  }, [userStats, effectiveDateFrom, effectiveDateTo, addToast])

  const handleExportCertification = useCallback(() => {
    try {
      const csv = buildCertificationRows(filteredSims, effectiveDateFrom, effectiveDateTo)
      triggerDownload(
        csv,
        `siigo-certificacion-${effectiveDateFrom}_${effectiveDateTo}.csv`,
      )
      addToast('Reporte de certificacion descargado correctamente.')
    } catch {
      addToast('Error al generar el archivo.', 'error')
    }
  }, [filteredSims, effectiveDateFrom, effectiveDateTo, addToast])

  // Custom config generate
  const handleGenerateCustom = useCallback(() => {
    if (!configDateFrom || !configDateTo) {
      addToast('Selecciona un rango de fechas valido.', 'error')
      return
    }
    if (configDateFrom > configDateTo) {
      addToast('La fecha de inicio no puede ser posterior a la fecha de fin.', 'error')
      return
    }

    setGenerating(true)
    try {
      // Filter sims to custom date range
      const rangeFrom = configDateFrom
      const rangeTo = configDateTo

      const simsInRange = filteredSims.filter((s) => {
        const d = (s.Fecha_y_Hora ?? '').slice(0, 10)
        return d >= rangeFrom && d <= rangeTo
      })

      const adapted = adaptSims(simsInRange)
      exportSimulationsCSV(adapted, `siigo-export-${rangeFrom}_${rangeTo}.csv`)
      addToast(`Exportacion generada: ${simsInRange.length} simulaciones.`)
    } catch {
      addToast('Error al generar la exportacion.', 'error')
    } finally {
      setGenerating(false)
    }
  }, [configDateFrom, configDateTo, filteredSims, addToast])

  return (
    <div className="flex flex-col gap-8 p-6 max-w-5xl mx-auto w-full">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-1"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {language === 'es' ? 'Reportes & Exportaciones' : 'Reports & Exports'}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          {language === 'es'
            ? 'Descarga datos de rendimiento, simulaciones y certificaciones en formato CSV.'
            : 'Download performance data, simulations, and certifications in CSV format.'}
        </p>
      </motion.div>

      {/* ── Quick export cards ────────────────────────────────────────────── */}
      <section>
        <SectionTitle>{language === 'es' ? 'Exportación rápida' : 'Quick export'}</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickExportCard
            title={language === 'es' ? 'Resumen Ejecutivo' : 'Executive Summary'}
            description={language === 'es' ? 'KPIs principales del periodo activo: simulaciones, aprobación, promedio.' : 'Key KPIs for the active period: simulations, pass rate, avg score.'}
            icon={BarChart2}
            color="blue"
            language={language}
            onExport={handleExportSummary}
            disabled={isLoading}
          />
          <QuickExportCard
            title={language === 'es' ? 'Detalle de Simulaciones' : 'Simulation Detail'}
            description={language === 'es' ? 'Todas las sesiones con usuario, puntaje, diagnóstico y fecha.' : 'All sessions with user, score, diagnosis, and date.'}
            icon={FileText}
            color="green"
            language={language}
            onExport={handleExportSimulations}
            disabled={isLoading}
          />
          <QuickExportCard
            title={language === 'es' ? 'Ranking de Asesores' : 'Advisor Ranking'}
            description={language === 'es' ? 'Clasificación de asesores por puntaje promedio y tasa de aprobación.' : 'Advisor ranking by average score and pass rate.'}
            icon={Trophy}
            color="amber"
            language={language}
            onExport={handleExportLeaderboard}
            disabled={isLoading || userStats.length === 0}
          />
          <QuickExportCard
            title={language === 'es' ? 'Reporte de Certificación' : 'Certification Report'}
            description={language === 'es' ? 'Estado de certificación por asesor: quién pasó y quién está pendiente.' : 'Certification status per advisor: who passed and who is pending.'}
            icon={Award}
            color="violet"
            language={language}
            onExport={handleExportCertification}
            disabled={isLoading}
          />
        </div>
      </section>

      {/* ── Export configuration ──────────────────────────────────────────── */}
      <section>
        <SectionTitle>{language === 'es' ? 'Configuración de exportación' : 'Export configuration'}</SectionTitle>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-xl bg-card border border-border/50 shadow-sm p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {/* Date from */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Desde
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="date"
                  value={configDateFrom}
                  min={DATA_EPOCH}
                  max={today}
                  onChange={(e) => setConfigDateFrom(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
            </div>

            {/* Date to */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Hasta
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="date"
                  value={configDateTo}
                  min={DATA_EPOCH}
                  max={today}
                  onChange={(e) => setConfigDateTo(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
            </div>

            {/* Format selector + button */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Formato
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <select
                    className="w-full py-2 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    defaultValue="csv"
                    disabled
                  >
                    <option value="csv">CSV</option>
                    <option value="pdf" disabled>
                      PDF (proximamente)
                    </option>
                  </select>
                </div>
                <button
                  onClick={handleGenerateCustom}
                  disabled={generating || isLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all duration-150 active:scale-95 whitespace-nowrap"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {generating ? 'Generando...' : 'Generar y Descargar'}
                </button>
              </div>
            </div>
          </div>

          {/* Info note */}
          <p className="mt-4 text-xs text-muted-foreground">
            La exportacion personalizada incluye el detalle completo de simulaciones filtrado por el
            rango de fechas seleccionado. El filtro de asesor y actividad del panel principal tambien
            se aplica.
          </p>
        </motion.div>
      </section>

      {/* ── Coming soon ───────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>{language === 'es' ? 'Funcionalidades en desarrollo' : 'Features in development'}</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ComingSoonCard
            title="Reportes por Email"
            description="Recibe un resumen automatico semanal directamente en tu bandeja de entrada."
            icon={Mail}
          />
          <ComingSoonCard
            title="Integracion PowerBI"
            description="Conecta el dashboard directamente con tus reportes de PowerBI via API."
            icon={BarChart2}
          />
          <ComingSoonCard
            title="Resumen Semanal"
            description="Email automatico cada lunes con el rendimiento del equipo de la semana anterior."
            icon={Users}
          />
        </div>
      </section>

      {/* ── Toast container ───────────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} />
    </div>
  )
}
