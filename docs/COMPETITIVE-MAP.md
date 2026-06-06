# GATRA AI — Competitive Map

> **Living document.** Last reviewed: 2026-06-06. Owned by Product & Market planning track.

---

## 1. Competitive Universe (How buyers will compare us)

A CIO BUMN/Konglomerasi yang dapat brief "kita butuh AI agent platform on-premise" akan menyusun shortlist dari 5 kategori:

| Kategori | Contoh | Posisi pasar |
|---|---|---|
| **A. Sovereign agent platforms** (target wedge) | **GATRA AI**, vendor lokal baru | Greenfield — kami pemain pertama Indonesia-led |
| **B. Cloud-managed agent platforms** | Anthropic Managed Agents + Ant CLI, OpenAI Agent Builder, Google Vertex Agent Builder | Strong product, weak on sovereignty |
| **C. Traditional RPA + AI add-on** | UiPath, Automation Anywhere, Microsoft Power Automate | Strong on installed base, weak on reasoning |
| **D. Open-source self-hosted (DIY)** | LangChain/LangGraph, Dify, n8n, Flowise, Langflow | Cheap upfront, expensive in delivery; missing enterprise gloss |
| **E. Big-vendor enterprise AI suites** | IBM watsonx, Red Hat OpenShift AI, NVIDIA AI Enterprise, SAP Joule, ServiceNow Now Assist | Strong governance, weak on Indonesia context, very expensive |

---

## 2. Master Comparison Matrix

Scoring legend: ● strong / ◐ partial / ○ weak / — N/A

| Dimension | **GATRA AI** | Anthropic MA + Ant CLI | UiPath / AA | LangChain / Dify | IBM watsonx |
|---|---|---|---|---|---|
| **Sovereignty & residency** | | | | | |
| On-premise / air-gap deploy | ● | ○ | ◐ (orchestrator on-prem) | ● | ◐ (Red Hat support) |
| Data tetap di yurisdiksi ID | ● | ○ | ◐ | ● | ◐ |
| UU PDP 27/2022 compliance posture | ● | ○ (ToS US/EU) | ◐ | ● (DIY) | ◐ |
| Source-code auditable | ● (MIT fork OpenClaw) | ○ | ○ | ● | ○ |
| **Agent capability** | | | | | |
| Long-lived stateful sessions (jam-hari) | ● | ● (Managed Agents) | ◐ (orchestrator state) | ◐ (build sendiri) | ◐ |
| Goal-based execution (decompose) | ● | ● | ○ (rule-based) | ◐ | ◐ |
| Memory + checkpoint resume | ● | ● | ○ | ○ (DIY) | ◐ |
| Multi-agent coordination | ● | ● | ○ | ◐ | ● |
| Pluggable models (Claude, Llama, lokal) | ● | ○ (Claude only) | ◐ | ● | ◐ (IBM ecosystem) |
| **Operations** | | | | | |
| Dashboard monitoring built-in | ● | ● (console) | ● | ○ | ● |
| Audit trail / log retention | ● | ◐ | ● (strong) | ○ | ● |
| Human-in-the-loop intervention queue | ● | ◐ | ● | ○ | ◐ |
| SLA & 24×7 support local | ● (Jakarta TAM) | ○ (US business hours) | ● (lokal partner) | ○ | ● |
| **Integration** | | | | | |
| ERP/Core banking connectors (SAP, Oracle, T24, BRINETS, Equation) | ◐ (Y1 manual; Y2 packaged) | ○ | ● (mature) | ◐ | ● |
| MCP / tool protocol support | ● | ● (native) | ◐ (improving) | ● | ◐ |
| **Commercial** | | | | | |
| IDR fixed annual pricing | ● | ○ (USD volatile) | ◐ (USD lokal partner) | ● (free + DIY cost) | ○ (USD enterprise) |
| TKDN eligible | ● (target ≥40%) | ○ | ○ | ◐ (DIY portion) | ○ |
| Vendor lokal (PT Indonesia) | ● | ○ | ◐ (partner only) | ◐ | ○ |
| **Risk / strategic** | | | | | |
| Vendor lock | ○ (fork-able) | ● (high) | ● (proprietary) | ○ | ● |
| Indonesia language tuning | ● | ◐ (multilingual generic) | ○ | ◐ | ◐ |
| Reference BUMN/Konglomerasi | ◐ (Y1 building) | ○ | ● (banking case studies) | ○ | ● |

