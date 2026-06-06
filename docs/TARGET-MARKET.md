# GATRA AI — Target Market

> **Living document.** Last reviewed: 2026-06-06. Owned by Product & Market planning track.

---

## 1. Market Segmentation Overview

Three concentric tiers, total addressable accounts ≈ **180–220 enterprise targets**:

| Tier | Description | Account count | ARPA target (Year 2) |
|------|------|---|---|
| **T1 — BUMN Strategis** | Danantara holding cluster: bank, energi, telco, infra | ~25 | IDR 8–15 M/yr |
| **T2 — BUMN Operasional + Anak Usaha** | Sisa 40 BUMN + 100+ anak usaha | ~60 | IDR 2–5 M/yr |
| **T3 — Konglomerasi Swasta** | Top 25 family conglomerates + listed group holdings | ~100 | IDR 3–8 M/yr |

**Beachhead (Year 1):** 5 design partners — 2 dari T1 (bank besar + telco), 2 dari T3 (Astra/Sinar Mas/Salim), 1 BUMN energi.

---

## 2. Tier 1 — BUMN Strategis (Danantara Cluster)

Sebanyak 65 BUMN bertahap masuk holding Danantara. Berikut breakdown sector-by-sector dengan **AI use case bernilai tinggi** per cluster.

### 2.1 Cluster Perbankan & Keuangan

| BUMN | Aset / posisi | Use case GATRA AI (long-lived agent) |
|------|------|------|
| **Bank Mandiri** | Bank terbesar by aset | • AML/CFT screening multi-day investigation<br>• Kredit korporat — agent review credit memo + bukti<br>• Rekonsiliasi nostro multi-hari<br>• Internal audit prep (ISO/SOX) |
| **BRI** | Mikro & UMKM leader | • Underwriting KUR mass-scale<br>• Branch SLA monitoring<br>• Kepatuhan POJK ke OJK reporting agent |
| **BNI** | Korporat & internasional | • Trade finance document review<br>• Sanctions screening (OFAC/EU/UN) |
| **BTN** | Perumahan | • KPR collateral verification<br>• NPL workout agent |
| **Danareksa** | Investment holding | • Portfolio risk scenario runner<br>• Quarterly board pack assembly |

**Regulator pressure:** POJK 11/2022 (Pelindungan Data Pribadi sektor jasa keuangan), SE OJK No. 21/2023 (anti pencucian uang), POJK Manajemen Risiko TI. **Semua mewajibkan data retention & processing di yurisdiksi Indonesia → on-premise wedge.**

### 2.2 Cluster Energi & Sumber Daya

| BUMN | Use case |
|---|---|
| **Pertamina** | • Procurement contract review agent (E-Katalog LKPP integration)<br>• HSE incident root-cause investigator<br>• Refinery turnaround planning copilot<br>• Trading & risk daily report |
| **PLN** | • Grid anomaly investigation agent<br>• Tarif adjustment justification memo<br>• PJBL contract drafting |
| **PGN** | • Pipeline integrity report synthesizer |
| **MIND ID** (Mining holding: Inalum, Antam, Bukit Asam, Timah, Freeport ID) | • Royalty calculation reconciliation<br>• ESG report auto-compile |
| **Geo Dipa Energi** | • Geothermal field data interpretation |

### 2.3 Cluster Telekomunikasi & Digital

| BUMN | Use case | Catatan strategis |
|---|---|---|
| **Telkom Indonesia + Telkomsel** | • Network ticket triage<br>• B2B sales proposal copilot<br>• Roaming reconciliation | **Potensi co-opetition** — Telkom BigBox AI sebagai model provider; GATRA sebagai agent runtime layer di atasnya |
| **Telkom Sigma / Infomedia** | • IT operations runbook execution agent | Channel partner candidate |

### 2.4 Cluster Infrastruktur & Konstruksi

| BUMN | Use case |
|---|---|
| **Hutama Karya, Waskita, WIKA, Adhi Karya, PP** | • Tender response auto-drafting<br>• Project cost overrun early warning<br>• Subcontractor invoice verification |
| **Jasa Marga** | • Toll incident response coordinator |
| **Angkasa Pura I & II** | • Slot allocation optimization<br>• PSC reconciliation |
| **Pelindo** | • Container manifest exception handling |

### 2.5 Cluster Asuransi & Dana Pensiun

