# GATRA AI — Pricing & Revenue Model

> **Living document.** Last reviewed: 2026-06-06. Owned by Product & Market planning track.
> Currency reference: 1 USD ≈ IDR 16,500 (mid-2026 BI middle rate).

---

## 1. Pricing Philosophy

GATRA AI menjual ke organisasi yang **wajib on-premise** dan **alergi terhadap per-token / per-seat USD billing**. Karena itu model pricing inti berbeda dari Anthropic Managed Agents:

| Pricing dimension | Anthropic Managed Agents | **GATRA AI** |
|---|---|---|
| Currency | USD | IDR (multi-year contract) |
| Unit ekonomi | Session-hour ($0.08) + per-token | Deployment + capacity tier + support |
| Token cost | Pass-through ke pelanggan | Pelanggan pakai compute & model sendiri (BYOC/BYOM) |
| Predictability | Volatile (token usage) | Fixed annual (CFO-friendly) |
| Capex/opex | 100% opex | Mix: capex (deployment), opex (subscription, support) |

**Inti:** kami menjual *kemampuan menjalankan agent fleet* bukan *eksekusi per query*. Pelanggan menanggung compute & token sendiri (mereka sudah punya GPU farm, atau pakai BigBox AI, atau call Claude via gateway).

---

## 2. Pricing Components

### Component A — **Deployment License (Capex / One-Time)**

Lisensi instalasi platform di environment klien. Dibayar saat go-live.

| Tier | Sizing | Harga (IDR) | Setara USD |
|---|---|---|---|
| **Starter** | 1 environment (prod), ≤ 50 concurrent agents, ≤ 5 user workspace | **IDR 750 juta** | ~$45K |
| **Growth** | 1 env, ≤ 200 concurrent agents, ≤ 25 user workspaces, HA active-passive | **IDR 2,2 milyar** | ~$133K |
| **Enterprise** | Multi-env (dev/stg/prod), ≤ 1,000 concurrent agents, ≤ 100 user workspaces, HA active-active, multi-region (DC + DRC) | **IDR 5,5 milyar** | ~$333K |
| **Sovereign** | Multi-tenant intra-grup (untuk Danantara / holding deploy lintas anak usaha), unlimited concurrent, source code escrow | **IDR 12 – 18 milyar** | ~$725K–$1.1M |

### Component B — **Annual Subscription (Opex / Recurring)**

Update, security patch, baseline agent recipes library, support portal.

| Tier | Annual subscription (IDR) | Includes |
|---|---|---|
| Starter | **IDR 350 jt / yr** | Email support, monthly patch, community recipes |
| Growth | **IDR 950 jt / yr** | + 8×5 phone support, SLA 8 jam P1, quarterly business review |
| Enterprise | **IDR 2,4 M / yr** | + 24×7 P1 SLA 2 jam, dedicated CSM, semi-annual roadmap input |
| Sovereign | **IDR 5,5 M / yr** | + on-site engineer 1 FTE, source escrow, custom roadmap commitment |

> **Rule of thumb:** subscription = ~45-50% dari deployment license per tahun untuk Starter/Growth, lebih rendah % untuk Enterprise/Sovereign (volume).

### Component C — **Professional Services / Implementation (One-Time)**

Termasuk: deploy ke infra klien, integration ke sumber data (Oracle ERP, SAP, core banking, etc.), agent recipe development, knowledge transfer ke tim internal.

| Engagement | Scope | Harga |
|---|---|---|
| **Quickstart Pack** | 2-week deployment + 1 agent recipe | **IDR 400 jt** |
| **Foundation Pack** | 4-week deployment + 3 agent recipes + 1 integration | **IDR 1,2 M** |
| **Transformation Pack** | 12-week, 8 agent recipes, 4 integrations, ToT | **IDR 4 M – 6 M** |
| **Custom Engineering** | T&M, on-demand | **IDR 4 jt / day / engineer** |

### Component D — **Premium Support Add-ons**

| Add-on | Annual (IDR) |
|---|---|
| **Dedicated TAM (Technical Account Manager)** | IDR 1,8 M / yr |
| **On-site resident engineer (1 FTE @ Jakarta)** | IDR 2,8 M / yr |
| **24×7 NOC + paging** (untuk regulated industries) | IDR 1,2 M / yr |
| **Source-code escrow (Iron Mountain Indonesia)** | IDR 250 jt setup + IDR 80 jt/yr |
| **Security review & re-cert (annual VAPT, ISO 27001 alignment evidence)** | IDR 600 jt / yr |

### Component E — **Compute & Model Pass-through** (BYOC / BYOM)

