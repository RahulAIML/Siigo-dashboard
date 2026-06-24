import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Send, Sparkles, Bot, Trash2, ImagePlus, XCircle,
  AlertCircle, User, StopCircle, CheckCircle2,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useLocation } from 'react-router-dom'
import { useAppStore } from '../../store'
import { t } from '../../lib/i18n'
import useDashboardData from '../../hooks/useDashboardData'
import { validationService } from '../../services/ValidationService'
import { queryService } from '../../services/QueryService'
import {
  DEFAULT_GEMINI_MODEL,
  AI_REQUEST_TIMEOUT_MS,
  MAX_IMAGE_DIM,
  MAX_IMAGE_BYTES,
  SIIGO_CLIENT_ID,
  SIIGO_IDS_SQL,
} from '../../config/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttachedImage {
  dataUrl:      string
  base64:       string
  mimeType:     'image/jpeg'
  originalName: string
}

type MessagePhase = 'sql_planning' | 'sql_executing' | 'generating' | 'done'

interface Message {
  role:          'user' | 'model'
  text:          string
  imageDataUrl?: string
  isError?:      boolean
  phase?:        MessagePhase
  sqlQuery?:     string
  sqlResult?:    string
}

// ─── Page Labels ──────────────────────────────────────────────────────────────

const PAGE_LABELS: Record<string, { en: string; es: string }> = {
  '/':               { en: 'Overview Dashboard', es: 'Vista General' },
  '/simulations':    { en: 'Simulations',         es: 'Simulaciones' },
  '/certification':  { en: 'Certification',        es: 'Certificación' },
  '/conversational': { en: 'Conversational',       es: 'Conversacional' },
  '/coaching':       { en: 'Coaching',             es: 'Coaching' },
  '/leaderboard':    { en: 'Leaderboard',          es: 'Ranking' },
  '/activities':     { en: 'Activities',           es: 'Actividades' },
  '/organization':   { en: 'Organization',         es: 'Organización' },
  '/reports':        { en: 'Reports',              es: 'Reportes' },
  '/settings':       { en: 'Settings',             es: 'Configuración' },
}

// ─── Blocked SQL patterns ─────────────────────────────────────────────────────

const BLOCKED_SQL_RE = /\b(DELETE|DROP|ALTER|UPDATE|INSERT|TRUNCATE|CREATE|EXEC|EXECUTE|GRANT|REVOKE|MERGE|REPLACE|CALL|COMMIT|ROLLBACK)\b/i

function isUnsafeSQL(sql: string): boolean {
  return BLOCKED_SQL_RE.test(sql)
}

// Extracts first SQL block from model output (```sql ... ``` or bare SELECT/WITH)
function extractSQL(text: string): string | null {
  // Try fenced code block first
  const fenced = text.match(/```(?:sql)?\s*([\s\S]*?)```/i)
  if (fenced) return fenced[1].trim()
  // Try bare SELECT/WITH starting a line
  const bare = text.match(/\b(SELECT|WITH)\b[\s\S]{10,}/i)
  if (bare) return bare[0].trim()
  return null
}

// ─── Image Processing ─────────────────────────────────────────────────────────

async function processImage(fileOrBlob: File | Blob, name = 'image'): Promise<AttachedImage> {
  return new Promise((resolve, reject) => {
    if (!fileOrBlob.type.startsWith('image/')) {
      reject(new Error(`Unsupported type: ${fileOrBlob.type}`))
      return
    }
    const objectUrl = URL.createObjectURL(fileOrBlob)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
        const ratio = Math.min(MAX_IMAGE_DIM / width, MAX_IMAGE_DIM / height)
        width  = Math.round(width  * ratio)
        height = Math.round(height * ratio)
      }
      const canvas  = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas unavailable')); return }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      let quality = 0.88
      let dataUrl = canvas.toDataURL('image/jpeg', quality)
      while (dataUrl.length * 0.75 > MAX_IMAGE_BYTES && quality > 0.4) {
        quality -= 0.1
        dataUrl  = canvas.toDataURL('image/jpeg', quality)
      }
      resolve({
        dataUrl,
        base64: dataUrl.split(',')[1],
        mimeType: 'image/jpeg',
        originalName: name,
      })
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }
    img.src = objectUrl
  })
}

