// csvExport.ts — SIIGO Dashboard

export interface Simulation {
  ID: string | number
  Usuario_Nombre: string
  Usuario_Email: string
  Actividad: string
  Calificacion: number | null | undefined
  Diagnostico_Final: string | null | undefined
  Fecha: string
}

export interface UserStat {
  nombre: string
  simulaciones: number
  avgScore: number
  passRate: number
  bestScore: number
}

export interface DashboardKPIs {
  totalSimulations: number
  activeAdvisors: number
  averageScore: number
  passRate: number
  certifiedCount: number
  inProgressCount: number
  strongCount: number
  developingCount: number
  weakCount: number
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function escapeCSVValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Wrap in double-quotes if the value contains a comma, double-quote, or newline
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function buildCSV(rows: (string | number | null | undefined)[][]): string {
  return rows.map((row) => row.map(escapeCSVValue).join(',')).join('\r\n')
}

function triggerDownload(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// exportSimulationsCSV
// ---------------------------------------------------------------------------

export function exportSimulationsCSV(
  sims: Simulation[],
  filename = 'siigo-simulations.csv',
): void {
  const headers = ['ID', 'Usuario', 'Email', 'Actividad', 'Calificacion', 'Diagnostico', 'Fecha']

  const dataRows = sims.map((sim) => [
    sim.ID,
    sim.Usuario_Nombre,
    sim.Usuario_Email,
    sim.Actividad,
    sim.Calificacion ?? '',
    sim.Diagnostico_Final ?? '',
    sim.Fecha,
  ])

  const csv = buildCSV([headers, ...dataRows])
  triggerDownload(csv, filename)
}

// ---------------------------------------------------------------------------
// exportLeaderboardCSV
// ---------------------------------------------------------------------------

export function exportLeaderboardCSV(
  userStats: UserStat[],
  filename = 'siigo-leaderboard.csv',
): void {
  const headers = [
    'Rank',
    'Nombre',
    'Simulaciones',
    'Promedio',
    'Tasa_Aprobacion',
    'Mejor_Puntaje',
  ]

  const sorted = [...userStats].sort((a, b) => b.avgScore - a.avgScore)

  const dataRows = sorted.map((stat, index) => [
    index + 1,
    stat.nombre,
    stat.simulaciones,
    stat.avgScore,
    stat.passRate,
    stat.bestScore,
  ])

  const csv = buildCSV([headers, ...dataRows])
  triggerDownload(csv, filename)
}

// ---------------------------------------------------------------------------
// exportSummaryCSV
// ---------------------------------------------------------------------------

export function exportSummaryCSV(
  kpis: DashboardKPIs,
  filename = 'siigo-summary.csv',
): void {
  const headers = ['Metrica', 'Valor']

  const dataRows: (string | number)[][] = [
    ['Total_Simulaciones', kpis.totalSimulations],
    ['Asesores_Activos', kpis.activeAdvisors],
    ['Puntaje_Promedio', kpis.averageScore],
    ['Tasa_Aprobacion', kpis.passRate],
    ['Certificados', kpis.certifiedCount],
    ['En_Progreso', kpis.inProgressCount],
    ['Nivel_Solido', kpis.strongCount],
    ['En_Desarrollo', kpis.developingCount],
    ['Nivel_Bajo', kpis.weakCount],
  ]

  const csv = buildCSV([headers, ...dataRows])
  triggerDownload(csv, filename)
}