---

## 3. Per-Competitor Deep Dive

### 3.1 Anthropic Managed Agents + Ant CLI

**What they are:** Ant = Go CLI (MIT) untuk akses Claude API + Managed Agents = cloud runtime untuk long-lived stateful agents, $0.08/session-hour + token, billed Anthropic.

**Strengths:**
- Best-in-class model (Claude Opus 4.7/4.8, Sonnet 4.6)
- Native Managed Agents runtime, session memory, checkpoints
- Strong developer mindshare (Claude Code adoption)
- Ant CLI MIT — kita bisa pelajari arsitektur

**Weaknesses for Indonesia enterprise:**
- 100% cloud — data ke US/EU yurisdiksi
- USD pricing, FX volatility
- Cannot satisfy UU PDP for sensitive personal data
- No local reference/SI partner
- Cannot air-gap

**Win narrative for GATRA:**
> "Anthropic memberikan agent runtime kelas dunia di cloud. GATRA memberikan kelas yang sama di dalam tembok data center Anda — dengan model yang Anda pilih, dalam mata uang Rupiah, audit-able oleh BPK."

**Loss scenario:** klien tidak peduli sovereignty (mis. non-regulated F&B, internal RnD use case bahan non-sensitif).

---

### 3.2 OpenAI Agent Builder / Assistants

**Quick take:** mirip Anthropic. Cloud-only, US-bound. Strengths di tooling ecosystem; weakness identik untuk sovereign use case. Sebagai catatan kompetitif tapi bukan ancaman utama di T1.

---

### 3.3 UiPath

**Strengths:**
- Mature di banking & insurance Indonesia (Bank Mega, BCA, etc. — UiPath case studies publik)
- Strong SI partner network (Sterling, Dentsu Soken, idstar, CFB Bots)
- Audit-friendly logs, enterprise governance
- Forrester Wave leader

**Weaknesses:**
- Rule-based — selectors break ketika UI berubah
- USD enterprise license expensive (typical Indonesian BFSI deal $400K-$2M/year)
- AI Center add-on bolted-on, not native agentic
- Vendor lock — sekali pakai workflow library susah migrate

**Win narrative for GATRA:**
> "UiPath cocok untuk proses yang langkah-langkahnya sudah Anda tahu. GATRA cocok ketika tujuan jelas tapi langkahnya bergantung situasi. Bukan pengganti UiPath — pelengkap, dengan TCO ½."

**Coexistence play:** rancang GATRA agent yang **memanggil UiPath robot** sebagai tool (mereka punya REST API). Posisi: agent = otak, RPA bot = tangan deterministik.

**Loss scenario:** klien sudah deep di UiPath ecosystem, ada CoE internal, prefer expand di stack existing.

---

### 3.4 Automation Anywhere

Sangat mirip UiPath. Strong di manufacturing & BPO sector. AA's Co-Pilot AI Agent Studio kompetitif untuk agent claims tapi tetap cloud-leaning (AA Cloud).

**Differentiator wedge:** GATRA = sovereign + agent-native sejak day 1, AA = RPA-native dengan agent retrofit.

---

### 3.5 Microsoft Power Automate + Copilot Studio

**Strengths:**
- Integrated dengan M365 (most BUMN punya M365 licensing)
- Strong di workflow + light agent
- Localization, Indonesian language fair

**Weaknesses:**
- Cloud-bound (Power Platform Azure)
- Agent capability dangkal vs. Anthropic/GATRA
- Lock-in Microsoft

**Win narrative:**
> "Copilot Studio bagus untuk Excel/Outlook copilot. Untuk agent yang menutup buku, AML, atau audit prep multi-hari — perlu runtime dedicated."