Tidak ditagih GATRA. Pelanggan membayar langsung ke:
- Provider compute mereka (Telkom Sigma cloud, internal GPU farm, NVIDIA NIM license, dll.)
- Provider model: Anthropic API via gateway, Sahabat-AI, Bigbox AI, internal Llama deployment, dll.

**GATRA opsional menyediakan:** Token Gateway add-on (caching, routing, budget enforcement) — pricing di Component D.

---

## 3. Example Bundles (Sales-Ready)

### Bundle 1 — **"BUMN Starter Pilot"** (target: BUMN T2 / anak usaha)

- Starter deployment license: IDR 750 jt
- Year-1 subscription: IDR 350 jt
- Quickstart Pack PS: IDR 400 jt
- **Year-1 total: ~IDR 1,5 M (~$91K)**
- Year-2+ run-rate: IDR 350 jt subscription saja

### Bundle 2 — **"BUMN Strategis Production"** (target: bank besar, energi besar)

- Enterprise deployment: IDR 5,5 M
- Year-1 subscription: IDR 2,4 M
- Foundation Pack PS: IDR 1,2 M
- TAM add-on: IDR 1,8 M
- 24×7 NOC: IDR 1,2 M
- **Year-1 total: ~IDR 12,1 M (~$733K)**
- Year-2+ run-rate: IDR 5,4 M / yr

### Bundle 3 — **"Konglomerasi Group Deploy"** (target: Astra/Salim/Sinar Mas)

- Sovereign deployment: IDR 14 M (negotiated)
- Year-1 subscription: IDR 5,5 M
- Transformation Pack PS: IDR 5 M
- 1 on-site resident engineer: IDR 2,8 M
- Source escrow: IDR 250 jt + IDR 80 jt
- **Year-1 total: ~IDR 27,6 M (~$1.67M)**
- Year-2+ run-rate: IDR 8,4 M / yr

---

## 4. Discount Framework

| Type | Discount | Rationale |
|---|---|---|
| **Design Partner (Year 1, max 5 logos)** | 50–70% off deployment + 50% off subscription Y1 | Case study + reference call + roadmap input |
| **Multi-year (3-yr commit)** | 15% off subscription | Cash flow predictability |
| **Multi-year (5-yr commit)** | 25% off subscription + free escrow setup | Strategic anchor |
| **Group / holding deploy (Konglomerasi)** | 20-35% volume disc on additional subsidiaries beyond 1st | Land-and-expand within group |
| **Education / non-profit / academic** | 80% off | Brand build (UI, UGM, ITB labs) |
| **Replacement competitor disc** (clear UiPath/AA contract evidence) | 25% off deployment | Win-back |

**Floor pricing:** never sell Enterprise below IDR 4 M deployment without C-level approval. Never give Starter below IDR 450 jt deployment.

---

## 5. Comparison vs. Alternatives (TCO 3-Year)

Asumsi: BUMN T1 dengan 100 concurrent agents, 5 use cases produksi, normal usage.

| Solution | Y1 (IDR) | Y2 (IDR) | Y3 (IDR) | 3-Yr TCO |
|---|---|---|---|---|
| **GATRA Enterprise** | 12,1 M | 5,4 M | 5,4 M | **22,9 M** |
| **UiPath Enterprise + SI** (equivalent scope) | 18 M | 12 M | 12 M | **42 M** |
| **Anthropic Managed Agents** (USD, est. $0.08 × 1M session-hours × 16,500) | ~22 M | ~22 M | ~22 M | **~66 M** + data residency risk |
| **DIY LangChain + internal team** (4 FTE × IDR 800 jt fully-loaded) | ~3,8 M | ~3,5 M | ~3,5 M | ~10,8 M build cost — **but PoC death rate ~70%** |
| **Dify / n8n self-host + custom dev** | ~6 M | ~4 M | ~4 M | ~14 M — but missing long-lived agent, dashboard, support |

**Key sales narrative:** GATRA = ½ TCO UiPath, ⅓ TCO Anthropic Managed, dengan deliverability lebih tinggi dari DIY.

---

## 6. Revenue Projection (3-year scenarios)

### 6.1 Assumptions

- 5 design partners Y1 (heavy discount, avg Y1 net IDR 1,8 M; Y2+ run-rate IDR 2,5 M)
- 12 new commercial logos Y2 (mix: 6 Starter, 4 Growth, 2 Enterprise)
- 25 new commercial logos Y3 (mix: 12 Starter, 8 Growth, 4 Enterprise, 1 Sovereign)
- Churn: 10% Y2, 8% Y3 (high enterprise stickiness post deploy)
- Subscription net retention: 110% (upsell add-ons)

### 6.2 Conservative scenario (IDR billion)

