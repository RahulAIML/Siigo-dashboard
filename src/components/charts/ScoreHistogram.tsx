import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import type { ScoreBucket } from '../../api/types'

// Five shades of SIIGO blue, lightest for lowest bucket, deepest for highest
const BUCKET_COLORS = [
  '#bfdbfe', // 0-19  very light blue
  '#60a5fa', // 20-39 light blue
  '#2563eb', // 40-59 medium blue
  '#0061ff', // 60-79 SIIGO blue
  '#003fad', // 80-100 deep SIIGO blue
]

interface ScoreHistogramProps {
  data:     ScoreBucket[]
  loading?: boolean
}

function HistogramTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null
  const bucket = payload[0]?.payload as ScoreBucket
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
      <p
        style={{
          margin: '0 0 6px',
          fontWeight: 600,
          color: '#94a3b8',
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {bucket?.label ?? label}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#94a3b8' }}>Sessions</span>
        <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{payload[0]?.value}</span>
      </div>
    </div>
  )
}

export function ScoreHistogram({ data, loading = false }: ScoreHistogramProps) {
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

  if (!data || data.length === 0) {
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
        <span style={{ fontSize: 32 }}>📊</span>
        <span>No distribution data</span>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={28}
        />
        <Tooltip content={<HistogramTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="count" name="Sessions" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={BUCKET_COLORS[i % BUCKET_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