---

### 3.6 LangChain / LangGraph

**Strengths:**
- Free, open source, huge community
- Composable building blocks
- Best for dev-first orgs

**Weaknesses for BUMN/Konglomerasi:**
- 4-6 engineer untuk build production-grade runtime
- No dashboard, no audit out-of-box
- 70% PoC death rate (anecdotal industry pattern)
- No vendor SLA — kalau core engineer keluar, project mandek

**Win narrative:**
> "LangChain memberi Anda Lego. GATRA memberi Anda gedung."

**Loss scenario:** startup-style internal teams yang punya AI engineering bench dan ingin full control.

---

### 3.7 Dify (self-hosted)

**Strengths:**
- Open-source, self-host capability
- Visual workflow builder + RAG
- Faster than LangChain DIY

**Weaknesses:**
- Workflow-centric, bukan long-lived stateful agent
- Limited multi-agent coordination
- No enterprise audit/SLA baseline

**Win narrative:**
> "Dify hebat untuk chatbot internal + RAG. GATRA dirancang untuk agent yang hidup berjam-jam dan menyelesaikan goal multi-step."

**Coexistence:** GATRA agent dapat memanggil Dify workflow sebagai tool.

---

### 3.8 n8n (self-hosted)

**Strengths:**
- Workflow automation, banyak connector
- Self-host friendly

**Weaknesses:**
- Bukan agent runtime — tidak ada stateful long-lived
- AI = node opsional, bukan first-class
- License: Sustainable Use License (bukan pure OSS) — some BUMN procurement pusing

**Win narrative:**
> "n8n = workflow. GATRA = agent. Berbeda problem space."

---

### 3.9 IBM watsonx / watsonx.ai / watsonx Orchestrate

**Strengths:**
- Enterprise governance, lineage, governance out-of-box
- Red Hat OpenShift backing → on-prem capable
- IBM reference customers di banking
- Audit + compliance dokumentasi tebal

**Weaknesses:**
- Sangat mahal (typical $1M+ deal)
- Heavy footprint, painful to deploy
- Slow innovation cycle vs. Anthropic
- IBM lock-in narrative tidak disukai oleh next-gen CIO

**Win narrative:**
> "IBM cocok untuk org yang sudah mainframe IBM-shop. GATRA untuk org yang mau modern stack tanpa lock-in."

**Loss scenario:** sangat large bank dengan IBM ecosystem dari mainframe ke watsonx — incumbent advantage.

---

### 3.10 Red Hat OpenShift AI

**Strengths:**
- Kubernetes-native, on-premise mature
- Open source heritage

**Weaknesses:**
- Infra platform, bukan agent platform — masih perlu build agent runtime di atasnya
- Red Hat / IBM commercial overlay

**Position:** **partner candidate** — GATRA bisa ship sebagai workload yang berjalan di OpenShift AI. Dual play (kami berjalan di Red Hat dan stand-alone).

---

### 3.11 NVIDIA AI Enterprise / NIM

**Strengths:**
- Hardware affinity (BUMN/Konglomerasi yang beli DGX wajib pakai)
- Model serving best-in-class
- Strong rep di Indonesia (NVIDIA Indonesia office)

**Weaknesses:**
- Model serving + framework, bukan agent runtime
- Tidak ada long-lived session abstraction

**Position:** **partner / dependency** — GATRA agent bisa konsumsi NIM endpoint sebagai model backend. Joint reference dengan NVIDIA Indonesia adalah quick win.

---

### 3.12 SAP Joule + Build Process Automation

**Strengths:** kalau klien sudah SAP-heavy, Joule has data context.

**Weaknesses:** terlalu SAP-centric, cloud-leaning. Tidak fit untuk non-SAP processes.

**Position:** non-overlap untuk most use cases; coexist.

---

## 4. Decision Tree (untuk sales conversation)

