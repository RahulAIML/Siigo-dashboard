// ValidationService.ts — SIIGO Dashboard

export interface ValidationWarning {
  field: string
  message: string
  affectedRows?: number
}

export interface ValidationError {
  field: string
  message: string
  value?: unknown
}

export interface ValidationResult {
  valid: boolean
  warnings: ValidationWarning[]
  errors: ValidationError[]
}

// Minimal shape expected from simulation records
export interface Simulation {
  session_id: string | number
  score: number | null
  date_created: string
  user_name?: string | null
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidDate(raw: string): boolean {
  if (!DATE_RE.test(raw)) return false
  const d = new Date(raw)
  return !isNaN(d.getTime())
}

class ValidationService {
  // ---------------------------------------------------------------------------
  // validateSimulations
  // ---------------------------------------------------------------------------
  validateSimulations(sims: Simulation[]): ValidationResult {
    const warnings: ValidationWarning[] = []
    const errors: ValidationError[] = []

    if (!sims || sims.length === 0) {
      return { valid: true, warnings, errors }
    }

    // Null scores — warn if > 10 %
    const nullScoreCount = sims.filter((s) => s.score === null || s.score === undefined).length
    const nullRatio = nullScoreCount / sims.length
    if (nullRatio > 0.1) {
      warnings.push({
        field: 'score',
        message: `${(nullRatio * 100).toFixed(1)}% of simulations have a null score (threshold: 10%)`,
        affectedRows: nullScoreCount,
      })
    }

    // Duplicate session IDs — error
    const seen = new Set<string | number>()
    const duplicates = new Set<string | number>()
    for (const s of sims) {
      if (seen.has(s.session_id)) duplicates.add(s.session_id)
      else seen.add(s.session_id)
    }
    if (duplicates.size > 0) {
      errors.push({
        field: 'session_id',
        message: `Duplicate session IDs detected: ${[...duplicates].slice(0, 10).join(', ')}`,
        value: [...duplicates],
      })
    }

    // Invalid dates — error
    const badDates = sims.filter((s) => !isValidDate(s.date_created))
    if (badDates.length > 0) {
      errors.push({
        field: 'date_created',
        message: `${badDates.length} simulation(s) have an unparseable date_created`,
        value: badDates.map((s) => s.date_created),
      })
    }

    // Scores out of range — error
    const outOfRange = sims.filter(
      (s) => s.score !== null && s.score !== undefined && (s.score < 0 || s.score > 100),
    )
    if (outOfRange.length > 0) {
      errors.push({
        field: 'score',
        message: `${outOfRange.length} simulation(s) have a score outside the valid range [0, 100]`,
        value: outOfRange.map((s) => ({ session_id: s.session_id, score: s.score })),
      })
    }

    // Missing user names — warn
    const missingNames = sims.filter((s) => !s.user_name || s.user_name.trim() === '')
    if (missingNames.length > 0) {
      warnings.push({
        field: 'user_name',
        message: `${missingNames.length} simulation(s) are missing a user name`,
        affectedRows: missingNames.length,
      })
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    }
  }

  // ---------------------------------------------------------------------------
  // validateScore
  // ---------------------------------------------------------------------------
  validateScore(score: number | null): boolean {
    if (score === null || score === undefined) return false
    if (typeof score !== 'number' || isNaN(score)) return false
    return score >= 0 && score <= 100
  }

  // ---------------------------------------------------------------------------
  // validateDateRange
  // ---------------------------------------------------------------------------
  validateDateRange(from: string, to: string): boolean {
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) return false

    const fromDate = new Date(from)
    const toDate = new Date(to)

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return false
    if (fromDate > toDate) return false

    // Neither can be more than 1 day in the future
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(23, 59, 59, 999)

    if (fromDate > tomorrow || toDate > tomorrow) return false

    return true
  }

  // ---------------------------------------------------------------------------
  // validateKPI
  // ---------------------------------------------------------------------------
  validateKPI(name: string, value: number): ValidationResult {
    const warnings: ValidationWarning[] = []
    const errors: ValidationError[] = []

    switch (name) {
      case 'passRate':
      case 'averageScore':
        if (value < 0 || value > 100) {
          errors.push({
            field: name,
            message: `${name} must be between 0 and 100, got ${value}`,
            value,
          })
        }
        break

      case 'activeAdvisors':
      case 'totalSimulations':
        if (value < 0) {
          errors.push({
            field: name,
            message: `${name} must be >= 0, got ${value}`,
            value,
          })
        }
        break

      default:
        warnings.push({
          field: name,
          message: `Unknown KPI "${name}" — no validation rules defined`,
        })
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    }
  }

  // ---------------------------------------------------------------------------
  // sanitizeSQL
  // ---------------------------------------------------------------------------
  sanitizeSQL(sql: string): string {
    // Strip block comments /* ... */
    let sanitized = sql.replace(/\/\*[\s\S]*?\*\//g, '')

    // Strip line comments -- ...
    sanitized = sanitized.replace(/--[^\n]*/g, '')

    // Trim whitespace
    sanitized = sanitized.trim()

    // Remove any leading non-SELECT keywords (e.g. DROP, DELETE, INSERT …)
    // Keep removing tokens that are not SELECT or WITH until we reach one or exhaust
    const forbiddenLeadingPattern =
      /^(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|GRANT|REVOKE|MERGE|REPLACE|CALL|USE|SET|BEGIN|COMMIT|ROLLBACK)\s+/i
    while (forbiddenLeadingPattern.test(sanitized)) {
      sanitized = sanitized.replace(forbiddenLeadingPattern, '').trim()
    }

    // Final gate — must start with SELECT or WITH
    if (!/^(SELECT|WITH)\s/i.test(sanitized)) {
      throw new Error(
        'Invalid SQL: query must start with SELECT or WITH after sanitization. ' +
          `Got: "${sanitized.substring(0, 40)}"`,
      )
    }

    return sanitized
  }
}

export const validationService = new ValidationService()
export default ValidationService
