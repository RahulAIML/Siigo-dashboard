import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { TrendPoint } from '../../api/types'
import { TooltipShell } from './TooltipShell'

const SIIGO_BLUE    = '#0061ff'
const SIIGO_BLUE_20 = 'rgba(0,97,255,0.18)'
const GREEN         = '#22c55e'

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

  const point = payload[0]?.payload as TrendPoint | undefined

  return (
    <div
      style={{
        background: '#1e2535',
        border: '1px solid #2d3a52',
        borderRadius: 8,
        padding: '10px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
        minWidth: 160,
        fontSize: 13,
        color: '#e2e8f0',
      }}
    >
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
        {label ? formatDate(label) : ''}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Row color={SIIGO_BLUE} label="Avg Score"  value={`${(point?.avgScore ?? 0).toFixed(1)}`} />
        <Row color={GREEN}      label="Pass Rate"  value={`${(point?.passRate ?? 0).toFixed(1)}%`} />
        <Row color="#94a3b8"    label="Sessions"   value={String(point?.count ?? 0)} />
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
      <span style={{ color: '#94a3b8', flex: 1 }}>{label}</span>
      <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{value}</span>
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

  const chartData = data.map(d => ({
    ...d,
    dateLabel: formatDate(d.date),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="siigoBlueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={SIIGO_BLUE} stopOpacity={0.35} />
            <stop offset="95%" stopColor={SIIGO_BLUE} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" vertical={false} />
        <XAxis
          dataKey="dateLabel"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          yAxisId="score"
          domain={[0, 100]}
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}`}
          width={32}
        />
        <YAxis
          yAxisId="rate"
          orientation="right"
          domain={[0, 100]}
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}%`}
          width={36}
        />
        <Tooltip content={<TrendTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }}
        />
        <Area
          yAxisId="score"
          type="monotone"
          dataKey="avgScore"
          name="Avg Score"
          stroke={SIIGO_BLUE}
          strokeWidth={2}
          fill="url(#siigoBlueGrad)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Line
          yAxisId="rate"
          type="monotone"
          dataKey="passRate"
          name="Pass Rate %"
          stroke={GREEN}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
