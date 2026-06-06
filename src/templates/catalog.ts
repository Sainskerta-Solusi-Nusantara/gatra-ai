// Use case template catalogue — content.
//
// Every entry is in Bahasa Indonesia (title / description / exampleGoal).
// Example goals reference realistic BUMN scenarios with concrete numbers,
// account names, dates, and Indonesian financial / operational vocabulary.
//
// To add a use case:
//   1. Find the right `section()` block by department + jabatan.
//   2. Append a row with the canonical 8 fields.
//   3. Run `npm run seed` — templates are upserted by id (idempotent).

import type {
  DepartmentSlug,
  Frequency,
  OutputFormat,
  UseCaseTemplate,
} from './types.js';
import { DEPARTMENT_NAMES } from './types.js';
import type { JabatanLevel } from '../rbac/types.js';

interface RawTemplate {
  command: string;
  category: string;
  title: string;
  description: string;
  exampleGoal: string;
  outputFormat: OutputFormat;
  frequency: Frequency;
  stakeholders?: DepartmentSlug[];
}

/** Expand a `RawTemplate[]` for a single (dept, jabatan) into full records. */
function section(
  dept: DepartmentSlug | null,
  minJabatan: JabatanLevel,
  rows: RawTemplate[],
): UseCaseTemplate[] {
  const departmentName = dept ? DEPARTMENT_NAMES[dept] : 'Cross-Department';
  const deptIdForId = dept ?? 'cross';
  return rows.map((r) => ({
    id: `${deptIdForId}:${minJabatan}:${r.command.replace(/^\//, '')}`,
    departmentId: dept,
    departmentName,
    minJabatan,
    command: r.command,
    category: r.category,
    title: r.title,
    description: r.description,
    exampleGoal: r.exampleGoal,
    outputFormat: r.outputFormat,
    frequency: r.frequency,
    stakeholders: r.stakeholders ?? [],
  }));
}

// =====================================================================
//  IT
// =====================================================================

const IT_STAFF = section('it', 'staff', [
  {
    command: '/monitor-server',
    category: 'Monitoring',
    title: 'Monitor kesehatan server',
    description: 'Pantau CPU, RAM, dan koneksi pada server inti.',
    exampleGoal:
      'Cek kondisi server APP-PROD-01 sampai APP-PROD-08 selama 1 jam terakhir. Laporkan CPU > 80%, RAM > 90%, dan koneksi MySQL yang menggantung lebih dari 10 menit.',
    outputFormat: 'report',
    frequency: 'daily',
  },
  {
    command: '/cek-log-error',
    category: 'Monitoring',
    title: 'Cek log error aplikasi',
    description: 'Scan log aplikasi untuk error level WARN ke atas.',
    exampleGoal:
      'Telusuri /var/log/app pada server CORE-BANKING-01 sejak pukul 22.00 tadi malam. Kelompokkan error level ERROR per modul, dan tandai yang muncul > 50 kali.',
    outputFormat: 'report',
    frequency: 'daily',
  },
  {
    command: '/restart-service',
    category: 'Operasional',
    title: 'Restart service aplikasi',
    description: 'Restart service tertentu dengan log perubahan.',
    exampleGoal:
      'Restart service nginx pada server WEB-DMZ-02 karena response time melonjak ke 8 detik. Pastikan health check hijau setelah restart dan buatkan tiket ITSM.',
    outputFormat: 'notification',
    frequency: 'on-demand',
  },
  {
    command: '/backup-db',
    category: 'Operasional',
    title: 'Backup database',
    description: 'Jalankan backup logical/physical database.',
    exampleGoal:
      'Eksekusi backup database core_banking ukuran ~420GB ke storage offsite. Verifikasi checksum, catat durasi, dan kirim notifikasi ke supervisor IT.',
    outputFormat: 'notification',
    frequency: 'daily',
  },
  {
    command: '/cek-uptime',
    category: 'Monitoring',
    title: 'Cek uptime layanan',
    description: 'Laporkan availability layanan kritikal.',
    exampleGoal:
      'Buat rekap uptime 7 hari terakhir untuk layanan internet banking, mobile banking, dan ATM switching. Sorot incident yang menyebabkan turun di bawah SLA 99,9%.',
    outputFormat: 'report',
    frequency: 'weekly',
  },
  {
    command: '/reset-password',
    category: 'Identity',
    title: 'Reset password user',
    description: 'Reset password user atas permintaan resmi.',
    exampleGoal:
      'Reset password Active Directory untuk user NIP 19880412 (Cabang Surabaya). Kirim password sementara ke nomor WA terdaftar dan paksa ganti pada login pertama.',
    outputFormat: 'notification',
    frequency: 'on-demand',
  },
  {
    command: '/scan-vulnerability',
    category: 'Security',
    title: 'Scan vulnerability',
    description: 'Jalankan vuln scan dasar pada host/aplikasi.',
    exampleGoal:
      'Jalankan scan Nessus pada subnet 10.20.30.0/24 (server zona DMZ). Fokus pada CVE severity High/Critical dan buatkan ringkasan untuk supervisor IT.',
    outputFormat: 'report',
    frequency: 'weekly',
  },
  {
    command: '/cek-disk-usage',
    category: 'Monitoring',
    title: 'Cek penggunaan disk',
    description: 'Pantau disk volume yang mendekati penuh.',
    exampleGoal:
      'Cek seluruh volume di server NAS-FILER-01 sampai NAS-FILER-04. Beri peringatan jika utilisasi > 85% dan rekomendasikan folder mana yang paling layak diarsipkan.',
    outputFormat: 'report',
    frequency: 'daily',
  },
]);

const IT_SUPERVISOR = section('it', 'supervisor', [
  {
    command: '/deploy-update',
    category: 'Operasional',
    title: 'Deploy update aplikasi',
    description: 'Eksekusi deployment dengan checklist rilis.',
    exampleGoal:
      'Lakukan deploy aplikasi Mobile Banking versi 4.12.0 ke environment staging. Jalankan smoke test 23 skenario, dan rekap hasil ke Confluence page rilis 2026-06.',
    outputFormat: 'report',
    frequency: 'weekly',
  },
  {
    command: '/manage-access',
    category: 'Identity',
    title: 'Kelola hak akses',
    description: 'Review dan rapikan hak akses sistem.',
    exampleGoal:
      'Review hak akses ke aplikasi SAP modul FI untuk 38 user di Divisi Finance Cabang Medan. Cabut akses yang sudah > 90 hari tidak login dan eskalasikan ke Manager IT.',
    outputFormat: 'report',
    frequency: 'monthly',
  },
  {
    command: '/incident-response',
    category: 'Operasional',
    title: 'Penanganan insiden',
    description: 'Koordinasi penanganan insiden P1/P2.',
    exampleGoal:
      'Buat insiden P2 untuk gangguan otentikasi LDAP pukul 09.45 WIB. Susun timeline, root cause sementara, dampak ke 1.200 user, dan langkah mitigasi 30 menit ke depan.',
    outputFormat: 'report',
    frequency: 'on-demand',
  },
  {
    command: '/audit-log',
    category: 'Security',
    title: 'Audit log akses',
    description: 'Tarik log akses untuk audit internal.',
    exampleGoal:
      'Tarik log akses ke folder /finance/laporan-rahasia selama 30 hari terakhir. Identifikasi user di luar Divisi Finance yang berhasil membaca file, dan beri rekomendasi.',
    outputFormat: 'dataset',
    frequency: 'monthly',
  },
  {
    command: '/capacity-planning',
    category: 'Perencanaan',
    title: 'Perencanaan kapasitas',
    description: 'Prediksi kebutuhan kapasitas infrastruktur.',
    exampleGoal:
      'Prediksi kebutuhan storage cluster Hadoop 6 bulan ke depan berdasar growth 12% per bulan. Rekomendasikan upgrade node atau pembelian disk baru beserta estimasi biaya.',
    outputFormat: 'report',
    frequency: 'quarterly',
  },
]);

