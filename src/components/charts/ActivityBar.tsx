import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts'
import type { ActivityStat } from '../../api/types'
import { PASS_THRESHOLD } from '../../config/constants'

const SIIGO_BLUE      = '#0061ff'
const SIIGO_BLUE_FAIL = '#1e40af'
const GREEN           = '#22c55e'

interface ActivityBarProps {
  data:     ActivityStat[]
  loading?: boolean
}

function ActivityTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null
  const stat = payload[0]?.payload as ActivityStat

  return (
    <div
      style={{
        background: '#1e2535',
        border: '1px solid #2d3a52',
        borderRadius: 8,
        padding: '10px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
        fontSize: 13,
        color: '#e2e8f0',
        maxWidth: 240,
      }}
    >
      <p
        style={{
          margin: '0 0 8px',
          fontWeight: 600,
          color: '#f1f5f9',
          fontSize: 13,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {stat?.activityName ?? label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <TooltipRow color={SIIGO_BLUE} label="Avg Score"  value={`${(stat?.avgScore ?? 0).toFixed(1)}`} />
        <TooltipRow color={GREEN}      label="Pass Rate"  value={`${(stat?.passRate ?? 0).toFixed(1)}%`} />
        <TooltipRow color="#94a3b8"    label="Sessions"   value={String(stat?.count ?? 0)} />
      </div>
    </div>
  )
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
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

function truncate(str: string, max = 22) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

export function ActivityBar({ data, loading = false }: ActivityBarProps) {
  if (loading) {
    return (
      <div
        style={{
          height: 300,
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
          height: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#475569',
          fontSize: 14,
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 32 }}>📋</span>
        <span>No activity data available</span>
      </div>
    )
  }

  // Sort descending by avgScore and take top 10
  const sorted = [...data]
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10)

  const chartData = sorted.map(d => ({
    ...d,
    shortName: truncate(d.activityName),
  }))

  const barHeight = 36
  const chartHeight = Math.max(220, chartData.length * barHeight + 60)

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 48, bottom: 4, left: 4 }}
        barCategoryGap="18%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}`}
        />
        <YAxis
          type="category"
          dataKey="shortName"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={136}
        />
        <Tooltip content={<ActivityTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <ReferenceLine
          x={PASS_THRESHOLD}
          stroke="#475569"
          strokeDasharray="4 3"
          strokeWidth={1}
          label={{
            value: `Pass (${PASS_THRESHOLD})`,
            position: 'insideTopRight',
            fill: '#475569',
            fontSize: 10,
          }}
        />
        <Bar dataKey="avgScore" name="Avg Score" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.avgScore >= PASS_THRESHOLD ? SIIGO_BLUE : SIIGO_BLUE_FAIL}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
