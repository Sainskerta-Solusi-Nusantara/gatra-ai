# Use Case Context — GATRA AI

Source: Bos Galih (2026-06-06, WhatsApp discussion)

## Core Use Case: Internal Enterprise AI Agent Platform

BUKAN general AI platform — tapi **internal system khusus kanggo perusahaan**.

## Key Requirements

### 1. Employee Lifecycle Automation
- **Resignation/Offboarding Flow**: Pas karyawan resign, sistem kudu otomatis:
  - Blacklist akses data perusahaan
  - Cabut semua credential (email, VPN, database, apps)
  - Log all access attempts post-resignation
  - Notify HR + IT + manager

### 2. HR Integration
- HR kudu paham sistem — bukan cuma IT domain
- HR bisa define policy, trigger actions, monitor compliance
- Self-service: HR bisa setup/ubah aturan tanpa bantuan IT

### 3. Whole Department Training
- Training bukan untuk 1-2 orang, tapi **seluruh departemen**
- Perlu role-based access: IT, HR, Manager, Exec
- Dashboard harus intuitive — non-technical users bisa pake

### 4. Data Security & PDP Compliance
- Data tidak boleh keluar server perusahaan
- Audit log semua actions
- Role-based access control
- ISO 27001 readiness

## Target Market
- BUMN Indonesia (Telkom, Pertamina, PLN, Bank BUMN, Angkasa Pura, dll)
- Konglomerasi Indonesia (Sinarmas, Astra, Djarum, Grup Lippo, dll)
- Enterprise dengan 500+ karyawan

## Competitive Advantage
- Self-hosted / on-premise (PDP compliant)
- Goal-based autonomous agents (kaya Ant CLI)
- Open source core (transparent, auditable)
- Buatan Indonesia, support lokal
- Multi-model (Qwen, Llama, DeepSeek, Claude, dll)