const IT_MANAGER = section('it', 'manager', [
  {
    command: '/it-report-bulanan',
    category: 'Pelaporan',
    title: 'Laporan IT bulanan',
    description: 'Susun laporan IT bulanan untuk Direktur.',
    exampleGoal:
      'Susun laporan IT bulan Mei 2026: 17 insiden (3 P1), realisasi SLA 99,82%, capex Rp 4,2 M dari pagu Rp 5 M, dan progress 5 inisiatif transformasi digital.',
    outputFormat: 'report',
    frequency: 'monthly',
    stakeholders: ['finance'],
  },
  {
    command: '/vendor-evaluation',
    category: 'Vendor',
    title: 'Evaluasi vendor IT',
    description: 'Skoring performa vendor IT.',
    exampleGoal:
      'Evaluasi performa 3 vendor SOC outsourcing periode 2025-2026: rata-rata MTTR, jumlah false positive, kepatuhan SLA, dan rekomendasi perpanjangan / re-tender.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['procurement'],
  },
  {
    command: '/budget-tracking',
    category: 'Anggaran',
    title: 'Tracking anggaran IT',
    description: 'Pantau realisasi anggaran IT vs pagu.',
    exampleGoal:
      'Bandingkan realisasi anggaran IT Q2 2026 (Rp 18,4 M) terhadap pagu (Rp 22 M). Identifikasi line item yang berisiko over budget di kuartal berikutnya.',
    outputFormat: 'dashboard',
    frequency: 'monthly',
    stakeholders: ['finance'],
  },
  {
    command: '/sla-monitoring',
    category: 'Monitoring',
    title: 'Monitoring SLA',
    description: 'Laporkan pencapaian SLA per layanan.',
    exampleGoal:
      'Buat dashboard pencapaian SLA 12 layanan kritikal selama Mei 2026. Highlight layanan ATM Switching yang turun ke 99,78% (target 99,95%) dan akar masalahnya.',
    outputFormat: 'dashboard',
    frequency: 'monthly',
  },
  {
    command: '/security-compliance',
    category: 'Security',
    title: 'Kepatuhan keamanan',
    description: 'Laporkan kepatuhan kontrol keamanan.',
    exampleGoal:
      'Cek kepatuhan kontrol ISO 27001 (114 kontrol) versi audit terakhir. Identifikasi gap pada kontrol A.12 (operations security) dan susun action plan 30/60/90 hari.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['legal'],
  },
]);

const IT_DIREKTUR = section('it', 'direktur', [
  {
    command: '/strategic-it-plan',
    category: 'Strategi',
    title: 'Rencana strategis IT',
    description: 'Susun strategic IT plan multi-tahun.',
    exampleGoal:
      'Susun draf IT Strategic Plan 2026-2028 yang menutup gap dari hasil maturity assessment terakhir (level 2,4 dari 5) dan selaras dengan target RBB Direksi.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['finance', 'operations'],
  },
  {
    command: '/digital-transformation',
    category: 'Strategi',
    title: 'Roadmap transformasi digital',
    description: 'Roadmap transformasi digital korporasi.',
    exampleGoal:
      'Buat roadmap digital transformation untuk 6 unit bisnis prioritas (Retail Banking, Wholesale, Treasury, Mikro, Syariah, Operations) periode 2026 H2 - 2027 H1.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['operations', 'marketing'],
  },
  {
    command: '/risk-assessment-it',
    category: 'Risiko',
    title: 'Asesmen risiko IT',
    description: 'Identifikasi top IT risk eksekutif.',
    exampleGoal:
      'Identifikasi 10 top IT risk korporasi dengan inherent / residual rating, mitigasi, dan owner. Petakan terhadap matriks 5x5 Direksi periode Juni 2026.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['legal'],
  },
]);

// =====================================================================
//  HRD
// =====================================================================

const HRD_STAFF = section('hrd', 'staff', [
  {
    command: '/input-karyawan',
    category: 'Administrasi',
    title: 'Input data karyawan baru',
    description: 'Tambah karyawan baru ke sistem HRIS.',
    exampleGoal:
      'Input data 12 karyawan baru batch onboarding 1 Juni 2026 ke HRIS: NIP, jabatan Officer, unit kerja, golongan, dan upload kontrak PKWT 2 tahun.',
    outputFormat: 'notification',
    frequency: 'weekly',
  },
  {
    command: '/cek-attendance',
    category: 'Absensi',
    title: 'Cek absensi karyawan',
    description: 'Tarik data kehadiran per unit kerja.',
    exampleGoal:
      'Tarik data absensi Divisi Operasional Kantor Pusat periode 1-15 Juni 2026. Identifikasi karyawan dengan tingkat keterlambatan > 3 kali untuk dirujuk ke supervisor.',
    outputFormat: 'dataset',
    frequency: 'weekly',
  },
  {
    command: '/leave-balance',
    category: 'Cuti',
    title: 'Cek sisa cuti karyawan',
    description: 'Cek sisa hak cuti per karyawan.',
    exampleGoal:
      'Cek sisa cuti tahunan 2026 untuk semua karyawan Divisi Treasury (47 orang). Tandai yang masih > 10 hari belum diambil dan jadwalkan reminder via WA.',
    outputFormat: 'dataset',
    frequency: 'monthly',
  },
  {
    command: '/update-data-karyawan',
    category: 'Administrasi',
    title: 'Update data karyawan',
    description: 'Update data master karyawan.',
    exampleGoal:
      'Update data 28 karyawan yang baru menyelesaikan rotasi: jabatan baru, unit kerja, atasan langsung, dan grade. Sumber data: SK Mutasi nomor 042/SK/HC/VI/2026.',
    outputFormat: 'notification',
    frequency: 'on-demand',
  },
  {
    command: '/rekap-lembur',
    category: 'Payroll',
    title: 'Rekap jam lembur',
    description: 'Rekap jam lembur bulanan per unit.',
    exampleGoal:
      'Rekap jam lembur Mei 2026 per unit kerja. Total lembur Divisi IT 1.240 jam — verifikasi terhadap form persetujuan dan kirim ke Payroll untuk diproses.',
    outputFormat: 'dataset',
    frequency: 'monthly',
    stakeholders: ['finance'],
  },
]);

const HRD_SUPERVISOR = section('hrd', 'supervisor', [
  {
    command: '/rekrutmen-screening',
    category: 'Rekrutmen',
    title: 'Screening kandidat rekrutmen',
    description: 'Screening awal kandidat rekrutmen.',
    exampleGoal:
      'Screening 156 CV pelamar posisi Relationship Manager Wholesale. Sortir berdasar pengalaman > 3 tahun di corporate banking, IPK > 3,0, dan domisili Jabodetabek.',
    outputFormat: 'dataset',
    frequency: 'weekly',
  },
  {
    command: '/onboarding-karyawan',
    category: 'Onboarding',
    title: 'Onboarding karyawan baru',
    description: 'Koordinasi onboarding karyawan baru.',
    exampleGoal:
      'Siapkan onboarding pack untuk 12 karyawan batch 1 Juni 2026: jadwal induksi 5 hari, akses sistem, name tag, kelengkapan kantor, dan buddy assignment per orang.',
    outputFormat: 'report',
    frequency: 'monthly',
    stakeholders: ['it', 'ga'],
  },
  {
    command: '/training-schedule',
    category: 'Training',
    title: 'Jadwal pelatihan',
    description: 'Susun jadwal pelatihan internal/external.',
    exampleGoal:
      'Susun jadwal Pelatihan Risk Management Q3 2026 untuk 84 peserta dari 6 cabang. Bagi ke 4 batch, kontak trainer eksternal, dan booking ruang Training Center lt. 8.',
    outputFormat: 'report',
    frequency: 'monthly',
  },
  {
    command: '/kpi-input',
    category: 'Performance',
    title: 'Input KPI karyawan',
    description: 'Input data KPI per karyawan.',
    exampleGoal:
      'Input KPI semester 1 2026 untuk 142 karyawan Divisi Operasional. Validasi terhadap form penilaian atasan dan flag KPI di bawah 80% untuk PIP plan.',
    outputFormat: 'dataset',
    frequency: 'quarterly',
  },
]);

