import { NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard,
  PlayCircle,
  MessageSquareText,
  BrainCircuit,
  Trophy,
  Activity,
  Building2,
  GitBranch,
  FileText,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react'
import { useAppStore } from '../../store/index'
import { t } from '../../lib/i18n'

type NavSection = {
  titleKey: string
  items: Array<{
    labelEs: string
    labelEn: string
    path: string
    icon: React.ComponentType<{ className?: string }>
  }>
}

const sections: NavSection[] = [
  {
    titleKey: 'sectionGeneral',
    items: [
      { labelEs: 'Overview', labelEn: 'Overview', path: '/', icon: LayoutDashboard },
    ],
  },
  {
    titleKey: 'sectionSimulator',
    items: [
      { labelEs: 'Simulaciones', labelEn: 'Simulations', path: '/simulations', icon: PlayCircle },
      { labelEs: 'Conversacional', labelEn: 'Conversational AI', path: '/conversational', icon: MessageSquareText },
      { labelEs: 'AI Coaching', labelEn: 'AI Coaching', path: '/coaching', icon: BrainCircuit },
      { labelEs: 'Ranking', labelEn: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    ],
  },
  {
    titleKey: 'sectionPlatform',
    items: [
      { labelEs: 'Actividades', labelEn: 'Activities', path: '/activities', icon: Activity },
      { labelEs: 'Organización', labelEn: 'Organization', path: '/organization', icon: Building2 },
      { labelEs: 'Business Lines', labelEn: 'Business Lines', path: '/certification', icon: GitBranch },
    ],
  },
  {
    titleKey: 'sectionMore',
    items: [
      { labelEs: 'Reportes', labelEn: 'Reports', path: '/reports', icon: FileText },
      { labelEs: 'Configuración', labelEn: 'Settings', path: '/settings', icon: Settings },
    ],
  },
]

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-4 px-6 py-8">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
        <span className="text-lg font-black tracking-[0.18em]">S</span>
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <div className="text-[2rem] font-black uppercase tracking-[0.06em] text-[#2da4ff]">
            SIIGO
          </div>
          <div className="text-[11px] leading-4 text-white/60">
            Analytics &amp; Training
          </div>
        </div>
      )}
    </div>
  )
}

function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate?: () => void
}) {
  const language = useAppStore((state) => state.language)

  return (
    <div className="flex h-full flex-col">
      <Brand collapsed={collapsed} />

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {sections.map((section) => (
          <div key={section.titleKey} className="mb-8">
            {!collapsed && (
              <div className="mb-4 px-2 text-[12px] font-bold uppercase tracking-[0.12em] text-white/60">
                {t(section.titleKey, language)}
              </div>
            )}

            <div className="space-y-2">
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      [
                        'group flex items-center rounded-2xl transition-all duration-200',
                        collapsed ? 'justify-center px-0 py-4' : 'gap-4 px-5 py-4',
                        isActive
                          ? 'bg-[#ff1734] text-white shadow-[0_18px_44px_rgba(255,23,52,0.25)]'
                          : 'text-white/84 hover:bg-white/8',
                      ].join(' ')
                    }
                    title={collapsed ? (language === 'es' ? item.labelEs : item.labelEn) : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={['h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-white/84'].join(' ')} />
                        {!collapsed && (
                          <span className="truncate text-[1.02rem] font-semibold">
                            {language === 'es' ? item.labelEs : item.labelEn}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Sidebar() {
  const collapsed = useAppStore((state) => state.sidebarCollapsed)
  const mobileOpen = useAppStore((state) => state.mobileMenuOpen)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  const setMobileMenuOpen = useAppStore((state) => state.setMobileMenuOpen)

  return (
    <>
      <aside
        className={[
          'hidden md:flex md:min-h-screen md:flex-col md:border-r md:border-[#08204d]',
          'bg-[linear-gradient(180deg,#092458_0%,#061b45_55%,#08204f_100%)] text-white',
          collapsed ? 'w-[96px]' : 'w-[320px]',
        ].join(' ')}
      >
        <div className="flex items-center justify-end px-5 pt-4">
          <button
            onClick={toggleSidebar}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        <SidebarContent collapsed={collapsed} />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-slate-950/50 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[300px] flex-col bg-[linear-gradient(180deg,#092458_0%,#061b45_55%,#08204f_100%)] text-white md:hidden"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ duration: 0.22 }}
            >
              <div className="flex items-center justify-end px-5 pt-4">
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close sidebar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SidebarContent collapsed={false} onNavigate={() => setMobileMenuOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
