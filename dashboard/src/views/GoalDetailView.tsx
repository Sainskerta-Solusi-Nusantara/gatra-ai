import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type AgentRun, type Goal, type SemanticFact } from '../api';

export default function GoalDetailView() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [facts, setFacts] = useState<SemanticFact[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = () => {
    if (!id) return;
    api.getGoal(id).then((r) => {
      setGoal(r.goal);
      setRuns(r.runs);
      setFacts(r.facts);
    }).catch((e) => setErr(String(e.message ?? e)));
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [id]);

  const start = async () => {
    if (!goal) return;
    setBusy(true); setErr(null);
    try {
      const run = await api.startRun(goal.id);
      nav(`/runs/${run.id}`);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    } finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!goal) return;
    setBusy(true);
    try { await api.cancelGoal(goal.id); refresh(); }
    catch (e) { setErr(String((e as Error).message ?? e)); }
    finally { setBusy(false); }
  };

  if (err) return <div className="card"><h2>Error</h2><p style={{ color: 'var(--danger)' }}>{err}</p></div>;
  if (!goal) return <div className="card"><h2>Loading…</h2></div>;

  return (
    <>
      <div className="card">
        <div className="row">
          <h2 style={{ margin: 0 }}>{goal.title}</h2>
          <div className="spacer" />
          <span className={`badge ${goal.status}`}>{goal.status}</span>
        </div>

        <label>Objective</label>
        <p style={{ marginTop: 0 }}>{goal.spec.objective}</p>

        <label>Success criteria</label>
        <pre className="json">{JSON.stringify(goal.spec.successCriteria, null, 2)}</pre>

        <label>Budget</label>
        <pre className="json">{JSON.stringify(goal.budget, null, 2)}</pre>

        <label>Policy</label>
        <pre className="json">{JSON.stringify(goal.policy, null, 2)}</pre>

        <div className="row" style={{ marginTop: 14 }}>
          <button className="primary" onClick={start} disabled={busy}>▶ Start run</button>
          <button className="danger" onClick={cancel} disabled={busy}>Cancel goal</button>
        </div>
      </div>

      <div className="card">
        <h2>Runs ({runs.length})</h2>
        {runs.length === 0 ? (
          <p className="empty">No runs yet.</p>
        ) : (
          <table>
            <thead><tr><th>Started</th><th>Status</th><th>Steps</th><th>Tokens</th><th>Cost</th><th></th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.startedAt ? new Date(r.startedAt).toLocaleString() : '—'}</td>
                  <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                  <td>{r.stepsExecuted}</td>
                  <td>{r.tokensUsed.toLocaleString()}</td>
                  <td>${r.costUsd.toFixed(4)}</td>
                  <td><Link to={`/runs/${r.id}`}>Open →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {facts.length > 0 && (
        <div className="card">
          <h2>Learned facts</h2>
          <table>
            <thead><tr><th>Key</th><th>Value</th><th>Conf.</th></tr></thead>
            <tbody>
              {facts.map((f) => (
                <tr key={f.id}>
                  <td className="mono">{f.key}</td>
                  <td>{f.value}</td>
                  <td>{f.confidence.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