const HRD_MANAGER = section('hrd', 'manager', [
  {
    command: '/attendance-report',
    category: 'Pelaporan',
    title: 'Laporan absensi konsolidasi',
    description: 'Laporan absensi konsolidasi korporasi.',
    exampleGoal:
      'Susun laporan absensi konsolidasi Mei 2026 untuk 6 cabang dan kantor pusat. Tampilkan tingkat kehadiran, keterlambatan, dan absensi tanpa keterangan per divisi.',
    outputFormat: 'dashboard',
    frequency: 'monthly',
  },
  {
    command: '/turnover-analysis',
    category: 'Analitik',
    title: 'Analisa turnover',
    description: 'Analisa turnover karyawan.',
    exampleGoal:
      'Analisa turnover 12 bulan terakhir per divisi dan generasi karyawan. Tingkat turnover IT 18% (industri 12%) — uraikan alasan resign dan rekomendasikan retention plan.',
    outputFormat: 'report',
    frequency: 'quarterly',
  },
  {
    command: '/training-needs',
    category: 'Training',
    title: 'Analisa training needs',
    description: 'Analisa kebutuhan pelatihan korporasi.',
    exampleGoal:
      'Analisa training needs 2026 berdasar hasil performance review dan competency gap. Susun katalog 24 program prioritas dan estimasi biaya per program.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['finance'],
  },
  {
    command: '/org-structure',
    category: 'Organisasi',
    title: 'Review struktur organisasi',
    description: 'Review struktur organisasi.',
    exampleGoal:
      'Review struktur organisasi Divisi Risk Management. Identifikasi span of control > 12 langsung, jabatan kosong > 3 bulan, dan rekomendasi restrukturisasi.',
    outputFormat: 'report',
    frequency: 'quarterly',
  },
  {
    command: '/payroll-summary',
    category: 'Payroll',
    title: 'Ringkasan payroll',
    description: 'Ringkasan payroll bulanan korporasi.',
    exampleGoal:
      'Susun ringkasan payroll Mei 2026: total gaji pokok Rp 48,2 M, tunjangan Rp 12,4 M, lembur Rp 2,1 M, PPh 21 Rp 8,4 M. Komparasi terhadap bulan sebelumnya.',
    outputFormat: 'report',
    frequency: 'monthly',
    stakeholders: ['finance'],
  },
]);

const HRD_DIREKTUR = section('hrd', 'direktur', [
  {
    command: '/workforce-planning',
    category: 'Strategi',
    title: 'Workforce planning',
    description: 'Susun workforce plan multi-tahun.',
    exampleGoal:
      'Susun workforce plan 2026-2028 mengantisipasi pensiun 142 karyawan dan ekspansi 3 cabang baru. Petakan demand vs supply per cluster jabatan.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['finance', 'operations'],
  },
  {
    command: '/talent-management',
    category: 'Strategi',
    title: 'Talent management plan',
    description: 'Susun talent management plan.',
    exampleGoal:
      'Susun talent management plan 2026: 9-box mapping 1.847 karyawan, identifikasi 124 top talent, suksesi 38 posisi kritikal, dan IDP per talent.',
    outputFormat: 'report',
    frequency: 'quarterly',
  },
  {
    command: '/hr-strategic-report',
    category: 'Strategi',
    title: 'Laporan strategis HR',
    description: 'Laporan strategis HR untuk Direksi.',
    exampleGoal:
      'Susun laporan strategis HR untuk RUPS 2026: realisasi headcount, biaya per karyawan, engagement index, turnover, dan progres transformasi people.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['finance'],
  },
]);

// =====================================================================
//  Finance
// =====================================================================

const FINANCE_STAFF = section('finance', 'staff', [
  {
    command: '/proses-invoice',
    category: 'AP',
    title: 'Proses invoice vendor',
    description: 'Input dan proses invoice vendor.',
    exampleGoal:
      'Proses 38 invoice vendor masuk hari ini. Validasi nomor PO, kelengkapan dokumen Faktur Pajak, dan kirim ke approval atasan untuk yang > Rp 50 juta.',
    outputFormat: 'dataset',
    frequency: 'daily',
  },
  {
    command: '/cek-payment-status',
    category: 'AP',
    title: 'Cek status pembayaran',
    description: 'Cek status pembayaran invoice.',
    exampleGoal:
      'Cek status pembayaran invoice PT Wijaya Karya Konstruksi periode Maret-Mei 2026. Total 14 invoice senilai Rp 2,8 M — beri status per invoice dan estimasi cair.',
    outputFormat: 'dataset',
    frequency: 'weekly',
  },
  {
    command: '/input-budget',
    category: 'Budgeting',
    title: 'Input usulan budget',
    description: 'Input usulan budget unit kerja.',
    exampleGoal:
      'Input usulan budget 2027 dari 14 unit kerja. Total usulan Rp 184 M (vs realisasi 2025 Rp 156 M). Validasi format template dan kelengkapan justifikasi per line item.',
    outputFormat: 'dataset',
    frequency: 'quarterly',
  },
  {
    command: '/rekap-pengeluaran',
    category: 'Pelaporan',
    title: 'Rekap pengeluaran harian',
    description: 'Rekap pengeluaran kas per hari.',
    exampleGoal:
      'Rekap pengeluaran kas hari ini di rekening operasional Bank Mandiri 1234567890. Total 27 transaksi senilai Rp 482 juta. Tampilkan per kategori beban.',
    outputFormat: 'dataset',
    frequency: 'daily',
  },
  {
    command: '/match-po-invoice',
    category: 'AP',
    title: 'Matching PO vs invoice',
    description: '3-way match antara PO, GR, dan invoice.',
    exampleGoal:
      'Lakukan 3-way match untuk 56 invoice batch hari ini. Highlight invoice yang harga unit-nya menyimpang > 5% dari PO atau GR-nya belum di-post.',
    outputFormat: 'report',
    frequency: 'daily',
    stakeholders: ['procurement'],
  },
]);

const FINANCE_SUPERVISOR = section('finance', 'supervisor', [
  {
    command: '/budget-reconciliation',
    category: 'Budgeting',
    title: 'Rekonsiliasi budget',
    description: 'Rekonsiliasi budget vs realisasi.',
    exampleGoal:
      'Rekonsiliasi budget vs realisasi Mei 2026 untuk Divisi IT. Pagu Rp 22 M, realisasi Rp 18,4 M. Identifikasi line item over (jika ada) dan klarifikasi ke divisi.',
    outputFormat: 'report',
    frequency: 'monthly',
  },
  {
    command: '/cashflow-monitoring',
    category: 'Treasury',
    title: 'Monitoring cashflow',
    description: 'Monitoring posisi cashflow harian.',
    exampleGoal:
      'Susun monitoring cashflow 7 hari ke depan. Saldo awal Rp 24,8 M, proyeksi inflow Rp 18 M, outflow Rp 22,4 M. Highlight tanggal yang berisiko negatif.',
    outputFormat: 'dashboard',
    frequency: 'daily',
  },
  {
    command: '/approval-pending',
    category: 'AP',
    title: 'Daftar approval pending',
    description: 'Daftar transaksi menunggu approval.',
    exampleGoal:
      'Tarik semua approval pending di sistem ERP per pukul 16.00 hari ini. 24 transaksi menunggu, dengan 3 transaksi > 5 hari. Eskalasi ke Manager Finance.',
    outputFormat: 'dataset',
    frequency: 'daily',
  },
  {
    command: '/tax-calculation',
    category: 'Pajak',
    title: 'Kalkulasi pajak',
    description: 'Kalkulasi pajak terutang bulanan.',
    exampleGoal:
      'Hitung PPh 21, 23, dan 4(2) untuk masa Mei 2026. Rekap per kategori beban, validasi bukti potong, dan siapkan SPT Masa untuk e-Filing tanggal 10 Juni.',
    outputFormat: 'report',
    frequency: 'monthly',
  },
]);

