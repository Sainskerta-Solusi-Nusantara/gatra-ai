# TOP 10 Produk SSN — Fork MIT + Signature Feature Original

> **Strategi:** Ambil MIT project → Fork → Tambah SIGNATURE FEATURE → Produk SSN sendiri.
> Bukan integrasi. Bukan plugin. Produk **standalone** dengan original flow.
> Target: BUMN/Konglomerasi Indonesia — on-premise, PDP compliant.

---

## 1. DOKUMENKU — RAG Knowledge Base Enterprise

**Base:** Dify (Apache 2.0) — https://github.com/langgenius/dify
**Signature Feature:** **Audit-Compliant RAG Engine**
**Dev Effort:** 6 minggu
**Target:** BUMN dengan departemen banyak (Telkom, Bank BUMN)

### Signature Feature — Alur Original:

```
User upload dokumen → Classifier otomatis per departemen
  ↓
Dokumen masuk RAG sesuai department (HRD → HRD vector)
  ↓
Staff IT tanya → cuma dapet jawaban dari dokumen IT
  ↓
Staff HRD tanya → cuma dapet jawaban dari dokumen HRD
  ↓
AUDIT LOG: siapa, kapan, query apa, dokumen mana → export PDF
```

### Fitur tambahan:
- **Departemen-based vector isolation** — data departemen A tidak tercampur B
- **Audit PDF auto-generate** — tiap query terekam: timestamp, user, query, dokumen sumber
- **Upload berantai** — upload 1 folder → otomatis terdistribusi ke departemen yg sesuai
- **PDP compliant** — data tidak keluar server. Vector DB di server sendiri (Qdrant/Milvus)

### Use Case BUMN:
- Bank BUMN: 500rb dokumen kebijakan → staff IT tanya SOP server, staff finance tanya aturan pajak
- PLN: dokumen teknis pembangkit → engineer tanya prosedur maintenance

### Revenue Model:
- Deployment fee: Rp 200-400jt
- Subscription: Rp 25-50jt/bln (per 1TB storage)
- Audit export: Rp 5jt/bulan (fitur premium)

---

## 2. ARSIPIN — Document Management + OCR Enterprise

**Base:** Paperless-ngx (GPL 3.0) — https://github.com/paperless-ngx/paperless-ngx
**Signature Feature:** **AI Department Auto-Router + Disposisi Digital**
**Dev Effort:** 4 minggu
**Target:** BUMN dengan arsip fisik besar (Pertamina, BPJS, POM)

### Signature Feature — Alur Original:

```
Scan dokumen masuk (fisik/PDF)
  ↓
AI baca isi → tentukan jenis: kontrak, invoice, memo, SK
  ↓
AI tentukan tujuan departemen + jabatan yg perlu disposisi
  ↓
Auto-route ke folder departemen yg tepat
  ↓
Notif ke PIC: "Dokumen kontrak IT dari Vendor X menunggu disposisi"
  ↓
PIC disposisi digital → auto-arsip + audit trail
```

### Fitur tambahan:
- **OCR Indonesia** — KTP, NPWP, Akta, Ijazah → ekstrak data otomatis
- **Disposisi workflow** — dokumen mengalir sesuai struktur organisasi
- **Retensi otomatis** — aturan berapa lama simpan, kapan musnahkan
- **Tanda tangan digital** — integrate dengan TTE Kominfo

### Use Case BUMN:
- Pertamina: 10rb kontrak vendor/thn → AI klasifikasi + arsip + reminder expiry
- BPJS: jutaan dokumen klaim → auto-routing ke petugas yg tepat

### Revenue Model:
- Deployment: Rp 150-300jt
- Subscription: Rp 15-30jt/bln
- OCR add-on: Rp 5jt/bulan/10rb dokumen

---

## 3. REKAPIN — Executive BI + Auto Reporting

**Base:** Apache Superset (Apache 2.0) — https://github.com/apache/superset
**Signature Feature:** **Tanda Tangan Digital Auto-Report Scheduler**
**Dev Effort:** 8 minggu
**Target:** C-level BUMN yang butuh laporan periodik

### Signature Feature — Alur Original:

