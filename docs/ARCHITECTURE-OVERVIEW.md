# GATRA AI — Architecture Overview

> Status: Design v0.1 — Planning Agent 2 (Technical Architecture)
> Scope: Fork of OpenClaw (TypeScript, MIT-licensed core) hardened for BUMN and Indonesian konglomerasi on-premise deployments.
> Audience: Implementing engineers, security reviewers, infra/SRE.

---

## 1. Inheritance from OpenClaw

GATRA AI inherits OpenClaw's **single long-lived Gateway** runtime model and adds five enterprise capability layers on top of it. We do **not** rebuild the gateway; we extend it.

What we keep verbatim:
- Single Node.js Gateway process per host, default bind `127.0.0.1:18789` (multiplexes WebSocket RPC + HTTP).
- Shared SQLite state DB at `~/.openclaw/state.db` (jobs, sessions, runs).
- Workspace layout at `~/.openclaw/workspace` with injected `AGENTS.md`, `SOUL.md`, `TOOLS.md`.
- Skill loading precedence (workspace > project-agent > personal-agent > managed > bundled).
- Sandbox runtime (Docker by default for `non-main` sessions).
- OpenAI-compatible HTTP surface (`/v1/models`, `/v1/chat/completions`, `/v1/responses`, `/v1/embeddings`, `/tools/invoke`).
- Channel adapters (WhatsApp, Telegram, Slack, etc.) — optional, disabled for typical BUMN deploys.

What we add (this fork):
1. **Long-Lived Agent Runtime (LLAR)** — autonomous, restart-safe agent loops, not just a long process.
2. **Goal Executor** — declarative goals → planner → executor with bounded autonomy.
3. **Memory & Checkpoint Layer (MCL)** — typed memory store + step checkpoints + resume.
4. **Operations Dashboard** — enterprise web UI for fleet status, audit logs, manual retry.
5. **Enterprise Self-Host Pack** — air-gapped install, RBAC, audit trail, OIDC bind.

---

## 2. System Diagram (ASCII)