const FINANCE_MANAGER = section('finance', 'manager', [
  {
    command: '/financial-report',
    category: 'Pelaporan',
    title: 'Laporan keuangan bulanan',
    description: 'Susun laporan keuangan bulanan.',
    exampleGoal:
      'Susun laporan keuangan Mei 2026 (PL, BS, CF) versi management. Bandingkan terhadap budget dan periode sama tahun lalu. Sertakan 5 variansi terbesar.',
    outputFormat: 'report',
    frequency: 'monthly',
  },
  {
    command: '/budget-variance',
    category: 'Budgeting',
    title: 'Analisa variansi budget',
    description: 'Analisa variansi budget per divisi.',
    exampleGoal:
      'Analisa variansi budget Mei 2026 per divisi. Highlight 4 divisi dengan variansi unfavorable > 10% dan minta klarifikasi resmi dari masing-masing kepala divisi.',
    outputFormat: 'report',
    frequency: 'monthly',
  },
  {
    command: '/forecast-revenue',
    category: 'Forecasting',
    title: 'Forecast pendapatan',
    description: 'Forecast pendapatan rolling 6 bulan.',
    exampleGoal:
      'Susun forecast revenue 6 bulan ke depan berbasis aktual YTD dan asumsi makro terbaru (BI Rate 5,75%, inflasi 3,4%). Pisahkan per segmen bisnis.',
    outputFormat: 'dashboard',
    frequency: 'monthly',
  },
  {
    command: '/cost-analysis',
    category: 'Analitik',
    title: 'Analisa biaya',
    description: 'Analisa struktur biaya korporasi.',
    exampleGoal:
      'Analisa struktur biaya YTD Mei 2026. Beban personil 48%, beban umum 22%, beban IT 14%, beban marketing 9%, beban lain 7%. Rekomendasikan 3 area cost saving.',
    outputFormat: 'report',
    frequency: 'quarterly',
  },
  {
    command: '/audit-trail-finance',
    category: 'Audit',
    title: 'Audit trail transaksi',
    description: 'Tarik audit trail transaksi keuangan.',
    exampleGoal:
      'Tarik audit trail jurnal manual > Rp 100 juta bulan Mei 2026 untuk persiapan audit eksternal. Verifikasi approval, supporting document, dan klasifikasi akun.',
    outputFormat: 'dataset',
    frequency: 'monthly',
    stakeholders: ['legal'],
  },
]);

const FINANCE_DIREKTUR = section('finance', 'direktur', [
  {
    command: '/strategic-finance',
    category: 'Strategi',
    title: 'Strategi keuangan korporasi',
    description: 'Strategi keuangan multi-tahun.',
    exampleGoal:
      'Susun strategi keuangan 2026-2028: target ROE 14%, CAR 22%, NIM 5,4%. Sertakan capital plan, funding strategy, dan stress test sederhana.',
    outputFormat: 'report',
    frequency: 'quarterly',
  },
  {
    command: '/risk-assessment-finance',
    category: 'Risiko',
    title: 'Asesmen risiko finansial',
    description: 'Asesmen risiko finansial korporasi.',
    exampleGoal:
      'Identifikasi 10 top financial risk korporasi (likuiditas, pasar, kredit, operasional). Petakan ke matriks risiko 5x5 dan rancang mitigasi per risiko.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['legal'],
  },
  {
    command: '/investment-analysis',
    category: 'Investasi',
    title: 'Analisa investasi',
    description: 'Analisa kelayakan investasi.',
    exampleGoal:
      'Analisa kelayakan investasi data center on-prem Rp 84 M vs sewa cloud Rp 12 M/tahun untuk 5 tahun. Hitung NPV, IRR, payback, dan rekomendasi.',
    outputFormat: 'report',
    frequency: 'on-demand',
    stakeholders: ['it'],
  },
]);

// =====================================================================
//  Operations
// =====================================================================

const OPS_STAFF = section('operations', 'staff', [
  {
    command: '/cek-stock',
    category: 'Inventory',
    title: 'Cek stok barang',
    description: 'Cek posisi stok per SKU.',
    exampleGoal:
      'Cek posisi stok 12 SKU prioritas di Gudang Cikarang. SKU AGR-1042 (pupuk NPK 50kg) tersisa 124 sak dari minimum stock 500 — siapkan permintaan replenishment.',
    outputFormat: 'dataset',
    frequency: 'daily',
  },
  {
    command: '/update-inventory',
    category: 'Inventory',
    title: 'Update data inventory',
    description: 'Update data inventory setelah movement.',
    exampleGoal:
      'Update inventory setelah penerimaan 18 truk hari ini (total 2.400 ton). Validasi terhadap delivery order vendor PT Saprotan Utama dan post ke ERP.',
    outputFormat: 'notification',
    frequency: 'daily',
  },
  {
    command: '/track-order',
    category: 'Logistik',
    title: 'Track status pesanan',
    description: 'Track status pengiriman pesanan.',
    exampleGoal:
      'Track status 42 sales order yang akan dikirim besok ke wilayah Jawa Tengah. Pastikan armada, dokumen, dan kontak penerima sudah lengkap.',
    outputFormat: 'dataset',
    frequency: 'daily',
  },
  {
    command: '/jadwal-produksi',
    category: 'Produksi',
    title: 'Jadwal produksi',
    description: 'Susun jadwal produksi harian.',
    exampleGoal:
      'Susun jadwal produksi line A dan B besok berdasar sales order 320 ton dan stok bahan baku tersedia. Sesuaikan dengan shift dan jam henti maintenance.',
    outputFormat: 'report',
    frequency: 'daily',
  },
  {
    command: '/quality-check',
    category: 'QA',
    title: 'Quality check produksi',
    description: 'Catat hasil quality check produksi.',
    exampleGoal:
      'Catat hasil QC batch produksi 2026-06-06 untuk line A. Sample 32 unit — 30 lolos spec (94%) dan 2 reject. Catat penyebab reject dan kategorinya.',
    outputFormat: 'report',
    frequency: 'daily',
  },
]);

const OPS_SUPERVISOR = section('operations', 'supervisor', [
  {
    command: '/process-optimization',
    category: 'Optimasi',
    title: 'Optimasi proses operasional',
    description: 'Identifikasi peluang optimasi proses.',
    exampleGoal:
      'Telusuri data produksi line A 30 hari terakhir. Identifikasi 3 langkah proses dengan cycle time terlama dan usulkan eksperimen perbaikan.',
    outputFormat: 'report',
    frequency: 'monthly',
  },
  {
    command: '/workflow-monitoring',
    category: 'Monitoring',
    title: 'Monitoring workflow',
    description: 'Monitoring workflow operasional.',
    exampleGoal:
      'Pantau workflow approval sales order 14 hari terakhir. SLA approval 4 jam, namun rata-rata 6,2 jam. Identifikasi langkah mana yang menjadi bottleneck.',
    outputFormat: 'dashboard',
    frequency: 'weekly',
  },
  {
    command: '/efficiency-analysis',
    category: 'Analitik',
    title: 'Analisa efisiensi',
    description: 'Analisa efisiensi operasional.',
    exampleGoal:
      'Analisa OEE (Overall Equipment Effectiveness) line A bulan Mei: availability 84%, performance 78%, quality 96%. OEE 63% (target 70%) — uraikan losses.',
    outputFormat: 'report',
    frequency: 'monthly',
  },
  {
    command: '/resource-allocation',
    category: 'Perencanaan',
    title: 'Alokasi sumber daya',
    description: 'Alokasi resource produksi.',
    exampleGoal:
      'Rencanakan alokasi 18 operator untuk 3 line produksi minggu depan. Pertimbangkan jadwal training 4 orang dan cuti 2 orang yang sudah disetujui.',
    outputFormat: 'report',
    frequency: 'weekly',
  },
]);

