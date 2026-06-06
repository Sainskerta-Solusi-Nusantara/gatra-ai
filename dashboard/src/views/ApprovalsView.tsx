import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Approval } from '../api';

export default function ApprovalsView() {
  const [items, setItems] = useState<Approval[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = () => {
    api.listApprovals().then((r) => setItems(r.items)).catch((e) => setErr(String((e as Error).message ?? e)));
  };
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, []);

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    setBusy(id);
    setErr(null);
    try {
      const comment = decision === 'rejected' ? prompt('Reason for rejection?') ?? undefined : undefined;
      await api.decideApproval(id, decision, comment);
      refresh();
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card">
      <h2>Pending approvals ({items.length})</h2>
      {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
      {items.length === 0 ? (
        <p className="empty">No approvals pending. The agents are running freely.</p>
      ) : (
        <table>
          <thead><tr><th>Requested</th><th>Reason</th><th>Role</th><th>Run</th><th>Step</th><th></th></tr></thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td className="mono">{new Date(a.requestedAt).toLocaleString()}</td>
                <td>{a.reason}</td>
                <td><span className="badge">{a.requestedRole}</span></td>
                <td><Link to={`/runs/${a.runId}`} className="mono">{a.runId.slice(0, 10)}…</Link></td>
                <td className="mono" style={{ color: 'var(--text-dim)' }}>{a.stepId.slice(0, 10)}…</td>
                <td>
                  <div className="row" style={{ gap: 4 }}>
                    <button className="primary" onClick={() => decide(a.id, 'approved')} disabled={busy === a.id}>Approve</button>
                    <button className="danger" onClick={() => decide(a.id, 'rejected')} disabled={busy === a.id}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