| Stream | Y1 | Y2 | Y3 |
|---|---|---|---|
| Deployment licenses | 6 | 28 | 78 |
| Subscriptions (recurring) | 2 | 12 | 32 |
| Professional services | 4 | 18 | 42 |
| Support add-ons | 0,5 | 4 | 12 |
| **Total revenue** | **12,5** | **62** | **164** |
| **Recurring %** | 16% | 19% | 20% |

### 6.3 Base scenario

| Stream | Y1 | Y2 | Y3 |
|---|---|---|---|
| Deployment | 9 | 45 | 130 |
| Subscriptions | 3 | 20 | 58 |
| PS | 7 | 30 | 75 |
| Support add-ons | 0,8 | 6 | 22 |
| **Total** | **19,8** | **101** | **285** |

### 6.4 Aggressive (if Danantara endorses / 1 holding-wide deal)

| Stream | Y1 | Y2 | Y3 |
|---|---|---|---|
| Deployment | 16 | 95 | 240 |
| Subscriptions | 4 | 38 | 110 |
| PS | 10 | 55 | 130 |
| Support add-ons | 1 | 10 | 38 |
| **Total** | **31** | **198** | **518** |

> **Conservative target = baseline plan.** Sales comp & investor narrative anchor here. Aggressive = upside narrative.

---

## 7. Unit Economics (per logo)

### 7.1 BUMN Enterprise logo

- Year-1 ACV ≈ IDR 12 M
- Run-rate ARR Y2+ ≈ IDR 5,4 M
- LTV (5-yr horizon, 10% churn) ≈ IDR 32 M
- CAC target ≤ IDR 6 M (50% Y1 ACV) — direct sales heavy
- **LTV/CAC target ≥ 5x**
- Payback period: < 12 months

### 7.2 Konglomerasi land-and-expand

- Initial logo Year-1 ACV ≈ IDR 8 M
- Expand to 4 anak usaha by Y3 → ARR ≈ IDR 18 M
- LTV (5-yr) ≈ IDR 80 M
- CAC: IDR 8 M (1 logo) → marginal additional ~IDR 2 M per anak usaha
- **LTV/CAC ≥ 7x**

---

## 8. Pricing Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Persepsi mahal vs. "kan ada Dify gratis" | Sales enablement: TCO model with full FTE loaded; reference UiPath benchmark |
| Anthropic drop session-hour price 50% lagi | Decouple — kami tidak sell session-hour; sell capacity tier |
| BUMN-style negotiation paksa diskon >40% | Floor pricing + walk-away discipline; gunakan PS sebagai stretch |
| FX risk (subscription pricing dalam IDR vs. cost USD ke vendor) | Hedge 50% via natural offset (lokal opex); review tahunan IDR price grid |
| Vendor lock perception → klien minta source escrow gratis | Sudah priced as add-on; refuse free escrow di bawah Sovereign tier |
| Procurement BUMN paksa unit-price per-token | Edukasi: kami bukan token reseller. Pinjam framing "platform license" seperti Oracle DB |

---

## 9. Pricing Governance

- **Quarterly review** harga grid IDR vs. USD reference + competitor moves
- **Approval matrix:**
  - Sales rep: dalam published price ± 10%
  - Sales Director: -10% to -25%
  - VP Sales: -25% to -40%
  - CEO: > -40% or non-standard structure
- **No published online price** — semua quoting via direct sales (T1 enterprise norm)
- **Reference price list** disimpan di vault, hanya dishare ke prospek setelah NDA

---

## 10. Open Questions

- [ ] Apakah perlu BYOL untuk model komersial (Claude) — gateway add-on?
- [ ] Strategi pricing kalau Telkom BigBox AI jadi default model — apakah ada revenue share?
- [ ] TKDN policy berpengaruh ke harga deployment (bila ada konten lokal premium)?
- [ ] BPK auditor — apakah harga harus published agar BUMN bisa benchmark?
- [ ] Trial / community edition gratis — yes/no? (rekomendasi: ya, Starter eval 60 hari, 5 agents max, no support)

---

## 11. References

- Anthropic Managed Agents pricing: $0.08/session-hour + token rates — https://platform.claude.com/docs/en/about-claude/pricing
- Anthropic billing analysis: https://www.finout.io/blog/anthropic-just-launched-managed-agents.-lets-talk-about-how-were-going-to-pay-for-this
- UiPath partner Indonesia pricing context: https://www.sterling-team.com/uipath-rpa-robotic-process-automation-indonesia/
- LKPP e-Katalog BUMN procurement context: https://www.lkpp.go.id/read/bu/lkpp-berhasil-membuat-lompatan-besar-dalam-pengembangan-sistem-e-katalog-dengan-mulai-melibatkan-bumn
