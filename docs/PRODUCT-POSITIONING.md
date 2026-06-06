# GATRA AI — Product Positioning

> **Living document.** Last reviewed: 2026-06-06. Owned by Product & Market planning track.

---

## 1. Name & Brand Rationale

### Primary: **GATRA AI**

`GATRA` (Sanskrit/Old Javanese: "limb, body, member, part of a whole") signals:
- **Indonesian sovereignty** — a Nusantara word, not a Silicon Valley brand
- **Composability** — agents as organs of one enterprise body
- **Cultural anchoring** — easy for BUMN/Konglomerasi C-suite to defend internally vs. Western brands

### Alternative Names (for trademark fallback)

| Name | Meaning | Use if |
|------|---------|--------|
| **NUSAGENT** | Nusantara + Agent | If GATRA blocked in Class 9/42 |
| **WALI AI** | "guardian/steward" — agent that watches over a goal | Banking/insurance positioning |
| **PUNAKAWAN** | Wayang servants who advise rulers | Premium / executive-assistant tier branding |
| **CAKRA** | Wheel/cycle — continuous agent loop | If positioning around "always-on agents" |
| **TAPAK AI** | Trace/footprint — auditable agent execution | Compliance-led positioning |

> **Decision rule:** keep GATRA as master brand; reserve PUNAKAWAN / WALI as product tiers if needed (e.g., GATRA AI **WALI** edition for BFSI).

---

## 2. One-Sentence Positioning

> **GATRA AI adalah platform AI Agent on-premise berdaulat — seperti Anthropic Claude Code + Managed Agents, tapi berjalan penuh di data center BUMN/Konglomerasi sehingga data, model, dan eksekusi tidak pernah keluar dari kedaulatan organisasi.**

English fallback:
> *GATRA AI is the sovereign on-premise agent platform — Anthropic-class long-lived agents that run entirely inside your data center, with goal-based execution, persistent memory, and full audit dashboard, fork of MIT-licensed OpenClaw.*

---

## 3. Positioning Statement (Geoffrey Moore template)

> **For** CIO/CTO/CDO BUMN dan Konglomerasi Indonesia yang **wajib menjalankan AI di on-premise** karena UU PDP, regulasi sektoral (OJK, Kominfo, BSSN), atau kebijakan kedaulatan data Danantara,
>
> **GATRA AI** adalah **platform AI Agent jangka panjang**
>
> **yang** menjalankan agent dengan **goal-based execution, memory + checkpoints, monitoring dashboard, dan eksekusi multi-jam/multi-hari**, sepenuhnya di infrastruktur klien.
>
> **Tidak seperti** Anthropic Managed Agents (cloud-only, USD billing, data keluar yurisdiksi), UiPath/Automation Anywhere (RPA berbasis rule, bukan goal), atau Dify/n8n (workflow builder, bukan stateful agent),
>
> **produk kami** memberikan **kombinasi sovereign + long-lived agentic** yang belum ada di pasar Indonesia, dibangun di atas OpenClaw (MIT) sehingga klien dapat audit dan fork bila perlu.

---

## 4. Value Proposition Canvas

### 4.1 Customer Jobs (Top 5)

1. **Patuhi UU PDP No. 27/2022** & regulasi sektoral tanpa men-disable AI strategis
2. **Otomasi proses backoffice multi-jam** (rekonsiliasi, AML/CFT screening, KYC review, audit prep) yang RPA tidak bisa selesaikan karena butuh reasoning
3. **Bangun "AI copilot internal"** untuk staf operasional tanpa subscription per-seat ke vendor luar negeri
4. **Lindungi proprietary knowledge** (kontrak, SOP, data nasabah, blueprint engineering) dari training data pihak ketiga
5. **Tunjukkan kedaulatan AI** ke regulator (OJK, BSSN, Kominfo, Danantara) dan stakeholder politik

### 4.2 Pains