```
Apakah workload menyentuh data nasabah/karyawan personal?
├─ Ya → Apakah ada kewajiban yurisdiksi (POJK/UU PDP)?
│         ├─ Ya → GATRA AI / IBM watsonx / Red Hat
│         │         ├─ Butuh IDR budget? → GATRA AI
│         │         └─ Sudah IBM-shop?  → watsonx
│         └─ Tidak → Anthropic / OpenAI / GATRA AI
└─ Tidak → Apakah proses repetitive deterministic?
            ├─ Ya → UiPath / AA / Power Automate
            └─ Tidak → Goal-based reasoning needed?
                       ├─ Ya, jangka panjang → GATRA AI / Anthropic MA
                       └─ Ya, jangka pendek → Dify / LangChain / Copilot Studio
```

---

## 5. Battle Cards (one-pager per scenario)

### 5.1 Vs. **Anthropic Managed Agents**

**When you hear:** "Kenapa tidak pakai Anthropic langsung? Mereka yang bikin Claude."

**Respond:**
1. POJK 11/2022 dan UU PDP 27/2022 mewajibkan data nasabah tidak keluar yurisdiksi. Anthropic ToS tidak menjamin ini.
2. Anthropic billing dalam USD per session-hour — sulit dipredict untuk RAB & BPK audit.
3. Anthropic Managed Agents tidak punya mekanisme audit yang dapat dishow ke BPK.
4. GATRA dibangun di OpenClaw MIT — Anda boleh fork, audit, exit kapan saja.
5. GATRA dapat memanggil Claude API sebagai model backend (via Anthropic gateway corporate) bila perlu — Anda dapat best of both worlds.

**Trap question to ask the prospect:** "Bagaimana Anda akan respond ketika BPK auditor minta lihat log lengkap agent execution selama 7 tahun retention period — kalau session-state ada di Anthropic infra?"

---

### 5.2 Vs. **UiPath**

**When you hear:** "Kami sudah pakai UiPath. Mereka rilis Agent Builder. Kenapa pindah?"

**Respond:**
1. Bukan pindah — coexist. UiPath untuk proses deterministic (form-fill, screen scrape) tetap optimal.
2. Agent Builder UiPath cloud-leaning; on-prem reasoning agent perlu runtime terpisah.
3. TCO 3-yr GATRA ≈ ½ UiPath equivalent karena licensing model berbeda.
4. GATRA agent dapat memanggil UiPath bot sebagai tool — best of both.

**Trap question:** "Berapa lama proses [reconciliation X] dibangun di UiPath, dan berapa banyak break ketika UI source berubah?"

---

### 5.3 Vs. **DIY LangChain / Dify**

**When you hear:** "Internal team kami sudah build LangChain stack."

**Respond:**
1. Hormati achievement. Tanyakan: berapa concurrent agent in production, ada dashboard, ada audit log retention?
2. Industry pattern: 70% LangChain PoC tidak naik ke production karena gap operasional.
3. Setelah core engineer keluar → siapa maintain?
4. GATRA bisa "absorb" use cases existing — agent recipe portable.

**Trap question:** "Ketika auditor minta evidence agent X mengeksekusi keputusan tertentu di tanggal Y jam Z — berapa lama untuk produce evidence dari LangChain stack?"

---

### 5.4 Vs. **IBM watsonx**

**When you hear:** "IBM sudah present watsonx ke kami. Mereka mention semua compliance."

**Respond:**
1. watsonx kuat di governance, lemah di developer velocity & innovation cadence.
2. Anchor TCO: IBM deal 5-yr typically $5-12M; GATRA ≤ ⅓.
3. GATRA MIT fork-able — Anda tidak terkurung IBM upgrade path.
4. Indonesia language tuning + lokal SI = waktu time-to-value lebih cepat.

**Trap question:** "Bagaimana watsonx integrasi dengan model lokal Sahabat-AI atau BigBox AI dari Telkom?"

---

## 6. Three Reference Scenarios — How Each Stack Actually Behaves

Tiga skenario di bawah adalah cerita yang sama, dilihat dari sudut tiap platform. Pre-sales pakai ini saat customer minta "tunjukkan bedanya konkret, bukan matrix." Setiap skenario ditulis cukup detail supaya CIO bisa memetakannya ke runbook internal mereka.

