import { describe, it, expect } from 'vitest'
import {
  computeQuickKPIs, computeTrend, computeScoreDistribution,
  computeUserStats, filterTestUsers, isTestUser,
} from '../lib/analytics'
import type { Simulation } from '../api/types'

function makeSim(overrides: Partial<Simulation> = {}): Simulation {
  return {
    ID_Sim: 1, ID_Caso_de_Uso: 3200, Actividad: 'Siigo Gastrobar',
    Usuario: 'real@siigo.com', Usuario_ID: '1',
    Usuario_Nombre: 'Real User', Calificacion: 75,
    Diagnostico_Final: 'si', Fecha_y_Hora: '2026-06-15 10:00:00',
    Puntos_Totales: 75, closing_analysis: null,
    Pregunta_1: null, Respuesta_1: null, Retroalimentacion_1: null, Puntos_1: null,
    Pregunta_2: null, Respuesta_2: null, Retroalimentacion_2: null, Puntos_2: null,
    Pregunta_3: null, Respuesta_3: null, Retroalimentacion_3: null, Puntos_3: null,
    Pregunta_4: null, Respuesta_4: null, Retroalimentacion_4: null, Puntos_4: null,
    Pregunta_5: null, Respuesta_5: null, Retroalimentacion_5: null, Puntos_5: null,
    ...overrides,
  }
}

describe('computeQuickKPIs', () => {
  it('returns zeros for empty array', () => {
    const kpis = computeQuickKPIs([])
    expect(kpis.total).toBe(0)
    expect(kpis.avgScore).toBe(0)
    expect(kpis.passRate).toBe(0)
    expect(kpis.activeUsers).toBe(0)
    expect(kpis.passCount).toBe(0)
    expect(kpis.failCount).toBe(0)
  })

  it('computes correct KPIs from sample data', () => {
    const sims = [
      makeSim({ Puntos_Totales: 80, Diagnostico_Final: 'si', Usuario_Nombre: 'Alice', Usuario: 'alice@siigo.com' }),
      makeSim({ Puntos_Totales: 60, Diagnostico_Final: 'no', Usuario_Nombre: 'Bob', Usuario: 'bob@siigo.com', Usuario_ID: '2', ID_Sim: 2 }),
      makeSim({ Puntos_Totales: 90, Diagnostico_Final: 'si', Usuario_Nombre: 'Alice', Usuario: 'alice@siigo.com', ID_Sim: 3 }),
    ]
    const kpis = computeQuickKPIs(sims)
    expect(kpis.total).toBe(3)
    expect(kpis.passCount).toBe(2)
    expect(kpis.failCount).toBe(1)
    expect(kpis.passRate).toBeCloseTo(66.67, 1)
    expect(kpis.avgScore).toBeCloseTo(76.67, 1)
    expect(kpis.activeUsers).toBe(2)
    expect(kpis.bestScore).toBe(90)
    expect(kpis.worstScore).toBe(60)
  })
})

describe('computeTrend', () => {
  it('returns empty array for empty input', () => {
    expect(computeTrend([])).toEqual([])
  })

  it('groups simulations by date', () => {
    const sims = [
      makeSim({ Fecha_y_Hora: '2026-06-01 10:00:00', Puntos_Totales: 80, Diagnostico_Final: 'si' }),
      makeSim({ Fecha_y_Hora: '2026-06-01 14:00:00', Puntos_Totales: 60, Diagnostico_Final: 'no', ID_Sim: 2 }),
      makeSim({ Fecha_y_Hora: '2026-06-02 10:00:00', Puntos_Totales: 90, Diagnostico_Final: 'si', ID_Sim: 3 }),
    ]
    const trend = computeTrend(sims)
    expect(trend).toHaveLength(2)
    expect(trend[0].date).toBe('2026-06-01')
    expect(trend[0].count).toBe(2)
    expect(trend[0].avgScore).toBe(70)
    expect(trend[1].date).toBe('2026-06-02')
    expect(trend[1].count).toBe(1)
  })
})

describe('computeScoreDistribution', () => {
  it('distributes scores into correct buckets', () => {
    const sims = [
      makeSim({ Puntos_Totales: 15 }),
      makeSim({ Puntos_Totales: 35, ID_Sim: 2 }),
      makeSim({ Puntos_Totales: 55, ID_Sim: 3 }),
      makeSim({ Puntos_Totales: 75, ID_Sim: 4 }),
      makeSim({ Puntos_Totales: 95, ID_Sim: 5 }),
    ]
    const dist = computeScoreDistribution(sims)
    expect(dist[0].count).toBe(1) // 0-20
    expect(dist[1].count).toBe(1) // 21-40
    expect(dist[2].count).toBe(1) // 41-60
    expect(dist[3].count).toBe(1) // 61-80
    expect(dist[4].count).toBe(1) // 81-100
  })
})

describe('filterTestUsers', () => {
  it('removes test users', () => {
    const sims = [
      makeSim({ Usuario_Nombre: 'Real User', Usuario: 'real@siigo.com' }),
      makeSim({ Usuario_Nombre: 'Tester Fake', Usuario: 'tester@siigo.com', ID_Sim: 2 }),
      makeSim({ Usuario_Nombre: 'Piloto 1', Usuario: 'piloto@siigo.com', ID_Sim: 3 }),
      makeSim({ Usuario_Nombre: 'Demo User', Usuario: 'demo@siigo.com', ID_Sim: 4 }),
    ]
    const filtered = filterTestUsers(sims)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].Usuario_Nombre).toBe('Real User')
  })
})

describe('isTestUser', () => {
  it('identifies rolplay email as test', () => {
    expect(isTestUser('John', 'john@rolplay.com')).toBe(true)
  })
  it('identifies Demo User as test', () => {
    expect(isTestUser('Demo User', 'demo@siigo.com')).toBe(true)
  })
  it('identifies normal users correctly', () => {
    expect(isTestUser('María García', 'maria@siigo.com')).toBe(false)
  })
})

describe('computeUserStats', () => {
  it('groups and sorts by avgScore descending', () => {
    const sims = [
      makeSim({ Usuario_Nombre: 'Alice', Usuario: 'alice@siigo.com', Puntos_Totales: 90, Diagnostico_Final: 'si' }),
      makeSim({ Usuario_Nombre: 'Bob', Usuario: 'bob@siigo.com', Usuario_ID: '2', Puntos_Totales: 50, Diagnostico_Final: 'no', ID_Sim: 2 }),
      makeSim({ Usuario_Nombre: 'Alice', Usuario: 'alice@siigo.com', Puntos_Totales: 80, Diagnostico_Final: 'si', ID_Sim: 3 }),
    ]
    const stats = computeUserStats(sims)
    expect(stats[0].name).toBe('Alice')
    expect(stats[0].count).toBe(2)
    expect(stats[0].avgScore).toBe(85)
    expect(stats[1].name).toBe('Bob')
  })
})
