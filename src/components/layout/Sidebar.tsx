import { useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  PlayCircle,
  Award,
  MessageSquare,
  Target,
  Trophy,
  BarChart2,
  Users,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import useAppStore from '../../store';

// ---------------------------------------------------------------------------
// i18n — lightweight inline translations
// ---------------------------------------------------------------------------
type Lang = 'es' | 'en' | 'fr';

const translations: Record<Lang, Record<string, string>> = {
  es: {
    dashboard: 'Dashboard',
    simulations: 'Simulaciones',
    certification: 'Certificación',
    conversational: 'Conversacional',
    coaching: 'Coaching',
    leaderboard: 'Ranking',
    activities: 'Actividades',
    organization: 'Organización',
    reports: 'Reportes',
    settings: 'Configuración',
    poweredBy: 'Desarrollado por',
  },
  en: {
    dashboard: 'Dashboard',
    simulations: 'Simulations',
    certification: 'Certification',
    conversational: 'Conversational',
    coaching: 'Coaching',
    leaderboard: 'Leaderboard',
    activities: 'Activities',
    organization: 'Organization',
    reports: 'Reports',
    settings: 'Settings',
    poweredBy: 'Powered by',
  },
  fr: {
    dashboard: 'Tableau de bord',
    simulations: 'Simulations',
    certification: 'Certification',
    conversational: 'Conversationnel',
    coaching: 'Coaching',
    leaderboard: 'Classement',
    activities: 'Activités',
    organization: 'Organisation',
    reports: 'Rapports',
    settings: 'Paramètres',
    poweredBy: 'Propulsé par',
  },
};

function useT(language: string) {
  const lang: Lang = (language as Lang) in translations ? (language as Lang) : 'es';
  return (key: string): string => translations[lang][key] ?? key;
}

// ---------------------------------------------------------------------------
// Nav item definition
// ---------------------------------------------------------------------------
interface NavItem {
  key: string;
  path: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', path: '/', icon: LayoutDashboard },
  { key: 'simulations', path: '/simulations', icon: PlayCircle },
  { key: 'certification', path: '/certification', icon: Award },
  { key: 'conversational', path: '/conversational', icon: MessageSquare },
  { key: 'coaching', path: '/coaching', icon: Target },
  { key: 'leaderboard', path: '/leaderboard', icon: Trophy },
  { key: 'activities', path: '/activities', icon: BarChart2 },
  { key: 'organization', path: '/organization', icon: Users },
  { key: 'reports', path: '/reports', icon: FileText },
  { key: 'settings', path: '/settings', icon: Settings },
];

// ---------------------------------------------------------------------------
// Sidebar width constants
// ---------------------------------------------------------------------------
const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 64;

// ---------------------------------------------------------------------------
// NavItem component
// ---------------------------------------------------------------------------
interface NavItemProps {
  item: NavItem;
  collapsed: boolean;
  t: (key: string) => string;
  onClick?: () => void;
}

const SidebarNavItem = ({ item, collapsed, t, onClick }: NavItemProps) => {
  const location = useLocation();
  const Icon = item.icon;

  // Exact match for root, prefix match for others
  const isActive =
    item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path);

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
        'transition-colors duration-150 select-none',
        isActive
          ? 'bg-[#E8F5FF] text-[#0078D4] dark:bg-[#0078D4]/20 dark:text-[#4DA6FF]'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
        collapsed ? 'justify-center px-0' : 'px-3',
      )}
      title={collapsed ? t(item.key) : undefined}
    >
      <Icon
        size={20}
        className={cn(
          'shrink-0',
          isActive
            ? 'text-[#0078D4] dark:text-[#4DA6FF]'
            : 'text-gray-500 group-hover:text-gray-700 dark:text-gray-500 dark:group-hover:text-gray-300',
        )}
      />
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            key="label"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden whitespace-nowrap"
          >
            {t(item.key)}
          </motion.span>
        )}
      </AnimatePresence>
    </NavLink>
  );
};

// ---------------------------------------------------------------------------
// Sidebar inner content (shared between desktop and mobile)
// ---------------------------------------------------------------------------
interface SidebarContentProps {
  collapsed: boolean;
  t: (key: string) => string;
  onNavClick?: () => void;
  onToggleCollapse?: () => void;
  showCollapseButton?: boolean;
}

