import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const STRONG_RED = '#ff2138'
const SOFT_RED = '#ff9cab'

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
        style={{ fill: '#172033', fontSize: 34, fontWeight: 800 }}
      >
        {passRate.toFixed(0)}%
      </text>
      <text
        x={cx}
        y={cy + 18}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fill: '#6b778c', fontSize: 14, fontWeight: 600 }}
      >
        Approval Rate
      </text>
    </>
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
    { name: 'Pass', value: passCount, color: STRONG_RED },
    { name: 'Fail', value: failCount, color: SOFT_RED },
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
          cy="48%"
          innerRadius={66}
          outerRadius={92}
          paddingAngle={2}
          dataKey="value"
          stroke="#ffffff"
          strokeWidth={3}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
          {/* @ts-expect-error recharts label render prop types */}
          <CenterLabel passRate={passRate} />
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