```
Manager/Direktur set jadwal: "Laporan keuangan setiap Senin jam 8"
  ↓
Auto-generate dashboard → Export PDF form consulting
  ↓
TTE digital otomatis (Kominfo PKI) atau manual review
  ↓
Kirim ke email + WA direktur + grup departemen
  ↓
Arsip laporan + audit log siapa yang lihat
```

### Fitur tambahan:
- **Jadwal export** — PDF/Excel per jam, hari, bulan
- **TTE Otomatis** — integrate dengan TTE Kominfo, BSSE
- **Comparative view** — "Bandingkan budget Q2 tahun ini vs tahun lalu"
- **Executive summary** — AI bikin ringkasan 1 paragraf dari 10 chart

### Use Case BUMN:
- Dirut minta laporan progress digitalisasi setiap bulan → auto-generate + auto-TTE
- CFO minta cashflow report tiap Jumat jam 5 → schedule + kirim

### Revenue Model:
- Deployment: Rp 300-500jt
- Subscription: Rp 30-60jt/bln
- TTE integration: Rp 10jt/bln

---

## 4. APPROVALIN — Low-Code Database + Approval Workflow

**Base:** NocoDB (GPL 3.0) — https://github.com/nocodb/nocodb
**Signature Feature:** **Approval Workflow per Field**
**Dev Effort:** 6 minggu
**Target:** Departemen yang butuh approval berjenjang

### Signature Feature — Alur Original:

```
HRD buat spreadsheet: "Data lembur bulan ini"
  ↓
Staff input → field lembur kena kunci
  ↓
Manager setujui → budget field terbuka
  ↓
Finance review → payment field siap
  ↓
Direktur setujui → final
  ↓
Selesai: data tidak bisa diubah lagi (immutable log)
```

### Fitur tambahan:
- **Row-level security** — staff lihat data sendiri, manager lihat tim, direktur lihat semua
- **Approval chain builder** — drag & drop: siapa setujui apa sebelum field terbuka
- **Audit trail field-level** — lihat histori tiap field
- **Integrasi WhatsApp** — "Menyetujui? Balas YES / NO"

### Use Case BUMN:
- HRD input lembur 500 karyawan → supervisor → manager → finance
- Procurement: PO → manager → direktur → finance

### Revenue Model:
- Deployment: Rp 150-300jt
- Subscription: Rp 20-40jt/bln
- Approval chain add-on: Rp 10jt/bln

---

## 5. PANELIN — Internal Dashboard Builder + RBAC

**Base:** Appsmith (Apache 2.0) — https://github.com/appsmithorg/appsmith
**Signature Feature:** **Jabatan-based Access & Page Design**
**Dev Effort:** 6 minggu
**Target:** Departemen yang butuh dashboard internal

### Signature Feature — Alur Original:

```
Bikin 1 dashboard → otomatis ter-copy per departemen
  ↓
Tiap departemen cuma lihat DATA departemen sendiri
  ↓
Staff: view only
Manager: view + edit
Direktur: view all
  ↓
Page auto-hide: menu yang bukan wewenang tidak muncul
```

### Fitur tambahan:
- **Page auto-filter** — satu dashboard untuk 10 departemen: masing-masing lihat versi sendiri
- **Role-based component** — tombol "Approval" cuma muncul untuk manager+
- **WhatsApp push** — data tertentu auto-kirim ke WA
- **Mobile responsive** — staff lapangan pake HP

### Use Case BUMN:
- Dashboard kinerja per departemen — IT lihat uptime, HRD lihat absensi
- Dashboard produksi per unit — masing-masing unit lihat KPI sendiri

### Revenue Model:
- Deployment: Rp 200-400jt
- Subscription: Rp 25-50jt/bln
- Page add-on: Rp 5jt/page

---

## 6. MONITORIN — Infrastructure + SLA Monitoring

**Base:** Grafana (Apache 2.0) + Prometheus (Apache 2.0)
**Signature Feature:** **SLA Auto-Escalation & Incident Manager**
**Dev Effort:** 6 minggu
**Target:** IT BUMN (Telkom, PLN, Angkasa Pura)

### Signature Feature — Alur Original:

```
Monitor 100 server → salah satu down > 5 menit
  ↓
Auto-diagnosis: cek log, cek disk, cek network
  ↓
Buat tiket + assign ke tim IT + notif WA
  ↓
30 menit unresolved → eskalasi ke supervisor
  ↓
1 jam unresolved → eskalasi ke manager + direktur IT
  ↓
Auto-create post-mortem report
```

