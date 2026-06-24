import type { Activity, Admin, Member, Simulation, SimReport } from './types'
import { resolveEffectiveDates } from '../lib/dateUtils'
import { API_BRIDGE, SIIGO_CLIENT_ID, SIIGO_IDS_SQL, PASS_THRESHOLD } from '../config/constants'

const REMOTE = API_BRIDGE

/** Extract YYYY-MM-DD from a datetime string */
export function simDate(fecha: string | null | undefined): string {
  return fecha?.substring(0, 10) ?? ''
}

// HTML entity decoder (browser-side only)
const _entityEl = typeof document !== 'undefined' ? document.createElement('textarea') : null
function decodeEntities(s: string | null | undefined): string {
  if (!s) return ''
  if (!_entityEl || !s.includes('&')) return s
  _entityEl.innerHTML = s
  return _entityEl.value
}

/** Extract overall score (0–100) from the closing_analysis HTML report */
function parseHtmlScore(html: string | null | undefined): number | null {
  if (!html) return null
  const m = html.match(/rp-sim-report-score-number[^>]*>\s*(\d+)\s*</)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return isNaN(n) ? null : Math.min(100, Math.max(0, n))
}

function isInternalEmail(email: string | null | undefined): boolean {
  return /rolplay/i.test(email ?? '')
}