```
                                  ┌──────────────────────────────────────────────┐
                                  │              OPERATORS (BUMN)                │
                                  │  SOC / SRE / Compliance / Business Owner     │
                                  └──────────────┬───────────────────────────────┘
                                                 │  HTTPS (TLS, OIDC)
                                                 ▼
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │                        REVERSE PROXY (nginx / Traefik)                       │
   │   - mTLS termination - OIDC enforcement - WAF rules - Rate limit            │
   └──────────────┬───────────────────────────────────┬──────────────────────────┘
                  │                                   │
                  │ /dashboard, /api/v1/*             │ /v1/* (OpenAI compat)
                  ▼                                   ▼
   ┌──────────────────────────────┐   ┌──────────────────────────────────────────┐
   │   GATRA Dashboard (Next.js)  │   │      GATEWAY (Node.js, long-lived)       │
   │   Server-rendered SSR pages  │◀─▶│  ┌──────────────────────────────────┐   │
   │   - Fleet view               │WS │  │   HTTP/WS multiplex on :18789    │   │
   │   - Run timeline             │   │  ├──────────────────────────────────┤   │
   │   - Manual retry             │   │  │   Auth: OIDC / shared-secret     │   │
   │   - Audit log search         │   │  │   RBAC: enterprise policy gate   │   │
   │   - Goal designer            │   │  ├──────────────────────────────────┤   │
   └──────────────┬───────────────┘   │  │   Control-plane RPC bus          │   │
                  │                   │  └──────────────────────────────────┘   │
                  │                   │                                          │
                  │ uses              │  ┌──────────────────────────────────┐   │
                  ▼                   │  │       LONG-LIVED AGENT RUNTIME    │  │
   ┌──────────────────────────────┐  │  │  (Feature #1 — new in GATRA)     │   │
   │  Audit Sink (immutable)      │  │  │  - Supervisor                    │   │
   │  - Append-only WAL           │  │  │  - Heartbeat                     │   │
   │  - Hash chain (tamper-evident)│  │  │  - Backoff & resume hooks        │   │
   │  - Optional S3/MinIO offload │  │  └────────┬─────────────────────────┘   │
   └──────────────────────────────┘  │           │                              │
                                     │           ▼                              │
                                     │  ┌──────────────────────────────────┐   │
                                     │  │   GOAL EXECUTOR (Feature #2)     │   │
                                     │  │   Planner → Step Queue → Critic  │   │
                                     │  │   Policy gate (budget, scopes)   │   │
                                     │  └────────┬─────────────────────────┘   │
                                     │           │                              │
                                     │           ▼                              │
                                     │  ┌──────────────────────────────────┐   │
                                     │  │  TOOL INVOKER + SANDBOX          │   │
                                     │  │  (OpenClaw-native; Docker)       │   │
                                     │  │  browser / fs / shell / http /…  │   │
                                     │  └────────┬─────────────────────────┘   │
                                     │           │                              │
                                     │           ▼                              │
                                     │  ┌──────────────────────────────────┐   │
                                     │  │  MEMORY & CHECKPOINT (Feature #3)│   │
                                     │  │  - Episodic / Semantic / Working │   │
                                     │  │  - Step checkpoints (CRDT-ish)   │   │
                                     │  │  - Resume controller             │   │
                                     │  └────────┬─────────────────────────┘   │
                                     └───────────┼──────────────────────────────┘
                                                 │
                ┌────────────────────────────────┼─────────────────────────────┐
                │                                │                             │
                ▼                                ▼                             ▼
   ┌──────────────────────┐         ┌──────────────────────┐    ┌────────────────────────┐
   │  STATE STORE          │         │  VECTOR STORE         │    │  OBJECT STORE          │
   │  SQLite (default)     │         │  pgvector (Postgres)  │    │  MinIO (S3-compat)     │
   │  Postgres (HA tier)   │         │  or sqlite-vss        │    │  - artifacts           │
   │  - sessions           │         │  (single-host fallback)│    │  - LLM call recordings │
   │  - goals              │         │                       │    │  - checkpoint blobs    │
   │  - checkpoints        │         │                       │    │                        │
   │  - audit_events       │         │                       │    │                        │
   └──────────────────────┘         └──────────────────────┘    └────────────────────────┘

                ┌──────────────────────────────────────────────────────────────┐
                │                  LLM PROVIDERS (egress)                      │
                │  ┌──────────────────┐  ┌──────────────────┐                  │
                │  │  Anthropic /     │  │  Self-hosted     │                  │
                │  │  Azure OpenAI    │  │  vLLM / Ollama   │                  │
                │  │  (egress proxy)  │  │  (in-VPC)        │                  │
                │  └──────────────────┘  └──────────────────┘                  │
                └──────────────────────────────────────────────────────────────┘
```

Notes on the diagram:
- All edges are mTLS or unix-socket inside the host.
- Operators **never** talk to Gateway directly in BUMN deployments — the dashboard SSR layer (Next.js) is the only browser-facing surface; the gateway stays loopback-bound and accessed via reverse proxy with OIDC.
- The dashed boundary of the Gateway box contains **all in-process modules** — they share one Node event loop and one SQLite handle (or one pooled pg client).

---

## 3. Component Inventory

| # | Component | Origin | Process | Default Port | Persistence |
|---|-----------|--------|---------|--------------|-------------|
| 1 | Gateway (multiplexed HTTP+WS) | OpenClaw | Node.js | 18789 | — |
| 2 | Long-Lived Agent Runtime | **GATRA new** | in-Gateway module | — | `agent_runs` table |
| 3 | Goal Executor (planner + critic) | **GATRA new** | in-Gateway module | — | `goals`, `steps` tables |
| 4 | Memory & Checkpoint Layer | **GATRA new** | in-Gateway module | — | `memories`, `checkpoints` tables + blob store |
| 5 | Tool Invoker + Sandbox | OpenClaw | in-Gateway + docker exec | — | — |
| 6 | Channel adapters (WA/TG/Slack) | OpenClaw | in-Gateway | — | session blobs |
| 7 | Cron scheduler | OpenClaw | in-Gateway | — | `cron_jobs` table |
| 8 | GATRA Dashboard | **GATRA new** | Node.js (Next.js) | 3000 | — (reads gateway) |
| 9 | Audit Sink | **GATRA new** | in-Gateway + sidecar | — | append-only WAL + S3 |
| 10 | OIDC adapter | **GATRA new** | in-Gateway plugin | — | — |
| 11 | State DB | OpenClaw | SQLite or Postgres | — | filesystem / pg |
| 12 | Vector DB | **GATRA new** | sqlite-vss or pgvector | 5432 | filesystem / pg |
| 13 | Object store | **GATRA new** | MinIO | 9000 | filesystem |
| 14 | Reverse proxy | infra | nginx / Traefik | 443 | — |