### 6.1 Scenario A — SRE Auto-Fix: production memory-leak jam 02:00 WIB

**Trigger.** Grafana alert: `payment-service-prod` heap 92%, trajectory 15 menit menuju OOM. PagerDuty fires. On-call engineer tidur.

#### A.1 GATRA AI flow
1. Webhook receiver di GATRA terima event PagerDuty, spawn `sre-triage` agent.
2. Agent baca alert, tarik 30 menit metrics terakhir via MCP `prometheus` tool, dan 500 baris log via `loki` tool — semua call tetap di dalam cluster on-prem.
3. Agent korelasi spike dengan deployment 4 jam sebelumnya (`v2.41.0`). Pull diff `v2.40.x` → `v2.41.0` dari GitLab on-prem via `git` tool.
4. Hipotesis: connection-pool leak di `OrderEventConsumer` baru. Agent siapkan **dua opsi**: (a) config rollback (max-pool 200 → 50), (b) code patch yang close consumer pada shutdown.
5. **Plan-mode pause:** kedua opsi dikirim ke on-call via Lark/Slack dengan SLA 5 menit. Jika approve → agent trigger ArgoCD rollback via `argocd` MCP tool, file incident di Jira via `jira` tool, draft postmortem di Confluence.
6. Setiap langkah masuk audit log; cost capped IDR 50k per incident.

**Wall-clock:** ~7 menit page → mitigated. **Human time:** ~3 menit (approve + watch).

#### A.2 Anthropic Managed Agents + Ant CLI flow
- Kapabilitas sama, wall-clock sama. **Tapi:** terminal on-call engineer melakukan outbound HTTPS ke `api.anthropic.com` dengan full log payloads dan production diff di prompt. Ini insiden sovereignty **di atas** insiden produksi.
- Tidak dapat di-deploy di bank OJK-regulated tanpa exemption letter dari compliance.

#### A.3 OpenAI Agent Builder flow
- Mirip Anthropic — residency blocker yang sama.
- Tambahan friksi: tool calls (Prometheus/Loki/ArgoCD MCP) harus di-wire sendiri oleh platform team karena tidak ship default.

#### A.4 Azure AI Foundry / Copilot Studio flow
- Bisa dibangun, butuh Foundry agents calling private network via Azure Private Link.
- Diagnosis traffic tetap lewat Azure Singapore untuk mayoritas tenant BUMN → cross-border data flow tetap terjadi.
- Build effort: 4–6 minggu integrasi, plus consumption cost ongoing.

#### A.5 UiPath / Automation Anywhere flow
- RPA tidak bisa baca Grafana metrics secara meaningful; tidak bisa reasoning tentang code diff; tidak bisa menulis patch.
- Best yang bisa dilakukan: page human, open Jira ticket, lampirkan screenshot alert. Itu **bukan** auto-fix — itu workflow automation.

#### A.6 Dify / n8n flow
- Workflow bisa dibangun: webhook → LLM call → Slack post → wait approval → run Ansible playbook.
- Dua failure mode: (a) LLM call ke endpoint yang dikonfigurasi tim, biasanya OpenAI cloud → sovereignty issue; (b) langkah "reason about logs" one-shot — tidak ada iterative planning, tidak ada recovery ketika hipotesis pertama salah.
- Layak untuk incident sederhana; gagal pada incident yang justru butuh agent.

#### A.7 LangChain / LangGraph flow
- Fully buildable. Platform team customer tulis state machine `LangGraph`, jalankan di infra sendiri.
- Cost: 2–4 engineer-bulan upfront + maintenance + stack observability sendiri.
- Ini opsi "build" untuk pertanyaan "buy" GATRA — outcome sama, runway lebih panjang.

#### A.8 IBM watsonx Orchestrate flow
- Bisa dibangun dengan watsonx Code Assistant + Orchestrate flows. Footprint berat, deploy memakan minggu.
- Governance kuat, tapi velocity iterasi lambat. Untuk incident di jam 02:00, lag iterasi = downtime tambahan.