// ─── Core SQL helper ──────────────────────────────────────────────────────────
async function remoteSQL<T>(sql: string, signal?: AbortSignal): Promise<T[]> {
  const res = await fetch(REMOTE, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ sql }),
    signal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} — remote-access.php`)
  const json = await res.json()
  if (json.result !== 'success') throw new Error(json.error ?? 'SQL query failed')
  return (json.data ?? []) as T[]
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export async function fetchActivities(signal?: AbortSignal): Promise<Activity[]> {
  return remoteSQL<Activity>(
    `SELECT ID, name, COALESCE(category,'SIM') AS category,
            COALESCE(interactions,0) AS interactions,
            lang, COALESCE(available,1) AS available
     FROM r_simulator
     WHERE ID IN (${SIIGO_IDS_SQL})
     ORDER BY name`,
    signal,
  )
}

export async function fetchSimulations(
  from?: string | null,
  to?:   string | null,
  signal?: AbortSignal,
): Promise<Simulation[]> {
  const { from: effFrom, to: effTo } = resolveEffectiveDates(from ?? null, to ?? null)

  const rows = await remoteSQL<Simulation>(
    `SELECT
       us.ID                              AS ID_Sim,
       us.simulator_id                    AS ID_Caso_de_Uso,
       rs.name                            AS Actividad,
       u.email                            AS Usuario,
       u.ID                               AS Usuario_ID,
       u.name                             AS Usuario_Nombre,
       us.score                           AS Calificacion,
       IF(us.passed_flag = 1, 'si', 'no') AS Diagnostico_Final,
       us.date_created                    AS Fecha_y_Hora,
       us.score                           AS Puntos_Totales,
       us.closing_analysis,
       d1.ai_text  AS Pregunta_1,  d1.user_text  AS Respuesta_1,  d1.retro_analysis  AS Retroalimentacion_1,  NULL AS Puntos_1,
       d2.ai_text  AS Pregunta_2,  d2.user_text  AS Respuesta_2,  d2.retro_analysis  AS Retroalimentacion_2,  NULL AS Puntos_2,
       d3.ai_text  AS Pregunta_3,  d3.user_text  AS Respuesta_3,  d3.retro_analysis  AS Retroalimentacion_3,  NULL AS Puntos_3,
       d4.ai_text  AS Pregunta_4,  d4.user_text  AS Respuesta_4,  d4.retro_analysis  AS Retroalimentacion_4,  NULL AS Puntos_4,
       d5.ai_text  AS Pregunta_5,  d5.user_text  AS Respuesta_5,  d5.retro_analysis  AS Retroalimentacion_5,  NULL AS Puntos_5,
       d6.ai_text  AS Pregunta_6,  d6.user_text  AS Respuesta_6,  d6.retro_analysis  AS Retroalimentacion_6,  NULL AS Puntos_6,
       d7.ai_text  AS Pregunta_7,  d7.user_text  AS Respuesta_7,  d7.retro_analysis  AS Retroalimentacion_7,  NULL AS Puntos_7,
       d8.ai_text  AS Pregunta_8,  d8.user_text  AS Respuesta_8,  d8.retro_analysis  AS Retroalimentacion_8,  NULL AS Puntos_8,
       d9.ai_text  AS Pregunta_9,  d9.user_text  AS Respuesta_9,  d9.retro_analysis  AS Retroalimentacion_9,  NULL AS Puntos_9,
       d10.ai_text AS Pregunta_10, d10.user_text AS Respuesta_10, d10.retro_analysis AS Retroalimentacion_10, NULL AS Puntos_10,
       d11.ai_text AS Pregunta_11, d11.user_text AS Respuesta_11, d11.retro_analysis AS Retroalimentacion_11, NULL AS Puntos_11,
       d12.ai_text AS Pregunta_12, d12.user_text AS Respuesta_12, d12.retro_analysis AS Retroalimentacion_12, NULL AS Puntos_12,
       d13.ai_text AS Pregunta_13, d13.user_text AS Respuesta_13, d13.retro_analysis AS Retroalimentacion_13, NULL AS Puntos_13,
       d14.ai_text AS Pregunta_14, d14.user_text AS Respuesta_14, d14.retro_analysis AS Retroalimentacion_14, NULL AS Puntos_14,
       d15.ai_text AS Pregunta_15, d15.user_text AS Respuesta_15, d15.retro_analysis AS Retroalimentacion_15, NULL AS Puntos_15,
       d16.ai_text AS Pregunta_16, d16.user_text AS Respuesta_16, d16.retro_analysis AS Retroalimentacion_16, NULL AS Puntos_16,
       d17.ai_text AS Pregunta_17, d17.user_text AS Respuesta_17, d17.retro_analysis AS Retroalimentacion_17, NULL AS Puntos_17,
       d18.ai_text AS Pregunta_18, d18.user_text AS Respuesta_18, d18.retro_analysis AS Retroalimentacion_18, NULL AS Puntos_18,
       d19.ai_text AS Pregunta_19, d19.user_text AS Respuesta_19, d19.retro_analysis AS Retroalimentacion_19, NULL AS Puntos_19,
       d20.ai_text AS Pregunta_20, d20.user_text AS Respuesta_20, d20.retro_analysis AS Retroalimentacion_20, NULL AS Puntos_20
     FROM r_user_session us
     JOIN r_user      u  ON u.ID  = us.user_id
     JOIN r_simulator rs ON rs.ID = us.simulator_id
     LEFT JOIN r_user_session_details d1  ON d1.session_id  = us.ID AND d1.sequence  = 1
     LEFT JOIN r_user_session_details d2  ON d2.session_id  = us.ID AND d2.sequence  = 2
     LEFT JOIN r_user_session_details d3  ON d3.session_id  = us.ID AND d3.sequence  = 3
     LEFT JOIN r_user_session_details d4  ON d4.session_id  = us.ID AND d4.sequence  = 4
     LEFT JOIN r_user_session_details d5  ON d5.session_id  = us.ID AND d5.sequence  = 5
     LEFT JOIN r_user_session_details d6  ON d6.session_id  = us.ID AND d6.sequence  = 6
     LEFT JOIN r_user_session_details d7  ON d7.session_id  = us.ID AND d7.sequence  = 7
     LEFT JOIN r_user_session_details d8  ON d8.session_id  = us.ID AND d8.sequence  = 8
     LEFT JOIN r_user_session_details d9  ON d9.session_id  = us.ID AND d9.sequence  = 9
     LEFT JOIN r_user_session_details d10 ON d10.session_id = us.ID AND d10.sequence = 10
     LEFT JOIN r_user_session_details d11 ON d11.session_id = us.ID AND d11.sequence = 11
     LEFT JOIN r_user_session_details d12 ON d12.session_id = us.ID AND d12.sequence = 12
     LEFT JOIN r_user_session_details d13 ON d13.session_id = us.ID AND d13.sequence = 13
     LEFT JOIN r_user_session_details d14 ON d14.session_id = us.ID AND d14.sequence = 14
     LEFT JOIN r_user_session_details d15 ON d15.session_id = us.ID AND d15.sequence = 15
     LEFT JOIN r_user_session_details d16 ON d16.session_id = us.ID AND d16.sequence = 16
     LEFT JOIN r_user_session_details d17 ON d17.session_id = us.ID AND d17.sequence = 17
     LEFT JOIN r_user_session_details d18 ON d18.session_id = us.ID AND d18.sequence = 18
     LEFT JOIN r_user_session_details d19 ON d19.session_id = us.ID AND d19.sequence = 19
     LEFT JOIN r_user_session_details d20 ON d20.session_id = us.ID AND d20.sequence = 20
     WHERE us.simulator_id IN (${SIIGO_IDS_SQL})
       AND u.client_id = ${SIIGO_CLIENT_ID}
       AND us.date_created >= '${effFrom}'
       AND us.date_created < DATE_ADD('${effTo}', INTERVAL 1 DAY)
     ORDER BY us.date_created DESC`,
    signal,
  )
  return rows
    .filter((r) => !isInternalEmail(r.Usuario))
    .map((r) => {
      const htmlScore = parseHtmlScore(r.closing_analysis)
      const score = htmlScore ?? 0
      return {
        ...r,
        Calificacion:      score,
        Puntos_Totales:    score,
        Diagnostico_Final: (score >= PASS_THRESHOLD ? 'si' : 'no') as 'si' | 'no',
      }
    })
}

export async function fetchSimReport(simId: number, signal?: AbortSignal): Promise<SimReport> {
  const id = Math.trunc(simId)

  const [session] = await remoteSQL<{
    ID_Sim: number; ID_Caso_de_Uso: number; Usuario: string | null; Usuario_Nombre: string | null
    Fecha_y_Hora: string | null; Calificacion: number; Producto: string; closing_analysis: string | null
  }>(
    `SELECT
       us.ID              AS ID_Sim,
       us.simulator_id    AS ID_Caso_de_Uso,
       u.email            AS Usuario,
       u.name             AS Usuario_Nombre,
       us.date_created    AS Fecha_y_Hora,
       us.score           AS Calificacion,
       rs.name            AS Producto,
       us.closing_analysis
     FROM r_user_session us
     JOIN r_user      u  ON u.ID  = us.user_id
     JOIN r_simulator rs ON rs.ID = us.simulator_id
     WHERE us.ID = ${id}`,
    signal,
  )
  if (!session) throw new Error(`Session ${id} not found`)
  const reportScore = parseHtmlScore(session.closing_analysis) ?? session.Calificacion

  const details = await remoteSQL<{
    sequence: number; ai_text: string | null; user_text: string | null; retro_analysis: string | null
  }>(
    `SELECT sequence, ai_text, user_text, retro_analysis
     FROM r_user_session_details
     WHERE session_id = ${id}
     ORDER BY sequence`,
    signal,
  )

  return {
    ID_Sim:         session.ID_Sim,
    ID_Caso_de_Uso: session.ID_Caso_de_Uso,
    Usuario:        session.Usuario,
    Usuario_Nombre: session.Usuario_Nombre,
    Fecha_y_Hora:   session.Fecha_y_Hora,
    Calificacion:   reportScore,
    Producto:       session.Producto,
    Titulo:         session.Producto,
    Rondas: details.map((d) => ({
      n:                d.sequence,
      pregunta:         d.ai_text ?? null,
      respuesta_rep:    d.user_text ?? null,
      criterio:         '',
      respuesta_modelo: '',
      analisis:         d.retro_analysis ?? '',
      puntos:           null,
      max_puntos:       1,
    })),
    Secciones: [],
  }
}

export async function fetchMembers(signal?: AbortSignal): Promise<Member[]> {
  const data = await remoteSQL<Member>(
    `SELECT
       ID,
       name,
       email,
       level,
       COALESCE(disabled, 0)     AS disabled,
       COALESCE(designation, '') AS designation,
       COALESCE(parent_id, 0)    AS parent_id
     FROM r_user
     WHERE client_id = ${SIIGO_CLIENT_ID}
     ORDER BY name`,
    signal,
  )
  return data
    .filter((m) => !isInternalEmail(m.email))
    .map((m) => ({ ...m, name: decodeEntities(m.name) }))
}

export async function fetchAdmins(signal?: AbortSignal): Promise<Admin[]> {
  const data = await remoteSQL<Admin>(
    `SELECT
       ID,
       name,
       email,
       COALESCE(parent_id, 0) AS parent_id
     FROM r_user
     WHERE client_id = ${SIIGO_CLIENT_ID}
       AND level IN (0, 1)
     ORDER BY name`,
    signal,
  )
  return data
    .filter((a) => !isInternalEmail(a.email))
    .map((a) => ({ ...a, name: decodeEntities(a.name) }))
}
