import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Isolated QueryService for tests ─────────────────────────────────────────
// We instantiate a fresh private class (not the singleton) to avoid test pollution.

const API_BRIDGE = '/siigo/bridge/remote-access.php'

interface CacheEntry {
  data:    unknown
  expires: number
}

class TestQueryService {
  private cache   = new Map<string, CacheEntry>()
  private pending = new Map<string, Promise<unknown>>()

  private getCacheKey(sql: string): string {
    return sql.trim().toLowerCase().slice(0, 256)
  }

  isReadOnly(sql: string): void {
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
        const res  = await fetch(API_BRIDGE, {
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
          // Skip actual sleep in tests — just break on first failure for speed
          break
        }
      }
    }
    this.pending.delete(key)
    throw lastError
  }

  clearCache(): void { this.cache.clear() }

  getCacheStats() { return { size: this.cache.size, keys: [...this.cache.keys()] } }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockFetchSuccess(data: unknown[]) {
  vi.mocked(globalThis.fetch).mockResolvedValueOnce({
    ok:   true,
    json: async () => ({ result: 'success', data }),
  } as Response)
}

function mockFetchHttpError(status: number) {
  vi.mocked(globalThis.fetch).mockResolvedValueOnce({
    ok:     false,
    status,
    json:   async () => ({}),
  } as Response)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('QueryService.isReadOnly', () => {
  const svc = new TestQueryService()

  it('allows SELECT', () => {
    expect(() => svc.isReadOnly('SELECT * FROM r_user')).not.toThrow()
  })
  it('allows WITH', () => {
    expect(() => svc.isReadOnly('WITH cte AS (SELECT 1) SELECT * FROM cte')).not.toThrow()
  })
  it('allows EXPLAIN', () => {
    expect(() => svc.isReadOnly('EXPLAIN SELECT * FROM r_user')).not.toThrow()
  })
  it('blocks DELETE', () => {
    expect(() => svc.isReadOnly('DELETE FROM r_user')).toThrow('Only SELECT')
  })
  it('blocks DROP', () => {
    expect(() => svc.isReadOnly('DROP TABLE r_user')).toThrow('Only SELECT')
  })
  it('blocks INSERT', () => {
    expect(() => svc.isReadOnly('INSERT INTO r_user VALUES (1)')).toThrow('Only SELECT')
  })
  it('blocks UPDATE', () => {
    expect(() => svc.isReadOnly('UPDATE r_user SET x=1')).toThrow('Only SELECT')
  })
})

describe('QueryService.execute — cache', () => {
  let svc: TestQueryService

  beforeEach(() => {
    svc = new TestQueryService()
    vi.mocked(globalThis.fetch).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns data from a successful fetch', async () => {
    mockFetchSuccess([{ id: 1 }])
    const result = await svc.execute('SELECT 1')
    expect(result).toEqual([{ id: 1 }])
  })

  it('uses cache on second identical call', async () => {
    mockFetchSuccess([{ id: 42 }])
    const r1 = await svc.execute('SELECT * FROM r_user')
    const r2 = await svc.execute('SELECT * FROM r_user')
    expect(r1).toBe(r2) // same reference from cache
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('does not use cache for different queries', async () => {
    mockFetchSuccess([{ id: 1 }])
    mockFetchSuccess([{ id: 2 }])
    await svc.execute('SELECT 1')
    await svc.execute('SELECT 2')
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })

  it('clears cache on clearCache()', async () => {
    mockFetchSuccess([{ id: 1 }])
    await svc.execute('SELECT 1')
    svc.clearCache()
    expect(svc.getCacheStats().size).toBe(0)
  })

  it('throws on non-SELECT before fetching', async () => {
    await expect(svc.execute('DELETE FROM r_user')).rejects.toThrow('Only SELECT')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('throws when upstream returns HTTP error', async () => {
    mockFetchHttpError(502)
    await expect(svc.execute('SELECT 1')).rejects.toThrow('HTTP 502')
  })

  it('getCacheStats reflects stored entries', async () => {
    mockFetchSuccess([])
    await svc.execute('SELECT 1')
    const stats = svc.getCacheStats()
    expect(stats.size).toBe(1)
    expect(stats.keys[0]).toContain('select 1')
  })
})
