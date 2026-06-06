# 10 Proyek AI Open-Source (MIT/Apache 2.0/BSD) untuk SSN

**Konteks**: Strategi produk SSN (Solusi Sembilan Nusantara) — membangun *Integrated Enterprise AI Suite* on-premise untuk BUMN dan Konglomerasi Indonesia, dengan **GATRA AI** sebagai *control plane*.

**Tanggal**: 2026-06-06
**Status**: Strategi produk, belum eksekusi
**Audiens**: Tim engineering & product SSN

---

## Ringkasan Eksekutif

GATRA AI sudah memiliki fondasi: **goal-executor**, **RBAC**, **template katalog (130 use case × 9 departemen)**, **scope enforcement (content-based + prompt-level)**, dan **self-hostable deployment**. Ini adalah *control plane* — orkestrasi, otorisasi, kebijakan, dan UI.

Yang belum dimiliki: *data plane* dan *capability layer* — RAG, OCR, visualisasi, observabilitas, dst. Membangun semuanya dari nol akan memakan 18-24 bulan. **Solusi**: fork proyek open-source berlisensi permisif (MIT/Apache 2.0/BSD), brand ulang sebagai bagian dari SSN Suite, integrasikan ke GATRA AI sebagai *backend services*.

**Mengapa lisensi permisif penting untuk SSN**:
- BUMN sering meminta **source code escrow** dan **modifikasi proprietary** — AGPL/SSPL/BSL akan memaksa SSN membuka kode hasil enhancement.
- SSN harus dapat **menjual lisensi enterprise** atas binary hasil fork. MIT/Apache 2.0/BSD memungkinkan hal ini tanpa kewajiban *copyleft*.
- BUMN/Konglomerasi sering meminta **air-gapped deployment** — lisensi permisif memudahkan pembuatan installer offline tanpa beban kepatuhan terhadap *upstream license server*.

**Anti-pola yang dihindari** (proyek populer tapi BUKAN untuk SSN):
- ❌ **n8n** — *Sustainable Use License*, bukan OSI-approved, restriksi komersial.
- ❌ **Ultralytics YOLOv8** — AGPL-3.0, akan memaksa SSN buka source.
- ❌ **Wazuh, Wiki.js, Khoj, Logseq, Metabase** — AGPL.
- ❌ **HashiCorp Vault, Consul, Terraform (≥1.6)** — BSL, restriksi *competitive use*.
- ❌ **MongoDB, Elasticsearch (≥7.11), Redis (≥7.4)** — SSPL/RSAL/AGPL, restriksi *managed service*.

---

## Pemetaan ke Stack GATRA AI

```
┌────────────────────────────────────────────────────────────┐
│  GATRA AI (sudah ada)                                       │
│  ├── Goal Executor   ── orkestrasi tugas                    │
│  ├── RBAC + Scope    ── kepatuhan & isolasi data            │
│  ├── Template Catalog ── 130 use case × 9 dept              │
│  └── Dashboard       ── UI manajemen                         │
└────────────────────┬───────────────────────────────────────┘
                     │ (memanggil via internal API)
                     ▼
┌────────────────────────────────────────────────────────────┐
│  SSN Capability Layer (yang akan di-fork)                   │
│                                                              │
│  P0  ├── LlamaIndex          ── RAG / Q&A                   │
│  P0  ├── Docling             ── parsing dokumen             │
│  P0  ├── Langfuse            ── observabilitas LLM          │
│  P1  ├── Apache Superset     ── BI / dashboard data         │
│  P1  ├── Temporal            ── workflow long-running       │
│  P1  ├── AnythingLLM         ── knowledge base UI           │
│  P2  ├── Whisper.cpp         ── speech-to-text              │
│  P2  ├── Supervision (Roboflow) ── computer vision        │
│  P2  ├── Rocket.Chat         ── chatbot enterprise          │
│  P3  └── Open Policy Agent (OPA) ── compliance engine     │
└────────────────────────────────────────────────────────────┘
```

---

## #1 — LlamaIndex (RAG / Document Q&A) — **P0**

| Atribut       | Nilai |
|---------------|-------|
| GitHub        | https://github.com/run-llama/llama_index |
| Lisensi       | **MIT** |
| Bahasa        | Python |
| Stars (≈)     | 35.000+ |
| Maintainer    | LlamaIndex Inc. (komersial, tapi lisensi MIT bersih) |

### Apa fungsinya
*Framework* RAG (Retrieval-Augmented Generation) lengkap: *document loaders* (200+ konektor), *chunking strategies*, *vector store abstractions*, *query engines*, *agent loops*, dan *evaluators*. Mendukung *sub-question decomposition*, *hierarchical retrieval*, *recursive retrieval*, dan *router queries* — superior dibanding LangChain untuk kasus *enterprise Q&A* yang kompleks.

