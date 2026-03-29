import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

type Crud = { read: 0 | 1; create: 0 | 1; update: 0 | 1; delete: 0 | 1 };
type Role = { id: string; name: string; key: string; permissions: Record<string, Crud> };

const DEFAULT_RESOURCES = [
  // Keep strictly to existing backend/frontend modules
  'users',                  // admin users management
  'roles',                  // this roles module
  'scans',                  // /api/scans
  'treatments',             // /api/treatments
  'relationships',          // /api/relationships
  'image',                  // /api/image (image_quality)
  'comparison',             // /api/comparison
  'treatment-suggestions',  // /api/treatment-suggestions
];

export default function AdminRoles() {
  const queryClient = useQueryClient();
  const [resources] = useState<string[]>(DEFAULT_RESOURCES);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Role | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKey, setNewKey] = useState('');
  const keyPattern = /^[a-z][a-z0-9_-]*$/;

  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const response = await api.get('/api/admin/roles');
      return response.json() as Promise<Role[]>;
    },
  });

  const selectedRole = useMemo(
    () => (Array.isArray(roles) ? roles.find((r) => r.id === selectedRoleId) || roles?.[0] : null),
    [roles, selectedRoleId]
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-roles'] });

  const createRole = useMutation({
    mutationFn: async (payload: { name: string; key: string; permissions: Record<string, Crud> }) => {
      const response = await api.post('/api/admin/roles', payload);
      if (!response.ok) throw new Error((await response.json().catch(() => ({})))?.detail || 'Create failed');
      return response.json();
    },
    onSuccess: () => {
      setCreateOpen(false);
      setNewName('');
      setNewKey('');
      invalidate();
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Role> }) => {
      const response = await api.put(`/api/admin/roles/${id}`, updates);
      if (!response.ok) throw new Error((await response.json().catch(() => ({})))?.detail || 'Update failed');
      return response.json();
    },
    onSuccess: () => invalidate(),
  });

  const deleteRole = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/api/admin/roles/${id}`);
      if (!response.ok) throw new Error((await response.json().catch(() => ({})))?.detail || 'Delete failed');
      return response.json();
    },
    onSuccess: () => {
      if (selectedRoleId) setSelectedRoleId(null);
      invalidate();
    },
  });

  const canCreate = newName.trim() && newKey.trim() && keyPattern.test(newKey.trim());

  const ensureCrud = (c?: Crud): Crud => ({ read: c?.read ?? 0, create: c?.create ?? 0, update: c?.update ?? 0, delete: c?.delete ?? 0 });
  // No implied READ; all flags are independent per request
  const noImply = (c: Crud): Crud => c;

  const toggle = (role: Role, res: string, field: keyof Crud) => {
    const curr = ensureCrud(role.permissions?.[res]);
    const next: Crud = { ...curr, [field]: curr[field] ? 0 : 1 } as Crud;
    const implied = noImply(next);
    updateRole.mutate({
      id: role.id,
      updates: { permissions: { ...(role.permissions || {}), [res]: implied } },
    });
  };

  const setRow = (role: Role, res: string, value: 0 | 1) => {
    const target: Crud = value
      ? { read: 1, create: 1, update: 1, delete: 1 }
      : { read: 0, create: 0, update: 0, delete: 0 };
    updateRole.mutate({
      id: role.id,
      updates: { permissions: { ...(role.permissions || {}), [res]: target } },
    });
  };

  const setColumn = (role: Role, field: keyof Crud, value: 0 | 1) => {
    const updated: Record<string, Crud> = { ...(role.permissions || {}) };
    resources.forEach((r) => {
      const curr = ensureCrud(updated[r]);
      const next = { ...curr, [field]: value } as Crud;
      updated[r] = noImply(next);
    });
    updateRole.mutate({ id: role.id, updates: { permissions: updated } });
  };

  const startRename = (role: Role) => {
    setRenameTarget(role);
    setRenameValue(role.name);
    setRenameOpen(true);
  };

  const Toggle = ({ checked, onChange, label, disabled }: { checked: boolean; onChange: () => void; label?: string; disabled?: boolean }) => (
    <button
      type="button"
      aria-pressed={checked}
      aria-disabled={disabled}
      aria-label={label}
      onClick={() => { if (!disabled) onChange(); }}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        disabled ? 'bg-slate-300 opacity-60 cursor-not-allowed' : checked ? 'bg-emerald-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <section className="p-4 lg:p-6">
      <div className="mb-3 flex items-center justify-between lg:hidden">
        <h1 className="text-lg font-semibold">Roles</h1>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
            onClick={() => setMobileListOpen(true)}
          >
            Manage Roles
          </button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Left: roles list */}
        <aside className="hidden lg:block rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <h2 className="text-sm font-semibold">Roles</h2>
            <button
              className="rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
              onClick={() => setCreateOpen(true)}
            >
              + Add
            </button>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            {(Array.isArray(roles) ? roles : []).map((r) => {
              const active = (selectedRole?.id || r.id) === r.id;
              return (
                <div key={r.id} className={`flex items-center justify-between px-3 py-2 ${active ? 'bg-slate-50' : ''}`}>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="active_role"
                      checked={active}
                      onChange={() => setSelectedRoleId(r.id)}
                    />
                    <span className="font-medium">{r.name}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button className="text-xs text-slate-600 hover:underline" onClick={() => startRename(r)}>rename</button>
                    <button
                      className="text-xs text-rose-600 hover:underline"
                      onClick={() => {
                        if (window.confirm('Delete this role?')) deleteRole.mutate(r.id);
                      }}
                    >
                      delete
                    </button>
                  </div>
                </div>
              );
            })}
            {(!roles || roles.length === 0) && (
              <div className="p-4 text-sm text-slate-500">No roles yet. Create your first role.</div>
            )}
          </div>

          {/* Create form inline drawer style */}
          {createOpen && (
            <div className="border-t border-slate-200 p-4 space-y-2">
              <input
                className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                placeholder="Role name (e.g., Supervisor)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                placeholder="Key (lowercase, a–z, 0–9, -, _)"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toLowerCase())}
              />
              {!keyPattern.test(newKey.trim()) && newKey.trim().length > 0 && (
                <div className="text-xs text-rose-600">
                  Key must start with a letter and contain only lowercase letters, numbers, hyphens, or underscores.
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <button
                  disabled={!canCreate || createRole.isLoading}
                  onClick={() =>
                    createRole.mutate({
                      name: newName.trim(),
                      key: newKey.trim(),
                      permissions: Object.fromEntries(resources.map((r) => [r, { read: 0, create: 0, update: 0, delete: 0 } as Crud])),
                    })
                  }
                  className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {createRole.isLoading ? 'Saving...' : 'Save'}
                </button>
                <button className="text-xs text-slate-600 hover:underline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Right: permission matrix */}
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div>
              <h2 className="text-sm font-semibold">Permissions</h2>
              {selectedRole && <div className="text-xs text-slate-500">Editing: {selectedRole.name}</div>}
            </div>
            {selectedRole && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Column quick actions removed from header per request */}
                {!editMode ? (
                  <button className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50" onClick={() => setEditMode(true)}>
                    Edit Permissions
                  </button>
                ) : (
                  <button className="rounded-md border border-emerald-300 px-2 py-1 text-xs hover:bg-emerald-50 text-emerald-700" onClick={() => setEditMode(false)}>
                    Done
                  </button>
                )}
                <button className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50" onClick={() => setHistoryOpen(true)}>
                  View History
                </button>
              </div>
            )}
          </div>

          {!selectedRole ? (
            <div className="p-6 text-sm text-slate-500">Select a role from the left to configure permissions.</div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop table */}
              <table className="hidden min-w-full text-left text-sm md:table">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold text-center">CREATE</th>
                    <th className="px-4 py-3 font-semibold text-center">READ</th>
                    <th className="px-4 py-3 font-semibold text-center">UPDATE</th>
                    <th className="px-4 py-3 font-semibold text-center">DELETE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resources.map((res) => {
                    const curr = ensureCrud(selectedRole.permissions?.[res]);
                    const cell = (f: keyof Crud) => (
                      <td className="px-4 py-3 text-center">
                        <Toggle
                          checked={!!curr[f]}
                          onChange={() => toggle(selectedRole, res, f)}
                          label={`${res} ${f}`}
                          disabled={!editMode}
                        />
                      </td>
                    );
                    return (
                      <tr key={res}>
                        <td className="px-4 py-3 font-medium capitalize">{res.replace('-', ' ')}</td>
                        {cell('create')}
                        {cell('read')}
                        {cell('update')}
                        {cell('delete')}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="md:hidden p-2 space-y-2">
                {resources.map((res) => {
                  const curr = ensureCrud(selectedRole.permissions?.[res]);
                  const Cell = ({ f }: { f: keyof Crud }) => (
                    <div className="flex items-center justify-between rounded-lg border border-default px-3 py-2">
                      <div className="text-xs font-medium">{f.toUpperCase()}</div>
                      <Toggle
                        checked={!!curr[f]}
                        onChange={() => toggle(selectedRole, res, f)}
                        label={`${res} ${f}`}
                        disabled={!editMode}
                      />
                    </div>
                  );
                  return (
                    <div key={res} className="rounded-lg border border-default p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="font-medium capitalize">{res.replace('-', ' ')}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Cell f="create" />
                        <Cell f="read" />
                        <Cell f="update" />
                        <Cell f="delete" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simple placeholder for View History */}
      {historyOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHistoryOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[420px] rounded-l-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h3 className="text-sm font-semibold">Permission History</h3>
              <button className="text-xs text-slate-600 hover:underline" onClick={() => setHistoryOpen(false)}>Close</button>
            </div>
            <div className="p-4 text-sm text-slate-600">
              History tracking can be wired to an audit collection. For now, this is a placeholder.
            </div>
          </div>
        </div>
      )}

      {/* Mobile drawer for roles list */}
      {mobileListOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileListOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[85%] max-w-[340px] rounded-r-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="text-sm font-semibold">Roles</h2>
              <button className="text-xs text-slate-600 hover:underline" onClick={() => setMobileListOpen(false)}>Close</button>
            </div>
            <div className="max-h-[60vh] overflow-auto">
              {(Array.isArray(roles) ? roles : []).map((r) => {
                const active = (selectedRole?.id || r.id) === r.id;
                return (
                  <div key={r.id} className={`flex items-center justify-between px-3 py-2 ${active ? 'bg-slate-50' : ''}`}>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="active_role_mobile"
                        checked={active}
                        onChange={() => { setSelectedRoleId(r.id); setMobileListOpen(false); }}
                      />
                      <span className="font-medium">{r.name}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button className="text-xs text-slate-600 hover:underline" onClick={() => startRename(r)}>rename</button>
                      <button
                        className="text-xs text-rose-600 hover:underline"
                        onClick={() => { if (window.confirm('Delete this role?')) deleteRole.mutate(r.id); }}
                      >
                        delete
                      </button>
                    </div>
                  </div>
                );
              })}
              {(!roles || roles.length === 0) && (
                <div className="p-4 text-sm text-slate-500">No roles yet. Create your first role.</div>
              )}
            </div>
            <div className="border-t border-slate-200 p-4 space-y-2">
              {!createOpen ? (
                <button className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white" onClick={() => setCreateOpen(true)}>
                  + Add Role
                </button>
              ) : (
                <>
                  <input
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                    placeholder="Role name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <input
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                    placeholder="key (lowercase)"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value.toLowerCase())}
                  />
                  {!keyPattern.test(newKey.trim()) && newKey.trim().length > 0 && (
                    <div className="text-xs text-rose-600">
                      Key must start with a letter and contain only lowercase letters, numbers, hyphens, or underscores.
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      disabled={!(newName.trim() && newKey.trim() && keyPattern.test(newKey.trim())) || createRole.isLoading}
                      onClick={() =>
                        createRole.mutate({
                          name: newName.trim(),
                          key: newKey.trim(),
                          permissions: Object.fromEntries(resources.map((r) => [r, { read: 0, create: 0, update: 0, delete: 0 } as Crud])),
                        })
                      }
                      className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {createRole.isLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button className="text-xs text-slate-600 hover:underline" onClick={() => setCreateOpen(false)}>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameOpen && renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRenameOpen(false)} />
          <div className="relative w-[95%] max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold">Rename role</h3>
            <p className="mt-1 text-xs text-slate-600">Update the display name for this role.</p>
            <div className="mt-3">
              <input
                autoFocus
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Role name"
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50"
                onClick={() => setRenameOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                disabled={!renameValue.trim() || updateRole.isLoading}
                onClick={() => {
                  const nv = renameValue.trim();
                  if (nv && nv !== renameTarget.name) {
                    updateRole.mutate({ id: renameTarget.id, updates: { name: nv } }, { onSuccess: () => setRenameOpen(false) });
                  } else {
                    setRenameOpen(false);
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