---

## 4. Deployment Topologies

GATRA AI ships **three reference topologies**. Customers pick by scale and posture.

### 4.1. Single-Host (pilot / dev / SME konglomerat)
```
┌──────────────────────────────────────────────┐
│                 single VM (4–8 vCPU)         │
│                                              │
│   ┌────────┐  ┌─────────┐  ┌─────────────┐   │
│   │ nginx  │  │ Gateway │  │  Dashboard  │   │
│   └────────┘  └─────────┘  └─────────────┘   │
│   ┌──────────────────────────────────────┐   │
│   │  SQLite + sqlite-vss + local MinIO   │   │
│   └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```
- One systemd unit per service.
- Default for proof-of-concept and edge BUMN branches.

### 4.2. HA Pair (enterprise default)
```
┌──────────────┐    ┌──────────────┐     ┌─────────────────────────────┐
│  Gateway-A   │    │  Gateway-B   │     │  Postgres (primary+replica) │
│  active      │◀──▶│  hot standby │────▶│  + pgvector                 │
└──────────────┘    └──────────────┘     └─────────────────────────────┘
        ▲                  ▲
        │                  │
        └─────────┬────────┘
                  │
       ┌─────────────────────┐         ┌──────────────────────┐
       │  Dashboard cluster  │────────▶│  MinIO cluster (3+)  │
       │  (Next.js, 2 pods)  │         │  erasure-coded       │
       └─────────────────────┘         └──────────────────────┘
```
- Active/standby Gateway via Postgres advisory lock (only one runs the executor at a time).
- Dashboard is stateless and can scale horizontally.

### 4.3. Air-Gapped (BUMN regulated / TLP:AMBER)
- Same as HA but: no egress to public LLM providers; on-prem **vLLM** or **Ollama** behind internal LB.
- Audit sink writes to internal MinIO + WORM bucket (compliance).
- Container images pulled from internal registry only.

---

## 5. Trust Boundaries

```
Internet ──[reverse proxy]──> Dashboard ──> Gateway ──> Tools (sandboxed)
                                  ▲             │
                                  │             ▼
                                  └── State DB / Vector / Object
                                  
                    LLM provider │ egress proxy (optional allowlist)
```

- **Boundary A** (Internet → Reverse proxy): TLS, OIDC, WAF, rate-limit.
- **Boundary B** (Reverse proxy → Dashboard SSR): mTLS, internal CA.
- **Boundary C** (Dashboard → Gateway): WebSocket with HMAC token; per-request RBAC re-check.
- **Boundary D** (Gateway → Tool sandbox): Docker network with deny-all egress except declared scopes.
- **Boundary E** (Gateway → LLM provider): explicit allowlist; redaction filter for PII tagged fields.

Gateway itself **never** binds to a public interface in GATRA — even the OIDC mode keeps it on loopback or a private VPC interface. The dashboard is the only ingress.

---

## 6. Cross-Cutting Concerns

### 6.1. Identity & RBAC
- Subjects: human operators (via OIDC), service accounts (mTLS cert), agents (signed agent token issued by gateway).
- Roles: `viewer`, `operator`, `goal_owner`, `admin`, `auditor` (read-only audit access only).
- Policy evaluation happens at the Gateway's RPC boundary, **before** any state read or tool invoke.

### 6.2. Audit
- Every state-changing RPC and every tool invocation emits an immutable `audit_event` row.
- Rows are appended to a hash-chained log (event N includes hash of event N-1) so tampering is detectable.
- The audit sidecar streams events to MinIO every 5s; WORM bucket retention is configurable per BUMN compliance window.