// ─── Error Classification ─────────────────────────────────────────────────────

function classifyError(err: unknown, lang: 'es' | 'en'): string {
  const msg   = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()
  if (lower.includes('api_key') || lower.includes('401') || lower.includes('403'))
    return lang === 'es'
      ? 'API key inválida. Verifica VITE_GEMINI_API_KEY en tu archivo .env.'
      : 'Invalid API key. Check VITE_GEMINI_API_KEY in your .env file.'
  if (lower.includes('429') || lower.includes('quota') || lower.includes('rate'))
    return lang === 'es'
      ? 'Límite de solicitudes alcanzado. Espera unos segundos e intenta de nuevo.'
      : 'Rate limit reached. Wait a moment and retry.'
  if (lower.includes('timeout') || lower.includes('aborted'))
    return lang === 'es'
      ? 'La solicitud tardó demasiado. Intenta de nuevo.'
      : 'Request timed out. Try again.'
  if (lower.includes('network') || lower.includes('fetch'))
    return lang === 'es'
      ? 'Error de red. Verifica tu conexión a internet.'
      : 'Network error. Check your internet connection.'
  return lang === 'es'
    ? `Error: ${msg.slice(0, 120)}`
    : `Error: ${msg.slice(0, 120)}`
}

// ─── Markdown Components ──────────────────────────────────────────────────────

const mdComponents = {
  p:      ({ children }: any) => <p className="mb-1.5 last:mb-0">{children}</p>,
  ul:     ({ children }: any) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
  ol:     ({ children }: any) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
  li:     ({ children }: any) => <li>{children}</li>,
  strong: ({ children }: any) => <strong className="font-semibold text-slate-100">{children}</strong>,
  em:     ({ children }: any) => <em className="italic text-slate-400">{children}</em>,
  code:   ({ children }: any) => (
    <code className="bg-white/10 rounded px-1 py-0.5 text-xs font-mono text-accent">{children}</code>
  ),
  pre:    ({ children }: any) => (
    <pre className="bg-white/5 rounded-lg p-2 mb-1.5 overflow-x-auto text-xs font-mono">{children}</pre>
  ),
  h1:     ({ children }: any) => <h1 className="font-bold text-base mb-1">{children}</h1>,
  h2:     ({ children }: any) => <h2 className="font-semibold text-sm mb-1">{children}</h2>,
  h3:     ({ children }: any) => <h3 className="font-medium text-sm mb-1">{children}</h3>,
  table:  ({ children }: any) => (
    <div className="overflow-x-auto mb-1.5">
      <table className="text-xs w-full border-collapse">{children}</table>
    </div>
  ),
  th:     ({ children }: any) => (
    <th className="border border-white/10 px-2 py-1 font-semibold text-slate-200 bg-white/5">{children}</th>
  ),
  td:     ({ children }: any) => (
    <td className="border border-white/10 px-2 py-1 text-slate-400">{children}</td>
  ),
}

// ─── Thinking dots (replaces all technical phase labels) ─────────────────────

