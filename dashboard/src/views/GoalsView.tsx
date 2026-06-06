import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Department, type Goal } from '../api';

export default function GoalsView() {
  const [items, setItems] = useState<Goal[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('');

  const deptName = useMemo(() => {
    const m = new Map<string, string>();
    departments.forEach((d) => m.set(d.id, d.name));
    return m;
  }, [departments]);

  const refresh = () => {
    const params: { status?: string; departmentId?: string } = {};
    if (filter) params.status = filter;
    if (deptFilter) params.departmentId = deptFilter;
    api
      .listGoals(params)
      .then((res) => setItems(res.items))
      .catch((e) => setErr(String(e.message ?? e)));
  };

  useEffect(refresh, [filter, deptFilter]);

  useEffect(() => {
    api.listDepartments().then((r) => setDepartments(r.items)).catch(() => undefined);
  }, []);

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Goals</h2>
        <div className="spacer" />
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={{ width: 180 }}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 180 }}>
          <option value="">All statuses</option>
          {['pending', 'planning', 'executing', 'paused', 'awaiting_approval', 'succeeded', 'failed', 'cancelled'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <Link to="/designer"><button className="primary">+ New goal</button></Link>
      </div>

      {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}

      {items.length === 0 ? (
        <p className="empty">No goals match this filter.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Title</th><th>Department</th><th>Status</th><th>Owner</th><th>Created</th><th>ID</th></tr>
          </thead>
          <tbody>
            {items.map((g) => (
              <tr key={g.id}>
                <td><Link to={`/goals/${g.id}`}>{g.title}</Link></td>
                <td>
                  {g.departmentId ? (
                    <span className="badge">{deptName.get(g.departmentId) ?? g.departmentId.slice(0, 6)}</span>
                  ) : (
                    <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>system</span>
                  )}
                </td>
                <td><span className={`badge ${g.status}`}>{g.status}</span></td>
                <td>{g.createdBy}</td>
                <td className="mono">{new Date(g.createdAt).toLocaleString()}</td>
                <td className="mono" style={{ color: 'var(--text-dim)', fontSize: 11 }}>{g.id.slice(0, 10)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
