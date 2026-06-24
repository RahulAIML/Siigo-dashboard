// reportPdf.ts — SIIGO Dashboard
// Generates a downloadable PDF simulation report using jsPDF.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Simulation {
  session_id: string | number
  score: number | null
  date_created: string
  user_name?: string | null
  activity_name?: string | null
  activity_id?: number | null
  result?: string | null
  closing_analysis?: string | null
}

export interface SimDetail {
  sequence: number
  ai_question: string
  user_response: string
  feedback?: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIIGO_BLUE = '#0066FF'
const SIIGO_BLUE_R = 0
const SIIGO_BLUE_G = 102
const SIIGO_BLUE_B = 255

const DARK_TEXT_R = 30
const DARK_TEXT_G = 30
const DARK_TEXT_B = 30

const MUTED_R = 100
const MUTED_G = 100
const MUTED_B = 100

const PAGE_W = 210   // A4 mm
const PAGE_H = 297   // A4 mm
const MARGIN_L = 18
const MARGIN_R = 18
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R
const FOOTER_H = 14  // reserved at bottom

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateLabel(dateStr: string, lang: 'es' | 'en'): string {
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return dateStr

  if (lang === 'en') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
}

function todayLabel(lang: 'es' | 'en'): string {
  const d = new Date()
  if (lang === 'en') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
}

function todaySlug(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

type LangMap = Record<'es' | 'en', string>

const T: Record<string, LangMap> = {
  title:            { es: 'SIIGO Sales Training',        en: 'SIIGO Sales Training' },
  reportDate:       { es: 'Fecha de generación',          en: 'Report date' },
  sessionInfo:      { es: 'Información de la Sesión',     en: 'Session Info' },
  userName:         { es: 'Asesor',                        en: 'Advisor' },
  activity:         { es: 'Actividad',                     en: 'Activity' },
  score:            { es: 'Puntuación',                    en: 'Score' },
  result:           { es: 'Resultado',                     en: 'Result' },
  sessionDate:      { es: 'Fecha de sesión',               en: 'Session date' },
  sessionId:        { es: 'ID de sesión',                  en: 'Session ID' },
  interactionTitle: { es: 'Detalle de Interacciones',      en: 'Interaction Details' },
  interaction:      { es: 'Interacción',                   en: 'Interaction' },
  aiQuestion:       { es: 'Pregunta AI',                   en: 'AI Question' },
  userResponse:     { es: 'Respuesta del asesor',          en: 'Advisor Response' },
  feedback:         { es: 'Retroalimentación',             en: 'Feedback' },
  closingTitle:     { es: 'Análisis de Cierre',            en: 'Closing Analysis' },
  noDetails:        { es: 'Sin detalle de interacciones disponible.', en: 'No interaction details available.' },
  passed:           { es: 'Aprobado',                      en: 'Passed' },
  failed:           { es: 'No aprobado',                   en: 'Not passed' },
  na:               { es: 'N/A',                           en: 'N/A' },
  footer:           { es: 'Confidencial — SIIGO | Powered by Rolplay', en: 'Confidential — SIIGO | Powered by Rolplay' },
  pageOf:           { es: 'Página',                        en: 'Page' },
}

function t(key: string, lang: 'es' | 'en'): string {
  return T[key]?.[lang] ?? key
}

// ---------------------------------------------------------------------------
// PDF layout utilities
// ---------------------------------------------------------------------------

interface DocState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any
  y: number
  lang: 'es' | 'en'
  pageCount: number
}

function addPage(state: DocState): void {
  state.doc.addPage()
  state.pageCount++
  state.y = MARGIN_L
  drawFooter(state)
}

function checkPageBreak(state: DocState, needed: number): void {
  if (state.y + needed > PAGE_H - FOOTER_H - 4) {
    addPage(state)
  }
}

function drawFooter(state: DocState): void {
  const { doc, lang } = state
  const footerY = PAGE_H - 8

  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(MARGIN_L, footerY - 4, PAGE_W - MARGIN_R, footerY - 4)

  doc.setFontSize(7.5)
  doc.setTextColor(MUTED_R, MUTED_G, MUTED_B)
  doc.text(t('footer', lang), MARGIN_L, footerY)

  // Page number on right — we patch this after all pages are built
  doc.text(`${t('pageOf', lang)} ${state.pageCount}`, PAGE_W - MARGIN_R, footerY, { align: 'right' })
}

function drawSectionHeader(state: DocState, label: string): void {
  const { doc } = state
  checkPageBreak(state, 12)

  doc.setFillColor(SIIGO_BLUE_R, SIIGO_BLUE_G, SIIGO_BLUE_B)
  doc.rect(MARGIN_L, state.y, CONTENT_W, 7, 'F')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(label, MARGIN_L + 3, state.y + 5)

  state.y += 10
  doc.setTextColor(DARK_TEXT_R, DARK_TEXT_G, DARK_TEXT_B)
}

function drawKV(state: DocState, key: string, value: string): void {
  const { doc } = state
  checkPageBreak(state, 7)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(MUTED_R, MUTED_G, MUTED_B)
  doc.text(`${key}:`, MARGIN_L + 2, state.y)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(DARK_TEXT_R, DARK_TEXT_G, DARK_TEXT_B)
  doc.text(value, MARGIN_L + 50, state.y)

  state.y += 6
}

function drawWrappedLabel(state: DocState, label: string, isBold: boolean, color?: [number, number, number]): void {
  const { doc } = state
  doc.setFontSize(8.5)
  doc.setFont('helvetica', isBold ? 'bold' : 'normal')
  if (color) {
    doc.setTextColor(...color)
  } else {
    doc.setTextColor(DARK_TEXT_R, DARK_TEXT_G, DARK_TEXT_B)
  }
  doc.text(label, MARGIN_L + 2, state.y)
  state.y += 5
}

function drawWrappedText(state: DocState, text: string, indent = 4): void {
  const { doc } = state
  const maxW = CONTENT_W - indent - 4

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(DARK_TEXT_R, DARK_TEXT_G, DARK_TEXT_B)

  const lines: string[] = doc.splitTextToSize(text || '—', maxW)
  for (const line of lines) {
    checkPageBreak(state, 5)
    doc.text(line, MARGIN_L + indent, state.y)
    state.y += 5
  }
}

function drawDivider(state: DocState): void {
  const { doc } = state
  checkPageBreak(state, 4)
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.2)
  doc.line(MARGIN_L, state.y, PAGE_W - MARGIN_R, state.y)
  state.y += 4
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function downloadSimReport(
  sim: Simulation,
  details: SimDetail[],
  lang: 'es' | 'en' = 'es',
): Promise<void> {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const state: DocState = { doc, y: MARGIN_L, lang, pageCount: 1 }

  // -------------------------------------------------------------------------
  // Header block
  // -------------------------------------------------------------------------
  doc.setFillColor(SIIGO_BLUE_R, SIIGO_BLUE_G, SIIGO_BLUE_B)
  doc.rect(0, 0, PAGE_W, 28, 'F')

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(t('title', lang), MARGIN_L, 13)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.text(`${t('reportDate', lang)}: ${todayLabel(lang)}`, MARGIN_L, 22)

  state.y = 34

  // -------------------------------------------------------------------------
  // Section 1 — Session Info
  // -------------------------------------------------------------------------
  drawSectionHeader(state, t('sessionInfo', lang))

  const scoreValue = sim.score !== null && sim.score !== undefined
    ? `${sim.score} / 100`
    : t('na', lang)

  let resultValue: string
  if (sim.result) {
    resultValue = sim.result
  } else if (sim.score !== null && sim.score !== undefined) {
    resultValue = sim.score >= 70 ? t('passed', lang) : t('failed', lang)
  } else {
    resultValue = t('na', lang)
  }

  drawKV(state, t('userName', lang),   sim.user_name?.trim() || t('na', lang))
  drawKV(state, t('activity', lang),   sim.activity_name?.trim() || t('na', lang))
  drawKV(state, t('score', lang),      scoreValue)
  drawKV(state, t('result', lang),     resultValue)
  drawKV(state, t('sessionDate', lang), formatDateLabel(sim.date_created, lang))
  drawKV(state, t('sessionId', lang),  String(sim.session_id))

  state.y += 4

  // -------------------------------------------------------------------------
  // Section 2 — Interaction Details
  // -------------------------------------------------------------------------
  drawSectionHeader(state, t('interactionTitle', lang))

  if (!details || details.length === 0) {
    checkPageBreak(state, 8)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(MUTED_R, MUTED_G, MUTED_B)
    doc.text(t('noDetails', lang), MARGIN_L + 2, state.y)
    state.y += 8
  } else {
    for (let i = 0; i < details.length; i++) {
      const d = details[i]

      checkPageBreak(state, 14)

      // Interaction heading
      doc.setFillColor(240, 245, 255)
      doc.rect(MARGIN_L, state.y - 1, CONTENT_W, 7, 'F')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(SIIGO_BLUE_R, SIIGO_BLUE_G, SIIGO_BLUE_B)
      doc.text(`${t('interaction', lang)} #${d.sequence}`, MARGIN_L + 2, state.y + 4)
      state.y += 9

      // AI question
      drawWrappedLabel(state, `${t('aiQuestion', lang)}:`, true, [MUTED_R, MUTED_G, MUTED_B])
      drawWrappedText(state, d.ai_question || '—')

      state.y += 1

      // User response
      drawWrappedLabel(state, `${t('userResponse', lang)}:`, true, [MUTED_R, MUTED_G, MUTED_B])
      drawWrappedText(state, d.user_response || '—')

      state.y += 1

      // Feedback (optional)
      if (d.feedback) {
        drawWrappedLabel(state, `${t('feedback', lang)}:`, true, [MUTED_R, MUTED_G, MUTED_B])
        drawWrappedText(state, d.feedback)
        state.y += 1
      }

      if (i < details.length - 1) {
        drawDivider(state)
      }
    }
  }

  state.y += 4

  // -------------------------------------------------------------------------
  // Section 3 — Closing Analysis (if available)
  // -------------------------------------------------------------------------
  if (sim.closing_analysis && sim.closing_analysis.trim().length > 0) {
    const closingText = sim.closing_analysis
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (closingText.length > 0) {
      drawSectionHeader(state, t('closingTitle', lang))
      drawWrappedText(state, closingText, 2)
      state.y += 4
    }
  }

  // -------------------------------------------------------------------------
  // Footer on page 1 (already drawn for subsequent pages via addPage)
  // -------------------------------------------------------------------------
  drawFooter(state)

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------
  const slug = todaySlug()
  const filename = `siigo-report-${sim.session_id}-${slug}.pdf`
  doc.save(filename)
}