**Winner skenario ini:** GATRA AI by structure. Claude/Anthropic akan menang on raw quality jika sovereignty bukan hard constraint.

---

### 6.2 Scenario B — Bug Hunter Auto-PR: nightly sweep monorepo 1.4M LOC

**Trigger.** Cron 01:00 WIB scan monorepo untuk bug baru, security smell, perf regression; open PR ke squad yang bertanggung jawab.

#### B.1 GATRA AI flow
1. Cron fires `bug-hunter-fleet` — workflow yang fan-out 8 subagent paralel, satu per service tier (payments, identity, ledger, gateway, …), bounded oleh nightly budget 2M token.
2. Setiap subagent clone slice-nya via GitLab lokal, jalankan lint / type-check / static-analysis deterministic, lalu pakai LLM untuk triage findings vs. false-positive list squad (disimpan sebagai semantic memory).
3. Untuk setiap finding yang lolos, **adversarial verifier subagent** mencoba **refute** finding. Hanya finding yang survive 2-dari-3 verifier vote yang dapat PR.
4. PR dibuka di GitLab via `gitlab` MCP tool dengan reproduction notes, failing test, dan proposed fix. CODEOWNERS auto-assign reviewer.
5. Telemetry export ke Prometheus + audit log customer: agents-spawned, tokens-spent, PRs-opened, false-positive rate (tracked dari rejection reviewer).
6. Cost capped IDR 800k per malam; run yang over-budget degrade ke "report-only" mode.

**Outcome (setelah 8 minggu tuning):** ~30–50 PR/malam lintas monorepo, ~70% merge rate, false-positive cost <1 reviewer-hour/hari.

#### B.2 Anthropic Managed Agents flow
- Capability-equivalent. Quality agent sama, fan-out parallel pattern juga ada di Claude Code.
- Operational blocker: seluruh monorepo harus ship-able ke Anthropic. IP customer, secret-in-code (jika ada), referensi data regulated — semua masuk prompt.
- Compliance team tidak akan approve. Even if approved, bill per-token pada skala ini ~USD 25–60k/bulan untuk satu monorepo.

#### B.3 OpenAI Agent Builder flow
- Residency blocker sama. Plus: assistants lebih lemah di long fan-out — file-search retrieval OK, tapi multi-agent orchestration harus hand-built.

#### B.4 Azure / GitHub Copilot Workspace flow
- Copilot Workspace bisa produce PR untuk *satu issue per kali*, di-trigger dari GitHub. Bukan nightly autonomous fleet.
- Foundry bisa host orchestration; model traffic stay in Azure region tapi biasanya bukan Jakarta.
- Build effort: 6–10 minggu, plus per-PR seat / consumption cost dari Microsoft.

#### B.5 UiPath / Automation Anywhere flow
- Out of scope. RPA tidak menulis code-grade PR melawan monorepo 1.4M LOC. Titik.

#### B.6 Dify / n8n flow
- Workflow bisa call static analyzer dan post report ke Slack. Tidak bisa jalankan iterative agent loop dengan adversarial verification lintas 8 service paralel di dalam token budget.
- Customer akan build sekali, dapat banjir false positive, abandon workflow dalam 3 minggu.

#### B.7 LangChain / LangGraph flow
- Buildable. Pattern (fan-out + verify + budget) sudah documented. Platform team customer bisa ship v1 dalam ~3 bulan.
- Setelah itu mereka own observability, budget enforcement, false-positive feedback loop, dan SRE rotation. Bulan ke-9, platform team 4 engineer full-time untuk runtime — bukan menulis agent.

#### B.8 IBM watsonx Code Assistant flow
- Code Assistant bagus untuk single-file refactor di SDLC mainframe legacy.
- Tidak ada nightly multi-agent fleet pattern out-of-the-box. Build effort comparable LangChain DIY tapi dengan governance bonus.

**Winner skenario ini:** GATRA AI by structure + operational fit. Anthropic kedua kalau sovereignty bukan masalah.

---

