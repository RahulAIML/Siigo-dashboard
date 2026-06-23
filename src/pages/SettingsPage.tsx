import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Settings,
  Globe,
  Moon,
  Sun,
  Calendar,
  ShieldCheck,
  Database,
  Info,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { useAppStore } from '../store'
import { PASS_THRESHOLD } from '../config/constants'
import { t } from '../lib/i18n'

// ─── Types ─────────────────────────────────────────────────────────────────────

type DatePreset = 'today' | 'last7' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'all'

// ─── Sub-components ────────────────────────────────────────────────────────────

interface SectionCardProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}

function SectionCard({ title, icon, children }: SectionCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
        <span className="text-indigo-500 dark:text-indigo-400">{icon}</span>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
          {title}
        </h2>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">{children}</div>
    </div>
  )
}

interface SettingRowProps {
  label: string
  description?: string
  children: React.ReactNode
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

interface ToggleGroupProps<T extends string> {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}

function ToggleGroup<T extends string>({ value, options, onChange }: ToggleGroupProps<T>) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs font-medium">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={[
            'px-3 py-1.5 transition-colors',
            value === opt.value
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Cache status ──────────────────────────────────────────────────────────────

function useCacheStatus() {
  const [lastCleared, setLastCleared] = useState<string | null>(() => {
    try {
      return localStorage.getItem('siigo-cache-cleared') ?? null
    } catch {
      return null
    }
  })
  return { lastCleared, setLastCleared }
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const language    = useAppStore((s) => s.language)
  const theme       = useAppStore((s) => s.theme)
  const datePreset  = useAppStore((s) => s.datePreset)
  const setLanguage = useAppStore((s) => s.setLanguage)
  const setTheme    = useAppStore((s) => s.setTheme)
  const setDatePreset = useAppStore((s) => s.setDatePreset)

  const queryClient = useQueryClient()
  const { lastCleared, setLastCleared } = useCacheStatus()
  const [clearDone, setClearDone] = useState(false)

  const handleClearCache = useCallback(() => {
    queryClient.clear()
    const keys: string[] = []
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && (k.startsWith('siigo-qc') || k.startsWith('siigo-store'))) {
          keys.push(k)
        }
      }
      keys.forEach((k) => localStorage.removeItem(k))
      const now = new Date().toLocaleString(language === 'es' ? 'es-CO' : 'en-US')
      localStorage.setItem('siigo-cache-cleared', now)
      setLastCleared(now)
    } catch {
      // storage unavailable
    }
    setClearDone(true)
    setTimeout(() => setClearDone(false), 2500)
  }, [queryClient, language, setLastCleared])

  const datePresetOptions: { value: DatePreset; label: string }[] = [
    { value: 'today',     label: t('today', language) },
    { value: 'last7',     label: t('lastWeek', language) },
    { value: 'last30',    label: t('lastMonth', language) },
    { value: 'last90',    label: t('last3Months', language) },
    { value: 'thisMonth', label: language === 'es' ? 'Este mes'    : 'This month' },
    { value: 'lastMonth', label: language === 'es' ? 'Mes anterior' : 'Last month' },
    { value: 'all',       label: t('allTime', language) },
  ]

  return (
    <div className="max-w-2xl mx-auto py-6 px-2 md:px-0 space-y-6">

      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
          <Settings size={22} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {t('settings', language)}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'es'
              ? 'Personaliza la experiencia del dashboard'
              : 'Customize your dashboard experience'}
          </p>
        </div>
      </div>

      {/* ── Display settings ── */}
      <SectionCard
        title={language === 'es' ? 'Visualización' : 'Display'}
        icon={<Globe size={16} />}
      >
        <SettingRow
          label={language === 'es' ? 'Idioma' : 'Language'}
          description={language === 'es' ? 'Español / Inglés' : 'Spanish / English'}
        >
          <ToggleGroup
            value={language}
            options={[
              { value: 'es', label: 'ES' },
              { value: 'en', label: 'EN' },
            ]}
            onChange={setLanguage}
          />
        </SettingRow>

        <SettingRow
          label={language === 'es' ? 'Tema' : 'Theme'}
          description={language === 'es' ? 'Modo claro u oscuro' : 'Light or dark mode'}
        >
          <ToggleGroup
            value={theme}
            options={[
              { value: 'light', label: language === 'es' ? 'Claro' : 'Light' },
              { value: 'dark',  label: language === 'es' ? 'Oscuro' : 'Dark' },
            ]}
            onChange={setTheme}
          />
        </SettingRow>
      </SectionCard>

      {/* ── Dashboard settings ── */}
      <SectionCard
        title={language === 'es' ? 'Dashboard' : 'Dashboard'}
        icon={<Calendar size={16} />}
      >
        <SettingRow
          label={language === 'es' ? 'Rango de fechas predeterminado' : 'Default date range'}
          description={
            language === 'es'
              ? 'Se aplica al cargar el dashboard'
              : 'Applied when loading the dashboard'
          }
        >
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value as DatePreset)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {datePresetOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </SettingRow>

        <SettingRow
          label={language === 'es' ? 'Umbral de aprobación' : 'Pass threshold'}
          description={
            language === 'es'
              ? 'Puntaje mínimo para aprobar una simulación'
              : 'Minimum score to pass a simulation'
          }
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-3 py-1.5 border border-emerald-200 dark:border-emerald-700">
              <ShieldCheck size={13} />
              {PASS_THRESHOLD}%
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {language === 'es' ? '(fijo)' : '(fixed)'}
            </span>
          </div>
        </SettingRow>
      </SectionCard>

      {/* ── Data settings ── */}
      <SectionCard
        title={language === 'es' ? 'Datos y caché' : 'Data & cache'}
        icon={<Database size={16} />}
      >
        <SettingRow
          label={language === 'es' ? 'Limpiar caché' : 'Clear cache'}
          description={
            language === 'es'
              ? 'Elimina los datos almacenados localmente y fuerza una recarga'
              : 'Removes locally stored data and forces a fresh fetch'
          }
        >
          <button
            onClick={handleClearCache}
            className={[
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
              clearDone
                ? 'bg-emerald-500 text-white'
                : 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700',
            ].join(' ')}
          >
            {clearDone ? (
              <>
                <CheckCircle size={13} />
                {language === 'es' ? 'Limpiado' : 'Cleared'}
              </>
            ) : (
              <>
                <Trash2 size={13} />
                {language === 'es' ? 'Limpiar caché' : 'Clear cache'}
              </>
            )}
          </button>
        </SettingRow>

        <SettingRow
          label={language === 'es' ? 'Estado del caché' : 'Cache status'}
          description={
            language === 'es'
              ? 'Última vez que se limpió el caché'
              : 'Last time the cache was cleared'
          }
        >
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <RefreshCw size={12} />
            {lastCleared
              ? lastCleared
              : language === 'es'
              ? 'Sin limpiar en esta sesión'
              : 'Not cleared this session'}
          </div>
        </SettingRow>
      </SectionCard>

      {/* ── About ── */}
      <SectionCard
        title={language === 'es' ? 'Acerca de' : 'About'}
        icon={<Info size={16} />}
      >
        {[
          {
            label:   language === 'es' ? 'Versión'   : 'Version',
            value:   '1.0.0',
          },
          {
            label:   language === 'es' ? 'Plataforma' : 'Platform',
            value:   'Rolplay',
          },
          {
            label:   language === 'es' ? 'Cliente'    : 'Client',
            value:   'SIIGO',
          },
          {
            label:   language === 'es' ? 'Soporte'    : 'Support',
            value:   'soporte@rolplay.app',
            isEmail: true,
          },
        ].map(({ label, value, isEmail }) => (
          <SettingRow key={label} label={label}>
            {isEmail ? (
              <a
                href={`mailto:${value}`}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                {value}
              </a>
            ) : (
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                {value}
              </span>
            )}
          </SettingRow>
        ))}
      </SectionCard>

    </div>
  )
}
