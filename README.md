# SIIGO Analytics Dashboard

Production-ready sales performance dashboard for **SIIGO** (client ID 29, simulator ID 3200 — "Simulador Siigo Gastrobar") built on the Rolplay platform.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite 5 |
| State | Zustand v5 (persisted) + TanStack Query v5 |
| Charts | Recharts 2 |
| Animation | Framer Motion 11 |
| Styling | TailwindCSS 3 (dark mode, CSS variables) |
| AI | Google Gemini 2.5 Flash (streaming, two-pass) |
| Proxy | Node.js HTTP server (no DB connection) |
| Tests | Vitest + Testing Library |
| Deploy | Docker / Render |

## Quick Start

```bash
npm install
cp .env.example .env   # set VITE_GEMINI_API_KEY
npm run dev            # development server
npm run build          # production build
npm start              # production server (port 4175)
npm test               # run test suite
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `PORT` | No | Server port (default 4175) |

## Architecture

```
Browser → /siigo/bridge/* → rolplay.app/ajax/remote-access.php
```

All data comes via POST SQL queries — no direct database connection.

### Services

- `src/api/client.ts` — SQL query builders
- `src/api/queries.ts` — TanStack Query hooks (5 min stale time)
- `src/hooks/useDashboardData.ts` — central data + analytics hook
- `src/lib/analytics.ts` — pure KPI computation functions
- `src/services/QueryService.ts` — cache + dedup + retry for AI queries
- `src/services/ValidationService.ts` — SQL sanitization, score/date validation

## Key Constants

- `SIIGO_CLIENT_ID = 29`
- `SIIGO_SIMULATOR_IDS = [3200]`
- `DATA_EPOCH = '2026-06-01'`
- Pass/fail from `Diagnostico_Final` field ('si'/'no'), not a numeric threshold

## Security

- `ValidationService.sanitizeSQL()` blocks DROP/DELETE/INSERT/UPDATE/ALTER/TRUNCATE
- Only SELECT and WITH allowed through AI assistant
- Node.js proxy adds X-Content-Type-Options, X-Frame-Options, Referrer-Policy headers

## AI Assistant

Two-pass hallucination prevention: model plans SQL → QueryService executes → answer from real results. Streaming via Gemini 2.5 Flash.

## i18n

Spanish (es) and English (en). Toggle in TopBar. Persisted across sessions. All visible strings use `t(key, language)` from `src/lib/i18n.ts`.

## Dark Mode

CSS variables (`--color-bg`, `--color-card`, `--color-line`) drive all colors. Toggle via TopBar. Persisted across sessions.

## Deployment

```bash
# Docker
docker build -t siigo-dashboard .
docker run -p 4175:4175 -e VITE_GEMINI_API_KEY=your_key siigo-dashboard
```

Render: push to GitHub and connect — `render.yaml` is pre-configured.
