import { format, parseISO, subDays, subMonths, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'

export const DATA_EPOCH = '2026-06-01'

export type DatePreset = 'today' | 'last7' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'all'

export function resolvePreset(preset: DatePreset): { from: string; to: string } {
  const now = new Date()
  const todayStr = format(startOfDay(now), 'yyyy-MM-dd')

  switch (preset) {
    case 'today':
      return { from: todayStr, to: todayStr }

    case 'last7':
      return {
        from: format(startOfDay(subDays(now, 7)), 'yyyy-MM-dd'),
        to: todayStr,
      }

    case 'last30':
      return {
        from: format(startOfDay(subDays(now, 30)), 'yyyy-MM-dd'),
        to: todayStr,
      }

    case 'last90':
      return {
        from: format(startOfDay(subDays(now, 90)), 'yyyy-MM-dd'),
        to: todayStr,
      }

    case 'thisMonth':
      return {
        from: format(startOfMonth(now), 'yyyy-MM-dd'),
        to: todayStr,
      }

    case 'lastMonth': {
      const prevMonth = subMonths(now, 1)
      return {
        from: format(startOfMonth(prevMonth), 'yyyy-MM-dd'),
        to: format(endOfMonth(prevMonth), 'yyyy-MM-dd'),
      }
    }

    case 'all':
      return { from: DATA_EPOCH, to: todayStr }

    default:
      return { from: DATA_EPOCH, to: todayStr }
  }
}

export function resolveEffectiveDates(
  from: string | null,
  to: string | null,
  preset?: DatePreset,
): { from: string; to: string } {
  const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd')

  if (from === null && to === null) {
    return resolvePreset(preset ?? 'last30')
  }

  let resolvedFrom = from ?? DATA_EPOCH
  let resolvedTo = to ?? todayStr

  if (resolvedFrom < DATA_EPOCH) {
    resolvedFrom = DATA_EPOCH
  }

  return { from: resolvedFrom, to: resolvedTo }
}

export function formatDate(dateStr: string, lang: 'es' | 'en' = 'es'): string {
  const date = parseISO(dateStr)

  if (lang === 'en') {
    return format(date, 'MMM d, yyyy')
  }

  const day = format(date, 'd')
  const monthNum = date.getMonth()
  const year = format(date, 'yyyy')

  const monthsEs = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const monthStr = monthsEs[monthNum]

  return `${day} ${monthStr} ${year}`
}

export function formatDateShort(dateStr: string): string {
  const date = parseISO(dateStr)
  return format(date, 'yyyy-MM-dd')
}

export function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false
  }

  const date = parseISO(dateStr)
  return !isNaN(date.getTime())
}

export function getDaysBetween(from: string, to: string): number {
  const fromDate = startOfDay(parseISO(from))
  const toDate = startOfDay(parseISO(to))
  const diffMs = toDate.getTime() - fromDate.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}
