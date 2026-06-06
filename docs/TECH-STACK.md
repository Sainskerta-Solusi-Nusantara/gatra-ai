# GATRA AI — Technology Stack

> Status: Design v0.1
> Scope: every dependency we choose for v1, why we chose it, and what the alternative was.

GATRA AI is a fork of OpenClaw. The first rule below shapes everything else:

> **Default to what OpenClaw already uses.** We only diverge when an enterprise requirement demands it. Each divergence below is explicit.

---

## 1. Language & Runtime

| Choice | Notes |
|---|---|
| **TypeScript 5.x** | OpenClaw is 91.8% TypeScript. We stay there. Strict mode on. |
| **Node.js 20 LTS** | Gateway and dashboard run on the same major; LTS through 2026-04. Upgrade to 22 LTS planned mid-2026. |
| **pnpm workspaces** | OpenClaw monorepo uses pnpm — we keep it. The `enterprise/*` and `dashboard/` packages slot in as workspaces. |
| **ESM** | OpenClaw is ESM-first; new code follows. |

Why not Go / Rust for the Gateway? Cost of forking outweighs the runtime benefit. Node + TS gives us cheap upstream pulls, faster contributor ramp, and the perf is fine — we're I/O bound, not CPU.

---

## 2. Build & Tooling

| Concern | Tool | Why |
|---|---|---|
| Build | **tsx + tsc --build** (incremental) for libraries; **Next.js build** for dashboard | What OpenClaw uses |
| Lint | **oxlint** (`.oxlintrc.json` upstream) | OpenClaw's choice; far faster than ESLint |
| Format | **oxfmt** (`.oxfmtrc.jsonc` upstream) | Consistent with upstream |
| Test | **vitest** (unit + integration), **Playwright** (E2E dashboard), **k6** (load) | vitest matches OpenClaw; Playwright is the obvious E2E pick |
| Security | **semgrep** (`.semgrepignore` upstream), **npm audit**, **trivy** (image scan) | Layered |
| Pre-commit | **pre-commit** (`.pre-commit-config.yaml` upstream) | Inherited |
| Packaging | **Docker** + multi-arch images (`amd64`, `arm64`) | Most BUMN run amd64 RHEL; arm64 for Mac dev |

---

## 3. Process & Service Management

| Concern | Choice | Notes |
|---|---|---|
| **Single-host** | systemd user units (matches OpenClaw `gateway install`) | one unit for `gatra-gateway`, one for `gatra-dashboard`, one for `gatra-audit-sidecar` |
| **HA / multi-host** | systemd units behind a TCP LB OR docker-compose OR Kubernetes (helm chart) | Customers choose; we ship all three deployment manifests |
| **Air-gap** | Same as HA, but images pulled from internal registry | Document the bundle + checksum process |

---

## 4. Data Stores

### 4.1. State DB

| Mode | Engine | Driver |
|---|---|---|
| Single-host | **SQLite (better-sqlite3)** with WAL mode | What OpenClaw uses for sessions/cron |
| HA | **PostgreSQL 16** | Adds replication, advisory locks, pgvector |

