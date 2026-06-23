import type { Activity, Admin, Member, Simulation, SimReport } from './types'
import { resolveEffectiveDates } from '../lib/dateUtils'
import { API_BRIDGE, SIIGO_CLIENT_ID, SIIGO_IDS_SQL } from '../config/constants'

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
       d1.ai_text   AS Pregunta_1, d1.user_text AS Respuesta_1,
       d1.retro_analysis AS Retroalimentacion_1, NULL AS Puntos_1,
       d2.ai_text   AS Pregunta_2, d2.user_text AS Respuesta_2,
       d2.retro_analysis AS Retroalimentacion_2, NULL AS Puntos_2,
       d3.ai_text   AS Pregunta_3, d3.user_text AS Respuesta_3,
       d3.retro_analysis AS Retroalimentacion_3, NULL AS Puntos_3,
       d4.ai_text   AS Pregunta_4, d4.user_text AS Respuesta_4,
       d4.retro_analysis AS Retroalimentacion_4, NULL AS Puntos_4,
       d5.ai_text   AS Pregunta_5, d5.user_text AS Respuesta_5,
       d5.retro_analysis AS Retroalimentacion_5, NULL AS Puntos_5
     FROM r_user_session us
     JOIN r_user      u  ON u.ID  = us.user_id
     JOIN r_simulator rs ON rs.ID = us.simulator_id
     LEFT JOIN r_user_session_details d1 ON d1.session_id = us.ID AND d1.sequence = 1
     LEFT JOIN r_user_session_details d2 ON d2.session_id = us.ID AND d2.sequence = 2
     LEFT JOIN r_user_session_details d3 ON d3.session_id = us.ID AND d3.sequence = 3
     LEFT JOIN r_user_session_details d4 ON d4.session_id = us.ID AND d4.sequence = 4
     LEFT JOIN r_user_session_details d5 ON d5.session_id = us.ID AND d5.sequence = 5
     WHERE us.simulator_id IN (${SIIGO_IDS_SQL})
       AND u.client_id = ${SIIGO_CLIENT_ID}
       AND us.date_created >= '${effFrom}'
       AND us.date_created < DATE_ADD('${effTo}', INTERVAL 1 DAY)
     ORDER BY us.date_created DESC`,
    signal,
  )
  return rows.filter((r) => !isInternalEmail(r.Usuario))
}

export async function fetchSimReport(simId: number, signal?: AbortSignal): Promise<SimReport> {
  const id = Math.trunc(simId)

  const [session] = await remoteSQL<{
    ID_Sim: number; ID_Caso_de_Uso: number; Usuario: string | null; Usuario_Nombre: string | null
    Fecha_y_Hora: string | null; Calificacion: number; Producto: string
  }>(
    `SELECT
       us.ID           AS ID_Sim,
       us.simulator_id AS ID_Caso_de_Uso,
       u.email         AS Usuario,
       u.name          AS Usuario_Nombre,
       us.date_created AS Fecha_y_Hora,
       us.score        AS Calificacion,
       rs.name         AS Producto
     FROM r_user_session us
     JOIN r_user      u  ON u.ID  = us.user_id
     JOIN r_simulator rs ON rs.ID = us.simulator_id
     WHERE us.ID = ${id}`,
    signal,
  )
  if (!session) throw new Error(`Session ${id} not found`)

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
    Calificacion:   session.Calificacion,
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
