import { useEffect, useMemo, useState } from 'react';
import {
  api,
  type AuthIdentity,
  type Department,
  type RbacUser,
  type ResignedUser,
} from '../api';

const MANAGER_RANK: Record<string, number> = {
  staff: 1,
  supervisor: 2,
  manager: 3,
  direktur: 4,
  admin_system: 99,
};

export default function ResignationView() {
  const [me, setMe] = useState<AuthIdentity | null>(null);
  const [tab, setTab] = useState<'active' | 'resigned'>('active');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<RbacUser[]>([]);
  const [resigned, setResigned] = useState<ResignedUser[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const deptName = useMemo(() => {
    const m = new Map<string, string>();
    departments.forEach((d) => m.set(d.id, d.name));
    return m;
  }, [departments]);

  const refreshActive = () => {
    api.listUsers({ active: true }).then((r) => setUsers(r.items)).catch((e) => setErr(String(e.message ?? e)));
  };
  const refreshResigned = () => {
    api.listResignedUsers().then((r) => setResigned(r.items)).catch((e) => setErr(String(e.message ?? e)));
  };

  useEffect(() => {
    api.me().then((r) => setMe(r.user)).catch((e) => setErr(String(e.message ?? e)));
    api.listDepartments().then((r) => setDepartments(r.items)).catch((e) => setErr(String(e.message ?? e)));
  }, []);

  useEffect(() => {
    if (tab === 'active') refreshActive();
    else refreshResigned();
  }, [tab]);

  const allowed = useMemo(() => {
    if (!me) return false;
    if (me.kind === 'system') return true;
    const rank = MANAGER_RANK[me.jabatan] ?? 0;
    return rank >= MANAGER_RANK.manager;
  }, [me]);

  if (me && !allowed) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Resignation & Offboarding</h2>
        <p style={{ color: 'var(--danger)' }}>
          Forbidden — only admin_system, direktur, and manager may view this page.
        </p>
      </div>
    );
  }

  const onResign = async (user: RbacUser) => {
    if (!confirm(`Mark ${user.name} (${user.waNumber}) as resigned? This terminates active sessions.`)) return;
    const reason = prompt('Reason (optional):') ?? undefined;
    try {
      await api.resign(user.waNumber, reason || undefined);
      setNotice(`${user.name} resigned successfully.`);
      refreshActive();
    } catch (e: any) {
      setErr(String(e.message ?? e));
    }
  };

  const onAdminRemove = async (user: RbacUser) => {
    if (!me?.waNumber && me?.kind !== 'system') {
      setErr('Your identity has no WA number — cannot record removal.');
      return;
    }
    if (!confirm(`Remove ${user.name} (${user.waNumber})? This deactivates the account and terminates sessions.`)) {
      return;
    }
    const removedByWa = me?.waNumber ?? '+62-000-0000-0000';
    try {
      await api.adminRemoveUser(user.waNumber, removedByWa);
      setNotice(`${user.name} removed by ${removedByWa}.`);
      refreshActive();
    } catch (e: any) {
      setErr(String(e.message ?? e));
    }
  };

  return (
    <>
      <div className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Resignation & Offboarding</h2>
          <div className="spacer" />
          <div className="row" style={{ gap: 4 }}>
            <TabButton active={tab === 'active'} onClick={() => setTab('active')}>
              Active Users
            </TabButton>
            <TabButton active={tab === 'resigned'} onClick={() => setTab('resigned')}>
              Resigned / Removed
            </TabButton>
          </div>
        </div>
        {err && (
          <p style={{ color: 'var(--danger)' }}>
            {err} <button onClick={() => setErr(null)}>dismiss</button>
          </p>
        )}
        {notice && (
          <p style={{ color: 'var(--success, #4ade80)' }}>
            {notice} <button onClick={() => setNotice(null)}>dismiss</button>
          </p>
        )}
      </div>

      {tab === 'active' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Active users</h3>
          {users.length === 0 ? (
            <p className="empty">No active users.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>WA Number</th>
                  <th>Department</th>
                  <th>Jabatan</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td className="mono">{u.waNumber}</td>
                    <td>
                      <span className="badge">{deptName.get(u.departmentId) ?? u.departmentId}</span>
                    </td>
                    <td>
                      <span className={`badge ${u.jabatan === 'admin_system' ? 'failed' : ''}`}>{u.jabatan}</span>
                    </td>
                    <td>
                      <button onClick={() => onResign(u)}>Resign</button>{' '}
                      <button className="primary" onClick={() => onAdminRemove(u)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'resigned' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Resigned / removed</h3>
          {resigned.length === 0 ? (
            <p className="empty">No resigned users.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>WA Number</th>
                  <th>Department</th>
                  <th>Jabatan</th>
                  <th>Resigned</th>
                  <th>Reason / Removed by</th>
                </tr>
              </thead>
              <tbody>
                {resigned.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td className="mono">{u.waNumber}</td>
                    <td>
                      <span className="badge">{u.departmentName ?? u.departmentId}</span>
                    </td>
                    <td>
                      <span className="badge">{u.jabatan}</span>
                    </td>
                    <td className="mono">{new Date(u.resignedAt).toLocaleString()}</td>
                    <td style={{ color: 'var(--text-dim)' }}>
                      {u.removedBy ? (
                        <span>
                          removed by <span className="mono">{u.removedBy}</span>
                        </span>
                      ) : (
                        u.resignationReason ?? '— self-resigned —'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className={active ? 'primary' : ''}>
      {children}
    </button>
  );
}