const OPS_MANAGER = section('operations', 'manager', [
  {
    command: '/operations-report',
    category: 'Pelaporan',
    title: 'Laporan operasional bulanan',
    description: 'Laporan operasional bulanan.',
    exampleGoal:
      'Susun laporan operasional Mei 2026: total produksi 4.820 ton (target 5.000), OEE 63%, downtime 124 jam, dan biaya operasional Rp 14,2 M.',
    outputFormat: 'report',
    frequency: 'monthly',
  },
  {
    command: '/kpi-operational',
    category: 'KPI',
    title: 'KPI operasional',
    description: 'Dashboard KPI operasional.',
    exampleGoal:
      'Susun dashboard KPI operasional Q2 2026: produksi vs target, OEE, on-time delivery, reject rate, dan biaya per ton. Komparasi terhadap 4 kuartal sebelumnya.',
    outputFormat: 'dashboard',
    frequency: 'monthly',
  },
  {
    command: '/cost-efficiency',
    category: 'Efisiensi',
    title: 'Efisiensi biaya operasional',
    description: 'Analisa efisiensi biaya operasional.',
    exampleGoal:
      'Analisa biaya per ton produksi line A vs line B Mei 2026. Selisih Rp 142 ribu/ton — uraikan komponen biaya yang berbeda dan rekomendasi penyamaan.',
    outputFormat: 'report',
    frequency: 'monthly',
    stakeholders: ['finance'],
  },
  {
    command: '/bottleneck-analysis',
    category: 'Analitik',
    title: 'Analisa bottleneck',
    description: 'Analisa bottleneck proses.',
    exampleGoal:
      'Identifikasi bottleneck end-to-end pesanan sampai pengiriman. Rata-rata lead time 9 hari (target 7) — buat fishbone dan rekomendasi 3 perbaikan prioritas.',
    outputFormat: 'report',
    frequency: 'quarterly',
  },
]);

const OPS_DIREKTUR = section('operations', 'direktur', [
  {
    command: '/strategic-operations',
    category: 'Strategi',
    title: 'Strategi operasional',
    description: 'Strategi operasional multi-tahun.',
    exampleGoal:
      'Susun strategi operasional 2026-2028: target kapasitas produksi 72.000 ton/tahun, ekspansi gudang regional, dan otomasi 3 line eksisting.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['finance'],
  },
  {
    command: '/supply-chain-optimization',
    category: 'Supply Chain',
    title: 'Optimasi supply chain',
    description: 'Optimasi end-to-end supply chain.',
    exampleGoal:
      'Susun roadmap optimasi supply chain end-to-end: cost-to-serve, inventory turn, dan supplier consolidation. Target penurunan biaya logistik 8% dalam 12 bulan.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['procurement', 'finance'],
  },
]);

// =====================================================================
//  Legal
// =====================================================================

const LEGAL_STAFF = section('legal', 'staff', [
  {
    command: '/review-contract',
    category: 'Kontrak',
    title: 'Review kontrak',
    description: 'Review draf kontrak komersial.',
    exampleGoal:
      'Review draf kontrak kerjasama dengan PT Telkom (kerjasama jaringan internet, nilai Rp 4,8 M / 24 bulan). Cek klausul terminasi, SLA, denda, dan force majeure.',
    outputFormat: 'report',
    frequency: 'on-demand',
  },
  {
    command: '/template-perjanjian',
    category: 'Kontrak',
    title: 'Susun template perjanjian',
    description: 'Susun template perjanjian standar.',
    exampleGoal:
      'Susun template Perjanjian Kerahasiaan (NDA) versi 2026 mengacu pada UU PDP No. 27/2022 dan kebijakan internal Risk Management terbaru.',
    outputFormat: 'file',
    frequency: 'quarterly',
  },
  {
    command: '/cek-regulasi',
    category: 'Regulasi',
    title: 'Cek regulasi terbaru',
    description: 'Scan regulasi terbaru OJK / BI / Kemenkeu.',
    exampleGoal:
      'Cek POJK dan SEOJK yang terbit dalam 30 hari terakhir. Identifikasi yang relevan ke Divisi Treasury dan susun ringkasan dampak per regulasi.',
    outputFormat: 'report',
    frequency: 'weekly',
  },
  {
    command: '/draft-surat',
    category: 'Korespondensi',
    title: 'Draft surat resmi',
    description: 'Draft surat resmi keluar.',
    exampleGoal:
      'Draft surat keberatan ke Disnaker terkait NORMA PHK karyawan A (NIP 19850421). Cantumkan kronologis, dasar hukum, dan tuntutan pencabutan rekomendasi.',
    outputFormat: 'file',
    frequency: 'on-demand',
  },
]);

const LEGAL_SUPERVISOR = section('legal', 'supervisor', [
  {
    command: '/compliance-check',
    category: 'Kepatuhan',
    title: 'Cek kepatuhan regulasi',
    description: 'Cek kepatuhan regulasi internal.',
    exampleGoal:
      'Cek kepatuhan implementasi POJK No. 11/POJK.03/2022 tentang Manajemen Risiko di 6 cabang. Identifikasi gap dan rekomendasi action plan.',
    outputFormat: 'report',
    frequency: 'quarterly',
  },
  {
    command: '/regulatory-monitoring',
    category: 'Regulasi',
    title: 'Monitoring regulasi',
    description: 'Monitoring regulasi sektor.',
    exampleGoal:
      'Susun ringkasan regulasi OJK, BI, dan Kemenkeu yang terbit Q2 2026. Tandai yang implementasi-nya jatuh tempo < 90 hari dan eskalasi ke Manager Legal.',
    outputFormat: 'report',
    frequency: 'monthly',
  },
  {
    command: '/risk-assessment-legal',
    category: 'Risiko',
    title: 'Asesmen risiko hukum',
    description: 'Asesmen risiko hukum aktif.',
    exampleGoal:
      'Asesmen risiko hukum atas 24 perkara aktif (12 perdata, 9 pidana, 3 TUN). Tampilkan exposure finansial, probabilitas kalah, dan strategi penanganan.',
    outputFormat: 'report',
    frequency: 'quarterly',
  },
]);

const LEGAL_MANAGER = section('legal', 'manager', [
  {
    command: '/legal-report',
    category: 'Pelaporan',
    title: 'Laporan legal bulanan',
    description: 'Laporan legal bulanan untuk Direksi.',
    exampleGoal:
      'Susun laporan legal Mei 2026: 24 kontrak ditandatangani (nilai total Rp 124 M), 24 perkara aktif, 3 putusan baru, dan progress 5 inisiatif compliance.',
    outputFormat: 'report',
    frequency: 'monthly',
  },
  {
    command: '/policy-development',
    category: 'Kebijakan',
    title: 'Penyusunan kebijakan',
    description: 'Susun draf kebijakan internal.',
    exampleGoal:
      'Susun draf Kebijakan Whistleblowing System sesuai POJK 39/2017 dan UU 31/1999. Sertakan tata cara pelaporan, perlindungan whistleblower, dan tata kelola.',
    outputFormat: 'file',
    frequency: 'quarterly',
  },
  {
    command: '/litigation-tracker',
    category: 'Litigasi',
    title: 'Tracker litigasi',
    description: 'Tracker perkara litigasi aktif.',
    exampleGoal:
      'Susun tracker 24 perkara aktif: posisi proses, agenda sidang 4 minggu ke depan, exposure Rp 18 M total, dan kebutuhan dukungan lawyer eksternal.',
    outputFormat: 'dataset',
    frequency: 'weekly',
  },
]);