| BUMN | Use case |
|---|---|
| **Taspen, ASABRI, BPJS Kesehatan, BPJS Ketenagakerjaan** | • Claim adjudication agent (medical, JHT, pension)<br>• Member-data PDP compliance audit |
| **Jasindo, Jasa Raharja, Askrindo** | • Underwriting + reinsurance memo review |

### 2.6 Cluster Pangan & Pertanian

| BUMN | Use case |
|---|---|
| **Bulog, RNI/ID Food, PTPN III** | • Supply chain anomaly agent<br>• Komoditas price intelligence digest |

---

## 3. Tier 3 — Konglomerasi Swasta

Top 25 keluarga konglomerasi yang relevan untuk GATRA AI. Diutamakan grup dengan **(a) regulated subsidiary** (bank, asuransi, telco), **(b) >5 anak usaha skala enterprise**, **(c) inisiatif AI internal sudah dimulai**.

### 3.1 Tier-A targets (5 grup paling siap)

| Grup | Anak usaha kunci | Use case wedge |
|---|---|---|
| **Salim Group** | Indofood, Indomobil, BCA-related, DCI Indonesia (data center), PIK 2 | • Supply chain across F&B brands<br>• DCI sebagai partner infra deploy<br>• Property — KYC tenant |
| **Sinar Mas** | BCA (Hartono terpisah — koreksi: Sinar Mas = Widjaja; BCA = Djarum/Hartono), APP, Sinarmas Land, Smart Tbk, Sinarmas Mining, **SMX01 data center 18-60 MW (semester 2 2026)** | • Pulp/paper plant OEE reporting<br>• Property leasing contract analyzer<br>• SMX01 = potential GATRA infra partner |
| **Djarum / Hartono Group** | **BCA**, Polytron, Sampoerna Strategic, Grand Indonesia, GDP Venture (Blibli, Tiket.com, Kaskus) | • BCA mass-personalization (sensitive!)<br>• GDP digital portfolio internal IT |
| **Astra International** | Astra Otoparts, AHM, Toyota Astra, Astra Financial (AstraPay, FIF), United Tractors, Astra Agro | • Dealer compliance review<br>• Multifinance underwriting<br>• Heavy-equipment service-report mining |
| **Lippo Group** | Siloam Hospitals, Lippo Karawaci, Lippo Insurance, Multipolar | • Hospital clinical doc summarization<br>• Property leasing automation |

### 3.2 Tier-B targets (next 10)

| Grup | Focus |
|---|---|
| **CT Corp** | Bank Mega, Detik, Transmart, Trans TV → cross-sector data agent |
| **MNC Group** | Media + finance + property |
| **Bakrie Group** | Energi (Bumi Resources), property, telco |
| **Gudang Garam / Surya Wonowidjojo** | Manufacturing |
| **Mayapada Group / Tahir** | Bank Mayapada, hospital, retail |
| **Emtek / EMTK** | Vidio, BCA-fintech, OVO → big digital play |
| **Triputra Group / Pangestu** | Multi-industry, Adaro-related |
| **Adaro Group / Thohir** | Energi, infrastruktur |
| **Royal Golden Eagle (RGE) / Tanoto** | Pulp & paper, palm oil — Singapore HQ caveat |
| **Para Group / Chairul Tanjung** (overlap CT Corp) | Already counted |
| **Maspion Group** | Manufacturing Surabaya |
| **Wings Group** | FMCG |
| **Mayora** | F&B |
| **Kalbe** | Pharma → regulated |
| **Indofarma + Kimia Farma (BUMN)** | Cross to T1 |

### 3.3 Tier-C: 100+ mid-conglomerates

Listed holdings dengan revenue > IDR 5T, contoh: Kawan Lama, Erajaya, ACE Hardware, MAP, Sumber Alfaria, Tower Bersama, XL Axiata (parent Axiata-Malaysia caveat), Indosat (Ooredoo-Qatar caveat).

---

## 4. Use Case Library (cross-cutting, deeper detail)

### 4.1 Banking & Financial Services

1. **AML/CFT continuous investigation agent** — feeds dari core banking + transaction monitoring, agent investigasi >3 hari, hasilkan SAR draft. UU TPPU 8/2010 + PPATK rule.
2. **Credit memo synthesis** — agent baca laporan keuangan + bank statement + collateral docs → draft memo kredit ke komite.
3. **POJK reporting agent** — quarterly + ad-hoc OJK request agent compile + reconcile.
4. **Internal audit prep** — agent walk through control test, capture evidence, draft finding memo.

### 4.2 Energy & Mining

