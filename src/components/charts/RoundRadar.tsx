import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
} from 'recharts'
import type { RoundStat } from '../../api/types'

const SIIGO_BLUE = '#0061ff'
const GREEN      = '#22c55e'

interface RoundRadarProps {
  data:     RoundStat[]
  loading?: boolean
}

function RadarTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null
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
        {label}
      </p>
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: i > 0 ? 4 : 0 }}>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: entry.color,
              flexShrink: 0,
            }}
          />
          <span style={{ color: '#94a3b8', flex: 1 }}>{entry.name}</span>
          <span style={{ fontWeight: 700, color: '#f1f5f9' }}>
            {entry.name === 'Pass Rate' ? `${Number(entry.value).toFixed(1)}%` : Number(entry.value).toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function RoundRadar({ data, loading = false }: RoundRadarProps) {
  if (loading) {
    return (
      <div
        style={{
          height: 280,
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
          height: 280,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#475569',
          fontSize: 14,
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 32 }}>🕸️</span>
        <span>No round data available</span>
      </div>
    )
  }

  const chartData = data.map(d => ({
    subject:  d.label,
    avg:      Math.round(d.avg * 10) / 10,
    passRate: Math.round(d.passRate * 10) / 10,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={chartData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
        <PolarGrid stroke="#1e2d3d" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: '#64748b', fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: '#475569', fontSize: 10 }}
          axisLine={false}
          tickCount={4}
        />
        <Radar
          name="Avg Score"
          dataKey="avg"
          stroke={SIIGO_BLUE}
          fill={SIIGO_BLUE}
          fillOpacity={0.18}
          strokeWidth={2}
          dot={{ r: 3, fill: SIIGO_BLUE, strokeWidth: 0 }}
        />
        <Radar
          name="Pass Rate"
          dataKey="passRate"
          stroke={GREEN}
          fill={GREEN}
          fillOpacity={0.12}
          strokeWidth={2}
          dot={{ r: 3, fill: GREEN, strokeWidth: 0 }}
        />
        <Tooltip content={<RadarTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 4 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
