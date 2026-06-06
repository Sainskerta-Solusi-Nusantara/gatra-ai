// Department scope definitions — used to constrain AI to only answer
// within the user's department + jabatan domain.

import type { JabatanLevel } from '../rbac/types.js';

export interface DepartmentScope {
  id: string;
  name: string;
  domain: string;       // what this department handles
  forbidden: string[];  // topics outside this department's scope
}

export const DEPARTMENT_SCOPES: Record<string, DepartmentScope> = {
  it: {
    id: 'it',
    name: 'IT / Teknologi Informasi',
    domain: 'infrastruktur IT, server, jaringan, database, keamanan siber, aplikasi, helpdesk teknis, deployment, backup, monitoring sistem',
    forbidden: [
      'HRD, rekrutmen, payroll, absensi, cuti, penilaian kinerja, pelatihan SDM',
      'keuangan, laporan keuangan, budgeting, invoice, pajak, akuntansi',
      'operasional produksi, supply chain, inventory, logistik gudang',
      'hukum, kontrak, perjanjian, regulasi, litigasi',
      'pemasaran, iklan, content marketing, social media, branding',
      'pengadaan barang, tender, vendor assessment',
      'customer service, tiket pelanggan, komplain',
      'general affairs, aset fisik, maintenance gedung, fasilitas kantor',
    ],
  },
  hrd: {
    id: 'hrd',
    name: 'HRD / Sumber Daya Manusia',
    domain: 'rekrutmen, payroll, absensi, cuti, penilaian kinerja, pelatihan SDM, data karyawan, struktur organisasi, onboarding',
    forbidden: [
      'IT, server, jaringan, database, programming, deployment aplikasi',
      'keuangan korporat, laporan keuangan, budgeting strategis, investasi',
      'operasional produksi, mesin, inventory bahan baku',
      'hukum bisnis, kontrak komersial, litigasi',
      'pemasaran digital, iklan berbayar, campaign marketing',
      'pengadaan strategis, tender besar, supply chain',
    ],
  },
  finance: {
    id: 'finance',
    name: 'Finance / Keuangan',
    domain: 'laporan keuangan, budgeting, cashflow, invoice, pajak, akuntansi, audit keuangan, forecasting, cost analysis, treasury',
    forbidden: [
      'HRD operasional, rekrutmen, absensi, cuti karyawan',
      'IT teknis, server, maintenance aplikasi, helpdesk IT',
      'operasional produksi harian, mesin produksi',
      'hukum kontrak, perjanjian legal',
      'pemasaran konten, social media management',
    ],
  },
  operations: {
    id: 'operations',
    name: 'Operations / Operasional',
    domain: 'produksi, supply chain, inventory, logistik, quality control, jadwal operasional, efisiensi proses, KPI operasional',
    forbidden: [
      'IT, server, pemrograman, keamanan siber',
      'HRD, rekrutmen, payroll, penilaian kinerja individu',
      'keuangan korporat, laporan keuangan strategis, investasi',
      'hukum, kontrak, perjanjian legal',
      'pemasaran, iklan, branding',
    ],
  },
  legal: {
    id: 'legal',
    name: 'Legal / Hukum',
    domain: 'kontrak, perjanjian, regulasi, compliance, litigasi, kebijakan perusahaan, aspek hukum bisnis, HKI',
    forbidden: [
      'IT teknis, server, aplikasi, deployment',
      'HRD operasional, rekrutmen, absensi',
      'keuangan harian, invoice, budgeting operasional',
      'operasional produksi, mesin, inventory',
      'pemasaran konten, social media',
    ],
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing / Pemasaran',
    domain: 'branding, iklan, content marketing, social media, riset pasar, campaign analysis, SEO, influencer, marketing strategy',
    forbidden: [
      'IT teknis, server maintenance, programming',
      'HRD, rekrutmen, payroll, absensi karyawan',
      'keuangan strategis, laporan keuangan konsolidasi',
      'operasional produksi, supply chain detail',
      'hukum, kontrak, litigasi',
    ],
  },
  procurement: {
    id: 'procurement',
    name: 'Procurement / Pengadaan',
    domain: 'pengadaan barang/jasa, tender, vendor management, kontrak pengadaan, evaluasi vendor, purchase order',
    forbidden: [
      'IT, server, programming, aplikasi',
      'HRD, rekrutmen, penilaian kinerja',
      'keuangan korporat, laporan keuangan strategis',
      'operasional produksi detail, mesin',
      'pemasaran, iklan, branding',
      'hukum umum, litigasi',
    ],
  },
  cs: {
    id: 'cs',
    name: 'Customer Service',
    domain: 'tiket pelanggan, komplain, SLA customer, helpdesk pelanggan, kepuasan pelanggan, feedback pelanggan',
    forbidden: [
      'IT internal, server, aplikasi internal',
      'HRD internal, payroll, data karyawan internal',
      'keuangan korporat, laporan keuangan',
      'operasional produksi internal',
      'hukum, kontrak, perjanjian',
      'pengadaan strategis, tender',
    ],
  },
  ga: {
    id: 'ga',
    name: 'General Affairs',
    domain: 'aset fisik, maintenance gedung, fasilitas kantor, pengadaan ATK, inventaris kantor, keamanan gedung, kebersihan',
    forbidden: [
      'IT teknis, server, pemrograman',
      'HRD, rekrutmen, penilaian kinerja', 
      'keuangan korporat, laporan keuangan strategis',
      'operasional produksi, mesin industri',
      'hukum, kontrak komersial, litigasi',
      'pemasaran, branding, iklan',
    ],
  },
};

