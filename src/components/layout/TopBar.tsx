import { Globe, Menu, Moon, Sun } from 'lucide-react'
import { useAppStore } from '../../store/index'
import { t } from '../../lib/i18n'

export default function TopBar() {
  const language = useAppStore((state) => state.language)
  const theme = useAppStore((state) => state.theme)
  const setLanguage = useAppStore((state) => state.setLanguage)
  const setTheme = useAppStore((state) => state.setTheme)
  const setMobileMenuOpen = useAppStore((state) => state.setMobileMenuOpen)

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface)]/95 px-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] backdrop-blur-sm transition-colors md:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="rounded-xl border border-[var(--color-line)] p-2 text-slate-600 dark:text-slate-300 transition hover:bg-[var(--color-bg-alt)] md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex items-center">
          <img
            src="/siigo_logo.jpg"
            alt="Siigo"
            className="h-10 w-auto object-contain"
            style={{ maxWidth: '120px' }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Language switcher */}
        <div className="hidden items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-bg-alt)] px-2 py-1.5 md:flex">
          <Globe className="h-3.5 w-3.5 text-slate-400" />
          <button
            onClick={() => setLanguage('es')}
            className={[
              'rounded-full px-2.5 py-1 text-xs font-semibold transition-all',
              language === 'es'
                ? 'bg-[var(--color-surface)] text-[#0066FF] shadow-sm dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400',
            ].join(' ')}
          >
            🇲🇽 ES
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={[
              'rounded-full px-2.5 py-1 text-xs font-semibold transition-all',
              language === 'en'
                ? 'bg-[var(--color-surface)] text-[#0066FF] shadow-sm dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400',
            ].join(' ')}
          >
            🇺🇸 EN
          </button>
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] p-2 text-slate-600 dark:text-slate-300 transition hover:bg-[var(--color-bg-alt)]"
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        {/* User badge — generic since no user auth in this dashboard */}
        <div className="flex items-center gap-2 rounded-full bg-[var(--color-bg-alt)] border border-[var(--color-line)] px-3 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0066FF] text-[10px] font-bold text-white">
            SG
          </div>
          <div className="hidden text-right md:block">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-none">SIIGO</div>
            <div className="text-[11px] font-medium text-slate-400 leading-tight">{t('admin', language)}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