### 6.3 Scenario C — Data Pipeline Repair: ETL gagal karena upstream schema drift

**Trigger.** 03:00 WIB — Airflow DAG `dwh_daily_load` gagal di task `dim_customer`. Root cause: upstream Oracle CDC tambah 2 kolom nullable; dbt model downstream dan warehouse schema on-prem dua-duanya break.

#### C.1 GATRA AI flow
1. Airflow `on_failure_callback` post failed task context ke GATRA. `data-pipeline-fixer` agent spawn.
2. Agent baca failed task log (via `airflow` MCP), dbt model source (`git`), warehouse schema (`postgres`/`oracle` tool), dan source-table DDL.
3. Diagnosis: schema drift, identifikasi 2 kolom baru, generate: (a) dbt model patch tambah kolom ke staging view, (b) warehouse `ALTER TABLE` migration dengan safe default, (c) backfill script untuk 24 jam terakhir.
4. **Plan-mode pause:** on-call data engineer lihat 3 artifact di Slack dengan diff preview. Approve migration + patch; backfill ditunda ke jam kerja.
5. Agent apply dbt patch via PR (auto-merge setelah CI green), jalankan migration via integrasi standar `flyway`/`liquibase`, retrigger DAG.
6. Report: pipeline green, lineage updated, backfill ticket di-file untuk data engineer.

**Wall-clock:** ~12 menit. **Human time:** ~4 menit.

#### C.2 Anthropic Managed Agents flow
- Kapabilitas sama. Sovereignty blocker sama — DWH schema, DDL customer-data, partial row sample akan dikirim ke Anthropic.
- Untuk state-owned bank, ini single most sensitive data-flow yang mereka own. Compliance tidak akan approve.

#### C.3 OpenAI Agent Builder flow
- Residency blocker sama. Plus: Assistants built-in support lebih lemah untuk long stateful session lintas Airflow + dbt + warehouse.

#### C.4 Azure AI Foundry / Microsoft Fabric flow
- Microsoft push Fabric untuk skenario ini; agent bisa dibangun di dalam Fabric notebooks.
- Untuk customer non-Fabric, integration cost signifikan.
- Untuk customer Fabric, residency improve (Fabric Jakarta region 2026) tapi tetap Azure-tenanted.

#### C.5 UiPath / Automation Anywhere flow
- RPA bisa re-run DAG Airflow yang gagal via UI klik. Tidak bisa reasoning schema drift atau menulis dbt patch.

#### C.6 Dify / n8n flow
- Workflow: detect failure → call LLM dengan log → minta LLM SQL patch → email data engineer.
- One-shot LLM call. Tidak ada iterative diagnosis, tidak ada plan/verify loop, tidak ada auto-PR. Data engineer tetap kerjakan 80%, hanya dapat starting hint.

#### C.7 LangChain / LangGraph flow
- Buildable dengan effort comparable skenario A dan B. Data platform team customer own it.
- Risk spesifik: langkah "verify patch is safe" non-trivial untuk DWH migration. Tanpa pattern adversarial-verifier GATRA out-of-the-box, homegrown version cenderung ship migration yang break downstream mart.

#### C.8 IBM watsonx / SAP Joule flow
- watsonx: governance kuat tapi velocity lambat. Untuk schema-drift insiden yang muncul tiap 2–3 minggu, lag = pipeline backlog menumpuk.
- SAP Joule cocok kalau warehouse di SAP HANA / BW. Untuk warehouse non-SAP, non-fit.

**Winner skenario ini:** GATRA AI by structural fit + adversarial-verify mengurangi migration risk. Cloud agent kalah di residency *dan* di migration-safety pattern.

---

### 6.4 Pola yang konsisten di tiga skenario

