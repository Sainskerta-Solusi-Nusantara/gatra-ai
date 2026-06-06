import { useEffect, useMemo, useState } from 'react';
import {
  api,
  type AccessLevel,
  type Department,
  type FolderPermission,
  type JabatanLevel,
  type RbacCheckResult,
  type RbacUser,
} from '../api';

const JABATAN_OPTIONS: JabatanLevel[] = ['staff', 'supervisor', 'manager', 'direktur', 'admin_system'];
const ACCESS_OPTIONS: AccessLevel[] = ['read', 'write', 'admin'];

export default function RBACView() {
  const [tab, setTab] = useState<'users' | 'departments' | 'permissions' | 'check'>('users');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const loadDepartments = () =>
    api.listDepartments().then((r) => setDepartments(r.items)).catch((e) => setErr(String(e.message ?? e)));

  useEffect(() => {
    loadDepartments();
  }, []);

  return (
    <>
      <div className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>RBAC Console</h2>
          <div className="spacer" />
          <div className="row" style={{ gap: 4 }}>
            <TabButton active={tab === 'users'} onClick={() => setTab('users')}>Users</TabButton>
            <TabButton active={tab === 'departments'} onClick={() => setTab('departments')}>Departments</TabButton>
            <TabButton active={tab === 'permissions'} onClick={() => setTab('permissions')}>Folder Perms</TabButton>
            <TabButton active={tab === 'check'} onClick={() => setTab('check')}>Access Check</TabButton>
          </div>
        </div>
        {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
      </div>

      {tab === 'users' && <UsersPanel departments={departments} onError={setErr} />}
      {tab === 'departments' && (
        <DepartmentsPanel departments={departments} onChange={loadDepartments} onError={setErr} />
      )}
      {tab === 'permissions' && <PermissionsPanel departments={departments} onError={setErr} />}
      {tab === 'check' && <AccessCheckPanel onError={setErr} />}
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={active ? 'primary' : ''}>
      {children}
    </button>
  );
}

// ---------- Users ----------

function UsersPanel({ departments, onError }: { departments: Department[]; onError: (msg: string) => void }) {
  const [users, setUsers] = useState<RbacUser[]>([]);
  const [filterDept, setFilterDept] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);

  const deptName = useMemo(() => {
    const m = new Map<string, string>();
    departments.forEach((d) => m.set(d.id, d.name));
    return m;
  }, [departments]);

  const refresh = () => {
    api
      .listUsers(filterDept ? { departmentId: filterDept } : {})
      .then((r) => setUsers(r.items))
      .catch((e) => onError(String(e.message ?? e)));
  };

  useEffect(refresh, [filterDept]);

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Users</h3>
        <div className="spacer" />
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={{ width: 200 }}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <button className="primary" onClick={() => setShowCreate((s) => !s)}>
          {showCreate ? 'Close' : '+ New user'}
        </button>
      </div>

      {showCreate && (
        <UserForm
          departments={departments}
          onSaved={() => {
            setShowCreate(false);
            refresh();
          }}
          onError={onError}
        />
      )}

      {users.length === 0 ? (
        <p className="empty">No users.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th><th>WA Number</th><th>Department</th><th>Jabatan</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                deptLabel={deptName.get(u.departmentId) ?? u.departmentId}
                departments={departments}
                onChanged={refresh}
                onError={onError}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function UserRow({
  user,
  deptLabel,
  departments,
  onChanged,
  onError,
}: {
  user: RbacUser;
  deptLabel: string;
  departments: Department[];
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <tr>
        <td>{user.name}</td>
        <td className="mono">{user.waNumber}</td>
        <td><span className="badge">{deptLabel}</span></td>
        <td><span className={`badge ${user.jabatan === 'admin_system' ? 'failed' : ''}`}>{user.jabatan}</span></td>
        <td>
          {user.isActive ? (
            <span className="badge succeeded">active</span>
          ) : user.resignedAt ? (
            <span className="badge failed" title={user.removedBy ? `removed by ${user.removedBy}` : (user.resignationReason ?? 'resigned')}>
              {user.removedBy ? 'removed' : 'resigned'}
            </span>
          ) : (
            <span className="badge">disabled</span>
          )}
        </td>
        <td>
          <button onClick={() => setEditing((e) => !e)}>{editing ? 'Cancel' : 'Edit'}</button>{' '}
          <button
            onClick={() => {
              api
                .updateUser(user.id, { isActive: !user.isActive })
                .then(onChanged)
                .catch((e) => onError(String(e.message ?? e)));
            }}
          >
            {user.isActive ? 'Disable' : 'Enable'}
          </button>
        </td>
      </tr>
      {editing && (
        <tr>
          <td colSpan={6}>
            <UserForm
              user={user}
              departments={departments}
              onSaved={() => {
                setEditing(false);
                onChanged();
              }}
              onError={onError}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function UserForm({
  user,
  departments,
  onSaved,
  onError,
}: {
  user?: RbacUser;
  departments: Department[];
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState(user?.name ?? '');
  const [waNumber, setWaNumber] = useState(user?.waNumber ?? '');
  const [departmentId, setDepartmentId] = useState<string>(user?.departmentId ?? departments[0]?.id ?? '');
  const [jabatan, setJabatan] = useState<JabatanLevel>(user?.jabatan ?? 'staff');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      if (user) {
        await api.updateUser(user.id, { name, waNumber, departmentId, jabatan });
      } else {
        await api.createUser({ name, waNumber, departmentId, jabatan, isActive: true });
      }
      onSaved();
    } catch (e: any) {
      onError(String(e.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} style={{ width: 200 }} />
        <input
          placeholder="WA number (+62...)"
          value={waNumber}
          onChange={(e) => setWaNumber(e.target.value)}
          style={{ width: 200 }}
        />
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} style={{ width: 180 }}>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select value={jabatan} onChange={(e) => setJabatan(e.target.value as JabatanLevel)} style={{ width: 160 }}>
          {JABATAN_OPTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
        </select>
        <button className="primary" disabled={saving || !name || !waNumber || !departmentId} onClick={submit}>
          {saving ? 'Saving…' : user ? 'Save' : 'Create user'}
        </button>
      </div>
    </div>
  );
}

// ---------- Departments ----------

function DepartmentsPanel({
  departments,
  onChange,
  onError,
}: {
  departments: Department[];
  onChange: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const create = () => {
    api
      .createDepartment({ name, description: description || null })
      .then(() => {
        setName('');
        setDescription('');
        onChange();
      })
      .catch((e) => onError(String(e.message ?? e)));
  };

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Departments</h3>
      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <input placeholder="Name (e.g. HRD)" value={name} onChange={(e) => setName(e.target.value)} style={{ width: 200 }} />
        <input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="primary" disabled={!name} onClick={create}>+ Add</button>
      </div>

      {departments.length === 0 ? (
        <p className="empty">No departments yet.</p>
      ) : (
        <table>
          <thead><tr><th>Name</th><th>Description</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id}>
                <td><span className="badge">{d.name}</span></td>
                <td style={{ color: 'var(--text-dim)' }}>{d.description ?? '—'}</td>
                <td className="mono">{new Date(d.createdAt).toLocaleString()}</td>
                <td>
                  <button
                    onClick={() => {
                      if (!confirm(`Delete department "${d.name}"? Users + permissions referencing it will become orphans.`)) {
                        return;
                      }
                      api.deleteDepartment(d.id).then(onChange).catch((e) => onError(String(e.message ?? e)));
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------- Folder permissions ----------

function PermissionsPanel({
  departments,
  onError,
}: {
  departments: Department[];
  onError: (msg: string) => void;
}) {
  const [items, setItems] = useState<FolderPermission[]>([]);
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? '');
  const [folderPath, setFolderPath] = useState('');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('read');

  const deptName = useMemo(() => {
    const m = new Map<string, string>();
    departments.forEach((d) => m.set(d.id, d.name));
    return m;
  }, [departments]);

  const refresh = () => {
    api.listPermissions().then((r) => setItems(r.items)).catch((e) => onError(String(e.message ?? e)));
  };

  useEffect(refresh, []);

  useEffect(() => {
    if (!departmentId && departments.length) setDepartmentId(departments[0].id);
  }, [departments]);

  const grant = () => {
    api
      .grantPermission({ departmentId, folderPath, accessLevel })
      .then(() => {
        setFolderPath('');
        refresh();
      })
      .catch((e) => onError(String(e.message ?? e)));
  };

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Folder permissions</h3>
      <div className="row" style={{ gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} style={{ width: 180 }}>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <input
          placeholder="/folder/path"
          value={folderPath}
          onChange={(e) => setFolderPath(e.target.value)}
          style={{ width: 240 }}
        />
        <select value={accessLevel} onChange={(e) => setAccessLevel(e.target.value as AccessLevel)} style={{ width: 120 }}>
          {ACCESS_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <button className="primary" disabled={!departmentId || !folderPath} onClick={grant}>+ Grant</button>
      </div>

      {items.length === 0 ? (
        <p className="empty">No grants.</p>
      ) : (
        <table>
          <thead><tr><th>Department</th><th>Folder</th><th>Access</th><th>Granted</th><th></th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td><span className="badge">{deptName.get(p.departmentId) ?? p.departmentId}</span></td>
                <td className="mono">{p.folderPath}</td>
                <td>
                  <span className={`badge ${p.accessLevel === 'admin' ? 'failed' : p.accessLevel === 'write' ? 'executing' : ''}`}>
                    {p.accessLevel}
                  </span>
                </td>
                <td className="mono">{new Date(p.createdAt).toLocaleString()}</td>
                <td>
                  <button
                    onClick={() => {
                      api
                        .revokePermission(p.departmentId, p.folderPath)
                        .then(refresh)
                        .catch((e) => onError(String(e.message ?? e)));
                    }}
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------- Access check ----------

function AccessCheckPanel({ onError }: { onError: (msg: string) => void }) {
  const [wa, setWa] = useState('');
  const [folder, setFolder] = useState('/');
  const [action, setAction] = useState<AccessLevel>('read');
  const [result, setResult] = useState<RbacCheckResult | null>(null);

  const check = () => {
    api
      .rbacCheck(wa, folder, action)
      .then(setResult)
      .catch((e) => onError(String(e.message ?? e)));
  };

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Access check</h3>
      <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
        Pre-flight what a WA number can do against a folder.
      </p>
      <div className="row" style={{ gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="WA number" value={wa} onChange={(e) => setWa(e.target.value)} style={{ width: 200 }} />
        <input placeholder="/folder/path" value={folder} onChange={(e) => setFolder(e.target.value)} style={{ width: 240 }} />
        <select value={action} onChange={(e) => setAction(e.target.value as AccessLevel)} style={{ width: 120 }}>
          {ACCESS_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <button className="primary" disabled={!wa || !folder} onClick={check}>Check</button>
      </div>

      {result && (
        <div className="card" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="row">
            <span className={`badge ${result.allowed ? 'succeeded' : 'failed'}`}>
              {result.allowed ? 'ALLOWED' : 'DENIED'}
            </span>
            <span style={{ color: 'var(--text-dim)' }}>{result.reason}</span>
          </div>
          {result.user && (
            <p className="mono" style={{ fontSize: 12, marginTop: 8 }}>
              {result.user.name} · {result.user.waNumber} · {result.user.departmentName ?? '—'} · {result.user.jabatan}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
