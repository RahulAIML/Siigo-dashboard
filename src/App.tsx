import React, { Component, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Shell from './components/layout/Shell'
import { prefetchAll } from './api/queries'
import { DATA_EPOCH, MAX_PERSISTED_ENTRY_BYTES } from './config/constants'

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'siigo-qc-v1'
const STALE_TIME  = 5 * 60 * 1000   // 5 min
const GC_TIME     = 10 * 60 * 1000  // 10 min
const DEBOUNCE_MS = 1_000

// ─── Persister helpers ────────────────────────────────────────────────────────

function loadCacheFromStorage(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return parsed
  } catch {
    return null
  }
}

function filterEntries(
  entries: Record<string, unknown>,
): Record<string, unknown> {
  const filtered: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(entries)) {
    // skip simReport entries — they can be large and are fetched on demand
    if (key.startsWith('simReport')) continue

    const bytes = JSON.stringify(value).length
    if (bytes > MAX_PERSISTED_ENTRY_BYTES) continue

    filtered[key] = value
  }
  return filtered
}

// ─── QueryClient factory ──────────────────────────────────────────────────────

function buildQueryClient(): QueryClient {
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME,
        gcTime:    GC_TIME,
        retry:     2,
      },
    },
  })

  // Restore persisted cache on mount — skip entries older than staleTime
  const stored = loadCacheFromStorage()
  if (stored && typeof stored === 'object') {
    const entries = stored as Record<string, unknown>
    const safe = filterEntries(entries)
    const now = Date.now()
    try {
      for (const [, data] of Object.entries(safe)) {
        const entry = data as { queryKey?: unknown[]; state?: { data?: unknown }; dataUpdatedAt?: number }
        if (!entry?.queryKey || entry?.state?.data === undefined) continue
        // If stored data is older than staleTime, skip it — React Query will fetch fresh
        if (entry.dataUpdatedAt && now - entry.dataUpdatedAt > STALE_TIME) continue
        qc.setQueryData(entry.queryKey, entry.state.data)
      }
    } catch {
      // If hydration fails, proceed without cache
    }
  }

  // Debounced save on cache changes
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  qc.getQueryCache().subscribe(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      try {
        const queries = qc.getQueryCache().getAll()
        const snapshot: Record<string, unknown> = {}
        for (const query of queries) {
          if (!query.queryHash) continue
          if (query.queryHash.includes('simReport')) continue
          const bytes = JSON.stringify(query.state.data ?? null).length
          if (bytes > MAX_PERSISTED_ENTRY_BYTES) continue
          snapshot[query.queryHash] = {
            queryKey:     query.queryKey,
            state:        { data: query.state.data },
            dataUpdatedAt: query.state.dataUpdatedAt,
          }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
      } catch {
        // quota exceeded or serialisation error — silently skip
      }
    }, DEBOUNCE_MS)
  })

  return qc
}

const queryClient = buildQueryClient()

// ─── Lazy pages ───────────────────────────────────────────────────────────────

const OverviewPage      = React.lazy(() => import('./pages/OverviewPage'))
const SimulationsPage   = React.lazy(() => import('./pages/SimulationsPage'))
const CertificationPage = React.lazy(() => import('./pages/CertificationPage'))
const ConversationalPage= React.lazy(() => import('./pages/ConversationalPage'))
const CoachingPage      = React.lazy(() => import('./pages/CoachingPage'))
const LeaderboardPage   = React.lazy(() => import('./pages/LeaderboardPage'))
const ActivitiesPage    = React.lazy(() => import('./pages/ActivitiesPage'))
const OrganizationPage  = React.lazy(() => import('./pages/OrganizationPage'))
const ReportsPage       = React.lazy(() => import('./pages/ReportsPage'))
const SettingsPage      = React.lazy(() => import('./pages/SettingsPage'))

// ─── Skeleton fallback ────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 w-full animate-pulse">
      <div className="h-8 w-48 rounded bg-slate-700/40" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-700/30" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-slate-700/30" />
      <div className="h-48 rounded-xl bg-slate-700/20" />
    </div>
  )
}

// ─── 404 ──────────────────────────────────────────────────────────────────────

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
      <span className="text-6xl font-bold text-slate-600">404</span>
      <p className="text-lg">Page not found</p>
      <a href="/" className="text-indigo-400 hover:underline">
        Return to dashboard
      </a>
    </div>
  )
}

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean
  message:  string
}

class ErrorBoundary extends Component<
  React.PropsWithChildren<object>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<object>) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message:  error instanceof Error ? error.message : String(error),
    }
  }

  override componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 text-slate-300 bg-slate-900 p-8">
          <span className="text-5xl">&#9888;</span>
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-slate-500 max-w-md text-center">
            {this.state.message}
          </p>
          <button
            className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
            onClick={() => {
              this.setState({ hasError: false, message: '' })
              window.location.href = '/'
            }}
          >
            Reload dashboard
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Prefetch on mount ────────────────────────────────────────────────────────

function PrefetchOnMount() {
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    prefetchAll(queryClient, DATA_EPOCH, today).catch(console.error)
  }, [])
  return null
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PrefetchOnMount />
        <BrowserRouter>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<Shell />}>
                <Route index element={<OverviewPage />} />
                <Route path="simulations"  element={<SimulationsPage />} />
                <Route path="certification" element={<CertificationPage />} />
                <Route path="conversational" element={<ConversationalPage />} />
                <Route path="coaching"     element={<CoachingPage />} />
                <Route path="leaderboard"  element={<LeaderboardPage />} />
                <Route path="activities"   element={<ActivitiesPage />} />
                <Route path="organization" element={<OrganizationPage />} />
                <Route path="reports"      element={<ReportsPage />} />
                <Route path="settings"     element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
