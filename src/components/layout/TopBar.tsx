import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Menu,
  Sun,
  Moon,
  Sparkles,
  CalendarDays,
  Download,
  ChevronDown,
  X,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import useAppStore from '../../store'
import { resolveEffectiveDates, resolvePreset, type DatePreset } from '../../lib/dateUtils'
import { exportSummaryCSV } from '../../lib/csvExport'
import { cn } from '../../lib/cn'
import t from '../../lib/i18n'
import useDashboardData from '../../hooks/useDashboardData'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRangeLabel(from: string, to: string, lang: 'es' | 'en'): string {
  const parseAndFormat = (dateStr: string, formatStr: string) => {
    try {
      return format(parseISO(dateStr), formatStr)
    } catch {
      return dateStr
    }
  }

  if (lang === 'en') {
    const fromLabel = parseAndFormat(from, 'MMM d')
    const toLabel = parseAndFormat(to, 'MMM d')
    if (fromLabel === toLabel) return fromLabel
    return `${fromLabel} – ${toLabel}`
  }

  const monthsEs = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const fromDate = parseISO(from)
  const toDate = parseISO(to)
  const fromLabel = `${fromDate.getDate()} ${monthsEs[fromDate.getMonth()]}`
  const toLabel = `${toDate.getDate()} ${monthsEs[toDate.getMonth()]}`
  if (fromLabel === toLabel) return fromLabel
  return `${fromLabel} – ${toLabel}`
}

function pathnameToTitle(pathname: string, lang: 'es' | 'en'): string {
  const segment = pathname.split('/').filter(Boolean)[0] ?? 'dashboard'
  const keyMap: Record<string, string> = {
    dashboard:      'dashboard',
    simulations:    'simulations',
    certification:  'certification',
    conversational: 'conversational',
    coaching:       'coaching',
    leaderboard:    'leaderboard',
    activities:     'activities',
    organization:   'organization',
    reports:        'reports',
    settings:       'settings',
  }
  const key = keyMap[segment] ?? segment
  return t(key, lang)
}

// ---------------------------------------------------------------------------
// DateRangeDialog
// ---------------------------------------------------------------------------

interface DateRangeDialogProps {
  open: boolean
  onClose: () => void
  lang: 'es' | 'en'
}

const PRESETS: { key: DatePreset; labelKey: string; short: string }[] = [
  { key: 'today',    labelKey: 'today',       short: 'Today' },
  { key: 'last7',    labelKey: 'lastWeek',    short: '7d'    },
  { key: 'last30',   labelKey: 'lastMonth',   short: '30d'   },
  { key: 'last90',   labelKey: 'last3Months', short: '3m'    },
  { key: 'all',      labelKey: 'allTime',     short: 'All'   },
]