const LEGAL_DIREKTUR = section('legal', 'direktur', [
  {
    command: '/legal-strategy',
    category: 'Strategi',
    title: 'Strategi legal korporasi',
    description: 'Strategi legal multi-tahun.',
    exampleGoal:
      'Susun strategi legal 2026-2028: konsolidasi anak perusahaan, standardisasi kontrak grup, dan kebijakan ESG yang sejalan dengan Permeneg BUMN PER-2/MBU/03/2023.',
    outputFormat: 'report',
    frequency: 'quarterly',
  },
  {
    command: '/regulatory-compliance-report',
    category: 'Kepatuhan',
    title: 'Laporan kepatuhan regulasi',
    description: 'Laporan kepatuhan regulasi eksekutif.',
    exampleGoal:
      'Susun laporan kepatuhan korporasi untuk Komite Audit Q2 2026: status kepatuhan 12 regulasi prioritas, temuan, action plan, dan progress remediasi.',
    outputFormat: 'report',
    frequency: 'quarterly',
  },
]);

// =====================================================================
//  Marketing
// =====================================================================

const MKT_STAFF = section('marketing', 'staff', [
  {
    command: '/draft-content',
    category: 'Konten',
    title: 'Draft konten marketing',
    description: 'Draft konten untuk channel marketing.',
    exampleGoal:
      'Draft 4 caption Instagram untuk kampanye Tabungan Emas batch Juli 2026. Target audiens 25-35 tahun, gaya konversasional, sertakan CTA dan disclaimer OJK.',
    outputFormat: 'file',
    frequency: 'weekly',
  },
  {
    command: '/social-media-monitor',
    category: 'Monitoring',
    title: 'Monitor sosial media',
    description: 'Pantau engagement sosial media.',
    exampleGoal:
      'Pantau Instagram, TikTok, dan X resmi 7 hari terakhir. Sajikan reach, engagement rate, dan top 5 konten. Highlight komentar negatif yang perlu direspons.',
    outputFormat: 'dashboard',
    frequency: 'weekly',
  },
  {
    command: '/competitor-watch',
    category: 'Riset',
    title: 'Pantau kompetitor',
    description: 'Pantau aktivitas kompetitor.',
    exampleGoal:
      'Pantau aktivitas marketing 3 kompetitor utama (BCA, BRI, BNI) dalam 14 hari terakhir. Highlight produk baru, kampanye besar, dan tarif promo.',
    outputFormat: 'report',
    frequency: 'weekly',
  },
  {
    command: '/cek-brand-mention',
    category: 'Monitoring',
    title: 'Cek brand mention',
    description: 'Pantau brand mention di internet.',
    exampleGoal:
      'Pantau brand mention nama perusahaan di Google News, X, dan Detik selama 24 jam terakhir. Sortir negatif vs positif dan eskalasi yang berpotensi krisis.',
    outputFormat: 'report',
    frequency: 'daily',
  },
]);

const MKT_SUPERVISOR = section('marketing', 'supervisor', [
  {
    command: '/campaign-analysis',
    category: 'Kampanye',
    title: 'Analisa kampanye',
    description: 'Analisa performance kampanye.',
    exampleGoal:
      'Analisa kampanye KPR Promo Mei 2026: spend Rp 480 juta, leads 2.142, kualifikasi 38%, akad kredit 124 KPR, CPA Rp 3,8 juta. Bandingkan dengan kampanye sebelumnya.',
    outputFormat: 'report',
    frequency: 'monthly',
  },
  {
    command: '/audience-insight',
    category: 'Insight',
    title: 'Insight audiens',
    description: 'Susun insight audiens kampanye.',
    exampleGoal:
      'Susun insight audiens nasabah Tabungan Generasi-Z (18-25 tahun). Profile demografi, behavior digital, dan top 5 channel paling efektif.',
    outputFormat: 'report',
    frequency: 'quarterly',
  },
  {
    command: '/content-performance',
    category: 'Kinerja',
    title: 'Performance konten',
    description: 'Performance konten per channel.',
    exampleGoal:
      'Susun performance konten 30 hari terakhir per channel (IG, TikTok, YouTube, Blog). Identifikasi 5 konten top performer dan pola yang bisa direplikasi.',
    outputFormat: 'dashboard',
    frequency: 'monthly',
  },
]);

const MKT_MANAGER = section('marketing', 'manager', [
  {
    command: '/marketing-report',
    category: 'Pelaporan',
    title: 'Laporan marketing bulanan',
    description: 'Laporan marketing bulanan untuk Direksi.',
    exampleGoal:
      'Susun laporan marketing Mei 2026: spend Rp 1,8 M (vs budget Rp 2 M), 8 kampanye aktif, kontribusi ke akuisisi nasabah 12.400 NTB, dan ROMI rata-rata 3,8x.',
    outputFormat: 'report',
    frequency: 'monthly',
  },
  {
    command: '/roi-analysis',
    category: 'ROI',
    title: 'Analisa ROI marketing',
    description: 'Analisa ROI marketing per channel.',
    exampleGoal:
      'Hitung ROMI per channel YTD 2026: Search Ads, Meta Ads, TikTok Ads, Influencer, OOH. Identifikasi 2 channel ROMI < 1 dan rekomendasi realokasi budget.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['finance'],
  },
  {
    command: '/market-research',
    category: 'Riset',
    title: 'Riset pasar',
    description: 'Riset pasar segmen tertentu.',
    exampleGoal:
      'Riset pasar tabungan haji generasi 30-45 tahun di 5 kota besar. Estimasi TAM, perilaku menabung, kompetitor utama, dan peluang produk yang belum digarap.',
    outputFormat: 'report',
    frequency: 'quarterly',
  },
  {
    command: '/brand-health',
    category: 'Brand',
    title: 'Brand health check',
    description: 'Brand health check periodik.',
    exampleGoal:
      'Susun brand health check Q2 2026: awareness, consideration, preference, dan NPS. Bandingkan dengan 3 kompetitor utama dan tren 4 kuartal terakhir.',
    outputFormat: 'dashboard',
    frequency: 'quarterly',
  },
]);

const MKT_DIREKTUR = section('marketing', 'direktur', [
  {
    command: '/marketing-strategy',
    category: 'Strategi',
    title: 'Strategi marketing',
    description: 'Strategi marketing multi-tahun.',
    exampleGoal:
      'Susun strategi marketing 2026-2028: positioning, target segmen prioritas, channel mix, brand investment Rp 84 M, dan target NTB 320.000 nasabah.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['finance'],
  },
  {
    command: '/market-expansion',
    category: 'Ekspansi',
    title: 'Rencana ekspansi pasar',
    description: 'Rencana ekspansi pasar / produk baru.',
    exampleGoal:
      'Susun rencana ekspansi ke Indonesia Timur (Sulawesi, Maluku, Papua) periode 2027. Strategi cabang, digital, dan kemitraan dengan tinjauan capex per opsi.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['operations', 'finance'],
  },
]);

// =====================================================================
//  Procurement
// =====================================================================

const PROC_STAFF = section('procurement', 'staff', [
  {
    command: '/cek-vendor',
    category: 'Vendor',
    title: 'Cek data vendor',
    description: 'Cek data vendor di master list.',
    exampleGoal:
      'Cek profil PT Saprotan Utama: status NPWP, klasifikasi vendor, history transaksi 12 bulan (Rp 28 M / 14 transaksi), dan rating evaluasi terakhir.',
    outputFormat: 'dataset',
    frequency: 'on-demand',
  },
  {
    command: '/input-purchase-order',
    category: 'PO',
    title: 'Input purchase order',
    description: 'Input PO baru ke sistem ERP.',
    exampleGoal:
      'Input PO baru ke ERP: nomor PO/06/2026/0142, vendor PT Wijaya Karya, item 18 line, total Rp 1,4 M, term pembayaran 30 hari, kirim ke approval Manager.',
    outputFormat: 'notification',
    frequency: 'daily',
  },
  {
    command: '/track-pengadaan',
    category: 'Tracking',
    title: 'Track status pengadaan',
    description: 'Track status pengadaan aktif.',
    exampleGoal:
      'Tampilkan 18 pengadaan aktif beserta tahap (RFP, evaluasi, negosiasi, kontrak). Highlight pengadaan yang sudah > 30 hari menggantung di satu tahap.',
    outputFormat: 'dataset',
    frequency: 'weekly',
  },
]);