1. **HSE near-miss investigation** — agent baca incident log, foto, statement → root cause + corrective action draft.
2. **Procurement contract redline** — vendor draft kontrak; agent compare ke standard template, highlight deviation.
3. **Royalty & DMO reconciliation** — multi-source, multi-month — class of work yang RPA tidak bisa karena butuh judgment.

### 4.3 Telco & Digital

1. **NOC tier-2 triage agent** — runbook execution + escalation.
2. **B2B sales engineer assist** — agent draft TSD, BOM, pricing dari requirement RFP.

### 4.4 Manufacturing / Conglomerate horizontals

1. **Supply chain exception** — late shipment, quality fail, agent investigate dan re-plan.
2. **Internal audit / SOX-style** — agent walk control + test sample.
3. **HR — letter generation & policy Q&A** — long-running compliance Q&A.
4. **Legal contract review** — NDA, MSA, distribution agreement.
5. **Tax return assembly** — agent gather transaksi, hitung PPh/PPN, draft SPT.

### 4.5 Healthcare (Lippo Siloam, BUMN hospitals, Kalbe)

1. **Discharge summary draft** — patient record → discharge letter (regulated, draft only, dokter approve).
2. **Insurance claim adjudication agent** — match medical record vs policy benefit table.

---

## 5. Buying Process per Segment

### 5.1 BUMN Buying Process (T1, T2)

```
[1] Initiation — CIO/CDO atau direktur transformasi digital floats kebutuhan
        ↓
[2] Internal Need Memo — Direktur Operasi/Direktur Keuangan endorsement
        ↓
[3] Kajian Strategis — biasanya direkomendasikan via Komite Manajemen Risiko TI
        ↓
[4] Procurement Method Decision:
        a. PBJ via internal procurement BUMN (Permen BUMN PER-2/MBU/3/2023)
        b. E-Katalog LKPP — sejak 2023 BUMN mulai pakai e-katalog (Pertamina pilot)
        c. Pengadaan langsung (di bawah threshold, ~IDR 200jt-2M tergantung BUMN)
        d. Tender terbuka (di atas threshold)
        ↓
[5] Vendor Eligibility:
        - TKDN (Tingkat Komponen Dalam Negeri) — GATRA harus ≥40% TKDN
        - Sertifikat ISO 27001, SOC2 / setara
        - Lokal-incorporated PT (bukan BUT)
        - Pengalaman proyek serupa (referensi BUMN lain)
        ↓
[6] Technical Evaluation — biasanya RFI → RFP → POC (1-3 bulan)
        ↓
[7] Commercial Negotiation — termasuk klausa BPK audit
        ↓
[8] Kontrak — Tahun jamak butuh persetujuan tambahan
        ↓
[9] Onboarding — Mandatory SLA, Berita Acara Serah Terima
```

**Realistic timeline:** 6-14 bulan dari initiation ke kontrak signed untuk BUMN T1.

**Approval thresholds (PMK 71/2024 + Permen BUMN):**
- < IDR 200jt: Pejabat Pengadaan
- IDR 200jt – 2.5M: Panitia Pengadaan, Direksi
- > IDR 2.5M: Tender + Dewan Komisaris awareness
- > IDR 25M: RUPS / Pemegang Saham (Danantara level)

### 5.2 Konglomerasi Buying Process (T3)

Lebih cepat, family-owned often:

```
[1] Champion Identification — CIO grup, atau head of digital di holding
        ↓
[2] Pitch ke Family Office / Holding ExCom
        ↓ (1-3 bulan)
[3] POC di 1 anak usaha "lighthouse"
        ↓ (2-3 bulan)
[4] Decision oleh family principal — bisa cepat kalau strategic buy-in
        ↓
[5] Roll-out fee mass deployment lintas anak usaha
```

**Realistic timeline:** 3-6 bulan ke kontrak pertama, kemudian rapid expansion intra-grup.

---

## 6. Decision Makers Map

### 6.1 BUMN T1

| Role | Influence | What they care about |
|------|------|------|
| **Direktur Utama** | Approver IDR >25M | Strategic narrative, kedaulatan, board defense |
| **Direktur Digital & TI / CIO** | Champion | Architecture fit, integrasi sistem |
| **Chief Risk Officer** | Veto | Compliance UU PDP, POJK, BSSN |
| **Internal Audit Head** | Veto | Auditability, log retention |
| **Direktur Keuangan / CFO** | Approver | TCO, IDR vs USD, capex/opex split |
| **Head of Procurement** | Process owner | TKDN, PBJ rules, vendor history |
| **Komisaris (Independen)** | Strategic input | Reputasi vendor, governance |
| **Danantara Investment Committee** | (untuk pembelian besar) | Sovereign alignment |