const JABATAN_DESCRIPTIONS: Record<JabatanLevel, string> = {
  staff: 'STAFF — tugas operasional harian. Tidak boleh mengambil keputusan strategis atau mengakses data di luar wewenang jabatan.',
  supervisor: 'SUPERVISOR — mengawasi operasional tim. Boleh mengakses data analitis tim sendiri, tapi tidak lintas departemen.',
  manager: 'MANAGER — mengelola departemen. Boleh data agregat dan laporan. Tidak boleh data departemen lain tanpa izin direktur.',
  direktur: 'DIREKTUR / KEPALA DIVISI — wewenang penuh atas departemen sendiri. Boleh meminta laporan lintas departemen untuk kepentingan strategis.',
  admin_system: 'ADMIN SISTEM — wewenang penuh atas seluruh sistem. Tidak terikat batasan departemen.',
};

export function getScopePrompt(departmentId: string | null, jabatan: JabatanLevel): string {
  if (jabatan === 'admin_system') {
    return `Anda adalah asisten AI sistem. Wewenang penuh tanpa batasan departemen.`;
  }

  const scope = departmentId ? DEPARTMENT_SCOPES[departmentId] : null;
  if (!scope) {
    return `Anda adalah asisten AI. Tidak ada batasan departemen khusus.`;
  }

  const jabatanDesc = JABATAN_DESCRIPTIONS[jabatan] ?? '';

  return `Anda adalah asisten AI untuk departemen ${scope.name}.

BATASAN DEPARTEMEN:
Anda HANYA boleh menjawab pertanyaan yang terkait dengan: ${scope.domain}

LARANGAN:
Berikut adalah topik yang BUKAN wewenang departemen Anda. WAJIB TOLAK dengan sopan:
${scope.forbidden.map((f) => `- ${f}`).join('\n')}

JABATAN ANDA:
${jabatanDesc}

ATURAN:
1. Jika user bertanya tentang topik di luar wewenang departemen Anda → TOLAK dengan sopan. Jelaskan bahwa itu domain departemen lain.
2. Jika user meminta data/jabatan di atas wewenang Anda → TOLAK. Sarankan untuk menghubungi atasan.
3. Jika user adalah direktur dan membutuhkan data lintas departemen → bantu dengan batasan kewajaran.
4. Selalu prioritaskan keamanan data perusahaan.`;
}
