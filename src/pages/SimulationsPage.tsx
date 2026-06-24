// SimulationsPage.tsx — SIIGO Dashboard
// Full simulations table with search, filters, sort, pagination, row expansion, and PDF report modal.

import React, { useState, useMemo, useCallback } from 'react'
import useDashboardData from '../hooks/useDashboardData'
import { useDebounce } from '../lib/useDebounce'
import { exportSimulationsCSV } from '../lib/csvExport'
import { downloadSimReport } from '../lib/reportPdf'
import { cn } from '../lib/cn'
import { useAppStore } from '../store'
import { t } from '../lib/i18n'
import type { Simulation } from '../api/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number | null): string {
  if (score === null || score === undefined) return 'text-slate-400'
  if (score >= 70) return 'text-emerald-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-red-400'
}

function parseDbDate(raw: string): Date {
  // MySQL returns "2026-06-23 21:05:05" — replace space with T so JS parses it
  // as local time rather than producing an invalid date
  return new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'))
}

function formatDate(raw: string | null | undefined, lang: 'es' | 'en'): string {
  if (!raw) return '—'
  const d = parseDbDate(raw)
  if (isNaN(d.getTime())) return raw
  return d.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateTime(raw: string | null | undefined, lang: 'es' | 'en'): string {
  if (!raw) return '—'
  const d = parseDbDate(raw)
  if (isNaN(d.getTime())) return raw
  return d.toLocaleString(lang === 'es' ? 'es-MX' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function stripHtml(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    // Remove style/script elements entirely
    doc.querySelectorAll('style,script').forEach((el) => el.remove())
    return (doc.body.textContent ?? '').trim()
  } catch {
    return html.replace(/<[^>]+>/g, '').trim()
  }
}

function buildSimDetails(sim: Simulation) {
  const details: { sequence: number; ai_question: string; user_response: string; feedback: string | null }[] = []
  for (let i = 1; i <= 20; i++) {
    const q = sim[`Pregunta_${i}` as keyof Simulation] as string | null
    const r = sim[`Respuesta_${i}` as keyof Simulation] as string | null
    const f = sim[`Retroalimentacion_${i}` as keyof Simulation] as string | null
    if (q || r) {
      details.push({
        sequence:      i,
        ai_question:   stripHtml(q ?? '—'),
        user_response: stripHtml(r ?? '—'),
        feedback:      f ? stripHtml(f) : null,
      })
    }
  }
  return details
}

// ---------------------------------------------------------------------------
// PassFailBadge
// ---------------------------------------------------------------------------

function PassFailBadge({ value, language }: { value: 'si' | 'no' | null; language: 'es' | 'en' }) {
  if (value === 'si') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        {t('pass', language)}
      </span>
    )
  }
  if (value === 'no') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
        {t('fail', language)}
      </span>
    )
  }
  return <span className="text-slate-500 text-xs">—</span>
}

// ---------------------------------------------------------------------------
// SimReportModal
// ---------------------------------------------------------------------------

interface SimReportModalProps {
  sim: Simulation
  onClose: () => void
  language: 'es' | 'en'
}