const PROC_SUPERVISOR = section('procurement', 'supervisor', [
  {
    command: '/vendor-evaluation-proc',
    category: 'Vendor',
    title: 'Evaluasi vendor periodik',
    description: 'Evaluasi periodik vendor aktif.',
    exampleGoal:
      'Evaluasi 24 vendor aktif Q2 2026: tepat waktu, kualitas, harga kompetitif, responsif. Sortir vendor rating < 3,0 untuk rencana penggantian.',
    outputFormat: 'report',
    frequency: 'quarterly',
  },
  {
    command: '/tender-monitoring',
    category: 'Tender',
    title: 'Monitor tender',
    description: 'Monitor tender aktif.',
    exampleGoal:
      'Monitor 6 tender aktif Q2 2026 (total HPS Rp 28 M). Pantau jadwal aanwijzing, klarifikasi, pemasukan penawaran, dan pengumuman pemenang.',
    outputFormat: 'dataset',
    frequency: 'weekly',
  },
  {
    command: '/contract-expiry',
    category: 'Kontrak',
    title: 'Cek kontrak akan berakhir',
    description: 'Cek kontrak yang akan berakhir.',
    exampleGoal:
      'Cek kontrak vendor yang berakhir dalam 90 hari ke depan. Total 12 kontrak senilai Rp 14 M — siapkan strategi (perpanjang, re-tender, atau dihentikan).',
    outputFormat: 'dataset',
    frequency: 'monthly',
  },
]);

const PROC_MANAGER = section('procurement', 'manager', [
  {
    command: '/procurement-report',
    category: 'Pelaporan',
    title: 'Laporan procurement bulanan',
    description: 'Laporan procurement bulanan.',
    exampleGoal:
      'Susun laporan procurement Mei 2026: 78 PO terbit (Rp 12,4 M), 6 tender selesai, savings vs HPS 4,8%, dan vendor onboarding 4 baru.',
    outputFormat: 'report',
    frequency: 'monthly',
  },
  {
    command: '/cost-savings-analysis',
    category: 'Saving',
    title: 'Analisa cost savings',
    description: 'Analisa cost savings procurement.',
    exampleGoal:
      'Susun analisa cost savings YTD 2026: realisasi savings Rp 4,2 M (target Rp 5 M). Per kategori belanja, identifikasi peluang savings sisa 6 bulan.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['finance'],
  },
  {
    command: '/supplier-risk',
    category: 'Risiko',
    title: 'Asesmen risiko supplier',
    description: 'Asesmen risiko supplier strategis.',
    exampleGoal:
      'Asesmen risiko 12 supplier strategis (single source, ketergantungan > 60%): finansial, operasional, geopolitik. Susun mitigasi per supplier kritikal.',
    outputFormat: 'report',
    frequency: 'quarterly',
  },
]);

const PROC_DIREKTUR = section('procurement', 'direktur', [
  {
    command: '/strategic-procurement',
    category: 'Strategi',
    title: 'Strategi procurement',
    description: 'Strategi procurement multi-tahun.',
    exampleGoal:
      'Susun strategi procurement 2026-2028: kategori manajemen, sentralisasi belanja grup, TKDN > 60%, dan target savings tahunan Rp 12 M.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['finance', 'operations'],
  },
  {
    command: '/partnership-evaluation',
    category: 'Kemitraan',
    title: 'Evaluasi kemitraan strategis',
    description: 'Evaluasi kemitraan strategis.',
    exampleGoal:
      'Evaluasi 4 strategic partnership existing (Telkom, Pertamina, Pos Indonesia, PLN). Cek realisasi value capture, perpanjangan, atau eksplorasi mitra baru.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['legal'],
  },
]);

// =====================================================================
//  Customer Service
// =====================================================================

const CS_STAFF = section('cs', 'staff', [
  {
    command: '/cek-ticket',
    category: 'Ticket',
    title: 'Cek ticket pelanggan',
    description: 'Cek status ticket pelanggan.',
    exampleGoal:
      'Tampilkan status semua ticket pelanggan yang ditangani agent NIP 19920311 hari ini. Ada 24 ticket — 18 closed, 4 in-progress, 2 escalated.',
    outputFormat: 'dataset',
    frequency: 'daily',
  },
  {
    command: '/reply-template',
    category: 'Template',
    title: 'Template balasan',
    description: 'Susun template balasan keluhan.',
    exampleGoal:
      'Susun draf balasan keluhan keterlambatan transfer antar-bank > 2 jam. Bahasa empatik, jelas, sertakan SLA dan langkah follow-up untuk pelanggan.',
    outputFormat: 'file',
    frequency: 'on-demand',
  },
  {
    command: '/escalate-issue',
    category: 'Eskalasi',
    title: 'Eskalasikan issue',
    description: 'Eskalasi issue ke unit terkait.',
    exampleGoal:
      'Eskalasi ticket #CS-2026-04812 (transaksi gagal Rp 8,4 juta) ke Tim Treasury. Sertakan kronologis, bukti screenshot, dan target resolusi 2 jam.',
    outputFormat: 'notification',
    frequency: 'on-demand',
  },
  {
    command: '/customer-history',
    category: 'Pelanggan',
    title: 'Cek history pelanggan',
    description: 'Cek riwayat interaksi pelanggan.',
    exampleGoal:
      'Tarik history interaksi nasabah CIF 0042-9981 12 bulan terakhir: 14 transaksi, 3 keluhan terkait kartu debit, NPS terakhir 6/10. Siapkan ringkasan untuk RM.',
    outputFormat: 'report',
    frequency: 'on-demand',
  },
]);

const CS_SUPERVISOR = section('cs', 'supervisor', [
  {
    command: '/ticket-analysis',
    category: 'Analitik',
    title: 'Analisa ticket pelanggan',
    description: 'Analisa pola ticket pelanggan.',
    exampleGoal:
      'Analisa pola ticket 30 hari terakhir: top 5 kategori keluhan, channel masuk, dan waktu peak. Identifikasi 2 root cause untuk eskalasi ke divisi terkait.',
    outputFormat: 'report',
    frequency: 'weekly',
  },
  {
    command: '/sla-cs-monitoring',
    category: 'SLA',
    title: 'Monitor SLA CS',
    description: 'Monitor pencapaian SLA CS.',
    exampleGoal:
      'Susun monitoring SLA CS Mei 2026: First Response Time, Resolution Time, dan FCR. SLA FRT 95% < 1 menit — realisasi 92%, uraikan penyebab gap.',
    outputFormat: 'dashboard',
    frequency: 'weekly',
  },
  {
    command: '/team-performance',
    category: 'Tim',
    title: 'Performance tim CS',
    description: 'Performance tim CS per agent.',
    exampleGoal:
      'Susun performance per agent Mei 2026: jumlah ticket handle, AHT, CSAT, dan FCR. Identifikasi 3 agent top performer dan 2 yang perlu coaching.',
    outputFormat: 'report',
    frequency: 'monthly',
  },
]);

const CS_MANAGER = section('cs', 'manager', [
  {
    command: '/cs-report',
    category: 'Pelaporan',
    title: 'Laporan CS bulanan',
    description: 'Laporan CS bulanan untuk Direksi.',
    exampleGoal:
      'Susun laporan CS Mei 2026: 18.420 ticket masuk (vs 16.800 bulan lalu), CSAT 4,3/5, FCR 78%, dan eskalasi ke divisi lain 942 ticket.',
    outputFormat: 'report',
    frequency: 'monthly',
  },
  {
    command: '/customer-satisfaction',
    category: 'CSAT',
    title: 'Analisa kepuasan pelanggan',
    description: 'Analisa kepuasan pelanggan.',
    exampleGoal:
      'Susun analisa CSAT dan NPS Q2 2026. NPS turun dari 42 ke 38 — uraikan dimensi yang menurun (digital, branch, call center) dan rekomendasi perbaikan.',
    outputFormat: 'report',
    frequency: 'quarterly',
  },
  {
    command: '/improvement-plan',
    category: 'Perbaikan',
    title: 'Improvement plan CS',
    description: 'Improvement plan CS periode berjalan.',
    exampleGoal:
      'Susun improvement plan CS H2 2026: 5 inisiatif prioritas (chatbot AI, knowledge base, IVR, training, hiring) dengan owner, KPI, dan budget Rp 3,2 M.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['it', 'hrd', 'finance'],
  },
]);

