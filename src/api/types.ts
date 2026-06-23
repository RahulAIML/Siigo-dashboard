// ─── API Response Wrapper ─────────────────────────────────────────────────────
export interface ApiResponse<T> {
  result: 'success' | 'failure'
  data:   T[]
  error:  string | null
}

// ─── Simulation Session ───────────────────────────────────────────────────────
export interface Simulation {
  ID_Sim:            number
  ID_Caso_de_Uso:    number
  Actividad:         string
  Usuario:           string | null   // email
  Usuario_ID:        string | null
  Usuario_Nombre:    string
  Calificacion:      number | null   // score 0–100
  Diagnostico_Final: 'si' | 'no' | null
  Fecha_y_Hora:      string          // datetime
  Puntos_Totales:    number | null
  closing_analysis:  string | null
  // Interaction rounds 1–5
  Pregunta_1: string | null;   Respuesta_1: string | null
  Retroalimentacion_1: string | null; Puntos_1: number | null
  Pregunta_2: string | null;   Respuesta_2: string | null
  Retroalimentacion_2: string | null; Puntos_2: number | null
  Pregunta_3: string | null;   Respuesta_3: string | null
  Retroalimentacion_3: string | null; Puntos_3: number | null
  Pregunta_4: string | null;   Respuesta_4: string | null
  Retroalimentacion_4: string | null; Puntos_4: number | null
  Pregunta_5: string | null;   Respuesta_5: string | null
  Retroalimentacion_5: string | null; Puntos_5: number | null
}

// ─── Activity / Simulator ─────────────────────────────────────────────────────
export interface Activity {
  ID:           number
  name:         string
  category:     string
  interactions: number | null
  lang:         string
  available:    number
}

// ─── Organization ─────────────────────────────────────────────────────────────
export interface Member {
  ID:          number
  name:        string
  email:       string
  level:       number
  disabled:    number
  designation: string
  parent_id:   number | null
}

export interface Admin {
  ID:        number
  name:      string
  email:     string
  parent_id: number | null
}

export interface OrgNode {
  id:          number
  parentId:    number | null
  name:        string
  email:       string
  type:        string
  children:    OrgNode[]
  memberCount: number
}

// ─── Session Detail ───────────────────────────────────────────────────────────
export interface SimDetail {
  ID:            number
  session_id:    number
  sequence:      number
  ai_text:       string | null
  user_text:     string | null
  retro_analysis: string | null
}

export interface SimReport {
  ID_Sim:         number
  ID_Caso_de_Uso: number
  Usuario:        string | null
  Usuario_Nombre: string | null
  Fecha_y_Hora:   string | null
  Calificacion:   number
  Producto:       string
  Titulo:         string
  Rondas: {
    n:               number
    pregunta:        string | null
    respuesta_rep:   string | null
    criterio:        string
    respuesta_modelo:string
    analisis:        string
    puntos:          number | null
    max_puntos:      number
  }[]
  Secciones: unknown[]
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────
export interface QuickKPIs {
  totalSimulations: number
  averageScore:     number
  passRate:         number
  activeAdvisors:   number
  passCount:        number
  failCount:        number
  bestScore:        number
  worstScore:       number
}

export interface DashboardKPIs extends QuickKPIs {
  totalActivities: number
  totalMembers:    number
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export interface TrendPoint {
  date:     string
  avgScore: number
  count:    number
  passRate: number
}

export interface RoundStat {
  round:    number
  label:    string
  avg:      number
  passRate: number
  count:    number
}

export interface ScoreBucket {
  label: string
  count: number
  min:   number
  max:   number
}

export interface UserStat {
  name:       string
  userId:     string | null
  count:      number
  avgScore:   number
  passRate:   number
  bestScore:  number
  passCount:  number
}

export interface ActivityStat {
  id:           number
  name:         string
  activityType: string
  count:        number
  avgScore:     number
  passRate:     number
  passCount:    number
  failCount:    number
}

// ─── Validation ───────────────────────────────────────────────────────────────
export interface ValidationWarning {
  field:        string
  message:      string
  affectedRows?: number
}

export interface ValidationError {
  field:   string
  message: string
  value?:  unknown
}

export interface ValidationResult {
  valid:    boolean
  warnings: ValidationWarning[]
  errors:   ValidationError[]
}