| Dimensi | Yang membuat GATRA menang |
| --- | --- |
| **Residency** | Semua tool call (Prometheus, GitLab, Airflow, warehouse) terjadi di dalam perimeter customer. Bukan klaim — by deployment topology. |
| **Plan-mode + approval gate** | Setiap aksi destructive butuh approval manusia di Slack/Lark dengan SLA jelas. Audit-trail by design. |
| **Adversarial verifier pattern** | Khusus skenario B & C, pattern multi-verifier mengurangi false positive dan migration risk — tidak ada di OSS frameworks out-of-the-box. |
| **Cost cap per run** | IDR budget enforcement built-in. RAB BUMN punya angka deterministic untuk diaudit BPK. |
| **MCP tool ecosystem packaged** | Prometheus, GitLab, Jira, Airflow, ArgoCD, Postgres, Oracle — kami ship sebagai tools. Customer tidak bangun integrasi dari nol. |

Tiga skenario ini akan jadi **demo script standar** untuk sales-engineer (lihat dokumen `DEMO-SCRIPTS.md` di iterasi berikut).

---

## 7. Coexistence Strategy (not zero-sum)

Smart enterprises akan **stack multi-vendor**. GATRA harus menerima ini dan posisi sebagai *agent runtime layer*, bukan all-or-nothing:

```
┌─────────────────────────────────────────────────────────────┐
│  GATRA AI Agent Runtime (long-lived, goal-based, on-prem)   │
│                                                             │
│  Calls tools ──→ ┌──────────────┐  ┌──────────────────┐    │
│                  │ UiPath bots   │  │ Dify / n8n flows │     │
│                  └──────────────┘  └──────────────────┘     │
│                                                             │
│  Uses models ──→ ┌──────────────┐  ┌──────────────────┐    │
│                  │ Claude (via   │  │ Sahabat-AI /     │     │
│                  │  GW)          │  │ BigBox / NIM     │     │
│                  └──────────────┘  └──────────────────┘     │
│                                                             │
│  Runs on    ──→  Red Hat OpenShift / bare metal / DCI        │
└─────────────────────────────────────────────────────────────┘
```

**Sales message:** "Kami bukan replacement vendor. Kami runtime layer yang membuat investment Anda di RPA, Dify, dan model lokal bekerja sebagai sistem agent terpadu."

---

## 8. Competitive Monitoring Plan

| Source | Cadence | Owner |
|---|---|---|
| Anthropic changelog & pricing page | Weekly | Product |
| OpenAI Agent Builder roadmap | Bi-weekly | Product |
| UiPath Indonesia press releases | Monthly | Sales |
| IBM watsonx Indonesia events | Quarterly | Sales |
| LKPP e-Katalog listing (RPA/AI category) | Monthly | Sales Ops |
| Telkom BigBox AI moves | Bi-weekly | Strategy |
| Forrester Wave / Gartner MQ Agent Platforms | Quarterly | Product |

---

## 9. Open Questions

- [ ] Apakah pursue official Anthropic gateway partnership (resmi reseller Claude API) sebagai add-on?
- [ ] Strategi terhadap UiPath — exclusive vs. coexist tool calling?
- [ ] Red Hat OpenShift AI — pursue certification / catalog listing?
- [ ] NVIDIA — pursue Inception program + reference architecture?
- [ ] Telkom BigBox AI — coopetition framework?

---

## 10. References

- Anthropic Managed Agents: https://wavespeed.ai/blog/posts/claude-managed-agents-pricing-2026/
- Anthropic billing analysis: https://www.finout.io/blog/anthropic-just-launched-managed-agents.-lets-talk-about-how-were-going-to-pay-for-this
- Ant CLI: https://pasqualepillitteri.it/en/news/4046/ant-cli-claude-platform-api-terminal
- Enterprise agentic on-premise landscape: https://vdf.ai/blog/enterprise-agentic-on-premises-solutions/
- Dify alternatives 2026: https://www.knowlee.ai/blog/dify-alternatives-2026
- Open-source agent frameworks: https://www.firecrawl.dev/blog/best-open-source-agent-frameworks
- UiPath Indonesia case (Bank Mega): https://www.uipath.com/resources/automation-case-studies/indonesia-bank-mega-banking-rpa
- RPA leaders Indonesia: https://solusiaplikasi.id/penyedia-robotic-process-automation-indonesia/
