import { Globe, Menu, Moon, Sun, ChevronDown } from 'lucide-react'
import { useAppStore } from '../../store/index'
import t from '../../lib/i18n'

export default function TopBar() {
  const language = useAppStore((state) => state.language)
  const theme    = useAppStore((state) => state.theme)
  const setLanguage = useAppStore((state) => state.setLanguage)
  const setTheme = useAppStore((state) => state.setTheme)
  const setMobileMenuOpen = useAppStore((state) => state.setMobileMenuOpen)

  return (
    <header className="sticky top-0 z-20 flex h-[92px] items-center justify-between border-b border-slate-200/80 bg-white/96 px-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] backdrop-blur md:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            SIIGO
          </div>
          <h1 className="truncate text-[2rem] font-extrabold tracking-[-0.03em] text-slate-950 dark:text-slate-100">
            {language === 'es' ? 'Plataforma de Analítica' : 'Analytics Platform'}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
          <Globe className="h-4 w-4 text-slate-500" />
          <button
            onClick={() => setLanguage('es')}
            className={[
              'rounded-full px-3 py-1 text-sm font-semibold transition',
              language === 'es' ? 'bg-white text-[#1f5fe2] shadow-sm' : 'text-slate-500',
            ].join(' ')}
          >
            🇲🇽 ES
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={[
              'rounded-full px-3 py-1 text-sm font-semibold transition',
              language === 'en' ? 'bg-white text-[#1f5fe2] shadow-sm' : 'text-slate-500',
            ].join(' ')}
          >
            🇺🇸 EN
          </button>
        </div>

        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        <div className="flex items-center gap-3 rounded-full bg-white px-2 py-1">
          <div className="hidden text-right md:block">
            <div className="text-[1.02rem] font-bold text-slate-900 dark:text-slate-100">SIIGO</div>
            <div className="text-sm font-medium text-slate-400">{language === 'es' ? 'Administrador' : 'Administrator'}</div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff3b4f,#ff7c8a)] text-sm font-bold text-white shadow-[0_10px_30px_rgba(255,59,79,0.28)]">
            {t('siigo', language).slice(0, 2)}
          </div>
          <ChevronDown className="hidden h-5 w-5 text-slate-600 md:block" />
        </div>
      </div>
    </header>
  )
}
