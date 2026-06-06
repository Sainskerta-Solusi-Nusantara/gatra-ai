# GATRA AI

On-premise AI Agent Platform for BUMN and Indonesian konglomerasi. Long-lived, goal-driven autonomous agents that run on infrastructure you control.

## What it does

- **Goal-based execution** — declare an objective, the platform plans, executes, verifies. No step-by-step scripting.
- **Long-lived sessions** — agents run for hours or days with state persistence, heartbeat, and auto-recovery from crashes.
- **Durable memory + checkpoints** — SQLite-backed checkpoints let crashed agents resume from their last good state.
- **Operations dashboard** — React UI for fleet status, run timelines, approvals inbox, and manual controls.
- **Self-hostable** — single Docker compose stack. No SaaS dependencies, optional outbound LLM calls only.

## Quick start

### 1. Configure
```bash
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY (or OPENAI_API_KEY) and GATRA_API_TOKEN
```

### 2. Build & run with Docker
```bash
docker compose up -d --build
# API:       http://localhost:7070
# Dashboard: http://localhost:7070/  (served by the same API)
```

### 3. Or run locally
```bash
npm install
npm run migrate
npm run build:all
npm start
# Dev mode (hot reload):
#   Terminal 1: npm run dev
#   Terminal 2: npm run dev:dashboard
```

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Dashboard (React + Vite)                │
└────────────────────────────────────────────────────────────┘
                           │  REST + WS
┌────────────────────────────────────────────────────────────┐
│                  API Layer (Express)                       │
│   /api/goals  /api/runs  /api/approvals  /ws/events        │
└────────────────────────────────────────────────────────────┘
                           │
┌──────────────────┐  ┌────────────────────┐  ┌──────────────┐
│   Orchestrator   │  │   Session Manager  │  │    Memory    │
│  planner /       │◄─┤  lease, heartbeat, ├─►│  SQLite,     │
│  executor /      │  │  lifecycle, retry  │  │  checkpoints │
│  verifier        │  └────────────────────┘  └──────────────┘
└──────────────────┘
        │
        ▼
┌──────────────────┐
│  LLM Provider    │  (Anthropic API, OpenAI API, or Claude CLI subprocess)
└──────────────────┘
```

## API surface (REST)

| Method | Path                          | Purpose                                  |
|--------|-------------------------------|------------------------------------------|
| POST   | `/api/goals`                  | Create a goal                            |
| GET    | `/api/goals`                  | List goals (filter: status, owner)       |
| GET    | `/api/goals/:id`              | Goal detail                              |
| POST   | `/api/goals/:id/start`        | Start an agent run for the goal          |
| POST   | `/api/goals/:id/cancel`       | Cancel goal                              |
| GET    | `/api/runs`                   | List runs                                |
| GET    | `/api/runs/:id`               | Run detail incl. steps and checkpoints   |
| GET    | `/api/runs/:id/timeline`      | Step-by-step timeline events             |
| POST   | `/api/runs/:id/pause`         | Pause a running agent                    |
| POST   | `/api/runs/:id/resume`        | Resume from last checkpoint              |
| POST   | `/api/runs/:id/stop`          | Stop run                                 |
| POST   | `/api/runs/:id/retry`         | Retry last failed step                   |
| GET    | `/api/checkpoints/:id`        | Checkpoint contents                      |
| POST   | `/api/checkpoints/:id/rollback`| Rollback to checkpoint                  |
| GET    | `/api/approvals`              | List pending approvals                   |
| POST   | `/api/approvals/:id/decide`   | Approve / reject a step                  |
| GET    | `/api/fleet/status`           | Fleet-wide counts and supervisor health  |
| GET    | `/ws/events`                  | WebSocket: live run events               |

All endpoints require `Authorization: Bearer ${GATRA_API_TOKEN}`.

## Project layout

```
src/
  orchestrator/   Goal-based executor (planner, executor, verifier)
  session/        Long-lived session manager (lease, heartbeat, recovery)
  memory/         SQLite store + checkpoint layer
  api/            Express REST + WebSocket
  llm/            Provider abstraction (Anthropic, OpenAI, Claude CLI)
  tools/          Tool registry (fs.read, http.get, shell)
  scripts/        seed, helpers
dashboard/        React + Vite operator console
docs/             Design documents
docker-compose.yml
Dockerfile
```

## License

Source-available. See LICENSE.