### Mengapa bernilai untuk BUMN
- BUMN punya **jutaan dokumen warisan** (SK, kontrak, laporan tahunan, peraturan internal). Mereka **butuh RAG yang akurat**, bukan demo.
- LlamaIndex mendukung **citation-grounded answers** — wajib untuk audit Inspektorat/BPK.
- Konektor SAP, Oracle, SharePoint, Confluence — sesuai realita IT BUMN.
- Bisa dijalankan **fully on-premise** dengan model lokal (Llama 3, Qwen, Sahabat-AI).

### Integrasi ke GATRA AI
- GATRA `goal-executor` memanggil LlamaIndex sebagai *tool* via internal HTTP API.
- Template katalog GATRA (mis. *"Ringkas kontrak vendor"*) → di-route ke *query engine* LlamaIndex tertentu sesuai dept.
- **Scope enforcement GATRA** (yang sudah ada) menyaring dokumen sebelum di-retrieve berdasarkan `user.department × document.classification` — mencegah data Treasury bocor ke staff Marketing.
- Citation hasil retrieval ditampilkan di dashboard sebagai *audit trail*.

### Enhancement yang dibutuhkan
1. **Konektor lokal**: SiPENA (BUMN), JDIH, OSS (Online Single Submission), Aplikasi Sakti, e-Office Kementerian. Tidak ada di upstream.
2. **Indonesian re-ranker**: fine-tune *cross-encoder* (mis. `indobert-base-p2`) sebagai *re-rank stage*. Re-ranker default (Cohere/Jina) hosted = tidak boleh untuk air-gapped.
3. **PII redactor pre-indexing**: NIK, NPWP, nomor rekening — di-mask sebelum embed.
4. **Vector store sovereignty layer**: bungkus Qdrant/Weaviate sehingga *vector data* dapat dipindahkan antar-VM tanpa re-embed.
5. **Caching layer multi-tenant**: anak perusahaan A tidak boleh melihat cache jawaban anak perusahaan B.

### Effort: **8 minggu** (2 senior engineer)

### Risiko
- LlamaIndex sering melakukan *breaking change* setiap 4-6 minggu. SSN harus **fork pada commit yang stabil** dan *rebase* terkontrol — bukan track main.

---

## #2 — Docling (Document Processing / OCR) — **P0**

| Atribut       | Nilai |
|---------------|-------|
| GitHub        | https://github.com/DS4SD/docling |
| Lisensi       | **MIT** |
| Bahasa        | Python |
| Stars (≈)     | 20.000+ |
| Maintainer    | IBM Research |

### Apa fungsinya
*Pipeline* parsing dokumen kelas enterprise: PDF (termasuk yang scan), DOCX, PPTX, HTML, image. **Mengekstrak struktur** — tabel, heading, daftar, *reading order* — bukan sekadar teks mentah. Dilatih dengan *layout-aware models* (TableFormer, DocLayNet) hasil riset IBM. Output **struktur Markdown/JSON** yang siap di-chunk untuk RAG.

### Mengapa bernilai untuk BUMN
- Dokumen BUMN didominasi **PDF scan tabel keuangan** dan **form pemerintah**. *Plain text extraction* (PyPDF) gagal pada >60% dokumen ini.
- Docling **memahami tabel kompleks** (multi-header, merged cells) — kritis untuk parsing Laporan Keuangan Tahunan, SPT, dan dokumen audit BPK.
- IBM Research = **track record riset** yang lebih bisa diaudit dibanding startup OCR.
- Alternatif (Unstructured.io) sebagian besar berlisensi MIT tapi *table extraction*-nya inferior untuk dokumen Indonesia.

### Integrasi ke GATRA AI
- GATRA template *"Analisis kontrak vendor"* → upload PDF → Docling parse → tabel diekstrak menjadi *structured rows* → diteruskan ke LlamaIndex untuk Q&A.
- *Long session memory* GATRA menyimpan hasil parsing sebagai *checkpoint* — tidak perlu re-parse setiap percakapan.
- Hasil parsing → input ke Superset (BI) untuk visualisasi otomatis.

### Enhancement yang dibutuhkan
1. **OCR Bahasa Indonesia**: Docling default pakai EasyOCR. Tambah PaddleOCR + fine-tune untuk **font khas dokumen pemerintah** (Times New Roman 11, Arial Narrow 10, *carbon copy* legacy).
2. **Recognizer KTP/NPWP/SIM/Paspor**: parser khusus dokumen ID Indonesia + auto-redact untuk RAG.
3. **Stempel & tanda tangan detector**: penting untuk validasi keabsahan dokumen BUMN (mis. SK Direksi). Output flag `signed: true/false`.
4. **Form aplikasi pemerintah parser**: SPT 1770, Formulir BPJS, dokumen DJP — *template-based extraction*.
5. **Performance**: Docling lambat (~10-30 detik/halaman pada CPU). SSN perlu **batch worker pool** + GPU inference path.

