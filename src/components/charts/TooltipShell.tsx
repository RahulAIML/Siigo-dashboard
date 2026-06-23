import type { TooltipProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'

export interface TooltipFormatter {
  (value: ValueType, name: NameType, index: number): [string, string]
}

interface TooltipShellProps extends TooltipProps<ValueType, NameType> {
  formatter?: TooltipFormatter
}

export function TooltipShell({ active, payload, label, formatter }: TooltipShellProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div
      style={{
        background: '#1e2535',
        border: '1px solid #2d3a52',
        borderRadius: 8,
        padding: '10px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
        minWidth: 140,
        fontSize: 13,
        color: '#e2e8f0',
      }}
    >
      {label !== undefined && label !== null && (
        <p
          style={{
            margin: '0 0 8px',
            fontWeight: 600,
            color: '#94a3b8',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {label}
        </p>
      )}
      {payload.map((entry, i) => {
        const raw = entry.value as ValueType
        const rawName = entry.name as NameType
        const [displayValue, displayName] = formatter
          ? formatter(raw, rawName, i)
          : [String(raw ?? '—'), String(rawName ?? '')]

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: i > 0 ? 4 : 0,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: entry.color ?? '#6366f1',
                flexShrink: 0,
              }}
            />
            <span style={{ color: '#94a3b8', flex: 1 }}>{displayName}</span>
            <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{displayValue}</span>
          </div>
        )
      })}
    </div>
  )
}