| Pain | Severity | Current "solution" |
|------|----------|----|
| Data nasabah tidak boleh keluar yurisdiksi (UU PDP, POJK 11/2022) | Blocker | AI dihentikan / hanya pilot sandbox |
| Lisensi RPA mahal & tidak bisa goal-based | High | Bayar UiPath ratusan ribu USD/tahun |
| Vendor SaaS AI = vendor lock + risiko geopolitik | High | "Tunggu sampai aman" |
| Dev internal tidak bisa maintain LangChain spaghetti | Medium | Project AI mandek setelah PoC |
| Tidak ada audit trail agent → tidak bisa lewat audit BPK/internal | High | AI dilarang untuk proses material |

### 4.3 Gains GATRA delivers

| Gain creator | How |
|---|---|
| **Sovereign by default** | Single binary deploy, air-gap capable, optional connection ke model lokal (Sahabat-AI, BigBox, NVIDIA NIM on-prem) |
| **Goal-based, bukan rule-based** | User: *"Tutup buku Q2 untuk 12 anak usaha"* → agent decompose, eksekusi, lapor |
| **Long-lived sessions** | Agent bisa hidup berjam-jam (rekonsiliasi 50K row, audit 200 invoice) tanpa kehilangan state |
| **Memory + checkpoint** | Crash? Restart dari checkpoint. Ganti shift? Operator lain lanjutkan session |
| **Dashboard monitoring** | C-suite, auditor, oncall lihat real-time: agent mana hidup, goal apa, token spent, intervention queue |
| **MIT base (OpenClaw fork)** | Klien boleh audit source, fork, atau exit kapan saja → tidak ada lock-in narrative |

---

## 5. Competitive Positioning Map

```
                       ┌─────────────────────────────────────────┐
       SOVEREIGN /     │                                         │
       ON-PREMISE      │    GATRA AI ★          IBM watsonx       │
                      │   (long-lived,         (heavy, mahal,      │
                      │    goal-based,         IBM lock-in)        │
                      │    Indonesia-first)                        │
                      │                                            │
                      │   Dify (self-host)     Red Hat OpenShift   │
                      │   n8n (self-host)      AI                  │
                      │   ── workflow only ──                      │
                      │                                            │
       ───────────────┼────────────────────────────────────────────┼──→ LONG-LIVED / AGENTIC
                      │                                            │
                      │   UiPath, Automation   Anthropic Managed   │
                      │   Anywhere (RPA -      Agents (cloud only, │
                      │   rule based, bukan    USD billing, data   │
                      │   reasoning)            keluar yurisdiksi)  │
                      │                                            │
                      │   OpenAI Assistants     LangChain hosted   │
                      │                                            │
       CLOUD /         │                                            │
       MANAGED         └────────────────────────────────────────────┘
                       RULE-BASED /                LONG-LIVED /
                       WORKFLOW                   GOAL-BASED
```

**GATRA AI occupies the upper-right quadrant alone** in the Indonesian market: sovereign + long-lived goal-based. This is the wedge.

---

## 6. Head-to-Head Differentiation

### vs. **Anthropic Ant CLI + Managed Agents**

| Dimension | Anthropic | GATRA AI |
|---|---|---|
| Deployment | Cloud (US/EU) | On-premise / private cloud Indonesia |
| Pricing | USD per session-hour + token | IDR, fixed deployment + subscription |
| Data residency | Anthropic ToS, US jurisdiction | Klien data center, UU PDP compliant |
| Model | Claude only | Pluggable: Sahabat-AI, Claude (via gateway), Llama 3, NIM local |
| Lock-in | High (ant CLI tied to console) | None — MIT fork-able |
| Indonesian language | Generic Claude multilingual | Tuned prompts + local model option |
| Audit/SOC compliance | Anthropic SOC 2, customer cannot inspect | Klien own logs, BPK-auditable |

