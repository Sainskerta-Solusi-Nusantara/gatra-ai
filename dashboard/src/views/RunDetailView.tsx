import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type AgentRun, type CheckpointSummary, type RunEvent, type Step } from '../api';

export default function RunDetailView() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<AgentRun | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [checkpoints, setCheckpoints] = useState<CheckpointSummary[]>([]);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [chainOk, setChainOk] = useState<boolean | null>(null);

  const refresh = () => {
    if (!id) return;
    api.getRun(id).then((r) => {
      setRun(r.run);
      setSteps(r.steps);
      setCheckpoints(r.checkpoints);
    }).catch((e) => setErr(String((e as Error).message ?? e)));
    api.runTimeline(id).then((r) => setEvents(r.events)).catch(() => {});
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [id]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); refresh(); }
    catch (e) { setErr(String((e as Error).message ?? e)); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    if (!id) return;
    try {
      const r = await api.verifyChain(id);
      setChainOk(r.ok);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    }
  };

  if (err) return <div className="card"><h2>Error</h2><p style={{ color: 'var(--danger)' }}>{err}</p></div>;
  if (!run) return <div className="card"><h2>Loading…</h2></div>;

  return (
    <>
      <div className="card">
        <div className="row">
          <h2 style={{ margin: 0 }}>Run {run.id.slice(0, 12)}…</h2>
          <div className="spacer" />
          <span className={`badge ${run.status}`}>{run.status}</span>
        </div>
        <div className="grid-stats" style={{ marginTop: 14 }}>
          <Mini label="Steps" value={String(run.stepsExecuted)} />
          <Mini label="Tokens" value={run.tokensUsed.toLocaleString()} />
          <Mini label="Cost" value={`$${run.costUsd.toFixed(4)}`} />
          <Mini label="Attempt" value={String(run.attempt)} />
          <Mini label="Started" value={run.startedAt ? new Date(run.startedAt).toLocaleTimeString() : '—'} />
          <Mini label="Ended" value={run.endedAt ? new Date(run.endedAt).toLocaleTimeString() : '—'} />
        </div>
        {run.errorMessage && (
          <pre className="json" style={{ color: 'var(--danger)', marginTop: 12 }}>{run.errorMessage}</pre>
        )}
        <div className="row" style={{ marginTop: 14, gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => act(() => api.pauseRun(run.id))} disabled={busy}>⏸ Pause</button>
          <button className="primary" onClick={() => act(() => api.resumeRun(run.id))} disabled={busy}>▶ Resume</button>
          <button onClick={() => act(() => api.retryRun(run.id))} disabled={busy}>↻ Retry</button>
          <button className="danger" onClick={() => act(() => api.stopRun(run.id))} disabled={busy}>⏹ Stop</button>
          <div className="spacer" />
          <button onClick={verify}>Verify checkpoint chain</button>
          {chainOk !== null && (
            <span className={`badge ${chainOk ? 'succeeded' : 'failed'}`}>
              {chainOk ? 'chain ok' : 'chain broken'}
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Step timeline ({steps.length})</h2>
        {steps.length === 0 ? (
          <p className="empty">No steps recorded yet.</p>
        ) : (
          <table>
            <thead><tr><th>#</th><th>Tool</th><th>Status</th><th>Tokens</th><th>Duration</th><th>Result</th></tr></thead>
            <tbody>
              {steps.map((s) => (
                <tr key={s.id}>
                  <td>{s.index}</td>
                  <td className="mono">{s.tool}</td>
                  <td><span className={`badge ${s.status}`}>{s.status}</span></td>
                  <td>{s.tokensUsed}</td>
                  <td>{s.startedAt && s.endedAt ? `${s.endedAt - s.startedAt} ms` : '—'}</td>
                  <td className="mono" style={{ fontSize: 11, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.result ? JSON.stringify(s.result).slice(0, 200) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Checkpoints ({checkpoints.length})</h2>
        {checkpoints.length === 0 ? (
          <p className="empty">No checkpoints yet.</p>
        ) : (
          <table>
            <thead><tr><th>Time</th><th>Reason</th><th>Size</th><th>State hash</th><th></th></tr></thead>
            <tbody>
              {checkpoints.map((c) => (
                <tr key={c.id}>
                  <td className="mono">{new Date(c.takenAt).toLocaleTimeString()}</td>
                  <td><span className="badge">{c.reason}</span></td>
                  <td>{c.sizeBytes} B</td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{c.stateHash.slice(0, 12)}…</td>
                  <td>
                    <button
                      onClick={() => act(() => api.rollback(c.id))}
                      disabled={busy}
                    >Rollback</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Event journal</h2>
        {events.length === 0 ? (
          <p className="empty">No events recorded.</p>
        ) : (
          <div>
            {events.slice().reverse().map((e) => (
              <div key={e.id} className={`timeline-event ${e.kind.replace(/\./g, '\\.')}`}>
                <div className="mono" style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                  {new Date(e.ts).toLocaleTimeString()} · <strong style={{ color: 'var(--text)' }}>{e.kind}</strong>
                </div>
                <pre className="json" style={{ marginTop: 4 }}>{JSON.stringify(e.meta, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value" style={{ fontSize: 18 }}>{value}</div>
    </div>
  );
}