### Effort: **10 minggu** (1 senior ML + 1 backend)

### Risiko
- Model TableFormer milik IBM — periksa apakah *model weights* benar-benar MIT atau ada *separate license*. Berdasarkan riset publik, weights di-release dengan lisensi terpisah (CDLA-Permissive-2.0) — masih kompatibel.

---

## #3 — Langfuse (Monitoring / Observability LLM) — **P0**

| Atribut       | Nilai |
|---------------|-------|
| GitHub        | https://github.com/langfuse/langfuse |
| Lisensi       | **MIT** (core), beberapa fitur Enterprise pisah |
| Bahasa        | TypeScript, Python SDK |
| Stars (≈)     | 8.000+ |
| Maintainer    | Langfuse GmbH |

### Apa fungsinya
*Observability platform* khusus LLM: *tracing* hierarkis (parent-child spans untuk *agent loops*), *prompt versioning*, *cost tracking* per model, *eval dataset*, *user feedback*, dan *playground*. Bisa dianggap "Datadog untuk LLM".

### Mengapa bernilai untuk BUMN
- BUMN **wajib audit setiap keputusan AI** — jawaban apa, sumber mana, biaya berapa, oleh user mana. Tanpa tracing, ini mustahil.
- *Cost attribution* per departemen/anak perusahaan — wajib untuk *charge-back* internal di Konglomerasi.
- **Eval dataset** memungkinkan *Inspektorat* mengetes regresi sebelum upgrade model.
- *Self-hostable* sepenuhnya — Langfuse Cloud tidak diperlukan.

### Integrasi ke GATRA AI
- Setiap eksekusi *goal-executor* GATRA → otomatis di-trace ke Langfuse via SDK.
- Hasil *scope enforcement* (allow/deny) → di-log sebagai *evaluation score*.
- Dashboard GATRA menampilkan *embed view* dari Langfuse untuk admin dept.
- Template katalog GATRA → di-version control sebagai *Langfuse prompts*.

### Enhancement yang dibutuhkan
1. **Multi-tenancy hardening**: Langfuse upstream punya *projects*, tapi belum cukup ketat untuk Konglomerasi (mis. Astra → Astra International, Astra Honda, Astra Agro). Perlu *org → tenant → project → dept* hierarchy.
2. **PII scrubber otomatis** pada trace input/output — Langfuse menyimpan **prompt mentah** termasuk PII. Tidak boleh.
3. **Export ke SIEM lokal**: ELK on-prem, IBM QRadar, Wazuh — common di BUMN.
4. **Indonesian eval set**: bangun *golden dataset* per dept (HR, Finance, Legal) untuk regresi.
5. **Air-gap mode**: matikan semua *external telemetry* dan *update check*.

### Effort: **6 minggu** (1 fullstack + 1 SRE)

### Risiko
- Beberapa fitur (mis. *SSO via SAML*, *audit logs lanjutan*) ada di *Langfuse Enterprise Edition*. SSN harus **menulis ulang fitur tersebut** atau menerima keterbatasan.

---

## #4 — Apache Superset (Data Visualization / BI) — **P1**

| Atribut       | Nilai |
|---------------|-------|
| GitHub        | https://github.com/apache/superset |
| Lisensi       | **Apache 2.0** |
| Bahasa        | Python, TypeScript |
| Stars (≈)     | 60.000+ |
| Maintainer    | Apache Software Foundation |

### Apa fungsinya
*Business intelligence platform* mature: konektor ke 40+ database, *dashboard builder* drag-and-drop, *SQL Lab*, *role-based access control*, *scheduled reports* via email/Slack, *embedded analytics* via SDK.

### Mengapa bernilai untuk BUMN
- BUMN sudah pakai Tableau/PowerBI/Qlik dengan biaya lisensi puluhan miliar Rupiah/tahun. Superset = **substitusi langsung dengan TCO 80% lebih rendah**.
- Apache Software Foundation = **brand kepercayaan** yang diterima di lingkungan birokrasi.
- Konektor ke SAP HANA, Oracle, MS SQL, PostgreSQL — sesuai stack BUMN.
- *Embedded dashboard* via iframe → GATRA AI dapat tampilkan analitik di dalam *chat response*.

### Integrasi ke GATRA AI
- GATRA template *"Analisis penjualan Q3"* → goal-executor → query Superset API → embed chart hasil ke *response* user.
- Hasil parsing Docling (tabel laporan keuangan) → otomatis di-push ke Superset sebagai *dataset baru*.
- **AI-native enhancement**: user dapat tanya "Buat dashboard pendapatan per region" via natural language, GATRA generate *Superset chart JSON*.
- *RBAC GATRA* dipetakan ke *Superset roles* — single source of truth.