### 6.2 Konglomerasi T3

| Role | Influence | What they care about |
|------|------|------|
| **Family principal / 2nd-gen heir** | Final say | Brand value, future-proof |
| **Group CIO** | Champion | Cross-subsidiary leverage |
| **CEO anak usaha lighthouse** | POC sponsor | ROI cepat di unit-nya |
| **CFO grup** | Budget guard | Volume discount lintas anak usaha |

---

## 7. Geographic & Regulatory Cuts

- **Jakarta-Tangerang-Bekasi-Bandung corridor** = 80% target accounts → fokus go-to-market di sini Year 1.
- **Surabaya** — manufacturing belt (Maspion, Wings, Mayora) — Year 2.
- **Medan, Pekanbaru** — palm oil, energy — Year 2.
- **Balikpapan, Makassar** — energi & port — Year 3.

**Regulatory anchors per sector:**
- Bank: **OJK** (POJK 11/2022, POJK Manajemen Risiko TI), Bank Indonesia (sistem pembayaran)
- Asuransi: OJK + PPATK
- Telco: **Kominfo / Komdigi** (PSE registration, UU PDP)
- Energi: **ESDM, BPH Migas**
- Kesehatan: **Kemenkes** (rekam medis elektronik PMK 24/2022)
- Cross-sector: **BSSN** (Sistem Elektronik strategis), **Komdigi** (UU PDP enforcement), **Danantara** (kebijakan kedaulatan).

---

## 8. Beachhead Strategy — Year 1 (Q3 2026 → Q2 2027)

**Goal:** 5 paying design partners, 1 lighthouse case study per sector vertical.

| Quarter | Milestone |
|---|---|
| Q3 2026 | 2 design partners signed (target: 1 bank + 1 konglomerasi anak usaha) |
| Q4 2026 | 2 more (target: 1 BUMN energi + 1 telco-related) |
| Q1 2027 | 1 lighthouse use-case case study published per partner |
| Q2 2027 | First Danantara/OJK-level validation event |

**Pricing posture:** heavy discount (50-70%) untuk 5 design partners — exchange for case study rights, reference call participation, and roadmap input.

---

## 9. Channel Strategy

| Channel | Role | Year |
|---|---|---|
| **Direct sales** | T1 BUMN, T3 Tier-A grup | Y1+ |
| **Sistem Integrator (SI) lokal** — Mitra Integrasi Informatika (MII), Multipolar, Sigma Cipta Caraka, Telkomsigma | Implementasi & support | Y2+ |
| **Big-4 consultancy** (Deloitte, EY, PwC, KPMG Indonesia) | Advisory-led entry ke C-suite | Y2+ |
| **Telkom Solution / BigBox AI** | Possible OEM/partner — Telkom sells the bundle (compute + GATRA + BigBox model) | Y2 explore |
| **Akademia / asosiasi** (ABDI, MASTEL, IADI) | Awareness | Y1+ |

---

## 10. Open Questions

- [ ] Apakah pursue Danantara-level master agreement (akselerator) atau bottom-up per BUMN?
- [ ] Stance Telkom BigBox AI: kompetitor atau OEM partner?
- [ ] TKDN strategy — bagaimana kami calculate komponen lokal kalau base OpenClaw dari upstream global?
- [ ] Risk concentration: 5 design partners di mana? Hindari semua satu sektor.

---

## 11. References

- Daftar BUMN Danantara: https://www.tempo.co/ekonomi/cek-daftar-perusahaan-bumn-yang-masuk-danantara-1225912
- Daftar konglomerasi: https://www.investasiku.id/eduvest/bisnis/perusahaan-konglomerasi
- LKPP e-Katalog BUMN: https://www.lkpp.go.id/read/bu/lkpp-berhasil-membuat-lompatan-besar-dalam-pengembangan-sistem-e-katalog-dengan-mulai-melibatkan-bumn
- UU PDP guide: https://www.recordinglaw.com/world-laws/world-data-privacy-laws/indonesia-data-privacy-laws/
- Telkom transformasi digital BUMN: https://www.bloombergtechnoz.com/detail-news/109263/telkom-solution-percepat-transformasi-digital-bumn
- Danantara holding update: https://www.cnbcindonesia.com/research/20260213111541-128-710959/ini-daftar-lengkap-holding-danantara-anak-usaha-bumn
