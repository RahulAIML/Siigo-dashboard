// Serves dist/ as a static SPA and proxies /siigo/bridge/* to rolplay.app/ajax/*
// with in-memory SQL-keyed cache, gzip compression, and security headers.
import { createServer } from 'http'
import { readFile }     from 'fs/promises'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { gzipSync }     from 'zlib'
import { createHash }   from 'crypto'

const __dirname  = fileURLToPath(new URL('.', import.meta.url))
const DIST       = join(__dirname, 'dist')
const PORT       = parseInt(process.env.PORT ?? '4175')
const UPSTREAM   = 'https://rolplay.app/ajax'
const CACHE_TTL  = 5 * 60 * 1000          // 5 min — matches React Query staleTime
const MAX_ENTRY  = 1_500_000               // skip caching entries > 1.5 MB

const apiCache    = new Map()  // cacheKey → { body, gz, ts }
const staticCache = new Map()  // filePath → { data, gz }

const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript',
  '.mjs':   'application/javascript',
  '.css':   'text/css',
  '.json':  'application/json',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.ico':   'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff':  'font/woff',
}
const SKIP_GZIP = new Set(['.png', '.ico', '.woff', '.woff2', '.jpg', '.gif'])
let requestCounter = 0

function acceptsGzip(req) {
  return (req.headers['accept-encoding'] ?? '').includes('gzip')
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
}

function send(req, res, payload, gz) {
  if (gz && acceptsGzip(req)) {
    res.setHeader('Content-Encoding', 'gzip')
    res.setHeader('Vary', 'Accept-Encoding')
    res.end(gz)
  } else {
    res.end(payload)
  }
}

function safeWriteHead(res, statusCode) {
  if (!res.headersSent) {
    res.writeHead(statusCode)
  }
}

function safeEnd(res, payload) {
  if (!res.writableEnded) {
    res.end(payload)
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data',  (c) => chunks.push(c))
    req.on('end',   () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

function cacheKey(body) {
  return createHash('sha256').update(body).digest('hex').slice(0, 48)
}

function serializeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    message: String(error),
  }
}

function log(level, event, details = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...details,
  }

  const line = JSON.stringify(entry)
  if (level === 'error') {
    console.error(line)
  } else {
    console.log(line)
  }
}

function logRequest(req, status, extra = {}) {
  log('info', 'request', {
    requestId: req.requestId,
    method: req.method,
    path: req.url,
    status,
    ...extra,
  })
}

function isAssetRequest(pathname) {
  return pathname.startsWith('/assets/') || /\.[a-zA-Z0-9]+$/.test(pathname)
}

