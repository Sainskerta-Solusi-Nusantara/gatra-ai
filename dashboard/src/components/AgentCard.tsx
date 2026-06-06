import { Link } from 'react-router-dom';
import type { AgentRun, Goal } from '../api';
import StatusBadge from './StatusBadge';
import { formatDuration, formatRelative } from '../lib/format';

interface Props {
  run: AgentRun;
  goal?: Goal;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onStop?: (id: string) => void;
  onRetry?: (id: string) => void;
}

export default function AgentCard({ run, goal, onPause, onResume, onStop, onRetry }: Props) {
  const elapsed =
    run.startedAt != null
      ? formatDuration((run.endedAt ?? Date.now()) - run.startedAt)
      : '—';
  const terminal = ['succeeded', 'failed', 'stopped'].includes(run.status);
  const paused = run.status === 'paused';

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div className="row" style={{ gap: 10 }}>
            <Link to={`/runs/${run.id}`} className="mono" style={{ fontWeight: 600 }}>
              {run.id.slice(0, 12)}
            </Link>
            <StatusBadge status={run.status} />
            <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>
              attempt {run.attempt}
            </span>
          </div>
          {goal ? (
            <div style={{ marginTop: 6, fontSize: 13 }}>
              <Link to={`/goals/${goal.id}`}>{goal.title}</Link>
              <span style={{ color: 'var(--text-dim)', marginLeft: 8 }}>
                {goal.spec.objective}
              </span>
            </div>
          ) : (
            <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 6 }}>
              goal {run.goalId.slice(0, 8)}
            </div>
          )}
          <div className="row" style={{ marginTop: 10, gap: 18, fontSize: 12, color: 'var(--text-dim)' }}>
            <span>steps {run.stepsExecuted}</span>
            <span>tokens {run.tokensUsed.toLocaleString()}</span>
            <span>cost ${run.costUsd.toFixed(4)}</span>
            <span>elapsed {elapsed}</span>
            <span>{formatRelative(run.updatedAt)}</span>
          </div>
          {run.errorMessage ? (
            <div style={{ marginTop: 8, color: 'var(--danger)', fontSize: 12 }}>
              {run.errorMessage}
            </div>
          ) : null}
        </div>
        <div className="row" style={{ gap: 6 }}>
          {!terminal && !paused && onPause ? (
            <button onClick={() => onPause(run.id)}>pause</button>
          ) : null}
          {paused && onResume ? (
            <button className="primary" onClick={() => onResume(run.id)}>
              resume
            </button>
          ) : null}
          {!terminal && onStop ? (
            <button className="danger" onClick={() => onStop(run.id)}>
              stop
            </button>
          ) : null}
          {terminal && onRetry ? (
            <button onClick={() => onRetry(run.id)}>retry</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