function DateRangeDialog({ open, onClose, lang }: DateRangeDialogProps) {
  const dateFrom = useAppStore((s) => s.dateFrom)
  const dateTo   = useAppStore((s) => s.dateTo)
  const setDateFrom = useAppStore((s) => s.setDateFrom)
  const setDateTo   = useAppStore((s) => s.setDateTo)

  const { from: effFrom, to: effTo } = resolveEffectiveDates(dateFrom ?? null, dateTo ?? null)

  const [localFrom, setLocalFrom] = useState(effFrom)
  const [localTo,   setLocalTo]   = useState(effTo)

  useEffect(() => {
    if (open) {
      const { from, to } = resolveEffectiveDates(dateFrom ?? null, dateTo ?? null)
      setLocalFrom(from)
      setLocalTo(to)
    }
  }, [open, dateFrom, dateTo])

  const overlayRef = useRef<HTMLDivElement>(null)

  function handlePreset(preset: DatePreset) {
    const { from, to } = resolvePreset(preset)
    setLocalFrom(from)
    setLocalTo(to)
  }

  function handleApply() {
    setDateFrom(localFrom)
    setDateTo(localTo)
    onClose()
  }

  function handleReset() {
    setDateFrom(null)
    setDateTo(null)
    onClose()
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-16"
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {lang === 'es' ? 'Filtrar por Fecha' : 'Filter by Date'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Preset pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map((p) => {
            const { from, to } = resolvePreset(p.key)
            const isActive = localFrom === from && localTo === to
            return (
              <button
                key={p.key}
                onClick={() => handlePreset(p.key)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
                )}
              >
                {t(p.labelKey, lang)}
              </button>
            )
          })}
        </div>

        {/* Date inputs */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('dateFrom', lang)}
            </label>
            <input
              type="date"
              value={localFrom}
              onChange={(e) => setLocalFrom(e.target.value)}
              className="w-full text-sm px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('dateTo', lang)}
            </label>
            <input
              type="date"
              value={localTo}
              onChange={(e) => setLocalTo(e.target.value)}
              className="w-full text-sm px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handleReset}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
          >
            {t('resetFilter', lang)}
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
          >
            {t('applyFilter', lang)}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ExportDropdown
// ---------------------------------------------------------------------------

interface ExportDropdownProps {
  lang: 'es' | 'en'
}

function ExportDropdown({ lang }: ExportDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { kpis } = useDashboardData()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleExportCSV() {
    exportSummaryCSV(kpis)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors"
        title={t('export', lang)}
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t('export', lang)}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-900 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-40 py-1">
          <button
            onClick={handleExportCSV}
            className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
          >
            <Download className="h-3.5 w-3.5 text-gray-400" />
            {t('exportCsv', lang)}
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TopBar
// ---------------------------------------------------------------------------

const TopBar = () => {
  const location = useLocation()

  const theme        = useAppStore((s) => s.theme)
  const lang         = useAppStore((s) => s.lang)
  const aiOpen       = useAppStore((s) => s.aiOpen)
  const dateFrom     = useAppStore((s) => s.dateFrom)
  const dateTo       = useAppStore((s) => s.dateTo)
  const toggleTheme  = useAppStore((s) => s.toggleTheme)
  const toggleLang   = useAppStore((s) => s.toggleLang)
  const toggleAI     = useAppStore((s) => s.toggleAI)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)

  const [dateDialogOpen, setDateDialogOpen] = useState(false)

  const { from: effFrom, to: effTo } = resolveEffectiveDates(dateFrom ?? null, dateTo ?? null)
  const rangeLabel = formatRangeLabel(effFrom, effTo, lang)
  const pageTitle  = pathnameToTitle(location.pathname, lang)

  return (
    <>
      <header className="h-14 flex items-center gap-2 px-3 md:px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">

        {/* Left: mobile menu + page title */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate hidden sm:block">
            {pageTitle}
          </h1>
        </div>

        {/* Center: date range filter */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => setDateDialogOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors max-w-xs"
          >
            <CalendarDays className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="truncate">{rangeLabel}</span>
            <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />
          </button>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1">

          {/* Export — hidden on very small screens */}
          <div className="hidden sm:block">
            <ExportDropdown lang={lang} />
          </div>

          {/* Language toggle */}
          <button
            onClick={toggleLang}
            className="px-2 py-1.5 rounded-md text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors uppercase tracking-wide"
            title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          >
            {lang === 'es' ? 'ES' : 'EN'}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-yellow-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* AI assistant button */}
          <button
            onClick={toggleAI}
            className={cn(
              'p-1.5 rounded-md transition-all duration-200',
              aiOpen
                ? [
                    'relative text-white',
                    'bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500',
                    'shadow-md shadow-violet-500/30',
                    'before:absolute before:inset-0 before:rounded-md before:bg-gradient-to-r',
                    'before:from-violet-400 before:via-blue-400 before:to-cyan-400',
                    'before:animate-pulse before:opacity-50 before:-z-10',
                  ]
                : 'text-gray-500 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-gray-800',
            )}
            aria-label={t('aiAssistant', lang)}
            title={t('aiAssistant', lang)}
          >
            <Sparkles className={cn('h-4 w-4', aiOpen && 'drop-shadow-sm')} />
          </button>
        </div>
      </header>

      {/* Date range dialog */}
      <DateRangeDialog
        open={dateDialogOpen}
        onClose={() => setDateDialogOpen(false)}
        lang={lang}
      />
    </>
  )
}

export default TopBar
