import { NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard,
  PlayCircle,
  MessageSquareText,
  Trophy,
  Activity,
  Building2,
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
      { labelEs: 'Vista General', labelEn: 'Overview', path: '/', icon: LayoutDashboard },
    ],
  },
  {
    titleKey: 'sectionSimulator',
    items: [
      { labelEs: 'Simulaciones', labelEn: 'Simulations', path: '/simulations', icon: PlayCircle },
      { labelEs: 'Conversacional', labelEn: 'Conversational AI', path: '/conversational', icon: MessageSquareText },
      { labelEs: 'Ranking', labelEn: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    ],
  },
  {
    titleKey: 'sectionPlatform',
    items: [
      { labelEs: 'Actividades',  labelEn: 'Activities',  path: '/activities',  icon: Activity },
      { labelEs: 'Organización', labelEn: 'Organization', path: '/organization', icon: Building2 },
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
    <div className={['flex items-center', collapsed ? 'justify-center px-0 py-4' : 'px-4 py-4'].join(' ')}>
      <div className={[
        'flex items-center justify-center rounded-xl bg-white/95',
        collapsed ? 'h-9 w-9 p-1' : 'px-3 py-1.5',
      ].join(' ')}>
        <img
          src="/siigo_logo.jpg"
          alt="Siigo"
          className={collapsed ? 'h-6 w-6 object-contain' : 'h-7 w-auto object-contain'}
          style={collapsed ? {} : { maxWidth: '88px' }}
        />
      </div>
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

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {sections.map((section) => (
          <div key={section.titleKey} className="mb-5">
            {!collapsed && (
              <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                {t(section.titleKey, language)}
              </div>
            )}

            <div className="space-y-0.5">
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
                        'group flex items-center rounded-xl transition-all duration-150',
                        collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-2.5',
                        isActive
                          ? 'bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]'
                          : 'text-white/65 hover:bg-white/8 hover:text-white',
                      ].join(' ')
                    }
                    title={collapsed ? (language === 'es' ? item.labelEs : item.labelEn) : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={['h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-white/70 group-hover:text-white'].join(' ')} />
                        {!collapsed && (
                          <span className="truncate text-[13px] font-medium">
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
          'hidden md:flex md:flex-col md:border-r md:border-[#08204d]',
          'bg-[linear-gradient(180deg,#092458_0%,#061b45_55%,#08204f_100%)] text-white',
          'transition-all duration-200',
          collapsed ? 'w-[72px]' : 'w-[240px]',
        ].join(' ')}
      >
        <div className="flex items-center justify-end px-3 pt-3">
          <button
            onClick={toggleSidebar}
            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
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
                  className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
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
