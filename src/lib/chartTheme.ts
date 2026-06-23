// SIIGO brand: primary blue #0066FF

export const CHART_COLORS = [
  '#0066FF',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#06B6D4',
  '#EF4444',
  '#6366F1',
  '#EC4899',
]

export const PASS_COLOR   = '#10B981'
export const FAIL_COLOR   = '#EF4444'
export const ACCENT_COLOR = '#0066FF'

export const axisStyle = {
  tick:     { fill: '#94A3B8', fontSize: 12, fontFamily: 'Inter, sans-serif' },
  axisLine: { stroke: '#334155' },
  tickLine: false as const,
}

export const gridStyle = {
  stroke:          '#334155',
  strokeDasharray: '3 3',
  strokeOpacity:   0.5,
}

export const tooltipStyle = {
  contentStyle: {
    background:   '#1E293B',
    border:       '1px solid #334155',
    borderRadius: 8,
    color:        '#F1F5F9',
    fontSize:     13,
    fontFamily:   'Inter, sans-serif',
  },
  cursor: { fill: 'rgba(0, 102, 255, 0.08)' },
}

export const chartMargin = { top: 8, right: 16, bottom: 8, left: 0 }