const SidebarContent = ({
  collapsed,
  t,
  onNavClick,
  onToggleCollapse,
  showCollapseButton = true,
}: SidebarContentProps) => (
  <div className="flex h-full flex-col overflow-hidden">
    {/* Logo */}
    <div
      className={cn(
        'flex h-16 shrink-0 items-center border-b border-gray-200 dark:border-gray-700',
        collapsed ? 'justify-center px-0' : 'justify-between px-4',
      )}
    >
      <AnimatePresence initial={false} mode="wait">
        {collapsed ? (
          <motion.span
            key="short"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-xl font-extrabold tracking-tight text-[#0078D4]"
          >
            S
          </motion.span>
        ) : (
          <motion.span
            key="full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-xl font-extrabold tracking-tight"
          >
            <span className="text-[#0078D4]">SIIG</span>
            <span className="text-gray-800 dark:text-white">O</span>
          </motion.span>
        )}
      </AnimatePresence>

      {showCollapseButton && !collapsed && (
        <button
          onClick={onToggleCollapse}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft size={18} />
        </button>
      )}
    </div>

    {/* Nav */}
    <nav className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
      <ul className="space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <li key={item.key}>
            <SidebarNavItem
              item={item}
              collapsed={collapsed}
              t={t}
              onClick={onNavClick}
            />
          </li>
        ))}
      </ul>
    </nav>

    {/* Footer */}
    <div
      className={cn(
        'shrink-0 border-t border-gray-200 dark:border-gray-700 py-3',
        collapsed ? 'flex justify-center px-2' : 'px-4',
      )}
    >
      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.div
            key="footer-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-0.5"
          >
            <span className="text-[10px] font-medium uppercase tracking-widest text-gray-400 dark:text-gray-600">
              {t('poweredBy')}
            </span>
            <span className="text-xs font-semibold text-[#0078D4]">Rolplay</span>
          </motion.div>
        ) : (
          <motion.div
            key="footer-collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F5FF] dark:bg-[#0078D4]/20"
            title="Powered by Rolplay"
          >
            <span className="text-[10px] font-extrabold text-[#0078D4]">R</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expand button shown only when collapsed */}
      {showCollapseButton && collapsed && (
        <button
          onClick={onToggleCollapse}
          className="mt-2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
          aria-label="Expand sidebar"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Sidebar (default export)
// ---------------------------------------------------------------------------
const Sidebar = () => {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const mobileMenuOpen = useAppStore((s) => s.mobileMenuOpen);
  const language = useAppStore((s) => s.language);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const setMobileMenuOpen = useAppStore((s) => s.setMobileMenuOpen);

  const t = useT(language ?? 'es');

  const toggleCollapse = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  const closeMobile = useCallback(() => {
    setMobileMenuOpen(false);
  }, [setMobileMenuOpen]);

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Desktop sidebar                                                      */}
      {/* ------------------------------------------------------------------ */}
      <motion.aside
        className={cn(
          'hidden md:flex flex-col shrink-0',
          'bg-white dark:bg-gray-900',
          'border-r border-gray-200 dark:border-gray-700',
          'relative z-20 overflow-hidden',
        )}
        animate={{ width: sidebarCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      >
        <SidebarContent
          collapsed={sidebarCollapsed}
          t={t}
          onToggleCollapse={toggleCollapse}
          showCollapseButton
        />
      </motion.aside>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile drawer backdrop                                               */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeMobile}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile drawer                                                        */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.aside
            key="mobile-drawer"
            className={cn(
              'fixed inset-y-0 left-0 z-40 flex flex-col md:hidden',
              'bg-white dark:bg-gray-900',
              'border-r border-gray-200 dark:border-gray-700',
              'shadow-xl',
            )}
            style={{ width: EXPANDED_WIDTH }}
            initial={{ x: -EXPANDED_WIDTH }}
            animate={{ x: 0 }}
            exit={{ x: -EXPANDED_WIDTH }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Close button */}
            <button
              onClick={closeMobile}
              className="absolute right-3 top-4 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>

            <SidebarContent
              collapsed={false}
              t={t}
              onNavClick={closeMobile}
              showCollapseButton={false}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
