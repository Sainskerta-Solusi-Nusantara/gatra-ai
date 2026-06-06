# Top MIT Dashboard Apps — Enterprise Grade (Like PowerBI)

> Dikhususkan kanggo BUMN/Konglomerasi. Self-hostable on-premise.
> Alternatif PowerBI/Tableau open source.

---

## 1. APACHE SUPERSET 🥇

**GitHub:** https://github.com/apache/superset
**License:** Apache 2.0
**Stars:** 64k+
**Self-host:** ✅ Docker, K8s, bare metal

**vs PowerBI:**
- ✅ SQL charting (bar, line, pie, heatmap, geospatial)
- ✅ Drag-drop dashboard builder
- ✅ SQL Lab (built-in query editor)
- ✅ RBAC (role-based access)
- ✅ Alert/report scheduling
- ❌ No native mobile app (responsive web pake)
- ❌ No Excel-like data model (tapi SQL langsung)

**Database:** MySQL, Postgres, BigQuery, Snowflake, Trino, druid, dll 40+

**Best for BUMN:** Executive dashboard real-time dari database internal. Gantian PowerBI lisensi mahal.

**Enhancement SSN:**
- + Auto-TTE export PDF (kaya REKAPIN)
- + Department-based data isolation
- + Notif WA auto

---

## 2. METABASE 🥇

**GitHub:** https://github.com/metabase/metabase
**License:** AGPL v3 (Enterprise: proprietary)
**Stars:** 39k+
**Self-host:** ✅ JAR, Docker, K8s

**vs PowerBI:**
- ✅ Paling gampang setup (5 menit)
- ✅ SQL + visual builder (non-teknis bisa)
- ✅ Email/Slack subscription
- ✅ Dashboard embedding
- ✅ Column-level permissions
- ❌ AGPL license (tapi free version cukup)
- ❌ Kurang advanced analytics

**Database:** MySQL, Postgres, BigQuery, MongoDB, Druid, dll 20+

**Best for BUMN:** Departemen non-teknis yang pengen bikin grafik sendiri tanpa IT. Paling user-friendly.

**Enhancement SSN:**
- + Audit log PDP compliant
- + Embed ke dashboard GATRA AI
- + Export PDF format BUMN

---

## 3. GRAFANA 🥈

**GitHub:** https://github.com/grafana/grafana
**License:** AGPL v3
**Stars:** 66k+
**Self-host:** ✅ Docker, K8s, binary

**vs PowerBI:**
- ✅ Best untuk time-series & monitoring
- ✅ Alert rules + notif (WA, Telegram, Email)
- ✅ Dashboard sangat interaktif (drill-down)
- ✅ Plugin ecosystem (100+ data sources)
- ✅ RBAC + teams
- ❌ Bukan BI tool pure — fokus monitoring
- ❌ Kurang support OLAP/adhoc query

**Database:** Prometheus, InfluxDB, Loki, Elastic, SQL dll

**Best for BUMN:** Dashboard SLA, monitoring infrastruktur, traffic network.

**Enhancement SSN:**
- + SLA Auto-Escalation (kaya MONITORIN)
- + Bentuk laporan formal BUMN (PDF)
- + Incident tracking integrated

---

## 4. REDASH 🥈

**GitHub:** https://github.com/getredash/redash
**License:** BSD 2-Clause
**Stars:** 26k+ (archived — pindah ke Databricks)
**Self-host:** ✅ Docker

**Catatan:** Redash wis discontinued (2024). Tapi fork-nya onok: **Reds** atau supaya pake Superset. Tak masukin sebagai catatan ae.

**Best for BUMN:** Dulu bagus, sekarang mending Superset/Metabase.

---

## 5. EVIDENCE 🥈

**GitHub:** https://github.com/evidence-dev/evidence
**License:** MIT ✅✅✅
**Stars:** 5k+
**Self-host:** ✅ Node.js, Docker

**vs PowerBI:**
- ✅ Code-first BI (SQL → Markdown → Dashboard)
- ✅ Perfect for git-based workflow
- ✅ Report bisa version control
- ✅ Lightweight, gak perlu server DB tambahan
- ❌ Kurang drag-drop (kudu SQL)
- ❌ Cocok untuk analyst, bukan end-user biasa

**Database:** DuckDB, Snowflake, Postgres, MySQL, BigQuery

**Best for BUMN:** Tim data analyst yang manage laporan periodik. Report bisa di-version control.

**Enhancement SSN:**
- + Visual editor (drag-drop)
- + Auto-jadwal export PDF
- + Department templates

---

## 6. LIGHTDASH 🥈

**GitHub:** https://github.com/lightdash/lightdash
**License:** MIT ✅✅✅
**Stars:** 3.5k+
**Self-host:** ✅ Docker, K8s

**vs PowerBI:**
- ✅ dbt-native (terintegrasi dbt)
- ✅ Metrics layer (define metrik sekali, pake di mana aja)
- ✅ Self-serve analytics
- ❌ Butuh dbt di stack
- ❌ Komunitas relatif kecil

**Database:** BigQuery, Snowflake, Postgres, Databricks (via dbt)

**Best for BUMN:** BUMN yang sudah pake dbt untuk data warehouse. Metrics governance.

**Enhancement SSN:**
- + Visual dashboard builder
- + Export PDF BUMN format
- + Integrasi RBAC GATRA AI