Schema migrations: **drizzle-kit** (chosen for type-safety; OpenClaw's migration story is currently ad-hoc — we tighten it for enterprise). Enterprise tables prefixed `e_` so they never collide with upstream OpenClaw tables.

Alternative considered: Knex. Rejected — types are weaker; drizzle's types make our RBAC code statically safe.

### 4.2. Vector Store

| Mode | Engine |
|---|---|
| Single-host | **sqlite-vss** (virtual table in the same SQLite file) |
| HA | **pgvector** extension on Postgres |

Same schema in both modes, differs only at the index level. Embedding dim default 3072 (text-embedding-3-large); configurable.

Alternative considered: standalone Qdrant or Weaviate. Rejected for v1 — adds an operational dependency BUMN SREs do not want and our retrieval needs are modest (top-K cosine, no graph queries, modest scale per goal).

### 4.3. Object Store

| Choice | Why |
|---|---|
| **MinIO** (S3-compatible, self-hosted) | The de facto on-prem S3. Single-binary, supports erasure coding, WORM buckets, KMS, easy ops. |

For customers who prefer a managed S3 in private cloud (e.g., Alicloud OSS in Indonesia DC), the S3 client is provider-agnostic.

### 4.4. Cache

None as a separate service. In-process LRU using `lru-cache` for hot session/goal handles. We deliberately avoid Redis to keep the dependency surface small.

---

## 5. LLM & Embedding Providers

### 5.1. LLM (chat/responses)

| Provider | Default model | Mode | Notes |
|---|---|---|---|
| **Anthropic** | `claude-opus-4-7` (planner), `claude-haiku-4-5` (cheap critic) | egress | First-class; native function calling |
| **Azure OpenAI** | `gpt-4o` family | egress | For BUMN with Azure agreements |
| **vLLM** (self-hosted) | Llama 3.1 70B or Qwen 2.5 72B | in-VPC | For air-gap |
| **Ollama** | smaller models | in-VPC | Dev / SME tier |

We use the **OpenAI-compatible** surface for vLLM/Ollama (they all expose it), so one provider client code path covers them. Anthropic uses the native SDK.

Provider selection is per-goal config; default is the workspace default; admin can change globally.

### 5.2. Embeddings

| Provider | Default model |
|---|---|
| OpenAI | `text-embedding-3-large` (3072d) |
| Azure | same |
| Self-hosted | **BGE-M3** via vLLM (1024d) for air-gap |

The vector dim is configured; switching models triggers a background re-embed job.

### 5.3. Provider proxy

A thin internal client (`enterprise/llm/`) wraps every provider with:
- Token accounting (charged to goal budget)
- Cost accounting (via per-provider price table)
- Circuit breaker (per provider)
- Retries with jitter
- Outbound PII redaction (see Memory doc §8)
- Audit hook (every call → `audit_event`)
- Optional call recording (off by default; on by config, retained per retention policy)

No provider SDK is called from goal/executor code directly — always via this wrapper.

---

## 6. Identity & Auth

| Concern | Choice |
|---|---|
| Operator SSO | **OIDC** via NextAuth.js (Keycloak, Azure AD, Google Workspace) |
| Service-to-service | **mTLS** with an internal CA (smallstep or step-ca) |
| Gateway shared-secret fallback | OpenClaw-native (token / password from env), kept for break-glass |
| Secrets at rest | **HashiCorp Vault** adapter when available; otherwise mode-0600 files with optional age encryption |

OIDC role claim defaults to `groups`; mapping to GATRA roles is per-deployment YAML.

---

## 7. Networking & Reverse Proxy

| Layer | Choice | Notes |
|---|---|---|
| Reverse proxy / TLS | **nginx** (preferred) or **Traefik** | BUMN SREs already run one |
| WAF | nginx + ModSecurity (CRS) or Traefik plugin | optional but recommended |
| Egress proxy (provider allowlist) | **squid** or **traefik egress** with explicit allowlist | for "no surprise SaaS calls" mode |

Gateway never binds to a public interface; all ingress goes through the reverse proxy.

---

## 8. Observability

| Concern | Choice |
|---|---|
| Logging | **pino** JSON to stdout → journald / docker logging driver |
| Metrics | **Prometheus** scraping `/metrics` (loopback) |
| Traces | **OpenTelemetry** SDK with OTLP exporter (Jaeger / Tempo) — sampled, off by default |
| Dashboards | **Grafana** (we ship JSON dashboards for the customer to import) |
| Alerts | **Alertmanager** → Slack / Teams / PagerDuty |

Mandatory metrics named in the feature docs (LLAR §10, Executor §14). Customers can scrape with their own Prometheus.

---

## 9. Dashboard Stack

| Concern | Choice |
|---|---|
| Framework | **Next.js 15** (App Router, RSC, Node runtime) |
| UI | **shadcn/ui** + **tailwindcss** |
| Auth | **NextAuth.js** with OIDC adapter |
| Server state | **@tanstack/react-query** |
| Client realtime | native `WebSocket` + tiny event bus (zustand) |
| i18n | **next-intl** |
| Charts | **recharts** |
| Forms | **react-hook-form** + **zod** for schemas |
| Tests | **vitest** + **@testing-library/react**; **Playwright** for E2E; **axe-core** for a11y |

We bundle dashboard with `next build` and serve via `node`. No Vercel runtime — runs anywhere a Node container can.

---

## 10. Sandbox & Tools

| Concern | Choice | Notes |
|---|---|---|
| Default sandbox | **Docker** (OpenClaw default for non-main sessions) | matches existing behaviour |
| Optional sandbox | **Kata Containers** or **gVisor** | for `RAHASIA NEGARA` workloads |
| Browser tool | **Playwright** (Chromium headless) | inherited from OpenClaw |
| Shell tool | **node-pty** | inherited |
| HTTP tool | **undici** | inherited |
| Filesystem tool | builtin `node:fs` | with path allowlists |

Tool registry stays OpenClaw's; we add an `enterprise.allowedTools` filter applied at the executor's policy gate (not in the registry itself — keeps upstream tool set unchanged).

---

## 11. Channels (Optional)

Inherited from OpenClaw verbatim — disabled by default for BUMN deployments where the dashboard + cron triggers are the only entry points. When enabled per-customer:

- WhatsApp (Baileys), Telegram (grammY), Slack, Discord, MS Teams (webhook only), Signal, IRC, WebChat.

These are optional packages and not pulled in unless `channels.<name>.enabled=true`. Reduces attack surface for high-compliance deployments.

---

## 12. CI/CD

| Concern | Choice |
|---|---|
| CI | **GitHub Actions** (mirrored to internal GitLab for customers) |
| Image registry | GitHub Container Registry; mirror to internal registry for air-gap customers |
| Image signing | **cosign** (sigstore) |
| SBOM | **syft** generated per release; published alongside images |
| Release cadence | Monthly minor, weekly patch when needed |

Release branches: `main` (development), `release/x.y` (stable). We pull OpenClaw upstream via `git subtree pull` onto a separate `upstream/` branch and merge to `main` after the enterprise integration suite passes.

---

## 13. Storage Footprint Targets (v1)

| Tier | DB | Vector | Object | Notes |
|---|---|---|---|---|
| Pilot (1 VM) | SQLite 1–5 GB | sqlite-vss 1–10 GB | local MinIO 50–200 GB | up to 20 active goals |
| Enterprise (HA pair) | Postgres 50–200 GB | pgvector 50–200 GB | MinIO 1–5 TB | up to 500 active goals |
| Air-gapped large | Postgres 500 GB+ | pgvector 500 GB+ | MinIO 20 TB+ | up to 5000 active goals |

---

## 14. License Strategy

| Component | License | Notes |
|---|---|---|
| OpenClaw upstream | per `openclaw/openclaw` LICENSE (review at fork-time; assume MIT-compat for v1 — confirm before public release) | We fork; we contribute back the runtime improvements |
| `enterprise/` code (GATRA) | MIT | aligns with parent project's open ethos and BUMN preference for non-restrictive licenses |
| Bundled dependencies | All MIT/Apache-2.0/BSD; no copyleft into the gateway image | Lock file checked monthly via license scanner |
| Customer-owned content (goals, memory, audit) | customer | we never claim rights |

We ship a SBOM with every release and run `license-checker` in CI.

---

## 15. Compatibility Matrix

| Item | Supported |
|---|---|
| OS | Linux x86_64 (Ubuntu 22.04+, RHEL 9+, Rocky 9+); macOS for dev only |
| Container runtime | Docker 24+, Podman 4.5+, containerd 1.7+ |
| Kubernetes (optional) | 1.28+ |
| Postgres | 16+ (with `pgvector` 0.7+) |
| MinIO | RELEASE.2024-04-* or newer |
| Node.js | 20.11+ |
| Browsers (operator) | last 2 of Chrome, Edge, Firefox, Safari |

ARM64 supported for Mac development and ARM-based BUMN deployments (Ampere); production guidance defaults to amd64.

---

## 16. Things We Deliberately Did Not Add

| Tempted | Why we said no (for v1) |
|---|---|
| Redis | One more service to run; SQLite + in-process LRU covers the hot path |
| Kafka | Audit pipeline is a slow stream; MinIO + DB cursor is enough |
| Kubernetes operator | Customers run their own Helm; an operator is a future-us problem |
| LangChain / LlamaIndex | We have a small, opinionated executor — pulling these in adds many transitive deps and constrains our planner shape |
| GraphQL | RPC over WebSocket is already there; adding GraphQL doubles surface area |
| Service mesh (Istio/Linkerd) | mTLS for two services is overkill; revisit when customers truly need it |
| Multi-tenancy in v1 | Each BUMN customer is its own deployment; tenancy is sales packaging, not code complexity |

---

## 17. Summary Table

| Concern | Choice |
|---|---|
| Language / runtime | TypeScript / Node 20 LTS |
| Package mgr | pnpm workspaces |
| Build/lint/test | tsc/oxlint/oxfmt/vitest/Playwright |
| State DB | SQLite (single-host) / Postgres 16 (HA) |
| Vector | sqlite-vss / pgvector |
| Object | MinIO |
| Cache | in-process LRU |
| LLM | Anthropic + Azure OpenAI (egress); vLLM + Ollama (air-gap) |
| Embeddings | OpenAI / BGE-M3 |
| Auth | OIDC (NextAuth) + mTLS for s2s |
| Reverse proxy | nginx / Traefik |
| Sandbox | Docker (default); Kata/gVisor optional |
| Dashboard | Next.js 15 + shadcn/ui + tailwind |
| Logs/metrics/traces | pino / Prometheus / OTel |
| CI | GitHub Actions; cosign + syft for releases |
| License | MIT for `enterprise/`; upstream license preserved for vendored code |
