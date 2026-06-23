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

function log(method, path, status) {
  const ts = new Date().toISOString()
  console.log(`[${ts}] ${method} ${path} → ${status}`)
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost`)
  setSecurityHeaders(res)

  // ── Health check ─────────────────────────────────────────────────────────────
  if (url.pathname === '/health' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }))
    log('GET', '/health', 200)
    return
  }

  // ── SIIGO bridge proxy ────────────────────────────────────────────────────────
  // /siigo/bridge/remote-access.php  →  https://rolplay.app/ajax/remote-access.php
  if (url.pathname.startsWith('/siigo/bridge/')) {
    const upstreamPath = url.pathname.replace(/^\/siigo\/bridge/, '')
    const upstreamUrl  = `${UPSTREAM}${upstreamPath}`

    if (req.method !== 'POST') {
      res.writeHead(405)
      res.end('Method Not Allowed')
      log(req.method, url.pathname, 405)
      return
    }

    let bodyText
    try { bodyText = await readBody(req) } catch { bodyText = '{}' }

    const key    = cacheKey(bodyText)
    const cached = apiCache.get(key)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('X-Cache', 'HIT')
      res.writeHead(200)
      send(req, res, cached.body, cached.gz)
      log('POST', url.pathname, '200 [cache HIT]')
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
        res.writeHead(upstream.status)
        res.end(text)
        log('POST', url.pathname, upstream.status)
        return
      }
      const body = await upstream.text()
      const gz   = gzipSync(body)
      if (body.length <= MAX_ENTRY) {
        apiCache.set(key, { body, gz, ts: Date.now() })
      }
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('X-Cache', 'MISS')
      res.writeHead(200)
      send(req, res, body, gz)
      log('POST', url.pathname, 200)
    } catch (err) {
      res.writeHead(502)
      res.end(String(err))
      log('POST', url.pathname, 502)
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
    res.writeHead(200)
    send(req, res, entry.data, entry.gz)
    log('GET', url.pathname, 200)
  } catch {
    // Fallback to SPA index.html for client-side routing
    try {
      const html = await readFile(join(DIST, 'index.html'))
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      res.writeHead(200)
      res.end(html)
    } catch {
      res.writeHead(404)
      res.end('Not found')
      log('GET', url.pathname, 404)
    }
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`SIIGO dashboard running on port ${PORT}`)
})
