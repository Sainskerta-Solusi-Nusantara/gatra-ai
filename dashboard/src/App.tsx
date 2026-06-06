import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getToken, setToken } from './api';
import { useWebSocket } from './ws';
import FleetView from './views/FleetView';
import GoalsView from './views/GoalsView';
import GoalDetailView from './views/GoalDetailView';
import GoalDesignerView from './views/GoalDesignerView';
import RunsView from './views/RunsView';
import RunDetailView from './views/RunDetailView';
import ApprovalsView from './views/ApprovalsView';
import AuditView from './views/AuditView';
import RBACView from './views/RBACView';
import ResignationView from './views/ResignationView';
import TemplatesView from './views/TemplatesView';

export default function App() {
  const [token, setLocalToken] = useState<string>(getToken());
  const [showTokenDialog, setShowTokenDialog] = useState<boolean>(!token);
  const { status } = useWebSocket();

  useEffect(() => {
    if (!token) setShowTokenDialog(true);
  }, [token]);

  if (showTokenDialog) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', padding: 20 }}>
        <div className="card" style={{ width: 380 }}>
          <h2>API Token</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
            Paste the <code>GATRA_API_TOKEN</code> from your <code>.env</code>. It is stored only in this browser.
          </p>
          <input
            placeholder="API token"
            defaultValue={token}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = (e.target as HTMLInputElement).value.trim();
                setToken(v);
                setLocalToken(v);
                setShowTokenDialog(false);
              }
            }}
            autoFocus
          />
          <button
            className="primary"
            style={{ marginTop: 12, width: '100%' }}
            onClick={() => {
              const el = document.querySelector('input') as HTMLInputElement | null;
              const v = el?.value.trim() ?? '';
              setToken(v);
              setLocalToken(v);
              setShowTokenDialog(false);
            }}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <header className="topbar">
        <span className="brand">GATRA AI</span>
        <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>operator console</span>
        <span className={`status-pill ${status === 'open' ? 'live' : 'down'}`}>
          {status === 'open' ? '● live' : status === 'connecting' ? '… connecting' : '○ offline'}
        </span>
        <button onClick={() => { localStorage.removeItem('gatra.token'); location.reload(); }}>logout</button>
      </header>

      <nav className="side">
        <NavLink to="/fleet">Fleet</NavLink>
        <NavLink to="/templates">Templates</NavLink>
        <NavLink to="/goals">Goals</NavLink>
        <NavLink to="/designer">Goal Designer</NavLink>
        <NavLink to="/runs">Runs</NavLink>
        <NavLink to="/approvals">Approvals</NavLink>
        <NavLink to="/audit">Audit</NavLink>
        <NavLink to="/rbac">RBAC</NavLink>
        <NavLink to="/resignation">Resignation</NavLink>
      </nav>

      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/fleet" replace />} />
          <Route path="/fleet" element={<FleetView />} />
          <Route path="/templates" element={<TemplatesView />} />
          <Route path="/goals" element={<GoalsView />} />
          <Route path="/goals/:id" element={<GoalDetailView />} />
          <Route path="/designer" element={<GoalDesignerView />} />
          <Route path="/runs" element={<RunsView />} />
          <Route path="/runs/:id" element={<RunDetailView />} />
          <Route path="/approvals" element={<ApprovalsView />} />
          <Route path="/audit" element={<AuditView />} />
          <Route path="/rbac" element={<RBACView />} />
          <Route path="/resignation" element={<ResignationView />} />
        </Routes>
      </main>
    </div>
  );
}