### Fitur tambahan:
- **SLA calculator** — hitung downtime, availability, MTTR, MTBF
- **Auto-ticketing** — incident → langsung tiket + assign
- **Eskalasi otomatis** — waktu eskalasi bisa diatur per SLA

### Use Case BUMN:
- Telkom: monitor 10rb node jaringan → SLA 99.9%
- PLN: monitor grid + trafo → auto-escalation

### Revenue Model:
- Deployment: Rp 200-400jt
- Subscription: Rp 25-50jt/bln (per 100 node)

---

## 7. PDFIN — Enterprise PDF Toolkit

**Base:** Stirling-PDF (GPL 3.0) — https://github.com/Frooodle/Stirling-PDF
**Signature Feature:** **Digital Signature Kominfo + OCR Indonesia**
**Dev Effort:** 3 minggu
**Target:** Legal & Admin BUMN

### Signature Feature — Alur Original:

```
Upload PDF → Pilih jenis dokumen
  ↓
AI tentukan posisi tanda tangan (sesuai template kontrak)
  ↓
TTE dengan sertifikat Kominfo / BSSE
  ↓
Auto-watermark: "Telah Ditandatangani Secara Elektronik"
  ↓
Arsip + hash SHA-256 + timestamp BSSN
```

### Fitur tambahan:
- **OCR PDF Indonesia** — scan kontrak → text searchable
- **PDF stamp** — cap instansi otomatis
- **Merge + split** — batch processing
- **Audit trail** — siapa akses PDF apa

### Use Case BUMN:
- Legal: 200 kontrak/vendor/thn → TTE massal
- HRD: SK karyawan → TTE direktur → kirim ke karyawan

### Revenue Model:
- Deployment: Rp 75-150jt
- Subscription: Rp 10-25jt/bln
- TTE add-on: Rp 5jt/bulan

---

## 8. TRANSKIPIN — Meeting-to-Action Auto Transcriber

**Base:** Whisper (MIT) — https://github.com/openai/whisper (via faster-whisper)
**Signature Feature:** **Meeting-to-Action Item Extractor**
**Dev Effort:** 4 minggu
**Target:** Semua BUMN yang sering rapat

### Signature Feature — Alur Original:

```
Rekam rapat / upload audio
  ↓
Whisper transkrip → bahasa Indonesia + Inggris
  ↓
AI ekstrak: Siapa bilang apa? Siapa ditugasi apa? Deadline?
  ↓
Auto-create: Action item per peserta
  ↓
Kirim notulensi ke WA grup + email peserta
  ↓
Tracking: "Action item Budi belum selesai +2 hari"
```

### Fitur tambahan:
- **Speaker diarization** — bedain siapa bicara
- **Action item tracker** — dari transkrip → jadi task yang bisa difollow
- **Bahasa daerah support** — Jawa, Sunda (fine-tune Whisper)
- **Minutes automation** — 1 jam rapat → 5 menit baca notulensi

### Use Case BUMN:
- Rapat mingguan direksi → auto action item → tracking di dashboard
- Rapat teknis proyek → distribusi task ke masing-masing PIC

### Revenue Model:
- Deployment: Rp 150-300jt
- Subscription: Rp 20-40jt/bln
- Speaker diarization add-on: Rp 10jt/bln

---

## 9. WORKIN — Human-in-the-Loop Workflow Engine

**Base:** n8n (Sustainable Use License / custom) — https://github.com/n8n-io/n8n
→ Alternatif: Temporal (MIT) — https://github.com/temporalio/temporal
**Signature Feature:** **Human-in-the-Loop Approval Node**
**Dev Effort:** 8 minggu
**Target:** BUMN dengan workflow approval berjenjang

### Signature Feature — Alur Original:

```
Trigger: Karyawan ajukan cuti
  ↓
Workflow berjalan otomatis
  ↓
Sampai node "Approval Manager"
  ↓
Workflow PAUSE → kirim WA ke manager: "Setujui cuti Budi?"
  ↓
Manager balas "YES" → workflow lanjut ke HRD
  ↓
HRD terima notif → proses cuti
  ↓
Workflow complete → log ke database
```

