import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { format, parseISO } from 'date-fns'
import { TrendingUp } from 'lucide-react'
import type { TrendPoint } from '../../api/types'
import { PASS_THRESHOLD } from '../../config/constants'
import { t } from '../../lib/i18n'

interface TrendChartProps {
  data:      TrendPoint[]
  height?:   number
  loading?:  boolean
  language?: 'es' | 'en'
}

function formatDate(dateStr: string) {
  try { return format(parseISO(dateStr), 'MMM d') }
  catch { return dateStr }
}

function TrendTooltip({ active, payload, label, language }: any) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]?.payload as TrendPoint | undefined
  const lang: 'es' | 'en' = language ?? 'es'
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e7ecf3',
      borderRadius: 14,
      padding: '12px 16px',
      boxShadow: '0 16px 32px rgba(15,23,42,0.10)',
      minWidth: 150,
      fontSize: 13,
      color: '#1e293b',
    }}>
      <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label ? formatDate(label) : ''}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Row color="#0066FF" label={t('avgScoreLabel', lang)} value={`${(point?.avgScore ?? 0).toFixed(1)}`} />
        <Row color="#22c55e" label={t('sessionsLabel', lang)}  value={`${point?.count ?? 0}`} />
        <Row color="#f59e0b" label={t('passRateLabel', lang)} value={`${(point?.passRate ?? 0).toFixed(1)}%`} />
      </div>
    </div>
  )
}

function Row({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ color: '#64748b', flex: 1 }}>{label}</span>
      <span style={{ fontWeight: 700, color: '#0f172a' }}>{value}</span>
    </div>
  )
}

export function TrendChart({ data, height = 260, loading = false, language = 'es' }: TrendChartProps) {
  if (loading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
        {t('loadingLabel', language)}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#94a3b8' }}>
        <TrendingUp size={28} style={{ opacity: 0.3 }} />
        <span style={{ fontSize: 13 }}>{t('noTrendData', language)}</span>
      </div>
    )
  }

  const chartData = data.map(d => ({ ...d, dateLabel: formatDate(d.date) }))
  const isSinglePoint = data.length === 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 8, right: 18, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#edf2f7" vertical={false} />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={<TrendTooltip language={language} />} />
          <ReferenceLine
            y={PASS_THRESHOLD}
            stroke="#22c55e"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{ value: `${t('passLabel', language)} ${PASS_THRESHOLD}`, position: 'insideTopRight', fill: '#22c55e', fontSize: 10 }}
          />
          <Line
            type="monotone"
            dataKey="avgScore"
            name={t('avgScoreLabel', language)}
            stroke="#0066FF"
            strokeWidth={2.5}
            dot={isSinglePoint ? { r: 6, fill: '#0066FF', strokeWidth: 0 } : false}
            activeDot={{ r: 5, fill: '#0066FF', strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="passRate"
            name={t('passRateLabel', language)}
            stroke="#22c55e"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={isSinglePoint ? { r: 5, fill: '#22c55e', strokeWidth: 0 } : false}
            activeDot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
      {isSinglePoint && (
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
          {t('singleDayTrend', language)}
        </p>
      )}
    </div>
  )
}