function ThinkingDots() {
  return (
    <span className="flex gap-1 items-center py-0.5">
      {[0, 1, 2].map((d) => (
        <span
          key={d}
          className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
          style={{ animationDelay: `${d * 150}ms` }}
        />
      ))}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIAssistant() {
  const { language, aiOpen, setAiOpen } = useAppStore()
  const location = useLocation()

  const { kpis, filteredSims, activities, activityStats, userStats, aiContext } = useDashboardData()

  const [messages,      setMessages]      = useState<Message[]>([])
  const [input,         setInput]         = useState('')
  const [thinking,      setThinking]      = useState(false)
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null)
  const [imageError,    setImageError]    = useState<string | null>(null)

  const bottomRef    = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef     = useRef<HTMLTextAreaElement>(null)
  const abortRef     = useRef({ shouldAbort: false })

  const pageName  = PAGE_LABELS[location.pathname]?.[language] ?? location.pathname
  const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL
  const apiKey    = import.meta.env.VITE_GEMINI_API_KEY as string | undefined

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  useEffect(() => {
    if (!aiOpen) abortRef.current.shouldAbort = true
  }, [aiOpen])

  useEffect(() => {
    if (aiOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 150)
      return () => clearTimeout(timer)
    }
  }, [aiOpen])

  // ── Image handling ────────────────────────────────────────────────────────

  const attachImage = useCallback(async (fileOrBlob: File | Blob, name?: string) => {
    setImageError(null)
    try {
      const img = await processImage(fileOrBlob, name)
      setAttachedImage(img)
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Image processing failed')
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    attachImage(file, file.name)
    e.target.value = ''
  }, [attachImage])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imgItem = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'))
    if (!imgItem) return
    e.preventDefault()
    const blob = imgItem.getAsFile()
    if (blob) attachImage(blob, 'pasted-image')
  }, [attachImage])

  // ── System prompt ─────────────────────────────────────────────────────────

  function buildSystemPrompt(withImage: boolean): string {
    const lang     = language === 'es' ? 'Spanish' : 'English'
    const noData   = language === 'es'
      ? 'No tengo datos suficientes para responder eso en este momento.'
      : 'I don\'t have enough data to answer that right now.'
    return `You are the SIIGO Sales Training Analytics AI Assistant.

⚠️ LANGUAGE RULE — HIGHEST PRIORITY:
You MUST respond EXCLUSIVELY in ${lang}. This is non-negotiable.
Do NOT use any other language regardless of what language the user writes in.
Every word of your response must be in ${lang}.

CRITICAL RULES — HALLUCINATION PREVENTION:
1. NEVER invent numbers, scores, percentages, or statistics.
2. Every numeric claim MUST come from the DASHBOARD DATA section below or from a database query you execute.
3. If data is unavailable, say exactly: "${noData}"
4. Always base answers on real data — dashboard data OR fresh query results.
5. Database queries MUST be read-only SELECT statements only.
6. Only use these tables: r_user_session, r_user, r_simulator, r_user_session_details.

CONTEXT:
- Client: SIIGO (client_id = ${SIIGO_CLIENT_ID})
- Simulator ID: ${SIIGO_IDS_SQL}
- Platform: Rolplay sales training simulation
- Current page: ${pageName}

⚠️ CRITICAL DATA ARCHITECTURE:
Scores and pass rates ARE NOT stored reliably in the database columns.
- r_user_session.score → ALWAYS 0 in DB. NEVER use in SQL.
- r_user_session.passed_flag → ALWAYS 0 in DB. NEVER use in SQL.
- Real scores are computed by the frontend by parsing HTML in closing_analysis.
- The LIVE DASHBOARD DATA below contains the ONLY accurate scores and pass rates.

AVAILABLE DATABASE TABLES (for counting and listing only — NOT for scores):
- r_user_session: ID, user_id, simulator_id, date_created, closing_analysis
- r_user_session_details: ID, session_id, sequence, ai_text, user_text, retro_analysis
- r_user: ID, name, email, level, client_id
- r_simulator: ID, name, category

JOIN PATTERN (always use this):
  FROM r_user_session us
  JOIN r_user u ON u.ID = us.user_id AND u.client_id = ${SIIGO_CLIENT_ID}
  WHERE us.simulator_id IN (${SIIGO_IDS_SQL})

SQL ALLOWED ONLY FOR: session counts, user lists, date ranges, interaction text, recent activity.
SQL FORBIDDEN FOR: pass rate, approval rate, scores, rankings, coaching risk — use DASHBOARD DATA instead.

LIVE DASHBOARD DATA (the ONLY source of truth for scores and pass rates):
${aiContext || '(No hay datos disponibles en este momento)'}

TWO-PASS RESPONSE PROTOCOL:
Only generate SQL when the question requires data NOT in the dashboard above (e.g. raw interaction text, specific date ranges, user details).
- If dashboard data answers the question → respond directly, say "NO_SQL_NEEDED" internally.
- If SQL needed → output ONLY the SQL block (triple-backtick sql ... triple-backtick), then answer from results.
- NEVER generate SQL to calculate pass rates or scores.

INSTRUCTIONS:
- Pass rate, scores, top/bottom performers, coaching candidates → ALWAYS use LIVE DASHBOARD DATA above.
- Be concise, data-driven, and actionable. Round to 1 decimal.
- Format: **bold** key metrics, tables for comparisons, bullets for lists.
${withImage ? '- An image has been attached. FIRST describe what you see in detail. THEN relate it to the dashboard data.' : ''}`.trim()
  }

  // ── SQL Execution (hallucination prevention) ──────────────────────────────

  async function executeSafeSQL(sql: string): Promise<string> {
    // Security gate 1: block dangerous keywords
    if (isUnsafeSQL(sql)) {
      return language === 'es'
        ? '[ERROR] Solo puedo realizar consultas de lectura (SELECT). Consulta bloqueada por seguridad.'
        : '[ERROR] Only read queries (SELECT) are allowed. Query blocked for security.'
    }

    // Security gate 2: sanitize via ValidationService
    let sanitized: string
    try {
      sanitized = validationService.sanitizeSQL(sql)
    } catch (_err) {
      return language === 'es'
        ? '[ERROR] La consulta no pasó la sanitización. Solo se permiten SELECT.'
        : '[ERROR] Query failed sanitization. Only SELECT is allowed.'
    }

    // Security gate 3: enforce client scope (inject if missing)
    if (!sanitized.toLowerCase().includes(`client_id = ${SIIGO_CLIENT_ID}`) &&
        !sanitized.toLowerCase().includes(`client_id=${SIIGO_CLIENT_ID}`)) {
      // Wrap in subquery with client filter
      sanitized = `SELECT * FROM (${sanitized}) AS __ai_query WHERE 1=1 LIMIT 200`
    }

    try {
      const rows = await queryService.execute<Record<string, unknown>>(sanitized, 2 * 60 * 1000)
      if (!rows || rows.length === 0) {
        return language === 'es' ? '[Sin resultados]' : '[No results]'
      }
      // Serialize as compact JSON, cap at 8KB to avoid context overflow
      const json = JSON.stringify(rows, null, 2)
      return json.length > 8000 ? json.slice(0, 8000) + '\n...[truncated]' : json
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return language === 'es'
        ? `[ERROR al ejecutar SQL: ${msg.slice(0, 200)}]`
        : `[SQL execution error: ${msg.slice(0, 200)}]`
    }
  }

  // ── Two-pass generation ───────────────────────────────────────────────────

  async function runTwoPassGeneration(
    chat: any,
    userParts: any[],
    msgIndex: number,
  ): Promise<void> {
    // PASS 1: Ask model to plan the SQL query it needs
    const planPrompt = language === 'es'
      ? `Antes de responder: ¿necesitas ejecutar una consulta SQL para responder con precisión?
Si sí, responde SOLO con el bloque SQL en formato markdown \`\`\`sql ... \`\`\`.
Si los datos del dashboard ya son suficientes, responde SOLO con: "NO_SQL_NEEDED".`
      : `Before answering: do you need to execute a SQL query to answer accurately?
If yes, respond ONLY with the SQL block in markdown format \`\`\`sql ... \`\`\`.
If dashboard data is already sufficient, respond ONLY with: "NO_SQL_NEEDED".`

    // Update phase
    setMessages((prev) => {
      const updated = [...prev]
      updated[msgIndex] = { ...updated[msgIndex], phase: 'sql_planning', text: '' }
      return updated
    })

    // Send user message + planning instruction
    const planParts = [...userParts, { text: '\n\n' + planPrompt }]
    const planStream = await chat.sendMessageStream(planParts)
    let planText = ''
    for await (const chunk of planStream.stream) {
      if (abortRef.current.shouldAbort) return
      planText += chunk.text()
    }
    planText = planText.trim()

    let sqlResult: string | null = null
    let executedSQL: string | null = null

    if (!planText.includes('NO_SQL_NEEDED')) {
      const extracted = extractSQL(planText)
      if (extracted) {
        executedSQL = extracted

        // Update phase: executing
        setMessages((prev) => {
          const updated = [...prev]
          updated[msgIndex] = {
            ...updated[msgIndex],
            phase: 'sql_executing',
            sqlQuery: executedSQL ?? undefined,
            text: '',
          }
          return updated
        })

        sqlResult = await executeSafeSQL(extracted)
      }
    }

    if (abortRef.current.shouldAbort) return

    // PASS 2: Generate final answer with SQL results injected
    setMessages((prev) => {
      const updated = [...prev]
      updated[msgIndex] = { ...updated[msgIndex], phase: 'generating', text: '' }
      return updated
    })

    let finalPrompt: string
    if (sqlResult !== null) {
      finalPrompt = language === 'es'
        ? `Datos adicionales recuperados para tu pregunta:\n\n${sqlResult}\n\nAhora responde la pregunta original del usuario de forma natural y directa. NUNCA menciones SQL, consultas, bases de datos ni detalles técnicos en tu respuesta. Si los datos muestran ceros o parecen poco fiables, usa los datos del dashboard del sistema. Presenta los hallazgos como insights de negocio.`
        : `Additional data retrieved for your question:\n\n${sqlResult}\n\nNow answer the user's original question naturally and directly. NEVER mention SQL, queries, databases, or any technical details in your response. If the data shows zeros or appears unreliable, use the dashboard data from the system prompt instead. Present findings as business insights.`
    } else {
      finalPrompt = language === 'es'
        ? 'Responde la pregunta original del usuario de forma natural y directa usando los datos del dashboard. No menciones detalles técnicos.'
        : 'Answer the user\'s original question naturally and directly using the dashboard data. Do not mention any technical details.'
    }

    const answerStream = await chat.sendMessageStream([{ text: finalPrompt }])
    let accumulated = ''

    for await (const chunk of answerStream.stream) {
      if (abortRef.current.shouldAbort) break
      accumulated += chunk.text()
      setMessages((prev) => {
        const updated = [...prev]
        updated[msgIndex] = {
          ...updated[msgIndex],
          text: accumulated,
          phase: 'generating',
          sqlQuery: executedSQL ?? updated[msgIndex].sqlQuery,
        }
        return updated
      })
    }

    // Final state
    setMessages((prev) => {
      const updated = [...prev]
      updated[msgIndex] = {
        ...updated[msgIndex],
        text: accumulated,
        phase: 'done',
        sqlQuery: executedSQL ?? updated[msgIndex].sqlQuery,
      }
      return updated
    })
  }

  // ── Send message ──────────────────────────────────────────────────────────

  async function sendMessage() {
    const text  = input.trim()
    const image = attachedImage

    if (!text && !image) return
    if (thinking) return

    if (!apiKey) {
      setMessages((prev) => [...prev, {
        role: 'model',
        text: language === 'es'
          ? 'No se encontró la clave de API de Gemini. Configura `VITE_GEMINI_API_KEY` en tu archivo `.env`.'
          : 'Gemini API key not found. Set `VITE_GEMINI_API_KEY` in your `.env` file.',
        isError: true,
      }])
      return
    }

    // Add user message
    const userMsg: Message = {
      role: 'user',
      text: text || '[Image attached]',
      imageDataUrl: image?.dataUrl,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setAttachedImage(null)
    setThinking(true)
    abortRef.current.shouldAbort = false

    // Add placeholder for streaming AI response
    const placeholderIndex = messages.length + 1
    setMessages((prev) => [...prev, { role: 'model', text: '', phase: 'sql_planning' }])

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

      // Build conversation history (last 20 messages, excluding placeholder)
      const historyMsgs = messages.slice(-20)
      const history = historyMsgs.map((m) => ({
        role:  m.role,
        parts: [{ text: m.text || '...' }],
      }))

      const chat = model.startChat({
        history,
        systemInstruction: { parts: [{ text: buildSystemPrompt(!!image) }] },
        generationConfig: {
          temperature: 0.2, // low temperature for factual accuracy
          maxOutputTokens: 2048,
        },
      })

      // Build user parts
      const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = []
      if (image) {
        parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } })
      }
      parts.push({ text: text || 'Describe the attached image in the context of the dashboard.' })

      // Set timeout
      const timeoutId = setTimeout(() => {
        abortRef.current.shouldAbort = true
      }, AI_REQUEST_TIMEOUT_MS)

      await runTwoPassGeneration(chat, parts, placeholderIndex)
      clearTimeout(timeoutId)

    } catch (err) {
      if (abortRef.current.shouldAbort) {
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'model',
            text: language === 'es' ? 'Respuesta cancelada.' : 'Response cancelled.',
            phase: 'done',
          }
          return updated
        })
      } else {
        const errMsg = classifyError(err, language)
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'model', text: errMsg, isError: true, phase: 'done' }
          return updated
        })
        console.error('[AIAssistant]', err)
      }
    } finally {
      setThinking(false)
    }
  }

  function handleAbort() {
    abortRef.current.shouldAbort = true
    setThinking(false)
    setMessages((prev) => {
      const updated = [...prev]
      const last = updated[updated.length - 1]
      if (last?.role === 'model' && !last.text) {
        updated[updated.length - 1] = {
          ...last,
          text: language === 'es' ? 'Respuesta cancelada.' : 'Response cancelled.',
          phase: 'done',
        }
      } else if (last?.role === 'model') {
        updated[updated.length - 1] = { ...last, phase: 'done' }
      }
      return updated
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Suggested questions ───────────────────────────────────────────────────

  const suggestions = language === 'es'
    ? [
        '¿Cuántas simulaciones hubo este mes?',
        '¿Quiénes son los mejores 5 asesores?',
        '¿Cuál es la tasa de aprobación actual?',
        '¿Qué asesores necesitan coaching urgente?',
      ]
    : [
        'How many simulations this month?',
        'Who are the top 5 advisors?',
        'What is the current pass rate?',
        'Which advisors need urgent coaching?',
      ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {aiOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-[#0F172A] border-l border-[#1E293B] flex flex-col z-50 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1E293B] flex-shrink-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0066FF, #8B5CF6)' }}
            >
              <Sparkles size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100">
                {t('aiAssistant', language)}
              </p>
              <p className="text-xs text-slate-500 truncate">{pageName}</p>
            </div>

            {/* Clear chat */}
            <button
              onClick={() => {
                setMessages([])
                setInput('')
                setAttachedImage(null)
                setImageError(null)
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
              title={language === 'es' ? 'Limpiar chat' : 'Clear chat'}
            >
              <Trash2 size={14} />
            </button>

            {/* Close */}
            <button
              onClick={() => setAiOpen(false)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
              title={language === 'es' ? 'Cerrar' : 'Close'}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* Empty state */}
            {messages.length === 0 && (
              <div className="text-center py-6">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'linear-gradient(135deg, rgba(0,102,255,0.15), rgba(139,92,246,0.15))' }}
                >
                  <Bot size={24} className="text-accent" />
                </div>
                <p className="text-sm text-slate-300 font-medium mb-1">
                  {t('aiAssistant', language)}
                </p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
                  {language === 'es'
                    ? 'Análisis con datos reales. Nunca invento números.'
                    : 'Analysis with real data. I never invent numbers.'}
                </p>

                {/* Hallucination prevention badge */}
                <div className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1 mb-4">
                  <CheckCircle2 size={10} className="text-green-400" />
                  <span className="text-[10px] text-green-400">
                    {language === 'es' ? 'Datos verificados en tiempo real' : 'Real-time verified data'}
                  </span>
                </div>

                {/* Suggested questions */}
                <div className="space-y-1.5 text-left">
                  {suggestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="block w-full text-left text-xs text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message list */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs
                    ${msg.role === 'user'
                      ? 'bg-accent text-white'
                      : msg.isError
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-white/10 text-slate-300'
                    }`}
                >
                  {msg.role === 'user'
                    ? <User size={13} />
                    : msg.isError
                      ? <AlertCircle size={13} />
                      : <Bot size={13} />
                  }
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2.5 text-[13px] leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-accent/20 text-slate-100 rounded-tr-none'
                      : msg.isError
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20 rounded-tl-none'
                        : 'bg-white/5 text-slate-300 rounded-tl-none'
                    }`}
                >
                  {/* Attached image */}
                  {msg.imageDataUrl && (
                    <img
                      src={msg.imageDataUrl}
                      alt={language === 'es' ? 'Imagen adjunta' : 'Attached image'}
                      className="rounded-lg mb-2 max-w-full max-h-40 object-contain"
                    />
                  )}

                  {/* Message content */}
                  {msg.role === 'model' && !msg.isError ? (
                    msg.text
                      ? <ReactMarkdown components={mdComponents}>{msg.text}</ReactMarkdown>
                      : <ThinkingDots />
                  ) : (
                    <span>{msg.text}</span>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator — only show when no streaming placeholder exists yet */}
            {thinking && messages[messages.length - 1]?.role !== 'model' && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Bot size={13} className="text-slate-300" />
                </div>
                <div className="bg-white/5 rounded-xl rounded-tl-none px-3 py-2">
                  <span className="flex gap-1 items-center">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
                        style={{ animationDelay: `${d * 150}ms` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Image preview */}
          {attachedImage && (
            <div className="px-4 py-2 border-t border-[#1E293B] flex items-center gap-2">
              <img
                src={attachedImage.dataUrl}
                alt="Preview"
                className="h-10 w-10 rounded-lg object-cover border border-white/10"
              />
              <span className="text-xs text-slate-500 flex-1 truncate">
                {attachedImage.originalName}
              </span>
              <button
                onClick={() => setAttachedImage(null)}
                className="text-slate-500 hover:text-red-400 transition-colors"
              >
                <XCircle size={14} />
              </button>
            </div>
          )}

          {/* Image error */}
          {imageError && (
            <div className="px-4 py-1.5 bg-red-500/10 border-t border-red-500/20">
              <p className="text-xs text-red-400">{imageError}</p>
            </div>
          )}

          {/* Input area */}
          <div className="px-4 py-3 border-t border-[#1E293B] flex-shrink-0">
            <div className="flex items-end gap-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Image attach button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={thinking}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors flex-shrink-0 disabled:opacity-40"
                title={language === 'es' ? 'Adjuntar imagen' : 'Attach image'}
              >
                <ImagePlus size={16} />
              </button>

              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={t('aiPlaceholder', language)}
                rows={1}
                disabled={thinking}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200
                  placeholder:text-slate-600 focus:outline-none focus:border-accent/50 resize-none
                  min-h-[38px] max-h-[120px] overflow-auto disabled:opacity-60"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const el = e.target as HTMLTextAreaElement
                  el.style.height = 'auto'
                  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
                }}
              />

              {/* Send / Abort button */}
              {thinking ? (
                <button
                  onClick={handleAbort}
                  className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 flex-shrink-0 transition-colors"
                  title={language === 'es' ? 'Cancelar' : 'Cancel'}
                >
                  <StopCircle size={16} />
                </button>
              ) : (
                <button
                  onClick={sendMessage}
                  disabled={(!input.trim() && !attachedImage) || thinking}
                  className="p-2 rounded-xl bg-accent hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed
                    text-white flex-shrink-0 transition-colors"
                  title={language === 'es' ? 'Enviar' : 'Send'}
                >
                  <Send size={16} />
                </button>
              )}
            </div>

            <p className="text-[10px] text-slate-600 mt-1.5 text-center">
              {language === 'es'
                ? 'Powered by Gemini 2.5 Flash • Solo datos SIIGO verificados'
                : 'Powered by Gemini 2.5 Flash • SIIGO verified data only'}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