// =====================================================================
//  General Affairs
// =====================================================================

const GA_STAFF = section('ga', 'staff', [
  {
    command: '/cek-aset',
    category: 'Aset',
    title: 'Cek data aset',
    description: 'Cek data aset tetap.',
    exampleGoal:
      'Cek aset tetap di Kantor Pusat lantai 4: 142 kursi, 84 meja, 28 PC desktop, 12 laptop. Bandingkan dengan stock opname terakhir dan tandai selisih.',
    outputFormat: 'dataset',
    frequency: 'monthly',
  },
  {
    command: '/maintenance-schedule',
    category: 'Maintenance',
    title: 'Jadwal maintenance fasilitas',
    description: 'Jadwal maintenance fasilitas.',
    exampleGoal:
      'Susun jadwal maintenance fasilitas Q3 2026: AC sentral, lift, genset, fire alarm di Kantor Pusat dan 3 cabang utama. Koordinasi dengan vendor terkait.',
    outputFormat: 'report',
    frequency: 'quarterly',
  },
  {
    command: '/pengajuan-fasilitas',
    category: 'Pengajuan',
    title: 'Proses pengajuan fasilitas',
    description: 'Proses pengajuan fasilitas kantor.',
    exampleGoal:
      'Proses 14 pengajuan fasilitas masuk minggu ini: 6 ATK, 4 meja kerja, 2 ruang meeting, 2 perbaikan AC. Verifikasi anggaran dan kirim approval ke supervisor.',
    outputFormat: 'dataset',
    frequency: 'weekly',
  },
]);

const GA_SUPERVISOR = section('ga', 'supervisor', [
  {
    command: '/aset-report',
    category: 'Pelaporan',
    title: 'Laporan aset',
    description: 'Laporan aset periodik.',
    exampleGoal:
      'Susun laporan aset Q2 2026: total 4.842 aset (nilai buku Rp 84,2 M), penambahan 142, penghapusan 38. Tampilkan per kategori dan per lokasi.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['finance'],
  },
  {
    command: '/vendor-ga-evaluation',
    category: 'Vendor',
    title: 'Evaluasi vendor GA',
    description: 'Evaluasi vendor GA (cleaning, security, dst).',
    exampleGoal:
      'Evaluasi 4 vendor GA Q2 2026: cleaning, security, catering, building maintenance. Skoring availability, kualitas SDM, biaya, dan kepuasan pengguna.',
    outputFormat: 'report',
    frequency: 'quarterly',
  },
  {
    command: '/budget-ga',
    category: 'Anggaran',
    title: 'Anggaran GA',
    description: 'Pantau realisasi anggaran GA.',
    exampleGoal:
      'Pantau realisasi anggaran GA Mei 2026: pagu Rp 1,8 M, realisasi Rp 1,52 M. Identifikasi line item yang berisiko over di Juni dan rekomendasi adjustment.',
    outputFormat: 'dashboard',
    frequency: 'monthly',
    stakeholders: ['finance'],
  },
]);

const GA_MANAGER = section('ga', 'manager', [
  {
    command: '/ga-report',
    category: 'Pelaporan',
    title: 'Laporan GA bulanan',
    description: 'Laporan GA bulanan untuk Direksi.',
    exampleGoal:
      'Susun laporan GA Mei 2026: utilisasi ruang kantor 78%, biaya per FTE Rp 184 ribu/hari, dan progress 4 inisiatif efisiensi (energy, ATK, fleet).',
    outputFormat: 'report',
    frequency: 'monthly',
  },
  {
    command: '/facility-planning',
    category: 'Perencanaan',
    title: 'Facility planning',
    description: 'Facility planning multi-tahun.',
    exampleGoal:
      'Susun facility planning 2026-2028: konsolidasi 3 kantor di Jakarta menjadi 1 tower, target densitas 1,4 sqm per FTE, dan estimasi capex Rp 48 M.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['finance', 'hrd'],
  },
]);

// =====================================================================
//  Cross-Department / Stakeholder
// =====================================================================

const CROSS = section(null, 'manager', [
  {
    command: '/approve-pengajuan',
    category: 'Approval',
    title: 'Approve pengajuan lintas-divisi',
    description: 'Setujui pengajuan dari unit kerja lain.',
    exampleGoal:
      'Tinjau 8 pengajuan menggantung > 24 jam dari unit lintas-divisi. Beri keputusan approve/reject/return berdasar batas wewenang dan dokumen pendukung.',
    outputFormat: 'approval',
    frequency: 'daily',
  },
  {
    command: '/cross-report',
    category: 'Pelaporan',
    title: 'Laporan lintas-divisi',
    description: 'Susun laporan gabungan lintas-divisi.',
    exampleGoal:
      'Gabungkan data realisasi IT (capex Rp 18,4 M), Finance (budget Rp 22 M), Operasional (produksi 4.820 ton) ke satu dashboard eksekutif Q2 2026.',
    outputFormat: 'dashboard',
    frequency: 'monthly',
    stakeholders: ['it', 'finance', 'operations'],
  },
]);

const CROSS_DIREKTUR = section(null, 'direktur', [
  {
    command: '/dashboard-executive',
    category: 'Eksekutif',
    title: 'Dashboard eksekutif',
    description: 'Dashboard eksekutif lintas-divisi.',
    exampleGoal:
      'Susun dashboard eksekutif Juni 2026: KPI 9 divisi, realisasi RBB, top 5 risiko, status 12 inisiatif strategis, dan agenda Direksi pekan depan.',
    outputFormat: 'dashboard',
    frequency: 'monthly',
    stakeholders: ['it', 'hrd', 'finance', 'operations', 'legal', 'marketing'],
  },
  {
    command: '/audit-compliance',
    category: 'Audit',
    title: 'Audit & kepatuhan korporasi',
    description: 'Audit & kepatuhan korporasi.',
    exampleGoal:
      'Susun status audit & kepatuhan korporasi Q2 2026: 14 temuan audit internal terbuka, 4 temuan audit eksternal, status remediasi, dan eskalasi ke Komite Audit.',
    outputFormat: 'report',
    frequency: 'quarterly',
    stakeholders: ['legal', 'finance'],
  },
]);

// =====================================================================
//  Final flat catalogue
// =====================================================================

export const CATALOG: UseCaseTemplate[] = [
  ...IT_STAFF,
  ...IT_SUPERVISOR,
  ...IT_MANAGER,
  ...IT_DIREKTUR,
  ...HRD_STAFF,
  ...HRD_SUPERVISOR,
  ...HRD_MANAGER,
  ...HRD_DIREKTUR,
  ...FINANCE_STAFF,
  ...FINANCE_SUPERVISOR,
  ...FINANCE_MANAGER,
  ...FINANCE_DIREKTUR,
  ...OPS_STAFF,
  ...OPS_SUPERVISOR,
  ...OPS_MANAGER,
  ...OPS_DIREKTUR,
  ...LEGAL_STAFF,
  ...LEGAL_SUPERVISOR,
  ...LEGAL_MANAGER,
  ...LEGAL_DIREKTUR,
  ...MKT_STAFF,
  ...MKT_SUPERVISOR,
  ...MKT_MANAGER,
  ...MKT_DIREKTUR,
  ...PROC_STAFF,
  ...PROC_SUPERVISOR,
  ...PROC_MANAGER,
  ...PROC_DIREKTUR,
  ...CS_STAFF,
  ...CS_SUPERVISOR,
  ...CS_MANAGER,
  ...GA_STAFF,
  ...GA_SUPERVISOR,
  ...GA_MANAGER,
  ...CROSS,
  ...CROSS_DIREKTUR,
];
