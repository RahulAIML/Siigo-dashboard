// SIIGO Configuration
export const SIIGO_CLIENT_ID = 29
export const SIIGO_SIMULATOR_IDS = [3200]
export const SIIGO_IDS_SQL = '3200'
export const DATA_EPOCH = '2026-06-01' // when SIIGO started on Rolplay

// Scoring
export const PASS_THRESHOLD = 70
export const CERT_PASS_SCORE = 80
export const STRONG_TIER = 60
export const DEVELOPING_TIER = 40

// Certification window
export const CERT_WINDOW = { from: '2026-06-01', to: '2026-12-31' }

// API
export const API_BRIDGE = '/siigo/bridge/remote-access.php'
export const UPSTREAM = 'https://rolplay.app/ajax'

// Cache TTL (ms)
export const CACHE_SIMULATIONS_MS = 5 * 60 * 1000
export const CACHE_ACTIVITIES_MS = 24 * 60 * 60 * 1000
export const CACHE_MEMBERS_MS = 2 * 60 * 60 * 1000
export const CACHE_STALE_NEVER = Infinity
export const MAX_PERSISTED_ENTRY_BYTES = 1_500_000
export const SERVER_CACHE_TTL = 5 * 60 * 1000

// Pagination
export const PAGE_SIZE_SIMULATIONS = 50
export const PAGE_SIZE_LEADERBOARD = 25
export const PAGE_SIZE_MEMBERS = 50
export const MAX_TREND_POINTS = 60

// AI / Gemini
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'
export const AI_REQUEST_TIMEOUT_MS = 45_000
export const MAX_IMAGE_DIM = 1536
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024

// Test user filter patterns
export const TEST_USER_PATTERNS = [/demo user/i, /piloto/i, /rolplay pruebas/i, /tester/i]
export const TEST_EMAIL_PATTERNS = [/@rolplay./i, /test@/i]

// Port
export const SERVER_PORT = 4175
