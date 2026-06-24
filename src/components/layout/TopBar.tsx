import { useLocation } from 'react-router-dom'
import { Globe, Menu, Moon, Sun } from 'lucide-react'
import { useAppStore } from '../../store/index'
import { t } from '../../lib/i18n'

// ─── Page metadata ────────────────────────────────────────────────────────────

const PAGE_META: Record<string, { es: string; en: string; subEs: string; subEn: string }> = {
  '/':              { es: 'Overview',       en: 'Overview',         subEs: 'Resumen del dashboard',       subEn: 'Dashboard summary' },
  '/simulations':   { es: 'Simulaciones',   en: 'Simulations',      subEs: 'Historial de sesiones',       subEn: 'Session history' },
  '/conversational':{ es: 'Conversacional', en: 'Conversational AI',subEs: 'Sesiones de chat con IA',     subEn: 'AI chat sessions' },
  '/coaching':      { es: 'AI Coaching',    en: 'AI Coaching',      subEs: 'Análisis de desempeño',       subEn: 'Performance analytics' },
  '/leaderboard':   { es: 'Ranking',        en: 'Leaderboard',      subEs: 'Mejores desempeños del equipo',subEn: 'Top team performers' },
  '/activities':    { es: 'Actividades',    en: 'Activities',       subEs: 'Desglose por actividad',      subEn: 'Activity breakdown' },
  '/organization':  { es: 'Organización',   en: 'Organization',     subEs: 'Estructura del equipo',       subEn: 'Team structure' },
  '/certification': { es: 'Business Lines', en: 'Business Lines',   subEs: 'Seguimiento de certificación',subEn: 'Certification tracking' },
  '/reports':       { es: 'Reportes',       en: 'Reports',          subEs: 'Reportes descargables',       subEn: 'Downloadable reports' },
  '/settings':      { es: 'Configuración',  en: 'Settings',         subEs: 'Preferencias del dashboard',  subEn: 'Dashboard preferences' },
}

export default function TopBar() {
  const location = useLocation()
  const language = useAppStore((state) => state.language)
  const theme    = useAppStore((state) => state.theme)
  const setLanguage = useAppStore((state) => state.setLanguage)
  const setTheme    = useAppStore((state) => state.setTheme)
  const setMobileMenuOpen = useAppStore((state) => state.setMobileMenuOpen)

  const meta  = PAGE_META[location.pathname] ?? PAGE_META['/']
  const title = language === 'es' ? meta.es : meta.en
  const sub   = language === 'es' ? meta.subEs : meta.subEn

  return (
    <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface)]/95 px-4 backdrop-blur-sm transition-colors md:px-6">
      {/* Left — mobile: hamburger + logo | desktop: page title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="rounded-lg border border-[var(--color-line)] p-1.5 text-[var(--color-muted)] transition hover:bg-[var(--color-bg-alt)] md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Mobile: show logo */}
        <img
          src="/siigo_logo.jpg"
          alt="Siigo"
          className="h-7 w-auto object-contain md:hidden"
          style={{ maxWidth: '80px' }}
        />

        {/* Desktop: show page title */}
        <div className="hidden md:flex md:items-baseline md:gap-2.5 min-w-0">
          <span className="text-[14px] font-semibold text-[var(--color-fg)] leading-none">
            {title}
          </span>
          <span className="text-[11px] text-[var(--color-muted)] leading-none hidden lg:block truncate">
            {sub}
          </span>
        </div>
      </div>

      {/* Right — controls */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Language switcher */}
        <div className="hidden items-center rounded-lg border border-[var(--color-line)] bg-[var(--color-bg-alt)] px-1 py-1 md:flex">
          <button
            onClick={() => setLanguage('es')}
            className={[
              'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all',
              language === 'es'
                ? 'bg-[var(--color-surface)] text-[#0066FF] shadow-sm'
                : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]',
            ].join(' ')}
          >
            ES
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={[
              'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all',
              language === 'en'
                ? 'bg-[var(--color-surface)] text-[#0066FF] shadow-sm'
                : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]',
            ].join(' ')}
          >
            EN
          </button>
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-1.5 text-[var(--color-muted)] transition hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-fg)]"
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        </button>

        {/* User badge */}
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg-alt)] px-2.5 py-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0066FF] text-[10px] font-bold text-white">
            SG
          </div>
          <div className="hidden text-right md:block">
            <div className="text-[12px] font-semibold text-[var(--color-fg)] leading-none">SIIGO</div>
            <div className="text-[10px] text-[var(--color-muted)] leading-tight">{t('admin', language)}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
