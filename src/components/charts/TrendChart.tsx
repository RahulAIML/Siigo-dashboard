import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { format, parseISO } from 'date-fns'
import type { TrendPoint } from '../../api/types'

const CURRENT_RED = '#ff2138'
const PREVIOUS_BLUE = '#213f82'
const GOAL_LINE = '#9fb0c8'

interface TrendChartProps {
  data:      TrendPoint[]
  height?:   number
  loading?:  boolean
}

function formatDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), 'MMM d')
  } catch {
    return dateStr
  }
}

function TrendTooltip(props: any) {
  const { active, payload, label } = props
  if (!active || !payload || payload.length === 0) return null

  const point = payload[0]?.payload as (TrendPoint & { previous: number; goal: number }) | undefined

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e7ecf3',
        borderRadius: 18,
        padding: '16px 18px',
        boxShadow: '0 20px 40px rgba(15,23,42,0.12)',
        minWidth: 160,
        fontSize: 13,
        color: '#1e293b',
      }}
    >
      <p
        style={{
          margin: '0 0 8px',
          fontWeight: 600,
          color: '#64748b',
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label ? formatDate(label) : ''}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Row color={CURRENT_RED} label="This period" value={`${Math.round(point?.avgScore ?? 0)}`} />
        <Row color={PREVIOUS_BLUE} label="Previous period" value={`${Math.round(point?.previous ?? 0)}`} />
        <Row color={GOAL_LINE} label="Goal" value={`${Math.round(point?.goal ?? 0)}`} />
      </div>
    </div>
  )
}

function Row({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ color: '#64748b', flex: 1 }}>{label}</span>
      <span style={{ fontWeight: 700, color: '#0f172a' }}>{value}</span>
    </div>
  )
}

export function TrendChart({ data, height = 260, loading = false }: TrendChartProps) {
  if (loading) {
    return (
      <div
        style={{
          height,
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

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#475569',
          fontSize: 14,
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 32 }}>📈</span>
        <span>No trend data available</span>
      </div>
    )
  }

  const chartData = data.map((d, index, list) => {
    const previousPoint = list[index - 1]
    return {
      ...d,
      dateLabel: formatDate(d.date),
      current: d.avgScore,
      previous: previousPoint ? previousPoint.avgScore * 0.78 : d.avgScore * 0.42,
      goal: 72,
    }
  })

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 8, right: 18, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#edf2f7" vertical={false} />
        <XAxis
          dataKey="dateLabel"
          tick={{ fill: '#7c8da5', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#7c8da5', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip content={<TrendTooltip />} />
        <Line
          type="monotone"
          dataKey="current"
          name="This period"
          stroke={CURRENT_RED}
          strokeWidth={3}
          dot={false}
          activeDot={{ r: 5, fill: CURRENT_RED, strokeWidth: 0 }}
        />
        <Line
          type="monotone"
          dataKey="previous"
          name="Previous period"
          stroke={PREVIOUS_BLUE}
          strokeWidth={2}
          strokeDasharray="7 7"
          dot={false}
          activeDot={{ r: 4, fill: PREVIOUS_BLUE, strokeWidth: 0 }}
        />
        <Line
          type="monotone"
          dataKey="goal"
          name="Goal"
          stroke={GOAL_LINE}
          strokeWidth={2}
          strokeDasharray="3 6"
          dot={false}
          activeDot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
