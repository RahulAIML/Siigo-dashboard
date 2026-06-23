import { API_BRIDGE } from '../config/constants'

interface CacheEntry {
  data:    unknown
  expires: number
}

class QueryService {
  private cache   = new Map<string, CacheEntry>()
  private pending = new Map<string, Promise<unknown>>()
  private static _instance: QueryService

  static getInstance(): QueryService {
    if (!QueryService._instance) QueryService._instance = new QueryService()
    return QueryService._instance
  }

  private getCacheKey(sql: string): string {
    // Simple but stable key — trim + lowercase
    return sql.trim().toLowerCase().slice(0, 256)
  }

  private isReadOnly(sql: string): void {
    const first = sql.trim().toUpperCase().split(/\s+/)[0]
    const allowed = new Set(['SELECT', 'WITH', 'EXPLAIN'])
    if (!allowed.has(first)) {
      throw new Error(`Only SELECT queries are allowed. Got: ${first}`)
    }
  }

  async execute<T = unknown>(sql: string, ttlMs = 5 * 60 * 1000): Promise<T[]> {
    this.isReadOnly(sql)

    const key    = this.getCacheKey(sql)
    const cached = this.cache.get(key)
    if (cached && Date.now() < cached.expires) {
      return cached.data as T[]
    }

    // Deduplicate concurrent identical requests
    const inFlight = this.pending.get(key)
    if (inFlight) return inFlight as Promise<T[]>

    const request = this._fetch<T>(sql, key, ttlMs)
    this.pending.set(key, request)
    return request
  }

  private async _fetch<T>(sql: string, key: string, ttlMs: number): Promise<T[]> {
    const delays = [1000, 2000, 4000]
    let lastError: Error = new Error('Unknown error')

    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        const res = await fetch(API_BRIDGE, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ sql }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (json.result !== 'success') throw new Error(json.error ?? 'Query failed')
        const data = (json.data ?? []) as T[]
        this.cache.set(key, { data, expires: Date.now() + ttlMs })
        this.pending.delete(key)
        return data
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (attempt < delays.length) {
          await new Promise((r) => setTimeout(r, delays[attempt]))
        }
      }
    }

    this.pending.delete(key)
    console.error('[QueryService] Failed after retries:', lastError)
    throw lastError
  }

  clearCache(): void {
    this.cache.clear()
  }

  getCacheStats(): { size: number; keys: string[] } {
    return { size: this.cache.size, keys: [...this.cache.keys()] }
  }
}

export const queryService = QueryService.getInstance()
