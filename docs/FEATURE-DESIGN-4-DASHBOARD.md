# Feature Design #4 — Operations Dashboard

> Status: Design v0.1
> Owner: dashboard/ (separate Next.js app) + enterprise/dashboard-api/ (RPC handlers in Gateway)
> Depends on: LLAR (#1), Goal Executor (#2), Memory & Checkpoint (#3), Audit sink.

---

## 1. Problem & Motivation

OpenClaw ships a Control UI suitable for personal use. BUMN and konglomerasi operators need a different surface:

- A **fleet view** of every active goal across the organisation.
- An **operator-facing** UI (not "AI tinkerer" UI) — clear status, clear next action, no jargon.
- **Manual override** controls: pause, resume, retry, rollback, approve, deny.
- A **compliance lens**: who did what, when; audit log search; PII findings; budget burn.
- A **goal designer** for non-technical operators to deploy goals from templates.

The Operations Dashboard is the only browser-facing surface in a BUMN deployment.

---

## 2. Goals & Non-Goals

### Goals
1. Server-rendered Next.js app deployed behind the customer's reverse proxy.
2. OIDC sign-in; per-role view filtering at the SSR layer (no RBAC bypass possible).
3. Live updates without polling — WebSocket relay from Gateway.
4. Manual intervention controls with strict audit trail.
5. Audit log search with verifiable hash chain.
6. Goal designer with templates + dry-run.
7. Operator-friendly Indonesian-language UI (with English toggle).
8. Accessible (WCAG 2.1 AA).
9. Works on tablet for SOC operators (no mobile-first scope creep — 1024+ px viewports first).

### Non-Goals
- Not a chat interface — that lives elsewhere or in the channel adapters.
- Not a BI tool — we link out to BUMN's existing dashboards for KPI rollups.
- Not a code editor — operators don't edit JavaScript; they configure goals.

---

## 3. Information Architecture

```
GATRA AI Dashboard
├─ Home
│   └─ Fleet status: counts of goals by status, recent events, alerts
├─ Goals
│   ├─ List (filter: status, owner, schedule)
│   ├─ Goal detail
│   │   ├─ Overview      (spec, budget, policy, owner, last run)
│   │   ├─ Runs          (list of AgentRuns)
│   │   ├─ Plan          (current plan, history of plan versions)
│   │   └─ Memory        (facts, recent observations, semantic search)
│   ├─ Designer         (create from template or scratch)
│   └─ Templates        (gallery)
├─ Runs
│   ├─ List (filter: goal, status, owner, date)
│   └─ Run detail
│       ├─ Timeline      (step-by-step, with rationale/result/critic)
│       ├─ Checkpoints   (chain view, verify, rollback)
│       ├─ Logs          (raw run journal, audit slices)
│       └─ Controls      (pause, resume, stop, kill, retry step)
├─ Approvals             (inbox of awaiting_approval steps)
├─ Audit
│   ├─ Search            (full-text + actor + action + target filters)
│   ├─ Verify chain      (run hash chain validation)
│   └─ Exports           (CSV / signed PDF for regulators)
├─ PII Findings          (audit_event kind=pii_leak_blocked)
├─ Skills & Tools        (registry view, enable/disable per goal-template)
├─ Schedule              (cron view of recurring goals)
├─ Fleet Ops
│   ├─ Supervisors       (Gateway instances, lease ownership)
│   ├─ Metrics           (embedded Grafana panels)
│   └─ Provider health   (LLM provider circuit breaker state)
└─ Settings
    ├─ Identity & RBAC   (OIDC binding, role assignment)
    ├─ Notifications     (Slack/Teams/email routes)
    ├─ Compliance        (retention policies, PII vocabulary)
    └─ Storage           (DB, vector, object — health & quotas)
```

Default landing for `operator` role: **Approvals** (their queue first), then **Runs**.
Default landing for `viewer`: **Fleet status**.
Default for `auditor`: **Audit › Search**.

---

## 4. RBAC at the SSR Layer

Every Next.js page is rendered server-side with `getServerSession()` resolving the OIDC token. Pages declare their required role:

```ts
// app/audit/search/page.tsx
export const requiredRole = ['auditor','admin','goal_owner'];
```

A `withRole()` HOC short-circuits to 403 if the session lacks the role. Importantly, the **API routes** the page calls also re-check — never trust the page to be the gate. The Gateway RPC is the final gate (defence in depth).

Role matrix:

| Capability | viewer | operator | goal_owner | admin | auditor |
|---|---|---|---|---|---|
| Read fleet status | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read run details | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve/deny step | — | ✅ | ✅ | ✅ | — |
| Pause/resume run | — | ✅ | ✅ | ✅ | — |
| Stop/kill run | — | — | ✅ | ✅ | — |
| Create/edit goal | — | — | ✅ | ✅ | — |
| Rollback to checkpoint | — | — | ✅ | ✅ | — |
| Edit RBAC | — | — | — | ✅ | — |
| Search audit | partial (own goals) | partial | partial | ✅ | ✅ |
| Verify audit chain | — | — | — | ✅ | ✅ |
| Edit retention | — | — | — | ✅ | — |

---

## 5. Live Update Model

The dashboard maintains **one** WebSocket connection to the Gateway per browser session. Events are multiplexed:

```
ws://gateway/dashboard/stream?token=<short-lived-jwt>

→ subscribe { topics: ['fleet','goal:goal_xxx','run:run_yyy'] }

← event { topic: 'run:run_yyy', kind: 'step_ok', step: {...} }
```

Subscriptions are role-checked at the Gateway. The browser cannot subscribe to a goal the operator can't read.

Throughput: events are coalesced per topic at 4Hz max — bursts of step events fold into a single "+12 steps, last status: ok" update to keep the UI calm. Detail pages can opt into 20Hz with explicit toggle.

Disconnects fall back to a 30s polling interval (still RBAC-checked) until the WebSocket reconnects.

---

## 6. Key Views in Detail

### 6.1. Fleet Status (Home)

```
┌────────────────────────────────────────────────────────────────┐
│  GATRA AI — Fleet                              [as: Andi (ops)]│
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   Goals     ──  Executing 12  Paused 3  Pending approval 1     │
│   Runs      ──  Active 18     Idle 5    Failed (last 24h) 2    │
│   Spend     ──  Today $34.12  This month $612 / $3000 budget  │
│                                                                │
│  Recent activity                                               │
│  ▸ 14:02  Goal "OJK Monitor" produced summary (compliance)    │
│  ▸ 13:51  Run #r_8z paused (reason=approval_required)         │
│  ▸ 13:30  Goal "GL Reconcile" succeeded (38 steps)            │
│  ▸ 13:12  Provider Anthropic: circuit closed                  │
│                                                                │
│  Alerts (2)                                                    │
│  ⚠ Run r_qm has not heartbeat for 2m (supervisor restart?)     │
│  ⚠ Audit MinIO bucket at 78% capacity                          │
└────────────────────────────────────────────────────────────────┘
```

Components are self-refreshing via the WebSocket. The "alerts" pane reads from `e_audit` where `kind LIKE 'alert.%'` filtered by role.

### 6.2. Run Timeline

The killer view. For each step, a card with:

```
┌────────────────────────────────────────────────────────────────┐
│ Step 14  ·  tool=http.get  ·  attempt 1  ·  220 ms  ·  ✓ ok    │
│                                                                │
│ Rationale:                                                     │
│   The planner needs the latest OJK circular index to decide    │
│   whether a new POJK has been published since the last run.    │
│                                                                │
│ Args:                                                          │
│   url: https://www.ojk.go.id/.../regulasi (allowlisted)        │
│                                                                │
│ Result:                                                        │
│   200 OK · 184 KB · cached observation #ob_1n45                │
│                                                                │
│ Critic:                                                        │
│   verdict=ok  confidence=0.97  "expected response shape"       │
│                                                                │
│ Checkpoint: c_82h …  [Verify chain]  [Rollback to here]        │
└────────────────────────────────────────────────────────────────┘
```

Each card is collapsible. A header strip shows the chain of step kinds at a glance: `▢▢▢◆▢▢◆◆▢▢▢▢▢◆` where ◆ = the step that triggered a replan, ▢ = ordinary step.

Controls at the top: **Pause** (default operator click target), **Stop**, **Force checkpoint**, **Open in plan view**.

### 6.3. Approvals Inbox

A single list of every step in `awaiting_approval` across goals the operator can see. Each row shows: goal title, step purpose, tool, args (formatted), the planner's rationale, the critic's pre-execution verdict (when run dry), and large **Approve** / **Deny** buttons.

Approving requires entering a reason (free-text, mandatory ≥10 chars). Denying same — and immediately pauses the parent goal.

Bulk approve is intentionally **not** offered for v1; we want operator attention to be itemised.

### 6.4. Goal Designer

A two-pane form:

```
┌────────────────────────────────┬──────────────────────────────┐
│  Spec & Policy (form)          │  Preview / Dry run            │
├────────────────────────────────┤                              │
│  Title                         │  Strategy:                   │
│  Objective (textarea, id-ID ⇄ │  1. Fetch OJK regulasi index │
│            en-US toggle)       │  2. Diff against last index   │
│  Success criteria              │  3. Filter new POJK by topic  │
│   (+) add observation_matches  │  4. Draft summary             │
│   (+) add operator_approves    │  5. Post to Teams channel     │
│  Budget                        │                              │
│   maxSteps, maxTokens, ...     │  Est cost: $0.42             │
│  Allowed tools (multi-select)  │  Est time: ~2 min            │
│  Require approval for          │                              │
│   ▢ payments.transfer          │  [Run dry]  [Save & deploy]  │
│  Schedule (cron + tz picker)   │                              │
└────────────────────────────────┴──────────────────────────────┘
```

**Dry run** calls the planner with `mode=dry`: returns a plan without enqueuing steps. Operator sees the plan, can edit the spec, and re-dry.

Templates are JSON files under `enterprise/dashboard-api/templates/` and are versioned. Customers can author internal templates and publish via `gatra template publish ./mytemplate.yaml`.

### 6.5. Audit Search

A faceted search:

```
Filters: [actor=*] [action=*] [target=*] [kind=*] [date range]   [Search]

Results (chronological)
  2026-06-06 13:22  actor=andi  action=run.pause     target=r_qm   reason="..."
  2026-06-06 13:21  actor=svc-llar  action=step.ok    target=r_qm/s_14  ...
  ...

[Verify chain over results]  [Export CSV]  [Export signed PDF]
```

Chain verification: the dashboard pulls the audit segment(s) from MinIO, recomputes hashes, and reports any gap. The signed PDF export embeds the hash of the segment(s) and is signed with a Gateway-issued key — regulators can verify offline.

---

## 7. Operator Notifications

Outbound notifications when operator attention is needed:

| Event | Default channel(s) | Configurable |
|-------|--------------------|--------------|
| Goal `awaiting_approval` | email + dashboard inbox | + Slack/Teams via webhook |
| Goal `paused (reason=approval_timeout)` | email + Slack | yes |
| Goal `failed` | email + Slack to goal owner + admin | yes |
| Run heartbeat stale > 5m | dashboard alert | + PagerDuty in HA |
| Provider circuit breaker open | dashboard alert + Slack | yes |
| PII leak blocked | dashboard alert + email to security role | yes |

Notification routes are RBAC: only `admin` can edit the goal-owner mapping. All notifications carry a deep-link back to the dashboard.

---

## 8. Storage & Quotas Page

A page non-technical for admin:
- Disk usage by store (SQLite/Postgres, vector, MinIO).
- Per-goal storage breakdown (clickthrough to the heavy ones).
- Trends (last 30 days).
- "Run retention purge now" button (defaults are nightly, but manual is allowed).
- "Reindex embeddings" button if the embedding model has been swapped.

---

## 9. Tech Choices for the Dashboard

| Concern | Choice | Why |
|---------|--------|-----|
| Framework | Next.js 15 (App Router, RSC) | Server-rendered, low JS payload, mature SSR with WebSocket via edge runtime fallback to Node |
| UI lib | shadcn/ui (radix + tailwind) | Accessible primitives, no heavyweight design system, easy to theme for BUMN branding |
| State | React Query + Zustand | RQ for server state, Zustand for the WS event bus |
| Charts | Recharts | Lightweight; we don't need heavy viz |
| i18n | next-intl | id-ID default, en-US toggle |
| Auth | NextAuth.js (OIDC provider) | Standard; works with Keycloak / Azure AD / Google Workspace |
| RPC | Custom thin client over WebSocket (OpenClaw style) | Matches Gateway's existing surface |

Dashboard runs as its own Node process (`node ./dashboard/server.js`). Two pods in HA; reverse proxy load-balances.

---

## 10. Theming & Branding

BUMN customers want their own colours, logo, and footer. We support:

- `theme.yaml` in deployment config: primary/secondary colour, logo path, favicon, custom footer HTML.
- CSS variables hot-applied; no rebuild needed.
- Dark mode toggle (default follows OS).

We do **not** support arbitrary HTML/JS injection — security risk too high. Custom widgets are out of v1.

---

## 11. Performance Targets

- TTFB for SSR pages: < 200ms p95 on a 4 vCPU dashboard pod.
- WebSocket event delivery: < 250ms gateway-to-browser p95 on LAN.
- Audit search over 30 days hot data: < 1s p95.
- Audit chain verify over 30 days cold data: < 30s (fetched lazily, progress bar).
- Concurrent operators per dashboard pod: 50+.

---

## 12. Internationalisation

- All UI strings in `dashboard/i18n/{id-ID,en-US}.json`.
- Default locale by operator preference, persisted on identity.
- Date/time formatting respects locale + tz; tz default `Asia/Jakarta`.
- Numerical formatting in id-ID uses `.` thousands and `,` decimal (matches operator expectation).
- Currency display: `Rp` for IDR, ISO for others.

---

## 13. Failure Modes

| Failure | Behaviour |
|---------|-----------|
| Gateway WS down | Dashboard shows "Reconnecting…" banner, falls back to 30s polling for status data; controls disabled |
| OIDC provider down | Existing sessions continue until expiry; new logins fail with clear error and a "use break-glass admin" link |
| Audit MinIO unreachable | Search still works on the DB hot copy; "cold segments unavailable" banner on Verify and Export |
| Dashboard pod overloaded | Health probe fails; LB removes it; the other pod absorbs |
| Operator submits a goal with invalid spec | Form rejects client-side; if it slips through, the Gateway returns structured error and the form highlights the offending field |

---

## 14. Audit of Dashboard Actions

Every operator action that mutates state in the Gateway is audited at the Gateway side (Feature #3's pipeline). The dashboard additionally logs *view* events for `auditor`-visible pages — knowing who looked at what is itself a compliance requirement for some BUMN classifications.

```sql
CREATE TABLE e_audit_view (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ts          INTEGER NOT NULL,
  actor       TEXT NOT NULL,
  page        TEXT NOT NULL,
  target_id   TEXT,
  ip          TEXT
);
```

View events are NOT hash-chained — they are operational telemetry, not legal evidence. Retention is 90 days by default.

---

## 15. Accessibility

- WCAG 2.1 AA minimum.
- Keyboard navigation for every primary action (Approve/Deny especially — operators run through inboxes fast).
- High-contrast mode toggle (separate from dark mode).
- All charts have a textual fallback table.

---

## 16. Configuration

```yaml
dashboard:
  bindHost: 0.0.0.0
  port: 3000
  baseUrl: https://gatra.bumn.example.com
  gatewayWsUrl: wss://gateway.internal:18789/dashboard/stream
  auth:
    oidc:
      issuer: https://sso.bumn.example.com
      clientId: gatra
      clientSecretEnv: GATRA_OIDC_SECRET
      roleClaim: groups
      roleMap:
        bumn-gatra-admin: admin
        bumn-gatra-ops: operator
        bumn-gatra-audit: auditor
  theme:
    primary: '#0b2545'
    accent: '#13315c'
    logoPath: /branding/logo.png
  i18n:
    defaultLocale: id-ID
  notifications:
    smtp: { host: ..., from: gatra@bumn.example.com }
    slackWebhookEnv: GATRA_SLACK_WEBHOOK
    teamsWebhookEnv: GATRA_TEAMS_WEBHOOK
```

---

## 17. Testing

1. **Component tests** (Vitest + Testing Library) for every form field — focus on validation feedback.
2. **End-to-end** (Playwright) for the three core operator journeys: approve a step, pause-then-resume a goal, deploy a goal from a template.
3. **Accessibility scan** (axe) wired into CI.
4. **RBAC tests**: matrix of role × page; assert 200 vs 403 matches the table in §4.
5. **Load test**: 50 simulated operators on the dashboard pod, 200 active goals streaming events; assert p95 latencies.
6. **Localisation test**: snapshot key pages in id-ID and en-US, assert no untranslated keys.

---

## 18. Rollout

1. Ship dashboard as a separate container alongside Gateway in the `docker-compose.yaml`.
2. Behind the same reverse proxy; OIDC integration is per-customer.
3. Day-1 templates: 5 BUMN-flavoured starter goals; 3 dashboards demo goals (read-only fixtures) for training/demos.
4. Customer onboarding doc walks SOC through RBAC, notification setup, and first goal deploy.

---

## 19. Open Questions

- Do we want a **mobile-tablet** specific view for execs (read-only KPI summary)? Lean: not v1; link to BUMN BI tool instead.
- Should goals support **multi-owner**? Lean: yes, simple list of owner role + individual operator ids.
- Audit search beyond 30 days: do operators expect to do this from the dashboard, or via offline tooling? Lean: dashboard for last 90 days; longer ranges hint at the CLI export.
