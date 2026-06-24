import { motion } from 'framer-motion'
import { GitBranch, BarChart2, TrendingUp, Users, ShoppingBag, Building2 } from 'lucide-react'
import useAppStore from '../store'
import { t } from '../lib/i18n'

const PLANNED_LINES = [
  { icon: ShoppingBag, labelEs: 'Contabilidad',     labelEn: 'Accounting',         color: '#0066FF' },
  { icon: TrendingUp,  labelEs: 'Nómina',            labelEn: 'Payroll',            color: '#10B981' },
  { icon: Users,       labelEs: 'Facturación',        labelEn: 'Billing',            color: '#F59E0B' },
  { icon: BarChart2,   labelEs: 'Cartera',            labelEn: 'Portfolio',          color: '#8B5CF6' },
  { icon: Building2,   labelEs: 'Gestión de Activos', labelEn: 'Asset Management',   color: '#EF4444' },
]

export default function BusinessLinesPage() {
  const language = useAppStore((s) => s.language)

  return (
    <div className="flex flex-col gap-8 p-6 max-w-4xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-1"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0066FF]/10 border border-[#0066FF]/20 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-[#0066FF]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-fg)] tracking-tight">
            {language === 'es' ? 'Business Lines' : 'Business Lines'}
          </h1>
        </div>
        <p className="text-sm text-[var(--color-muted)] ml-12">
          {language === 'es'
            ? 'Rendimiento segmentado por línea de producto y unidad de negocio'
            : 'Performance segmented by product line and business unit'}
        </p>
      </motion.div>

      {/* Coming soon banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-line)] p-8 text-center"
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0066FF]/10 border border-[#0066FF]/20">
          <GitBranch className="w-8 h-8 text-[#0066FF]" />
        </div>
        <h2 className="text-lg font-bold text-[var(--color-fg)] mb-2">
          {language === 'es' ? 'Módulo en Desarrollo' : 'Module in Development'}
        </h2>
        <p className="text-sm text-[var(--color-muted)] max-w-md mx-auto leading-relaxed">
          {language === 'es'
            ? 'Este módulo mostrará el rendimiento de simulaciones segmentado por línea de negocio (Contabilidad, Nómina, Facturación, etc.) para análisis estratégico del equipo de ventas.'
            : 'This module will show simulation performance segmented by business line (Accounting, Payroll, Billing, etc.) for strategic analysis of the sales team.'}
        </p>
        <span className="mt-4 inline-block text-[11px] font-semibold bg-[var(--color-bg-alt)] text-[var(--color-muted)] border border-[var(--color-line)] px-3 py-1 rounded-full uppercase tracking-wider">
          {t('comingSoon', language)}
        </span>
      </motion.div>

      {/* Planned lines preview */}
      <div>
        <h2 className="flex items-center gap-2.5 text-xs font-bold text-[var(--color-muted)] uppercase tracking-[0.12em] mb-4">
          <span className="inline-block w-0.5 h-3.5 rounded-full bg-[var(--color-accent)]" />
          {language === 'es' ? 'Líneas Planificadas' : 'Planned Lines'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {PLANNED_LINES.map((line) => {
            const Icon = line.icon
            return (
              <motion.div
                key={line.labelEn}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="rounded-xl bg-[var(--color-card)] border border-[var(--color-line)] p-4 flex flex-col items-center gap-2 text-center opacity-60 select-none"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${line.color}18`, border: `1px solid ${line.color}30` }}
                >
                  <Icon className="w-5 h-5" style={{ color: line.color }} />
                </div>
                <span className="text-xs font-medium text-[var(--color-fg-sub)]">
                  {language === 'es' ? line.labelEs : line.labelEn}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
