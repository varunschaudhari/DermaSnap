import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';

type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  role: 'patient' | 'doctor' | 'admin';
  is_active: boolean;
  is_deleted?: boolean;
};

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: '',
    email: '',
    role: '',
    password: '',
    height_cm: '',
    weight_kg: '',
    bmi: '',
    address: '',
    pincode: '',
    dob: '',
    gender: '',
    mobile: '',
  });

  const [roleFilter, setRoleFilter] = useState<'' | 'patient' | 'doctor' | 'admin'>('');
  const [showDeleted, setShowDeleted] = useState(false);
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', showDeleted],
    queryFn: async () => {
      const response = await api.get(`/api/admin/users${showDeleted ? '?include_deleted=true' : ''}`);
      return response.json();
    },
    placeholderData: (prev) => prev,
  });
  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const response = await api.get('/api/admin/roles');
      return response.json();
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: Partial<Pick<AdminUser, 'role' | 'is_active'>>;
    }) => {
      const params = new URLSearchParams();
      if (typeof updates.role !== 'undefined') params.set('role', updates.role);
      if (typeof updates.is_active !== 'undefined') params.set('is_active', String(updates.is_active));
      const response = await api.put(`/api/admin/users/${userId}?${params.toString()}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (payload: { full_name: string; email: string; role: string; password?: string }) => {
      const res = await api.post('/api/admin/users', payload);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create user');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setAddOpen(false);
      setAddForm({ full_name: '', email: '', role: '', password: '', height_cm: '', weight_kg: '', bmi: '', address: '', pincode: '', dob: '', gender: '', mobile: '' });
    },
  });

  const filteredUsers = useMemo(() => {
    let list = Array.isArray(users) ? (users as AdminUser[]) : [];
    const needle = search.trim().toLowerCase();
    if (needle) {
      list = list.filter(
        (u) => u.full_name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle)
      );
    }
    if (roleFilter) {
      list = list.filter((u) => u.role === roleFilter);
    }
    return list;
  }, [users, search, roleFilter]);

  return (
    <section className="p-6 lg:p-8">
      <header className="rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-heading font-bold text-slate-900">Users Module</h1>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-slate-600">Manage user roles and activation status.</p>
          <button className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white" onClick={() => setAddOpen(true)}>
            + Add User
          </button>
        </div>
      </header>

      <div className="mt-5 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as '' | 'patient' | 'doctor' | 'admin')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
          >
            <option value="">All roles</option>
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
            />
            Show deleted
          </label>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No users found.</div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => navigate(`/admin/users/${user.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{user.full_name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!user.is_deleted && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm('Delete this user? This is a soft delete and can be restored.')) return;
                        try {
                          await api.delete(`/api/admin/users/${user.id}`);
                          await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
                          await queryClient.invalidateQueries({ queryKey: ['admin-users', true] });
                          await queryClient.invalidateQueries({ queryKey: ['admin-users', false] });
                        } catch (err) {
                          alert('Failed to delete user');
                        }
                      }}
                      className="inline-flex items-center justify-center rounded-md border border-slate-300 p-2 text-slate-700 hover:bg-rose-50"
                      aria-label="Delete user"
                    >
                      {/* trash icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-rose-600">
                        <path d="M9 3h6a1 1 0 0 1 1 1v1h4v2H4V5h4V4a1 1 0 0 1 1-1zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"/>
                      </svg>
                    </button>
                    )}
                    {user.is_deleted && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await api.post(`/api/admin/users/${user.id}/restore`);
                            await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
                            await queryClient.invalidateQueries({ queryKey: ['admin-users', true] });
                            await queryClient.invalidateQueries({ queryKey: ['admin-users', false] });
                          } catch (err) {
                            alert('Failed to restore user');
                          }
                        }}
                        className="inline-flex items-center justify-center rounded-md border border-slate-300 p-2 text-slate-700 hover:bg-emerald-50"
                        aria-label="Restore user"
                      >
                        {/* rotate-left icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-emerald-700">
                          <path d="M13 3a9 9 0 1 0 8.485 6H19a7 7 0 1 1-6-4v3l5-4-5-4v3z"/>
                        </svg>
                      </button>
                    )}
                    <Link
                      to={`/admin/users/${user.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-2 inline-flex items-center justify-center rounded-md border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
                      aria-label="View / Edit"
                    >
                      {/* pencil icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 000-1.42l-2.34-2.34a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/>
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAddOpen(false)} />
          <div className="relative w-[95%] max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold">Add user</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="text-xs text-slate-600 mb-1">Full name</div>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                  placeholder="e.g., Jane Doe"
                />
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-slate-600 mb-1">Email</div>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="name@clinic.com"
                />
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">Role</div>
                <select
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                >
                  <option value="">Select role</option>
                  {(Array.isArray(roles) ? roles : []).map((r: any) => (
                    <option key={r.id} value={r.key}>{r.name || r.key}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">Temporary password (optional)</div>
                <input
                  type="password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="Min 8 characters"
                />
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">Date of Birth</div>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
                  value={addForm.dob}
                  onChange={(e) => setAddForm({ ...addForm, dob: e.target.value })}
                />
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">Gender</div>
                <select
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                  value={addForm.gender}
                  onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-slate-600 mb-1">Mobile number</div>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
                  value={addForm.mobile}
                  onChange={(e) => setAddForm({ ...addForm, mobile: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">Height (cm)</div>
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
                  value={addForm.height_cm}
                  onChange={(e) => {
                    const height_cm = e.target.value;
                    const h = parseFloat(height_cm);
                    const w = parseFloat(addForm.weight_kg || '0');
                    const bmi = h > 0 && w > 0 ? (w / Math.pow(h / 100, 2)).toFixed(1) : '';
                    setAddForm({ ...addForm, height_cm, bmi });
                  }}
                  placeholder="e.g., 170"
                />
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">Weight (kg)</div>
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
                  value={addForm.weight_kg}
                  onChange={(e) => {
                    const weight_kg = e.target.value;
                    const h = parseFloat(addForm.height_cm || '0');
                    const w = parseFloat(weight_kg);
                    const bmi = h > 0 && w > 0 ? (w / Math.pow(h / 100, 2)).toFixed(1) : '';
                    setAddForm({ ...addForm, weight_kg, bmi });
                  }}
                  placeholder="e.g., 65"
                />
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">BMI</div>
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring disabled:bg-slate-50"
                  value={addForm.bmi}
                  onChange={(e) => setAddForm({ ...addForm, bmi: e.target.value })}
                  placeholder="auto"
                />
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-slate-600 mb-1">Address</div>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
                  value={addForm.address}
                  onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                  placeholder="Street, Area"
                />
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">Pincode</div>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
                  value={addForm.pincode}
                  onChange={(e) => setAddForm({ ...addForm, pincode: e.target.value })}
                  placeholder="ZIP / PIN"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="rounded-md border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50" onClick={() => setAddOpen(false)}>
                Cancel
              </button>
              <button
                className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                disabled={!addForm.full_name.trim() || !addForm.email.trim() || !addForm.role.trim() || createUserMutation.isPending}
                onClick={() => {
                  const payload: any = {
                    full_name: addForm.full_name.trim(),
                    email: addForm.email.trim(),
                    role: addForm.role.trim(),
                  };
                  if (addForm.password.trim()) payload.password = addForm.password.trim();
                  if (addForm.height_cm) payload.height_cm = parseFloat(addForm.height_cm);
                  if (addForm.weight_kg) payload.weight_kg = parseFloat(addForm.weight_kg);
                  if (addForm.bmi) payload.bmi = parseFloat(addForm.bmi);
                  if (addForm.address) payload.address = addForm.address.trim();
                  if (addForm.pincode) payload.pincode = addForm.pincode.trim();
                  if (addForm.dob) payload.dob = addForm.dob;
                  if (addForm.gender) payload.gender = addForm.gender;
                  if (addForm.mobile) payload.mobile = addForm.mobile.trim();
                  createUserMutation.mutate(payload, {
                    onError: (e: any) => alert(e?.message || 'Failed to create user'),
                  });
                }}
              >
                {createUserMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