function SimReportModal({ sim, onClose, language }: SimReportModalProps) {
  const [downloading, setDownloading] = useState(false)
  const details = buildSimDetails(sim)

  const handlePDF = useCallback(async () => {
    setDownloading(true)
    try {
      await downloadSimReport(
        {
          session_id: sim.ID_Sim,
          score: sim.Calificacion,
          date_created: sim.Fecha_y_Hora,
          user_name: sim.Usuario_Nombre,
          activity_name: sim.Actividad,
          activity_id: sim.ID_Caso_de_Uso,
          result: sim.Diagnostico_Final === 'si' ? 'Aprobado' : sim.Diagnostico_Final === 'no' ? 'No aprobado' : null,
          closing_analysis: sim.closing_analysis,
        },
        details.map((d) => ({
          sequence: d.sequence,
          ai_question: d.ai_question,
          user_response: d.user_response,
          feedback: d.feedback,
        })),
        'es',
      )
    } finally {
      setDownloading(false)
    }
  }, [sim, details])

  // Trap focus / close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-white">{t('simulationReport', language)}</h2>
            <p className="text-xs text-slate-400 mt-0.5">ID #{sim.ID_Sim} — {sim.Actividad}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Session metadata */}
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{t('sessionInfo', language)}</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-slate-500">{t('advisorLabel', language)}: </span>
              <span className="text-slate-200">{sim.Usuario_Nombre || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500">{t('activity', language)}: </span>
              <span className="text-slate-200">{sim.Actividad || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500">{t('score', language)}: </span>
              <span className={cn('font-semibold', scoreColor(sim.Calificacion))}>
                {sim.Calificacion !== null && sim.Calificacion !== undefined ? `${sim.Calificacion} / 100` : '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">{t('result', language)}: </span>
              <PassFailBadge value={sim.Diagnostico_Final} language={language} />
            </div>
            <div>
              <span className="text-slate-500">{t('date', language)}: </span>
              <span className="text-slate-200">{formatDateTime(sim.Fecha_y_Hora, language)}</span>
            </div>
            <div>
              <span className="text-slate-500">{t('sessionId', language)}: </span>
              <span className="text-slate-400 font-mono text-xs">{sim.ID_Sim}</span>
            </div>
          </div>
        </div>

        {/* Interaction details */}
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{t('interactionDetails', language)}</h3>
          {details.length === 0 ? (
            <p className="text-sm text-slate-500 italic">{t('noInteractionDetail', language)}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {details.map((d) => (
                <div key={d.sequence} className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">
                      {d.sequence}
                    </span>
                    <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wide">
                      {t('interaction', language)} #{d.sequence}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('aiQuestion', language)}</p>
                      <p className="text-sm text-slate-200 leading-relaxed">{d.ai_question}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('advisorResponse', language)}</p>
                      <p className="text-sm text-slate-200 leading-relaxed">{d.user_response}</p>
                    </div>
                    {d.feedback && (
                      <div className="rounded-lg bg-slate-700/40 border border-slate-600/40 p-3">
                        <p className="text-xs font-semibold text-amber-400/80 uppercase tracking-wide mb-1">{t('feedbackLabel', language)}</p>
                        <p className="text-sm text-slate-300 leading-relaxed">{d.feedback}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Closing analysis — rendered as iframe to preserve full platform HTML styling */}
        {sim.closing_analysis && sim.closing_analysis.trim().length > 0 && (
          <div className="px-6 py-4 border-b border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{t('closingAnalysis', language)}</h3>
            <iframe
              srcDoc={sim.closing_analysis}
              title="Closing Analysis"
              sandbox="allow-same-origin"
              className="w-full rounded-lg border border-slate-700"
              style={{ height: 520, background: '#fff' }}
            />
          </div>
        )}

        {/* Footer actions */}
        <div className="sticky bottom-0 px-6 py-4 bg-slate-900 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
          >
            {t('close', language)}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Expanded row detail panel
// ---------------------------------------------------------------------------

function ExpandedRow({ sim, language }: { sim: Simulation; language: 'es' | 'en' }) {
  const details = buildSimDetails(sim)

  if (details.length === 0) {
    return (
      <div className="px-6 py-4 text-sm text-[var(--color-muted)] italic">
        {t('noInteractionDetail', language)}
      </div>
    )
  }

  return (
    <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {details.map((d) => (
        <div key={d.sequence} className="rounded-xl bg-[var(--color-bg-alt)] border border-[var(--color-line)] p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600/80 text-white text-xs font-bold">
              {d.sequence}
            </span>
            <span className="text-xs font-semibold text-indigo-400">{t('interaction', language)} #{d.sequence}</span>
          </div>
          <p className="text-xs text-[var(--color-muted)] font-medium mb-0.5">{t('aiQuestion', language)}</p>
          <p className="text-xs text-[var(--color-fg)] mb-2 line-clamp-2">{d.ai_question}</p>
          <p className="text-xs text-[var(--color-muted)] font-medium mb-0.5">{t('result', language)}</p>
          <p className="text-xs text-[var(--color-fg)] line-clamp-2">{d.user_response}</p>
          {d.feedback && (
            <>
              <p className="text-xs text-amber-500 font-medium mt-2 mb-0.5">{t('feedbackLabel', language)}</p>
              <p className="text-xs text-[var(--color-muted)] line-clamp-2">{d.feedback}</p>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sort types
// ---------------------------------------------------------------------------

type SortKey = 'score' | 'date'
type SortDir = 'asc' | 'desc'

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SimulationsPage() {
  const language = useAppStore((s) => s.language)
  const { filteredSims, activities, isLoading, isError } = useDashboardData()

  // ── Local filter state ────────────────────────────────────────────────────
  const [searchRaw, setSearchRaw] = useState('')
  const [activityFilter, setActivityFilter] = useState<string>('all')
  const [resultFilter, setResultFilter] = useState<'all' | 'passed' | 'failed'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)

  // ── Row expansion & modal state ───────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [modalSim, setModalSim] = useState<Simulation | null>(null)

  // ── Debounced search ──────────────────────────────────────────────────────
  const search = useDebounce(searchRaw, 300)

  // ── Unique activity names from the currently filtered sims ────────────────
  const activityOptions = useMemo(() => {
    const names = new Set<string>()
    filteredSims.forEach((s) => { if (s.Actividad) names.add(s.Actividad) })
    return Array.from(names).sort()
  }, [filteredSims])

  // ── Filtered + sorted sims ────────────────────────────────────────────────
  const displaySims = useMemo(() => {
    let result = filteredSims

    // Search by user name (case-insensitive)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((s) => (s.Usuario_Nombre ?? '').toLowerCase().includes(q))
    }

    // Activity filter
    if (activityFilter !== 'all') {
      result = result.filter((s) => s.Actividad === activityFilter)
    }

    // Result filter
    if (resultFilter === 'passed') {
      result = result.filter((s) => s.Diagnostico_Final === 'si')
    } else if (resultFilter === 'failed') {
      result = result.filter((s) => s.Diagnostico_Final === 'no')
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortKey === 'score') {
        const sa = a.Calificacion ?? -1
        const sb = b.Calificacion ?? -1
        return sortDir === 'asc' ? sa - sb : sb - sa
      } else {
        const da = new Date(a.Fecha_y_Hora ?? 0).getTime()
        const db = new Date(b.Fecha_y_Hora ?? 0).getTime()
        return sortDir === 'asc' ? da - db : db - da
      }
    })

    return result
  }, [filteredSims, search, activityFilter, resultFilter, sortKey, sortDir])

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(displaySims.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const pageEnd = pageStart + PAGE_SIZE
  const pageSims = displaySims.slice(pageStart, pageEnd)

  // Reset to page 1 when filters change
  const handleSearchChange = (v: string) => { setSearchRaw(v); setPage(1) }
  const handleActivityChange = (v: string) => { setActivityFilter(v); setPage(1) }
  const handleResultChange = (v: 'all' | 'passed' | 'failed') => { setResultFilter(v); setPage(1) }

  // ── Sort toggle ───────────────────────────────────────────────────────────
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
    setPage(1)
  }

  // ── CSV export ────────────────────────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    exportSimulationsCSV(
      displaySims.map((s) => ({
        ID: s.ID_Sim,
        Usuario_Nombre: s.Usuario_Nombre ?? '',
        Usuario_Email: s.Usuario ?? '',
        Actividad: s.Actividad ?? '',
        Calificacion: s.Calificacion,
        Diagnostico_Final: s.Diagnostico_Final,
        Fecha: s.Fecha_y_Hora ?? '',
      })),
      'siigo-simulations.csv',
    )
  }, [displaySims])

  // ── Row expand toggle ─────────────────────────────────────────────────────
  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  // ── Sort indicator ────────────────────────────────────────────────────────
  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-[var(--color-muted)]" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5 10a1 1 0 011-1h8a1 1 0 010 2H6a1 1 0 01-1-1zM3 6a1 1 0 011-1h12a1 1 0 010 2H4a1 1 0 01-1-1zm4 8a1 1 0 011-1h4a1 1 0 010 2H8a1 1 0 01-1-1z" />
        </svg>
      )
    }
    return sortDir === 'asc' ? (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    )
  }

  // ── Loading / error states ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6 animate-pulse">
        <div className="h-8 w-64 rounded bg-[var(--color-line)]" />
        <div className="h-12 rounded-xl bg-[var(--color-line)]" />
        <div className="h-96 rounded-xl bg-[var(--color-bg-alt)]" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--color-muted)]">
        <p>{t('errorLoadingSims', language)}</p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Modal */}
      {modalSim && (
        <SimReportModal
          sim={modalSim}
          onClose={() => setModalSim(null)}
          language={language}
        />
      )}

      <div className="flex flex-col gap-6 p-6 min-h-0">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[var(--color-fg)]">{t('simulations', language)}</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
              {filteredSims.length} total
            </span>
            {displaySims.length !== filteredSims.length && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-400">
                {displaySims.length} filtradas
              </span>
            )}
          </div>

          {/* CSV export */}
          <button
            onClick={handleExportCSV}
            disabled={displaySims.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-bg-alt)] hover:bg-[var(--color-line)] border border-[var(--color-line)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--color-fg)] text-sm font-medium transition-colors self-start sm:self-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            {t('exportCsv', language)}
          </button>
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)] pointer-events-none"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              placeholder={t('searchByUser', language)}
              value={searchRaw}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-line)] text-sm text-[var(--color-fg)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition"
            />
            {searchRaw && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                aria-label="Limpiar búsqueda"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          {/* Activity filter */}
          <select
            value={activityFilter}
            onChange={(e) => handleActivityChange(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-line)] text-sm text-[var(--color-fg)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition"
          >
            <option value="all">{t('allActivities', language)}</option>
            {activityOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {/* Result filter */}
          <div className="flex rounded-lg overflow-hidden border border-[var(--color-line)] text-sm">
            {(['all', 'passed', 'failed'] as const).map((v) => (
              <button
                key={v}
                onClick={() => handleResultChange(v)}
                className={cn(
                  'px-3 py-2 font-medium transition-colors',
                  resultFilter === v
                    ? v === 'all'
                      ? 'bg-indigo-600 text-white'
                      : v === 'passed'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-red-600 text-white'
                    : 'bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-alt)]',
                )}
              >
                {v === 'all'
                  ? t('allResult', language)
                  : v === 'passed'
                  ? t('passedResult', language)
                  : t('failedResult', language)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-[var(--color-line)] overflow-hidden bg-[var(--color-card)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)] bg-[var(--color-bg-alt)]">
                  <th className="w-10 px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider min-w-[160px]">{t('name', language)}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider min-w-[160px]">{t('activity', language)}</th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider cursor-pointer select-none group"
                    onClick={() => toggleSort('score')}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {t('score', language)}
                      <SortIcon col="score" />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">{t('result', language)}</th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider cursor-pointer select-none"
                    onClick={() => toggleSort('date')}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {t('date', language)}
                      <SortIcon col="date" />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">{t('actionsCol', language)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {pageSims.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-[var(--color-muted)]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[var(--color-line)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-base font-medium text-[var(--color-fg)]">{t('noResults', language)}</p>
                        <p className="text-sm">{t('noSimsMatchFilters', language)}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageSims.map((sim, idx) => {
                    const globalIdx = pageStart + idx + 1
                    const isExpanded = expandedId === sim.ID_Sim
                    return (
                      <React.Fragment key={sim.ID_Sim}>
                        <tr
                          className={cn(
                            'group transition-colors cursor-pointer',
                            isExpanded
                              ? 'bg-[var(--color-bg-alt)]'
                              : 'hover:bg-[var(--color-bg-alt)]',
                          )}
                          onClick={() => toggleExpand(sim.ID_Sim)}
                        >
                          {/* # */}
                          <td className="px-4 py-3 text-[var(--color-muted)] text-xs font-mono">{globalIdx}</td>

                          {/* Usuario */}
                          <td className="px-4 py-3">
                            <span className="text-[var(--color-fg)] font-medium truncate block max-w-[160px]">
                              {sim.Usuario_Nombre || <span className="text-[var(--color-muted)] italic">—</span>}
                            </span>
                            {sim.Usuario && (
                              <span className="text-[var(--color-muted)] text-xs truncate block max-w-[160px]">{sim.Usuario}</span>
                            )}
                          </td>

                          {/* Actividad */}
                          <td className="px-4 py-3">
                            <span className="text-[var(--color-fg)] truncate block max-w-[180px]" title={sim.Actividad}>
                              {sim.Actividad || '—'}
                            </span>
                          </td>

                          {/* Calificacion */}
                          <td className="px-4 py-3">
                            <span className={cn('font-semibold tabular-nums', scoreColor(sim.Calificacion))}>
                              {sim.Calificacion !== null && sim.Calificacion !== undefined
                                ? sim.Calificacion
                                : <span className="text-slate-500">—</span>}
                            </span>
                          </td>

                          {/* Diagnostico */}
                          <td className="px-4 py-3">
                            <PassFailBadge value={sim.Diagnostico_Final} language={language} />
                          </td>

                          {/* Fecha */}
                          <td className="px-4 py-3 text-[var(--color-muted)] whitespace-nowrap">
                            {formatDate(sim.Fecha_y_Hora, language)}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              {/* Expand indicator */}
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleExpand(sim.ID_Sim) }}
                                className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-alt)] transition-colors"
                                aria-label={isExpanded ? 'Colapsar' : 'Expandir'}
                                title={isExpanded ? 'Colapsar detalles' : 'Expandir detalles'}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')}
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                              {/* Open modal */}
                              <button
                                onClick={(e) => { e.stopPropagation(); setModalSim(sim) }}
                                className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                                aria-label="Ver reporte completo"
                                title="Ver reporte completo"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded detail row */}
                        {isExpanded && (
                          <tr className="bg-[var(--color-bg-alt)]">
                            <td colSpan={7} className="p-0">
                              <ExpandedRow sim={sim} language={language} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 text-sm">
            <p className="text-[var(--color-muted)]">
              {t('showing', language)} {pageStart + 1}–{Math.min(pageEnd, displaySims.length)} {t('pageOf', language)} {displaySims.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-line)] text-[var(--color-fg)] hover:bg-[var(--color-bg-alt)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {t('previousPage', language)}
              </button>

              {/* Page numbers — show up to 5 around current */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                  .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((item, i) =>
                    item === 'ellipsis' ? (
                      <span key={`e${i}`} className="px-1 text-slate-600">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPage(item as number)}
                        className={cn(
                          'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                          safePage === item
                            ? 'bg-indigo-600 text-white'
                            : 'bg-[var(--color-surface)] border border-[var(--color-line)] text-[var(--color-muted)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-fg)]',
                        )}
                      >
                        {item}
                      </button>
                    ),
                  )}
              </div>

              <span className="sm:hidden text-[var(--color-muted)]">
                {safePage} / {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-line)] text-[var(--color-fg)] hover:bg-[var(--color-bg-alt)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {t('nextPage', language)}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