**Key message:** "Yang dibangun Anthropic untuk pasar global, GATRA bangun ulang untuk pasar berdaulat Indonesia."

### vs. **UiPath / Automation Anywhere (traditional RPA)**

| Dimension | RPA Klasik | GATRA AI |
|---|---|---|
| Paradigm | Record macro / rule-based bot | Goal-based LLM agent |
| Brittle to UI change | Sangat — screen scrape break | Adapt — agent re-plan |
| Use case fit | Repetitive deterministic (form-fill) | Reasoning, ambiguity, multi-step planning |
| Time to deploy 1 process | 2-8 minggu dev RPA | Hours — define goal, give tools |
| Stateful long-running | Limited (orchestrator-managed) | Native (session + checkpoint) |
| Licensing | Per-bot, per-attended seat (USD) | Deployment-based (IDR) |
| Indonesian vendor partner | UiPath/AA channels (foreign HQ) | GATRA = vendor lokal |

**Key message:** "RPA selesaikan tugas yang sudah pasti langkahnya. GATRA selesaikan tugas yang Anda tidak tahu pasti langkahnya."

### vs. **LangChain / Dify / n8n (self-hosted DIY)**

| Dimension | DIY frameworks | GATRA AI |
|---|---|---|
| Setup | Tim AI engineer 4-6 orang, 3-6 bulan | Deploy single binary, hari pertama |
| Long-lived session | Build sendiri (postgres + state mgmt) | Built-in |
| Goal-based executor | Tulis ReAct loop sendiri | Built-in |
| Dashboard | Build sendiri React app | Built-in |
| Indonesian support | Komunitas Discord | Vendor lokal, SLA Indonesia |
| Risk | Project AI mandek setelah hire engineer pivot | Vendor accountability |

**Key message:** "Hindari membangun framework — bangun proses bisnis Anda."

---

## 7. Anti-Positioning (apa GATRA BUKAN)

- ❌ Bukan chatbot CS — kami tidak compete dengan Kata.ai, Bahasa.ai
- ❌ Bukan LLM foundation — kami konsumsi model, bukan train model
- ❌ Bukan RPA pengganti penuh — RPA tetap optimal untuk repetitive deterministic
- ❌ Bukan SaaS — multi-tenant cloud tidak ada di roadmap (anti-positioning vs. Anthropic)
- ❌ Bukan retail/SMB — minimum entry tier dirancang untuk org > 500 staf

---

## 8. Messaging Pillars (untuk sales deck)

1. **"Daulat Data, Daulat Eksekusi"** — sovereign positioning
2. **"Beri Tujuan, Bukan Skrip"** — goal-based vs RPA
3. **"Agent yang Tidak Tidur"** — long-lived sessions
4. **"Forkable. Auditable. Indonesian."** — MIT base + local vendor

---

## 9. Open Questions / Risks

- [ ] Trademark check: GATRA mark di kelas 9 (software) & 42 (SaaS) — perlu IPR research
- [ ] Apakah brand "GATRA" bertabrakan dengan media Gatra.com? Cek koeksistensi
- [ ] Strategi terhadap Telkom BigBox AI (state-backed competitor) — partner atau kompetisi?
- [ ] Stance terhadap Danantara — apakah pursue official endorsement atau bottom-up adoption?

---

## 10. References

- Anthropic Managed Agents pricing & Ant CLI: https://platform.claude.com/docs/en/about-claude/pricing
- OpenClaw upstream (MIT): https://github.com/openclaw/openclaw
- UU PDP 27/2022: https://regulations.ai/regulations/indonesia-2022-10-uu-pdp-27-2022
- Telkom Sovereign AI program (May 2026): https://m.antaranews.com/amp/berita/5571619/telkom-siap-dukung-transformasi-digital-bumn-lewat-cloud-dan-ai
- Forrester Wave RPA leaders: https://solusiaplikasi.id/penyedia-robotic-process-automation-indonesia/
