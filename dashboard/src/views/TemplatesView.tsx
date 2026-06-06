import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  api,
  type AuthIdentity,
  type TemplateDepartmentId,
  type TemplateFrequency,
  type TemplateOutputFormat,
  type UseCaseTemplate,
} from '../api';

const DEPARTMENT_LABELS: Record<TemplateDepartmentId, string> = {
  it: 'IT',
  hrd: 'HRD',
  finance: 'Finance',
  operations: 'Operations',
  legal: 'Legal',
  marketing: 'Marketing',
  procurement: 'Procurement',
  cs: 'Customer Service',
  ga: 'General Affairs',
  'cross-department': 'Lintas Departemen',
};

const JABATAN_LABELS: Record<string, string> = {
  staff: 'Staff',
  supervisor: 'Supervisor',
  manager: 'Manager',
  direktur: 'Direktur',
  admin_system: 'Admin Sistem',
};

const FREQ_LABELS: Record<TemplateFrequency, string> = {
  'one-time': 'Sekali',
  daily: 'Harian',
  weekly: 'Mingguan',
  monthly: 'Bulanan',
  continuous: 'Berkesinambungan',
  quarterly: 'Kuartalan',
  'on-demand': 'Atas permintaan',
};

const OUTPUT_LABELS: Record<TemplateOutputFormat, string> = {
  report: 'Laporan',
  notification: 'Notifikasi',
  data: 'Data',
  action: 'Aksi',
  analysis: 'Analisa',
  dataset: 'Dataset',
  dashboard: 'Dashboard',
  file: 'File',
  approval: 'Persetujuan',
};

