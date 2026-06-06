import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type AgentRun, type Department, type Goal } from '../api';

export default function RunsView() {
  const [items, setItems] = useState<AgentRun[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const goalDept = useMemo(() => {
    const m = new Map<string, string | null>();
    goals.forEach((g) => m.set(g.id, g.departmentId));
    return m;
  }, [goals]);

  const deptName = useMemo(() => {
    const m = new Map<string, string>();
    departments.forEach((d) => m.set(d.id, d.name));
    return m;
  }, [departments]);

  const refresh = () => {
    const params: { status?: string; departmentId?: string } = {};
    if (filter) params.status = filter;
    if (deptFilter) params.departmentId = deptFilter;
    api.listRuns(params).then((r) => setItems(r.items)).catch((e) => setErr(String(e)));
    api.listGoals(deptFilter ? { departmentId: deptFilter } : {}).then((r) => setGoals(r.items)).catch(() => undefined);
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [filter, deptFilter]);

  useEffect(() => {
    api.listDepartments().then((r) => setDepartments(r.items)).catch(() => undefined);
  }, []);

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Agent runs</h2>
        <div className="spacer" />
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={{ width: 180 }}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 180 }}>
          <option value="">All</option>
          {['ready', 'active', 'paused', 'succeeded', 'failed', 'stopped', 'orphaned'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}

      {items.length === 0 ? (
        <p className="empty">No runs.</p>
      ) : (
        <table>
          <thead><tr><th>Started</th><th>Status</th><th>Department</th><th>Goal</th><th>Steps</th><th>Tokens</th><th>Cost</th><th></th></tr></thead>
          <tbody>
            {items.map((r) => {
              const dept = goalDept.get(r.goalId) ?? null;
              return (
                <tr key={r.id}>
                  <td className="mono">{r.startedAt ? new Date(r.startedAt).toLocaleString() : '—'}</td>
                  <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                  <td>
                    {dept ? (
                      <span className="badge">{deptName.get(dept) ?? dept.slice(0, 6)}</span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td><Link to={`/goals/${r.goalId}`} className="mono">{r.goalId.slice(0, 10)}…</Link></td>
                  <td>{r.stepsExecuted}</td>
                  <td>{r.tokensUsed.toLocaleString()}</td>
                  <td>${r.costUsd.toFixed(4)}</td>
                  <td><Link to={`/runs/${r.id}`}>Open →</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