### Enhancement yang dibutuhkan
1. **Natural-language-to-dashboard**: layer LLM yang generate Superset chart spec dari prompt. Tidak ada di upstream.
2. **Indonesian locale**: format Rupiah (`Rp 1.234.567,89`), tanggal Indonesia, terjemahan UI (i18n upstream lemah).
3. **Theming SSN/BUMN branding**: white-label untuk dijual sebagai produk SSN.
4. **Single Sign-On ke GATRA**: SAML/OIDC bridge.
5. **Komentar AI pada chart**: auto-generated insight ("Pendapatan turun 12% karena...") di bawah setiap chart.

### Effort: **12 minggu** (2 engineer fullstack)

### Risiko
- Codebase Superset besar (~500k LOC). *Maintenance burden* tinggi. Disarankan **tidak fork hard** — pakai sebagai *upstream dependency* dan tambahkan plugin/extension.

---

## #5 — Temporal (Workflow / Process Automation) — **P1**

| Atribut       | Nilai |
|---------------|-------|
| GitHub        | https://github.com/temporalio/temporal |
| Lisensi       | **MIT** |
| Bahasa        | Go (server), SDK: Go/Java/Python/TS/.NET |
| Stars (≈)     | 12.000+ |
| Maintainer    | Temporal Technologies |

### Apa fungsinya
*Durable workflow engine*. Menjalankan *long-running processes* (jam, hari, bulan) yang **tahan crash, restart, dan network failure**. Programmer menulis kode workflow seperti kode biasa; Temporal menangani *state persistence*, *retry*, *timeout*, *signal*, dan *versioning*. Konsep "*workflow as code*".

### Mengapa bernilai untuk BUMN
- Proses BUMN **panjang dan multi-aktor**: persetujuan kredit (3-7 hari), pengadaan barang (30-90 hari), onboarding karyawan (2 minggu). Tidak cocok untuk *request-response*.
- Tahan terhadap **kegagalan infrastruktur** — penting untuk DC BUMN yang sering *maintenance*.
- *Audit trail* otomatis (event sourcing) — semua state change tersimpan, cocok untuk audit.
- Alternatif komersial (Camunda Enterprise, Pega) berharga **miliaran/tahun** per kasus penggunaan.

### Integrasi ke GATRA AI
- GATRA *goal-executor* sekarang *in-memory*. Setelah Temporal: setiap goal-executor run = *Temporal workflow* yang *durable*.
- Template *"Approval pengadaan"* → workflow Temporal multi-step dengan *human approval signal* dari atasan.
- Long-session memory GATRA → Temporal *workflow state* sebagai SSOT, bukan checkpoint terpisah.
- AI agent sebagai *Temporal activity* — *retry* otomatis bila LLM API gagal.

### Enhancement yang dibutuhkan
1. **Visual workflow designer** Indonesian-friendly. Temporal upstream = *code-only* — tidak cocok untuk *business analyst* BUMN. Bangun *BPMN-like editor* yang generate code.
2. **Pre-built activity library** untuk integrasi BUMN: kirim dokumen ke SIDJP, push notification BBM, query SAP RFC, request approval via WhatsApp Business.
3. **Human-in-the-loop UI**: dashboard untuk *pending approvals*, integrasi mobile (Android/iOS).
4. **GATRA AI sebagai workflow author**: user bisa minta GATRA membuat workflow dari natural language ("Buatkan saya proses approval cuti").
5. **Indonesian holiday calendar**: untuk *timer/deadline* yang otomatis skip libur nasional.

### Effort: **14 minggu** (2 backend + 1 frontend)

### Risiko
- *Learning curve* Temporal curam. Tim SSN butuh **training intensif** sebelum bisa membangun di atasnya.
- Saingan **n8n** lebih *familiar* — tetapi n8n bukan lisensi permisif. SSN harus mendidik pasar tentang nilai Temporal.

---

## #6 — AnythingLLM (Knowledge Management) — **P1**

| Atribut       | Nilai |
|---------------|-------|
| GitHub        | https://github.com/Mintplex-Labs/anything-llm |
| Lisensi       | **MIT** |
| Bahasa        | JavaScript, Node.js, React |
| Stars (≈)     | 30.000+ |
| Maintainer    | Mintplex Labs |

### Apa fungsinya
*Knowledge base chat interface* — upload dokumen, buat *workspace*, chat dengan LLM yang grounded pada dokumen. Mendukung multi-user, multi-workspace, multi-LLM provider, dan multi-vector-store. UI matang, *mobile-responsive*, *desktop installer* tersedia.

### Mengapa bernilai untuk BUMN
- GATRA AI saat ini fokus pada *task automation*. AnythingLLM melengkapi dengan **chat-with-documents UX** yang familiar untuk user awam.
- *Workspace per departemen* — sejalan dengan model RBAC GATRA.
- *Desktop installer* untuk pejabat yang sering offline (audit lapangan, kunjungan kerja).
- UI sudah polished — SSN hemat 3-6 bulan engineering frontend.

