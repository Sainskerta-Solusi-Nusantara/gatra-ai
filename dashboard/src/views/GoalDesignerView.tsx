import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type ToolInfo } from '../api';

const TEMPLATES: Record<string, { title: string; objective: string; criteria: string }> = {
  recon: {
    title: 'Daily liquidity reconciliation',
    objective:
      'Reconcile the overnight liquidity position by reading the cash-flow report and writing a summary file to ./data/summary.txt.',
    criteria: JSON.stringify(
      [{ kind: 'tool_output_contains', tool: 'fs.write', pattern: 'wrote' }],
      null,
      2,
    ),
  },
  research: {
    title: 'Research a topic',
    objective: 'Research the topic and write a structured summary in ./data/report.md.',
    criteria: JSON.stringify(
      [{ kind: 'tool_output_contains', tool: 'fs.write', pattern: 'report' }],
      null,
      2,
    ),
  },
  blank: { title: '', objective: '', criteria: '[]' },
};

export default function GoalDesignerView() {
  const nav = useNavigate();
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [title, setTitle] = useState(TEMPLATES.recon.title);
  const [objective, setObjective] = useState(TEMPLATES.recon.objective);
  const [criteria, setCriteria] = useState(TEMPLATES.recon.criteria);
  const [allowedTools, setAllowedTools] = useState<string[]>(['noop', 'fs.read', 'fs.write']);
  const [requireApproval, setRequireApproval] = useState<string[]>([]);
  const [maxSteps, setMaxSteps] = useState(50);
  const [maxTokens, setMaxTokens] = useState(200_000);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.listTools().then((r) => setTools(r.items)).catch(() => {});
  }, []);

  // Pick up a preset stashed by TemplatesView when the user clicked "Pakai template".
  useEffect(() => {
    const raw = sessionStorage.getItem('gatra.designerPreset');
    if (!raw) return;
    sessionStorage.removeItem('gatra.designerPreset');
    try {
      const preset = JSON.parse(raw) as { title?: string; objective?: string };
      if (preset.title) setTitle(preset.title);
      if (preset.objective) setObjective(preset.objective);
    } catch {
      // ignore malformed preset payload
    }
  }, []);

  const apply = (k: keyof typeof TEMPLATES) => {
    const t = TEMPLATES[k];
    setTitle(t.title);
    setObjective(t.objective);
    setCriteria(t.criteria);
  };

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(criteria);
      } catch {
        throw new Error('Success criteria must be a JSON array.');
      }
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('At least one success criterion required.');
      const goal = await api.createGoal({
        title,
        spec: {
          objective,
          successCriteria: parsed as { kind: string }[],
          language: 'id-ID',
        },
        budget: { maxSteps, maxTokens, maxWallClockSeconds: 86400 },
        policy: {
          allowedTools,
          requireApprovalFor: requireApproval.length ? requireApproval : undefined,
        },
      });
      nav(`/goals/${goal.id}`);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (arr: string[], setArr: (s: string[]) => void, name: string) => {
    setArr(arr.includes(name) ? arr.filter((x) => x !== name) : [...arr, name]);
  };

  return (
    <div className="card" style={{ maxWidth: 800 }}>
      <h2>Goal Designer</h2>

      <div className="row" style={{ gap: 6, marginBottom: 8 }}>
        <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>Template:</span>
        <button onClick={() => apply('recon')}>Reconciliation</button>
        <button onClick={() => apply('research')}>Research</button>
        <button onClick={() => apply('blank')}>Blank</button>
      </div>

      <label>Title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />

      <label>Objective</label>
      <textarea value={objective} onChange={(e) => setObjective(e.target.value)} />

      <label>Success criteria (JSON array)</label>
      <textarea
        className="mono"
        value={criteria}
        onChange={(e) => setCriteria(e.target.value)}
        spellCheck={false}
      />

      <label>Allowed tools</label>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
        {tools.map((t) => (
          <button
            key={t.name}
            onClick={() => toggle(allowedTools, setAllowedTools, t.name)}
            className={allowedTools.includes(t.name) ? 'primary' : ''}
            title={t.description}
          >
            {t.name}
          </button>
        ))}
      </div>

      <label>Require approval for</label>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
        {tools.filter((t) => allowedTools.includes(t.name)).map((t) => (
          <button
            key={t.name}
            onClick={() => toggle(requireApproval, setRequireApproval, t.name)}
            className={requireApproval.includes(t.name) ? 'danger' : ''}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="row" style={{ gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label>Max steps</label>
          <input type="number" value={maxSteps} onChange={(e) => setMaxSteps(Number(e.target.value))} />
        </div>
        <div style={{ flex: 1 }}>
          <label>Max tokens</label>
          <input type="number" value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))} />
        </div>
      </div>

      {err && <p style={{ color: 'var(--danger)', marginTop: 12 }}>{err}</p>}

      <div className="row" style={{ marginTop: 18 }}>
        <button className="primary" onClick={submit} disabled={busy}>
          {busy ? 'Creating…' : 'Create goal'}
        </button>
      </div>
    </div>
  );
}