### 6.3. Observability
- Structured JSON logs (pino) to stdout — picked up by systemd-journal / Docker logging driver.
- Prometheus metrics on `/metrics` (loopback only): goal counts, step latency, tool failure rate, LLM token spend.
- OpenTelemetry traces with a sampled exporter (Jaeger / Tempo) — optional, off by default.

### 6.4. Configuration
- Layered: `defaults → /etc/gatra/config.yaml → workspace config → env vars → CLI flags`.
- Secrets via env, file (mode 0600), or Vault adapter — never in YAML.
- All config has a JSON Schema; the dashboard exposes a config diff tool with validation.

---

## 7. Module Boundaries (Source Layout)

```
src/
├── gateway/                # OpenClaw-derived; keep upstream-compatible
│   ├── server.ts
│   ├── ws.ts
│   └── http/
├── enterprise/             # GATRA additions — isolated, MIT-licensed too
│   ├── llar/               # Long-Lived Agent Runtime  (Feature #1)
│   │   ├── supervisor.ts
│   │   ├── heartbeat.ts
│   │   └── backoff.ts
│   ├── executor/           # Goal Executor             (Feature #2)
│   │   ├── planner.ts
│   │   ├── critic.ts
│   │   ├── stepQueue.ts
│   │   └── policy.ts
│   ├── memory/             # Memory + Checkpoint       (Feature #3)
│   │   ├── episodic.ts
│   │   ├── semantic.ts
│   │   ├── working.ts
│   │   └── checkpoint.ts
│   ├── audit/              # Audit sink + hash chain
│   ├── rbac/               # OIDC + policy
│   └── dashboard-api/      # RPC handlers the dashboard calls
├── tools/                  # OpenClaw-native tool registry (kept)
└── shared/                 # shared types, db schema, codecs

dashboard/                  # Next.js app                (Feature #4)
├── app/
├── components/
└── lib/
```

The `enterprise/` subtree is the only code we ship that diverges from OpenClaw upstream — every other directory remains a thin layer over upstream so we can pull releases without painful merges.

---

## 8. Upgrade & Compatibility Strategy

- We treat `src/gateway/`, `src/tools/`, and bundled OpenClaw skills as **vendored upstream**: changes go upstream first, are pulled back via `git subtree pull`.
- The `enterprise/` directory is GATRA-owned. It plugs into Gateway via two extension points OpenClaw already exposes: the plugin RPC route (`/api/v1/admin/rpc`) and the tool registry hook.
- DB migrations live in `src/shared/db/migrations/` and are run by Gateway on boot; enterprise tables are prefixed `e_` (`e_goal`, `e_checkpoint`, `e_audit`) to never collide with upstream tables.

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Long-running agents leak memory or browser tabs | Supervisor enforces per-run TTL + tool-level GC hook |
| Goal executor loops forever on adversarial input | Hard budget: max steps, max tokens, max wall-clock — all configurable per goal |
| Checkpoint blob bloat fills disk | Retention policy + dedupe by content hash; admin alert on >80% disk |
| OpenClaw upstream breaks our enterprise hooks | Pin upstream by tag, run integration suite on every pull, keep extension surface narrow |
| Air-gap install loses access to model weights at runtime | Cached weight bundle on shared MinIO; preflight check in `gatra doctor` |
| BUMN audit asks "who did what when" | Hash-chained audit log answers this directly with `gatra audit verify` |

---

## 10. Open Questions for Planning Agent 1 (Product) and Agent 3 (Security)

1. **PII tagging vocabulary** — do we ship a canonical Indonesian PII tag set (NIK, NPWP, KTP) by default, or load it from BUMN-supplied dictionary?
2. **Bahasa Indonesia in planner prompts** — is the planner expected to think/write in Bahasa, English, or model-native?
3. **Sandbox profile baseline** — Docker is the OpenClaw default; do we need Kata/gVisor for `RAHASIA NEGARA` workloads?
4. **OIDC provider matrix** — Keycloak, Azure AD, Google Workspace, in-house BUMN SSO; which are mandatory for v1?
5. **Audit retention floor** — 7 years (typical OJK regulator) or longer for SOE archive rules?

These do not block implementation of the runtime; they shape defaults.
