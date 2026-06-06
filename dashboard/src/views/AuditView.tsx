import { useEffect, useState } from 'react';
import { api, type AuditEvent } from '../api';

export default function AuditView() {
  const [items, setItems] = useState<AuditEvent[]>([]);
  const [q, setQ] = useState('');
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const refresh = () => {
    api
      .listAudit({ q: q || undefined, actor: actor || undefined, action: action || undefined })
      .then((r) => setItems(r.items))
      .catch((e) => setErr(String((e as Error).message ?? e)));
  };

  useEffect(refresh, [q, actor, action]);

  return (
    <div className="card">
      <h2>Audit log</h2>
      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <input placeholder="search target / meta…" value={q} onChange={(e) => setQ(e.target.value)} />
        <input placeholder="actor" value={actor} onChange={(e) => setActor(e.target.value)} style={{ maxWidth: 160 }} />
        <input placeholder="action" value={action} onChange={(e) => setAction(e.target.value)} style={{ maxWidth: 160 }} />
      </div>
      {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
      {items.length === 0 ? (
        <p className="empty">No matching audit events.</p>
      ) : (
        <table>
          <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Meta</th></tr></thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td className="mono">{new Date(a.ts).toLocaleString()}</td>
                <td>{a.actor}</td>
                <td><span className="badge">{a.action}</span></td>
                <td className="mono">{a.target.slice(0, 16)}…</td>
                <td className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  {JSON.stringify(a.meta).slice(0, 200)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