### Integrasi ke GATRA AI
- AnythingLLM menjadi **UI lapisan kedua** GATRA: "GATRA Workspaces". User awam tinggal pakai chat; *power user* pakai GATRA goal-executor.
- *Backend retrieval* AnythingLLM digantikan oleh **LlamaIndex** (proyek #1) untuk konsistensi.
- *Auth bridge* AnythingLLM → GATRA RBAC.
- *Workspaces* AnythingLLM = *projects* GATRA.

### Enhancement yang dibutuhkan
1. **Hapus konektor cloud** (OpenAI default, Pinecone) — ganti default ke on-prem (Sahabat-AI, Qwen, Qdrant local).
2. **Bahasa Indonesia UI** dan template prompt lokal (Indonesian).
3. **Audit log lengkap**: setiap pertanyaan, setiap dokumen yang dilihat, setiap jawaban — tersimpan untuk Inspektorat.
4. **Disable telemetry** sepenuhnya. AnythingLLM upstream mengirim *anonymous metrics* — harus dimatikan total.
5. **GATRA tool integration**: user di AnythingLLM dapat memanggil *GATRA goal* via slash command.

### Effort: **6 minggu** (1 fullstack)

### Risiko
- AnythingLLM bergerak cepat. SSN harus *cherry-pick fix*, bukan full rebase, untuk menjaga modifikasi.
- Beberapa fitur *agent* AnythingLLM tumpang tindih dengan GATRA goal-executor. **Putuskan early**: matikan agent AnythingLLM atau adopsi sebagai sub-set.

---

## #7 — Whisper.cpp (Speech / Audio Processing) — **P2**

| Atribut       | Nilai |
|---------------|-------|
| GitHub        | https://github.com/ggerganov/whisper.cpp |
| Lisensi       | **MIT** |
| Bahasa        | C/C++ |
| Stars (≈)     | 35.000+ |
| Maintainer    | Georgi Gerganov + komunitas |

### Apa fungsinya
*Port C++* dari OpenAI Whisper — model transcription/translation multi-bahasa (99 bahasa, termasuk Bahasa Indonesia, Jawa, Sunda — varying quality). Dapat berjalan di **CPU** dengan kecepatan layak; di GPU dengan CUDA/Metal/Vulkan jauh lebih cepat. *Quantized weights* memungkinkan model 1.5 GB.

### Mengapa bernilai untuk BUMN
- BUMN punya **ribuan jam rekaman**: rapat direksi, panggilan customer service, *town hall*. Tidak ada cara hemat untuk men-transcribe-nya tanpa AI.
- **Kompliance**: BPK/Inspektorat sering meminta *minutes of meeting* — saat ini ditulis manual. Whisper otomatisasi.
- *On-device deployment* — rekaman sensitif tidak perlu keluar dari laptop pejabat.
- OpenAI Whisper original berlisensi MIT — whisper.cpp adalah implementasi MIT yang *production-ready*.

### Integrasi ke GATRA AI
- GATRA template *"Buat MoM dari rekaman rapat"* → upload audio → whisper.cpp transcribe → LLM summarize → keluar MoM terstruktur.
- *Voice query mode* di dashboard GATRA — user bicara, GATRA execute goal.
- Hasil transkrip → indexed ke LlamaIndex untuk *retrieval lintas rapat*.
- *Real-time streaming* untuk subtitle rapat Zoom/Teams.

### Enhancement yang dibutuhkan
1. **Fine-tune untuk Bahasa Indonesia konteks korporat**: domain-specific corpus (istilah keuangan, hukum, teknis BUMN). Whisper default kurang akurat untuk akronim Indonesia (mis. "RUPS", "KPI", "OPEX").
2. **Speaker diarization** (siapa bicara kapan) — penting untuk MoM. Whisper.cpp tidak punya bawaan; integrasikan pyannote.audio (MIT-compatible: cek versi, beberapa versi MIT, yang lain Apache 2.0).
3. **Code-mixing handling**: pejabat BUMN sering mix Indonesia-Inggris ("kita akan *follow up* dengan vendor"). Default Whisper sering salah.
4. **Real-time streaming server**: whisper.cpp punya example streaming, tapi belum production-grade untuk multi-tenant.
5. **Bahasa daerah** (Jawa, Sunda, Batak, Minang) — fine-tune jika ada *budget riset*. *Optional*.

### Effort: **8 minggu** (1 ML engineer + 1 backend)

### Risiko
- *Diarization* (pyannote) kompleks untuk audio rekaman noisy (rapat dengan banyak orang via speakerphone).
- *GPU procurement* untuk inference real-time bisa jadi bottleneck di BUMN (procurement panjang).

---

## #8 — Supervision by Roboflow (Computer Vision) — **P2**

| Atribut       | Nilai |
|---------------|-------|
| GitHub        | https://github.com/roboflow/supervision |
| Lisensi       | **MIT** |
| Bahasa        | Python |
| Stars (≈)     | 22.000+ |
| Maintainer    | Roboflow |

### Apa fungsinya
*Reusable CV utilities*: *annotation rendering*, *tracking* (ByteTrack), *zone analytics* (line crossing, polygon dwell), *video processing helpers*. Tidak menggantikan model deteksi — melainkan **memperkuat pipeline** di atas model (YOLOX, RT-DETR, MMDetection — yang Apache 2.0).

### Mengapa bernilai untuk BUMN
- Use case CV BUMN tinggi: **smart manufacturing** (Pertamina, Krakatau Steel), **K3 monitoring** (helm, vest), **traffic analytics** (Jasa Marga), **smart farming** (PT Perkebunan Nusantara), **counter footfall** (BRI, Mandiri ATM lobby).
- Supervision MIT → boleh dimodifikasi dan dijual.
- *Roboflow* sebagai brand mengasosiasikan dengan kualitas — namun SSN tidak terikat ke cloud Roboflow.
- Alternatif **Ultralytics YOLOv8** = AGPL → **tidak bisa dipakai untuk produk komersial SSN tanpa membuka source**. Wajib pakai YOLOX/RT-DETR.

### Integrasi ke GATRA AI
- GATRA template *"Audit pemakaian APD pabrik"* → upload video → pipeline CV (YOLOX + Supervision tracking) → laporan kepatuhan K3.
- *Edge deployment*: deploy ke kamera CCTV via ONNX/TensorRT — heartbeat ke GATRA cloud.
- Alert real-time → masuk ke notifikasi GATRA → eskalasi via Rocket.Chat (proyek #9).
- Dashboard CV (heatmap, count) → embed ke Superset.

### Enhancement yang dibutuhkan
1. **Model zoo on-prem**: kemas YOLOX, RT-DETR, InsightFace dengan *weights* yang Apache/MIT.
2. **Indonesian-context training data**: APD lokal, helm proyek SNI, plat nomor Indonesia.
3. **Edge runtime SSN**: package untuk Jetson Nano/Xavier dan NVIDIA RTX di server BUMN.
4. **No-code rule builder**: "alert jika orang tanpa helm di zona X selama Y detik" — generate Supervision pipeline.
5. **License plate recognition Indonesia** — model + post-process khusus format Indonesia (B 1234 ABC).

### Effort: **10 minggu** (1 ML CV + 1 embedded engineer)

### Risiko
- **Model zoo licensing trap**: hati-hati saat memilih *pretrained weights*. Banyak model populer di-train pada dataset dengan lisensi non-komersial (COCO OK, tapi beberapa dataset turunan tidak).
- *Hardware procurement* GPU di BUMN = lambat. SSN perlu menawarkan **alternatif CPU-inference** dengan model lebih kecil.

---

## #9 — Rocket.Chat (Communication Bot) — **P2**

| Atribut       | Nilai |
|---------------|-------|
| GitHub        | https://github.com/RocketChat/Rocket.Chat |
| Lisensi       | **MIT** (community edition) |
| Bahasa        | JavaScript, TypeScript, Meteor |
| Stars (≈)     | 40.000+ |
| Maintainer    | Rocket.Chat Technologies Corp. |

### Apa fungsinya
*Self-hosted team messaging* (alternatif Slack/Teams) dengan *app framework* terbuka, *omnichannel* (WhatsApp, Telegram, email, SMS), *video conference* (Jitsi integrated), *threads*, *channels*, *DM*. Kelas enterprise.

### Mengapa bernilai untuk BUMN
- BUMN **dilarang menyimpan chat di Slack/Teams** untuk data sensitif — *data residency* harus di Indonesia.
- Banyak BUMN sudah punya Rocket.Chat on-prem (Pertamina, BNI di beberapa unit). Familiar.
- *Omnichannel* memungkinkan **customer service unified**: WhatsApp Business + Instagram + Twitter masuk ke satu inbox.
- *Bot framework* memungkinkan GATRA AI menjadi **chatbot di dalam Rocket.Chat**.

### Integrasi ke GATRA AI
- *GATRA Bot* di Rocket.Chat — semua channel dapat memanggil GATRA via mention.
- Eskalasi otomatis dari workflow Temporal → kirim DM ke user yang harus approve.
- *Customer service*: pertanyaan masuk WhatsApp → triage AI → jawab otomatis atau hand-off ke agent manusia.
- *MoM rapat Whisper* → otomatis posting ke channel rapat dengan tagging participants.
- Dashboard GATRA: *cost per conversation* dari analytics Rocket.Chat.

### Enhancement yang dibutuhkan
1. **GATRA AI App** native untuk Rocket.Chat marketplace internal — slash commands, modals, action buttons.
2. **WhatsApp Business API integration kit** untuk BUMN — dokumentasi setup, template approval Meta.
3. **AI-powered routing**: pertanyaan customer → klasifikasi → route ke departemen yang tepat.
4. **PII redaction** otomatis pada chat history sebelum di-train atau di-summarize.
5. **Branded build**: "SSN Chat" / branded mode untuk Konglomerasi yang ingin white-label.

### Effort: **8 minggu** (1 fullstack + 1 integration engineer)

### Risiko
- Rocket.Chat **mengubah strategi lisensi sebelumnya** — periksa lisensi commit terkini (sebelum fork) untuk memastikan masih MIT untuk Community. Beberapa modul (mis. Cloud, LDAP advanced) dipindah ke EE.
- *Meteor* framework yang dipakai Rocket.Chat sudah *legacy*. Maintenance jangka panjang mungkin sulit.

---

## #10 — Open Policy Agent (Security / Compliance) — **P3**

| Atribut       | Nilai |
|---------------|-------|
| GitHub        | https://github.com/open-policy-agent/opa |
| Lisensi       | **Apache 2.0** |
| Bahasa        | Go |
| Stars (≈)     | 10.000+ |
| Maintainer    | CNCF (graduated project) |

### Apa fungsinya
*General-purpose policy engine*. Bahasa deklaratif **Rego** untuk menulis kebijakan: siapa boleh apa, kapan, di mana, dalam konteks apa. Dapat dipanggil sebagai sidecar, library, atau service. Digunakan luas di Kubernetes (Gatekeeper), Envoy, Terraform, dan stack cloud-native.

### Mengapa bernilai untuk BUMN
- BUMN/Konglomerasi punya **kebijakan kepatuhan kompleks**: UU PDP (Perlindungan Data Pribadi), POJK 11/12 (perbankan), POJK 14 (asuransi), regulasi sektor (ESDM, BUMN itu sendiri).
- Hard-code policy di GATRA = **tidak maintainable**. OPA memungkinkan **policy-as-code** yang bisa di-version, di-review, di-audit.
- *Inspektorat* dapat **membaca dan memverifikasi** policy Rego (relatif lebih readable dibanding kode Python).
- Standar de-facto industri — auditor familiar.

### Integrasi ke GATRA AI
- *Scope enforcement* GATRA yang sudah ada (RBAC + content-based) di-**generalisasi via OPA**: semua keputusan allow/deny → query OPA dengan input `{user, action, resource, context}`.
- Template katalog GATRA → setiap template punya *policy bundle* yang menentukan eligibility.
- Workflow Temporal: setiap transisi di-cek OPA (mis. *"approval di atas 10M butuh CFO"*).
- Audit log: setiap *OPA decision* di-trace ke Langfuse.
- Policy update **tanpa redeploy** GATRA — *hot reload* bundle.

### Enhancement yang dibutuhkan
1. **Indonesian regulatory policy library**: UU PDP, POJK, peraturan BUMN, AML/CFT, GCG — ditulis sebagai Rego module siap pakai.
2. **Policy authoring UI**: BUMN compliance officer **tidak mau menulis Rego**. SSN bangun *visual policy builder* yang generate Rego.
3. **Decision log analyzer**: dashboard menampilkan *frequency of denials*, *anomalous patterns*, *user complaints*.
4. **Integration with GATRA prompt-level RBAC**: pre-prompt filter dan post-LLM filter dijalankan via OPA.
5. **Compliance report generator**: otomatis generate laporan kepatuhan bulanan untuk Direksi dari decision log.

### Effort: **10 minggu** (1 backend + 1 compliance domain expert)

### Risiko
- Compliance officer BUMN sering **tidak teknis**. UI policy builder = *project tersendiri* yang berisiko *scope creep*.
- Regulasi Indonesia **berubah cepat** (UU PDP baru, POJK revisi). SSN harus punya tim hukum yang me-maintain *policy library*.
- OPA cocok untuk *authorization*, **bukan** untuk *security monitoring*. Untuk SIEM, tetap perlu Wazuh (GPL — tidak bisa, gunakan alternatif **Suricata** + **Falco** yang Apache 2.0 — di luar scope dokumen ini).

---

## Matriks Prioritas & Roadmap

| # | Proyek          | Prioritas | Effort   | Dependensi      | Quarter |
|---|-----------------|-----------|----------|-----------------|---------|
| 1 | LlamaIndex      | **P0**    | 8 minggu | —               | Q3 2026 |
| 2 | Docling         | **P0**    | 10 minggu| —               | Q3 2026 |
| 3 | Langfuse        | **P0**    | 6 minggu | —               | Q3 2026 |
| 4 | Apache Superset | **P1**    | 12 minggu| LlamaIndex      | Q4 2026 |
| 5 | Temporal        | **P1**    | 14 minggu| Langfuse        | Q4 2026 |
| 6 | AnythingLLM     | **P1**    | 6 minggu | LlamaIndex      | Q4 2026 |
| 7 | Whisper.cpp     | **P2**    | 8 minggu | LlamaIndex      | Q1 2027 |
| 8 | Supervision     | **P2**    | 10 minggu| —               | Q1 2027 |
| 9 | Rocket.Chat     | **P2**    | 8 minggu | Temporal        | Q1 2027 |
| 10| Open Policy Agent| **P3**   | 10 minggu| GATRA RBAC      | Q2 2027 |

**Total effort kumulatif**: 92 minggu × 1-2 engineer = **~140-180 engineer-weeks**.

Dengan tim 6 engineer paralel (2 ML, 2 backend, 1 frontend, 1 SRE) — target *MVP P0+P1* tercapai dalam **9-12 bulan** dengan overlap dan sharing.

---

## Strategi Lisensi & Branding

### Naming convention untuk produk SSN
- **GATRA AI** — control plane (sudah ada)
- **SSN Retrieve** — fork LlamaIndex + Docling stack
- **SSN Vista** — fork Apache Superset
- **SSN Flow** — fork Temporal
- **SSN Voice** — fork Whisper.cpp
- **SSN Vision** — fork Supervision + model zoo
- **SSN Talk** — fork Rocket.Chat
- **SSN Guard** — fork OPA + policy library
- **SSN Insight** — fork Langfuse
- **SSN Knowledge** — fork AnythingLLM

### Kewajiban atribusi
Semua produk SSN **wajib menyertakan**:
- File `NOTICES.md` daftar proyek upstream + lisensi.
- *Splash screen* "Powered by Open Source — see NOTICES".
- Tidak boleh menghapus copyright notice upstream dari source files.
- Untuk Apache 2.0: sertakan teks lisensi lengkap.
- Untuk MIT: sertakan copyright notice.

### Yang TIDAK boleh dilakukan
- ❌ Mengklaim SSN sebagai *sole author* — pelanggaran lisensi.
- ❌ Mengubah lisensi upstream menjadi proprietary — tidak bisa, tapi *enhancement SSN* dapat proprietary.
- ❌ Menggugat user yang menggunakan SSN Suite untuk *patent infringement* terhadap kode upstream — Apache 2.0 melarang.

---

## Rekomendasi Eksekusi

### Fase 1 — Foundation (Q3 2026, 3 bulan)
- Fork & brand: LlamaIndex, Docling, Langfuse.
- Buat **internal SDK**: `@ssn/retrieve`, `@ssn/parse`, `@ssn/observe`.
- Integrasi pertama ke GATRA goal-executor.
- **Demo POC ke 2 BUMN target** (mis. BNI, Pertamina) untuk validasi.

### Fase 2 — Expansion (Q4 2026, 3 bulan)
- Tambah Superset, Temporal, AnythingLLM.
- Bundle "GATRA AI Enterprise Edition" — sales-ready.
- **Pricing**: lisensi per-node atau per-user, hindari *per-query* untuk menghindari kekhawatiran *cost runaway* BUMN.

### Fase 3 — Specialization (Q1 2027, 3 bulan)
- Whisper, Supervision, Rocket.Chat.
- Industri vertikal: bank, manufaktur, energi, FMCG (konglomerasi).
- *Partner program* dengan SI lokal (Telkomsigma, Sigma Cipta Caraka, Mitra Solusi Telematika).

### Fase 4 — Compliance & Scale (Q2 2027, 3 bulan)
- OPA + policy library.
- ISO 27001, SOC2, sertifikasi lokal (Kominfo TKDN).
- *Air-gapped installer* lengkap, *escrow agreement* template.

---

## Catatan Akhir

**Jangan berusaha membangun semua sendiri.** Setiap proyek di daftar ini adalah hasil **ratusan engineer-tahun** dari komunitas global. Fork yang cerdas = *time-to-market* 5-10× lebih cepat.

**Tapi**: fork ≠ bebas effort. Setiap fork = **tanggung jawab maintenance jangka panjang**. SSN harus berkomitmen *rebase periodik*, *security patch propagation*, dan *kontribusi balik upstream* untuk mengurangi *drift cost*.

**Differensiasi SSN bukan pada kode**, melainkan pada:
1. **Konteks Indonesia** (bahasa, regulasi, integrasi sistem lokal).
2. **Service & SLA** untuk BUMN (24/7, on-site).
3. **Sertifikasi & TKDN** (lokal konten Kominfo, ISO).
4. **GATRA AI sebagai control plane** yang mengikat semua kapabilitas menjadi *integrated suite*.

Pesaing yang mengintegrasikan 10 proyek sebaik ini di Indonesia = **belum ada**. Window peluang: 18-24 bulan sebelum vendor global (Microsoft Copilot, Google Vertex) atau lokal-skala-besar (Indosat AI, Telkom Antares AI) menutup gap.

**Move fast. Brand strong. Integrate deep.**
