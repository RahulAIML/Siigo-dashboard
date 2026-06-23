import { describe, it, expect } from 'vitest'
import { validationService } from '../services/ValidationService'

describe('ValidationService.validateScore', () => {
  it('accepts valid scores', () => {
    expect(validationService.validateScore(0)).toBe(true)
    expect(validationService.validateScore(50)).toBe(true)
    expect(validationService.validateScore(100)).toBe(true)
  })

  it('rejects invalid scores', () => {
    expect(validationService.validateScore(-1)).toBe(false)
    expect(validationService.validateScore(101)).toBe(false)
    expect(validationService.validateScore(null)).toBe(false)
    expect(validationService.validateScore(NaN)).toBe(false)
  })
})

describe('ValidationService.validateDateRange', () => {
  it('accepts valid date ranges', () => {
    expect(validationService.validateDateRange('2026-06-01', '2026-06-24')).toBe(true)
    expect(validationService.validateDateRange('2026-01-01', '2026-06-23')).toBe(true)
  })

  it('rejects invalid date formats', () => {
    expect(validationService.validateDateRange('06/01/2026', '06/30/2026')).toBe(false)
    expect(validationService.validateDateRange('', '2026-06-30')).toBe(false)
  })

  it('rejects reversed ranges', () => {
    expect(validationService.validateDateRange('2026-06-30', '2026-06-01')).toBe(false)
  })
})

describe('ValidationService.sanitizeSQL', () => {
  it('allows SELECT queries', () => {
    expect(() => validationService.sanitizeSQL('SELECT * FROM r_user')).not.toThrow()
    expect(() => validationService.sanitizeSQL('  SELECT id FROM r_user_session')).not.toThrow()
  })

  it('blocks dangerous operations', () => {
    expect(() => validationService.sanitizeSQL('DELETE FROM r_user WHERE 1=1')).toThrow()
    expect(() => validationService.sanitizeSQL('DROP TABLE r_user')).toThrow()
    expect(() => validationService.sanitizeSQL('UPDATE r_user SET disabled=1')).toThrow()
    expect(() => validationService.sanitizeSQL('INSERT INTO r_user VALUES (1)')).toThrow()
    expect(() => validationService.sanitizeSQL('ALTER TABLE r_user ADD COLUMN x INT')).toThrow()
  })

  it('strips SQL comments', () => {
    const sql = validationService.sanitizeSQL('SELECT * FROM r_user -- this is a comment')
    expect(sql).not.toContain('--')
  })
})