createServer(async (req, res) => {
  req.requestId = `req-${Date.now()}-${++requestCounter}`
  const url = new URL(req.url ?? '/', `http://localhost`)
  setSecurityHeaders(res)

  log('info', 'request:start', {
    requestId: req.requestId,
    method: req.method,
    path: url.pathname,
    search: url.search,
    userAgent: req.headers['user-agent'] ?? '',
  })

  // ── Health check ─────────────────────────────────────────────────────────────
  if (url.pathname === '/health' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json')
    safeWriteHead(res, 200)
    safeEnd(res, JSON.stringify({ status: 'ok', uptime: process.uptime() }))
    logRequest(req, 200, { route: 'health' })
    return
  }

  // ── SIIGO bridge proxy ────────────────────────────────────────────────────────
  // /siigo/bridge/remote-access.php  →  https://rolplay.app/ajax/remote-access.php
  if (url.pathname.startsWith('/siigo/bridge/')) {
    const upstreamPath = url.pathname.replace(/^\/siigo\/bridge/, '')
    const upstreamUrl  = `${UPSTREAM}${upstreamPath}`

    if (req.method !== 'POST') {
      safeWriteHead(res, 405)
      safeEnd(res, 'Method Not Allowed')
      logRequest(req, 405, { route: 'proxy', reason: 'method_not_allowed' })
      return
    }

    let bodyText
    try {
      bodyText = await readBody(req)
    } catch (error) {
      bodyText = '{}'
      log('error', 'proxy:read_body_failed', {
        requestId: req.requestId,
        path: url.pathname,
        error: serializeError(error),
      })
    }

    const key    = cacheKey(bodyText)
    const cached = apiCache.get(key)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('X-Cache', 'HIT')
      safeWriteHead(res, 200)
      send(req, res, cached.body, cached.gz)
      logRequest(req, 200, { route: 'proxy', cache: 'HIT' })
      return
    }

    try {
      const upstream = await fetch(upstreamUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    bodyText,
      })
      if (!upstream.ok) {
        const text = await upstream.text()
        safeWriteHead(res, upstream.status)
        safeEnd(res, text)
        log('error', 'proxy:upstream_error', {
          requestId: req.requestId,
          path: url.pathname,
          upstreamUrl,
          status: upstream.status,
          responsePreview: text.slice(0, 500),
        })
        logRequest(req, upstream.status, { route: 'proxy', cache: 'MISS' })
        return
      }
      const body = await upstream.text()
      const gz   = gzipSync(body)
      if (body.length <= MAX_ENTRY) {
        apiCache.set(key, { body, gz, ts: Date.now() })
      }
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('X-Cache', 'MISS')
      safeWriteHead(res, 200)
      send(req, res, body, gz)
      logRequest(req, 200, {
        route: 'proxy',
        cache: 'MISS',
        upstreamUrl,
        responseBytes: body.length,
      })
    } catch (err) {
      safeWriteHead(res, 502)
      safeEnd(res, String(err))
      log('error', 'proxy:request_failed', {
        requestId: req.requestId,
        path: url.pathname,
        upstreamUrl,
        error: serializeError(err),
      })
      logRequest(req, 502, { route: 'proxy' })
    }
    return
  }

  // ── Static file serving ───────────────────────────────────────────────────────
  let filePath = join(DIST, url.pathname)
  const ext    = extname(filePath)

  // SPA fallback — all non-file paths serve index.html
  if (!ext) filePath = join(DIST, 'index.html')

  try {
    let entry = staticCache.get(filePath)
    if (!entry) {
      const data = await readFile(filePath)
      const e    = extname(filePath)
      entry = { data, gz: SKIP_GZIP.has(e) ? null : gzipSync(data) }
      staticCache.set(filePath, entry)
    }
    const mime = MIME[extname(filePath)] ?? 'application/octet-stream'
    res.setHeader('Content-Type', mime)
    if ((ext === '.js' || ext === '.css') && url.pathname.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    } else if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    }
    safeWriteHead(res, 200)
    send(req, res, entry.data, entry.gz)
    logRequest(req, 200, { route: 'static', filePath })
  } catch (error) {
    log('error', 'static:read_failed', {
      requestId: req.requestId,
      path: url.pathname,
      filePath,
      error: serializeError(error),
    })

    if (isAssetRequest(url.pathname)) {
      if (!res.writableEnded) {
        safeWriteHead(res, 404)
        safeEnd(res, 'Not found')
        logRequest(req, 404, { route: 'static', filePath, reason: 'asset_not_found' })
      }
      return
    }

    // Fallback to SPA index.html for client-side routing
    try {
      const html = await readFile(join(DIST, 'index.html'))
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      safeWriteHead(res, 200)
      safeEnd(res, html)
      logRequest(req, 200, { route: 'spa_fallback' })
    } catch (fallbackError) {
      log('error', 'spa:fallback_failed', {
        requestId: req.requestId,
        path: url.pathname,
        dist: DIST,
        error: serializeError(fallbackError),
      })
      if (!res.writableEnded) {
        safeWriteHead(res, 404)
        safeEnd(res, 'Not found')
        logRequest(req, 404, { route: 'spa_fallback', reason: 'index_missing' })
      }
    }
  }
}).listen(PORT, '0.0.0.0', () => {
  log('info', 'server:start', {
    port: PORT,
    dist: DIST,
    upstream: UPSTREAM,
    node: process.version,
  })
})

process.on('uncaughtException', (error) => {
  log('error', 'process:uncaught_exception', {
    error: serializeError(error),
  })
})

process.on('unhandledRejection', (reason) => {
  log('error', 'process:unhandled_rejection', {
    error: serializeError(reason),
  })
})