export default function TemplatesView() {
  const nav = useNavigate();
  const [me, setMe] = useState<AuthIdentity | null>(null);
  const [items, setItems] = useState<UseCaseTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [jabatanFilter, setJabatanFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [outputFilter, setOutputFilter] = useState<string>('');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [includeAll, setIncludeAll] = useState<boolean>(true);

  useEffect(() => {
    api.me().then((r) => setMe(r.user)).catch(() => undefined);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: { department?: string; jabatan?: string; category?: string; includeAll?: boolean } = {};
    if (deptFilter) params.department = deptFilter;
    if (jabatanFilter) params.jabatan = jabatanFilter;
    if (categoryFilter) params.category = categoryFilter;
    if (includeAll) params.includeAll = true;
    api
      .listTemplates(params)
      .then((res) => {
        setItems(res.items);
        setCategories(res.categories);
        setTotal(res.count);
        setErr(null);
      })
      .catch((e) => setErr(String(e.message ?? e)))
      .finally(() => setLoading(false));
  }, [deptFilter, jabatanFilter, categoryFilter, includeAll]);

  const visibleItems = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((t) => {
      if (outputFilter && t.outputFormat !== outputFilter) return false;
      if (frequencyFilter && t.frequency !== frequencyFilter) return false;
      if (!s) return true;
      return (
        t.command.toLowerCase().includes(s) ||
        t.title.toLowerCase().includes(s) ||
        t.description.toLowerCase().includes(s) ||
        t.category.toLowerCase().includes(s)
      );
    });
  }, [items, outputFilter, frequencyFilter, search]);

  // Stats: count per department in current filter
  const stats = useMemo(() => {
    const byDept = new Map<string, number>();
    const byJabatan = new Map<string, number>();
    for (const t of visibleItems) {
      const d = (t.departmentId ?? 'cross-department') as TemplateDepartmentId;
      byDept.set(d, (byDept.get(d) ?? 0) + 1);
      byJabatan.set(t.minJabatan, (byJabatan.get(t.minJabatan) ?? 0) + 1);
    }
    return { byDept, byJabatan };
  }, [visibleItems]);

  // Group by department for display
  const grouped = useMemo(() => {
    const groups = new Map<string, UseCaseTemplate[]>();
    for (const t of visibleItems) {
      const key = (t.departmentId ?? 'cross-department') as string;
      const arr = groups.get(key) ?? [];
      arr.push(t);
      groups.set(key, arr);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visibleItems]);

  const applyToDesigner = (t: UseCaseTemplate) => {
    sessionStorage.setItem(
      'gatra.designerPreset',
      JSON.stringify({
        title: t.title,
        objective: t.exampleGoal,
        command: t.command,
        category: t.category,
        outputFormat: t.outputFormat,
      }),
    );
    nav('/designer');
  };

  const clearFilters = () => {
    setDeptFilter('');
    setJabatanFilter('');
    setCategoryFilter('');
    setOutputFilter('');
    setFrequencyFilter('');
    setSearch('');
    setIncludeAll(true);
  };

  const isAdmin = me?.jabatan === 'admin_system';

  return (
    <div>
      <div className="card">
        <div className="row" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Use Case Templates</h2>
          <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>
            {visibleItems.length} dari {total} use case tampil
          </span>
          <div className="spacer" />
          <button onClick={clearFilters}>Reset filter</button>
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, margin: 0 }}>
          Pilih template, salin contoh goal, atau klik <strong>Pakai template</strong> untuk
          membuka Goal Designer dengan goal terisi otomatis.
        </p>
      </div>

      <div className="card">
        <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div style={{ flex: '1 1 200px' }}>
            <label>Departemen</label>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">Semua</option>
              {Object.entries(DEPARTMENT_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label>Jabatan (min level)</label>
            <select value={jabatanFilter} onChange={(e) => setJabatanFilter(e.target.value)}>
              <option value="">Semua</option>
              {Object.entries(JABATAN_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label>Kategori</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">Semua</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label>Output</label>
            <select value={outputFilter} onChange={(e) => setOutputFilter(e.target.value)}>
              <option value="">Semua</option>
              {Object.entries(OUTPUT_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label>Frekuensi</label>
            <select value={frequencyFilter} onChange={(e) => setFrequencyFilter(e.target.value)}>
              <option value="">Semua</option>
              {Object.entries(FREQ_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '2 1 280px' }}>
            <label>Cari</label>
            <input
              placeholder="cari di command / judul / deskripsi…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {isAdmin && (
          <div className="row" style={{ marginTop: 10, gap: 6 }}>
            <label style={{ margin: 0, textTransform: 'none', letterSpacing: 0 }}>
              <input
                type="checkbox"
                style={{ width: 'auto', marginRight: 6 }}
                checked={includeAll}
                onChange={(e) => setIncludeAll(e.target.checked)}
              />
              Admin mode — tampilkan semua departemen tanpa filter cross-dept otomatis
            </label>
          </div>
        )}
      </div>

      {stats.byDept.size > 0 && (
        <div className="card">
          <h2>Sebaran per Departemen</h2>
          <div className="grid-stats">
            {[...stats.byDept.entries()].map(([d, n]) => (
              <div className="stat" key={d}>
                <div className="label">{DEPARTMENT_LABELS[d as TemplateDepartmentId] ?? d}</div>
                <div className="value">{n}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {err && (
        <div className="card">
          <p style={{ color: 'var(--danger)' }}>{err}</p>
        </div>
      )}

      {loading && (
        <div className="card">
          <p className="empty">Memuat template…</p>
        </div>
      )}

      {!loading && visibleItems.length === 0 && (
        <div className="card">
          <p className="empty">Tidak ada template yang cocok dengan filter.</p>
        </div>
      )}

      {grouped.map(([deptId, tpls]) => (
        <div className="card" key={deptId}>
          <h2>{DEPARTMENT_LABELS[deptId as TemplateDepartmentId] ?? deptId} — {tpls.length} template</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: 12,
            }}
          >
            {tpls.map((t) => (
              <TemplateCard key={t.id} t={t} onApply={() => applyToDesigner(t)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TemplateCard({ t, onApply }: { t: UseCaseTemplate; onApply: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      style={{
        background: 'var(--bg-elev-2)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div className="row" style={{ alignItems: 'baseline' }}>
        <code style={{ color: 'var(--accent)', fontSize: 13 }}>{t.command}</code>
        <span
          className="badge"
          style={{ marginLeft: 'auto', fontSize: 10 }}
          title="Jabatan minimal"
        >
          {JABATAN_LABELS[t.minJabatan] ?? t.minJabatan}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{t.title}</div>
      <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>{t.description}</div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
        <span className="badge">{t.category}</span>
        <span className="badge" title="Output format">{OUTPUT_LABELS[t.outputFormat] ?? t.outputFormat}</span>
        <span className="badge" title="Frekuensi">{FREQ_LABELS[t.frequency] ?? t.frequency}</span>
        {t.stakeholders.length > 0 && (
          <span className="badge" title="Stakeholder departments">
            ↔ {t.stakeholders.join(', ')}
          </span>
        )}
      </div>
      {expanded && (
        <div
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: 10,
            fontSize: 12,
            color: 'var(--text)',
            whiteSpace: 'pre-wrap',
          }}
        >
          <div style={{ color: 'var(--text-dim)', fontSize: 11, marginBottom: 4 }}>
            Contoh goal:
          </div>
          {t.exampleGoal}
        </div>
      )}
      <div className="row" style={{ marginTop: 'auto' }}>
        <button onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Sembunyikan' : 'Lihat contoh'}
        </button>
        <div className="spacer" />
        <button
          onClick={() => {
            navigator.clipboard.writeText(t.exampleGoal).catch(() => undefined);
          }}
          title="Salin contoh goal ke clipboard"
        >
          Salin
        </button>
        <button className="primary" onClick={onApply}>
          Pakai template
        </button>
      </div>
    </div>
  );
}
