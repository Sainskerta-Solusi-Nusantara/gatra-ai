import { useEffect, useState } from 'react';
import { api, type FleetStatus } from '../api';
import { useWebSocket } from '../ws';

export default function FleetView() {
  const [status, setStatus] = useState<FleetStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { messages } = useWebSocket();

  const refresh = () => {
    api.fleetStatus().then(setStatus).catch((e) => setErr(String(e.message ?? e)));
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, []);

  if (err) return <div className="card"><h2>Fleet</h2><p style={{ color: 'var(--danger)' }}>{err}</p></div>;
  if (!status) return <div className="card"><h2>Fleet</h2><p>Loading…</p></div>;

  return (
    <>
      <div className="card">
        <h2>Fleet · {status.instance}</h2>
        <div className="grid-stats">
          <Stat label="Active sessions" value={status.sessions.active} />
          <Stat label="Paused" value={status.sessions.paused} />
          <Stat label="Idle" value={status.sessions.idle} />
          <Stat label="Succeeded (all-time)" value={status.sessions.succeeded} />
          <Stat label="Failed (all-time)" value={status.sessions.failed} />
          <Stat label="Pending approvals" value={status.pendingApprovals} accent={status.pendingApprovals > 0 ? 'var(--warn)' : undefined} />
        </div>
      </div>

      <div className="card">
        <h2>Goals by status</h2>
        <div className="grid-stats">
          {Object.entries(status.goals).map(([k, v]) => (
            <Stat key={k} label={k} value={v} />
          ))}
          {Object.keys(status.goals).length === 0 && <p className="empty">No goals yet.</p>}
        </div>
      </div>

      <div className="card">
        <h2>Live event stream</h2>
        {messages.length === 0 ? (
          <p className="empty">No events yet.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Time</th><th>Kind</th><th>Detail</th></tr>
            </thead>
            <tbody>
              {messages.slice(0, 30).map((m, i) => (
                <tr key={i}>
                  <td className="mono" style={{ color: 'var(--text-dim)' }}>{new Date().toLocaleTimeString()}</td>
                  <td><span className="badge">{m.kind}</span></td>
                  <td className="mono" style={{ fontSize: 11 }}>{JSON.stringify(m.payload).slice(0, 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Tool registry</h2>
        <table>
          <thead><tr><th>Name</th><th>Description</th><th>Danger</th></tr></thead>
          <tbody>
            {status.tools.map((t) => (
              <tr key={t.name}>
                <td className="mono">{t.name}</td>
                <td style={{ color: 'var(--text-dim)' }}>{t.description}</td>
                <td>{t.dangerous ? <span className="badge failed">DANGER</span> : <span className="badge">safe</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value" style={{ color: accent }}>{value}</div>
    </div>
  );
}