### Fitur tambahan:
- **WA/Telegram approval** — balas YES/NO di chat
- **Timeout & eskalasi** — manager tidak balas 24 jam → eskalasi ke direktur
- **SLA per node** — tiap step punya batas waktu
- **Audit trail** — workflow history per instance

### Use Case BUMN:
- Cuti: staff → manager → HRD → selesai
- Pengadaan: staff → supervisor → manager → direktur → finance
- Claim asuransi: nasabah → CS → verifikator → manager → approve

### Revenue Model:
- Deployment: Rp 250-500jt
- Subscription: Rp 30-60jt/bln
- Workflow add-on: Rp 10jt/10 workflow

---

## 10. TASKIN — Enterprise Project Resource Manager

**Base:** Plane (Apache 2.0) — https://github.com/makeplane/plane
**Signature Feature:** **Resource-based Auto-Assignment**
**Dev Effort:** 8 minggu
**Target:** BUMN dengan project besar dan banyak orang

### Signature Feature — Alur Original:

```
PM bikin task: "Migrasi server 50 unit"
  ↓
System cek: Siapa yang available? Siapa yang skill-nya cocok?
  ↓
Auto-assign ke orang dengan beban kerja paling ringan
  ↓
Notif ke orang + PM: "Task assigned to Budi (35% capacity)"
  ↓
Budi progress → otomatis update dashboard PM
  ↓
Nek deadline mepet → auto-eskalasi ke manager
```

### Fitur tambahan:
- **Skill tagging** — setiap task butuh skill tertentu → assign otomatis
- **Workload balancer** — lihat siapa overload, siapa idle
- **Gantt chart + dependency** — task A harus selesai sebelum task B mulai
- **Laporan produktivitas per orang** — siapa lembur, siapa on-time

### Use Case BUMN:
- Proyek migrasi IT: 10 staff → auto-assign task by skill + capacity
- Proyek pembangunan: arsitek, engineer, kontraktor → timeline terintegrasi

### Revenue Model:
- Deployment: Rp 200-400jt
- Subscription: Rp 25-50jt/bln (per 100 users)

---

## SUMMARY — Prioritas Produk SSN

| # | Produk | Base | Signature Feature | Dev | Revenue/bln | Prioritas |
|---|---|---|---|---|---|---|
| 1 | DOKUMENKU | Dify | Audit RAG + dept isolation | 6 minggu | Rp 30-55jt | **P0** |
| 2 | ARSIPIN | Paperless-ngx | AI Router + Disposisi | 4 minggu | Rp 20-35jt | **P0** |
| 3 | REKAPIN | Superset | Auto-TTE Report | 8 minggu | Rp 40-70jt | **P0** |
| 4 | APPROVALIN | NocoDB | Field-level approval | 6 minggu | Rp 30-50jt | **P1** |
| 5 | PANELIN | Appsmith | Jabatan-based UI | 6 minggu | Rp 30-55jt | **P1** |
| 6 | MONITORIN | Grafana | SLA auto-escalation | 6 minggu | Rp 30-55jt | **P1** |
| 7 | PDFIN | Stirling-PDF | TTE Kominfo | 3 minggu | Rp 15-30jt | **P2** |
| 8 | TRANSKIPIN | Whisper | Meeting-to-Action | 4 minggu | Rp 20-40jt | **P2** |
| 9 | WORKIN | n8n/Temporal | HITL Approval Node | 8 minggu | Rp 40-70jt | **P2** |
| 10 | TASKIN | Plane | Auto-assign by skill | 8 minggu | Rp 30-55jt | **P3** |

## Total Revenue Potensial (langganan):
- Minimum: Rp 285jt/bulan (10 produk)
- Maksimum: Rp 515jt/bulan (10 produk)
- + Deployment fee: Rp 1.9-3.5M (one time)

## Strategi Go-to-Market:
1. **Bulan 1-3:** Produk P0 (DOKUMENKU + ARSIPIN + REKAPIN) → pilot 1 BUMN
2. **Bulan 3-6:** P1 + P2 → deploy ke 3 BUMN
3. **Bulan 6-12:** All 10 produk → scale ke 10 BUMN + Konglomerasi
