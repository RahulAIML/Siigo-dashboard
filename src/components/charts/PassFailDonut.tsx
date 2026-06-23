import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const GREEN = '#22c55e'
const RED   = '#ef4444'

interface PassFailDonutProps {
  passCount:  number
  failCount:  number
  loading?:   boolean
}

interface DonutEntry {
  name:  string
  value: number
  color: string
}

function CenterLabel({
  viewBox,
  passRate,
}: {
  viewBox?: { cx?: number; cy?: number }
  passRate: number
}) {
  const cx = viewBox?.cx ?? 0
  const cy = viewBox?.cy ?? 0
  return (
    <>
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fill: '#f1f5f9', fontSize: 26, fontWeight: 700 }}
      >
        {passRate.toFixed(0)}%
      </text>
      <text
        x={cx}
        y={cy + 18}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fill: '#64748b', fontSize: 12 }}
      >
        pass rate
      </text>
    </>
  )
}

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null
  const entry = payload[0] as { name: string; value: number; payload: DonutEntry }
  return (
    <div
      style={{
        background: '#1e2535',
        border: '1px solid #2d3a52',
        borderRadius: 8,
        padding: '8px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
        fontSize: 13,
        color: '#e2e8f0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: entry.payload.color,
          }}
        />
        <span style={{ color: '#94a3b8' }}>{entry.name}</span>
        <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{entry.value}</span>
      </div>
    </div>
  )
}

export function PassFailDonut({ passCount, failCount, loading = false }: PassFailDonutProps) {
  if (loading) {
    return (
      <div
        style={{
          height: 220,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#475569',
          fontSize: 14,
        }}
      >
        Loading...
      </div>
    )
  }

  const total = passCount + failCount
  const passRate = total > 0 ? (passCount / total) * 100 : 0

  const chartData: DonutEntry[] = [
    { name: 'Pass', value: passCount, color: GREEN },
    { name: 'Fail', value: failCount, color: RED },
  ]

  if (total === 0) {
    return (
      <div
        style={{
          height: 220,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#475569',
          fontSize: 14,
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 32 }}>🍩</span>
        <span>No data available</span>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          innerRadius={58}
          outerRadius={82}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
          {/* @ts-expect-error recharts label render prop types */}
          <CenterLabel passRate={passRate} />
        </Pie>
        <Tooltip content={<DonutTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 4 }}
          formatter={(value, entry: any) => (
            <span style={{ color: '#94a3b8' }}>
              {value} ({entry.payload.value})
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