---

## 7. CUBE.JS 🥉

**GitHub:** https://github.com/cube-js/cube
**License:** MIT ✅✅✅
**Stars:** 18k+
**Self-host:** ✅ Docker

**vs PowerBI:**
- ✅ Semantic layer (define metrik sekali)
- ✅ API-first (REST + GraphQL + WebSocket)
- ✅ Caching super cepat
- ✅ Pre-aggregation untuk big data
- ❌ Bukan dashboard — butuh frontend
- ❌ Perlu Superset/Metabase/Grafana sebagai frontend

**Database:** Postgres, MySQL, BigQuery, Snowflake, Druid, dll

**Best for BUMN:** Backend BI — cache + API untuk dashboard. Combine karo Superset/Metabase.

**Enhancement SSN:**
- + Integrasi GATRA AI (agent bisa query Cube)
- + Dashboard frontend sendiri (bisa make React)
- + Auditing

---

## 8. STREAMLIT 🥉

**GitHub:** https://github.com/streamlit/streamlit
**License:** Apache 2.0
**Stars:** 37k+
**Self-host:** ✅ Python, Docker

**vs PowerBI:**
- ✅ Python-native — ML developers suka
- ✅ Bisa buat custom dashboard apa aja
- ✅ Chart + table + map + widgets
- ✅ Deploy cepet
- ❌ Butuh coding Python
- ❌ Bukan BI tool untuk non-teknis

**Database:** Pandas, Snowflake, BigQuery, dll

**Best for BUMN:** Dashboard custom + ML model deployment. Tim data science.

**Enhancement SSN:**
- + Template dashboard BUMN
- + WYSIWYG editor (no-code)
- + RBAC integration

---

## 9. PLOTLY DASH 🥉

**GitHub:** https://github.com/plotly/dash
**License:** MIT ✅✅✅ (Enterprise: proprietary)
**Stars:** 21k+
**Self-host:** ✅ Python, Docker

**vs PowerBI:**
- ✅ Bikin dashboard Python interaktif
- ✅ Complex visualizations
- ✅ Callback-based interactivity
- ❌ Butuh Python coding
- ❌ Gak ada drag-drop builder

**Database:** Pandas, SQL, Snowflake, dll

**Best for BUMN:** Custom analytics + visualisasi kompleks.

**Enhancement SSN:**
- + Template dashboard
- + No-code editor
- + PDF export

---

## 10. PRESTO / TRINO (Bukan Dashboard Tapi Penting)

**GitHub:** https://github.com/trinodb/trino
**License:** Apache 2.0
**Stars:** 10k+
**Fungsi:** Query engine — join data dari banyak database sekali query

**Kenapa penting:** Dashboard tools butuh data source. Trino ngumpulin data dari database beda-beda.

---

## RANKING — Enterprise Readiness

| Rank | App | License | Self-host | UI | Data Sources | BUMN Fit |
|---|---|---|---|---|---|---|
| 🥇 | **Superset** | Apache 2.0 | ✅ Docker/K8s | Drag-drop | 40+ | Paling lengkap |
| 🥇 | **Metabase** | AGPL | ✅ JAR/Docker | Sangat mudah | 20+ | User friendly |
| 🥇 | **Grafana** | AGPL | ✅ Docker/K8s | Sangat interaktif | 100+ | Monitoring |
| 🥈 | **Lightdash** | MIT | ✅ Docker | dbt-native | via dbt | Metrics layer |
| 🥈 | **Evidence** | MIT | ✅ Node | Code-first | via DuckDB | Data analyst |
| 🥈 | **Cube.js** | MIT | ✅ Docker | API-first | 20+ | Backend BI |
| 🥉 | **Streamlit** | Apache | ✅ Python | Python-coding | Pandas/DB | Custom app |
| 🥉 | **Dash** | MIT | ✅ Python | Python-coding | Pandas/DB | Complex viz |
| ❌ | **Redash** | BSD | ✅ | Archived | 20+ | Skip — pake Superset |

---

## REKOMENDASI SSN

### Rekomendasi 1: Fork Apache Superset → REKAPIN
Lisensi Apache 2.0 paling aman. Fitur paling lengkap. Komunitas kuat (64k stars).
+ Signature: Auto-TTE, Departemen RBAC, WA notif

### Rekomendasi 2: Fork Lightdash/Evidence → dashboard code-first
MIT license bersih. Cocok untuk BUMN yang tim data-analyst e existing.
+ Signature: dbt-native + RBAC GATRA AI

### Rekomendasi 3: Gunakan Cube.js sebagai backend BI
MIT license. Sebagai semantic layer. Combine karo Superset/Grafana.

---

## LISENSI NOTE

| License | Bisa Fork & Jual? | Wajib Open Source? |
|---|---|---|
| **MIT** | ✅✅✅ Bebas | ❌ Tidak |
| **Apache 2.0** | ✅✅✅ Bebas | ❌ Tidak |
| **AGPL v3** | ✅ Bisa jual | ✅ WAJIB buka source |
| **BSL** | ⚠️ Production limit | ⚠️ 3-4 tahun jadi open |

**Saranku:** Pilih MIT/Apache 2.0 untuk produk SSN. AGPL/BSL riskan untuk enterprise.
