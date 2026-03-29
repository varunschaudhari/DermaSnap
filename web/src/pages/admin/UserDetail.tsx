import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at?: string;
  height_cm?: number;
  weight_kg?: number;
  bmi?: number;
  address?: string;
  pincode?: string;
  dob?: string;
  gender?: string;
  mobile?: string;
};

export default function AdminUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AdminUser | null>(null);
  const [edit, setEdit] = useState(false);
  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const res = await api.get('/api/admin/roles');
      return res.json() as Promise<{ id: string; name: string; key: string }[]>;
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-user', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await api.get(`/api/admin/users/${userId}`);
      return res.json() as Promise<AdminUser>;
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<AdminUser>) => {
      const params = new URLSearchParams();
      if (typeof updates.is_active !== 'undefined') params.set('is_active', String(updates.is_active));
      if (updates.role) params.set('role', updates.role);
      // send extra fields in JSON body
      const body: any = {};
      if (typeof updates.height_cm !== 'undefined') body.height_cm = updates.height_cm;
      if (typeof updates.weight_kg !== 'undefined') body.weight_kg = updates.weight_kg;
      if (typeof updates.bmi !== 'undefined') body.bmi = updates.bmi;
      if (typeof updates.address !== 'undefined') body.address = updates.address;
      if (typeof updates.pincode !== 'undefined') body.pincode = updates.pincode;
      const res = await api.put(`/api/admin/users/${userId}?${params.toString()}`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEdit(false);
    },
  });

  const canSave = useMemo(() => {
    return !!form && typeof form.is_active === 'boolean' && !!form.role;
  }, [form]);

  if (isLoading) return <div className="p-6 text-sm text-slate-600">Loading user...</div>;
  if (error) return <div className="p-6 text-sm text-rose-600">Failed to load user.</div>;
  if (!form) return null;

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">User Details</h1>
          <p className="text-xs text-slate-600">{form.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {!edit ? (
            <button className="rounded-md border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50" onClick={() => setEdit(true)}>
              Edit
            </button>
          ) : (
            <>
              <button
                className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                disabled={!canSave || updateMutation.isLoading}
                onClick={() => {
                  updateMutation.mutate({ is_active: form.is_active, role: form.role });
                }}
              >
                {updateMutation.isLoading ? 'Saving...' : 'Save'}
              </button>
              <button className="rounded-md border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50" onClick={() => { setForm(data as AdminUser); setEdit(false); }}>
                Cancel
              </button>
            </>
          )}
          <button className="rounded-md border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="text-sm font-semibold mb-3">Profile</div>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-slate-500">Full Name</div>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring disabled:bg-slate-50"
                disabled
                value={form.full_name}
                onChange={(e) => setForm({ ...(form as AdminUser), full_name: e.target.value })}
              />
            </div>
            <div>
              <div className="text-xs text-slate-500">Email</div>
              <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50" disabled value={form.email} />
            </div>
              <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-500">Role</div>
                <select
                  disabled={!edit}
                  className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm disabled:bg-slate-50"
                  value={form.role}
                    onChange={(e) => setForm({ ...(form as AdminUser), role: e.target.value })}
                >
                    {/* Options populated from roles collection; fall back to current role if not present */}
                    {(Array.isArray(roles) ? roles : []).map((r) => (
                      <option key={r.id} value={r.key}>{r.name || r.key}</option>
                    ))}
                    {roles && Array.isArray(roles) && roles.findIndex(r => r.key === form.role) === -1 && (
                      <option value={form.role}>{form.role}</option>
                    )}
                </select>
              </div>
              <div>
                <div className="text-xs text-slate-500">Status</div>
                <button
                  className={`w-full rounded-md px-3 py-2 text-sm font-semibold ${form.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'} ${!edit ? 'opacity-60' : ''}`}
                  disabled={!edit}
                  onClick={() => setForm({ ...(form as AdminUser), is_active: !form.is_active })}
                >
                  {form.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div>
                  <div className="text-xs text-slate-500">Date of Birth</div>
                  <input
                    type="date"
                    disabled={!edit}
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm disabled:bg-slate-50"
                    value={form.dob ?? ''}
                    onChange={(e) => setForm({ ...(form as AdminUser), dob: e.target.value })}
                  />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Gender</div>
                  <select
                    disabled={!edit}
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm disabled:bg-slate-50"
                    value={form.gender ?? ''}
                    onChange={(e) => setForm({ ...(form as AdminUser), gender: e.target.value })}
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Mobile</div>
                  <input
                    disabled={!edit}
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm disabled:bg-slate-50"
                    value={form.mobile ?? ''}
                    onChange={(e) => setForm({ ...(form as AdminUser), mobile: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div>
                  <div className="text-xs text-slate-500">Height (cm)</div>
                  <input
                    type="number"
                    disabled={!edit}
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm disabled:bg-slate-50"
                    value={form.height_cm ?? ''}
                    onChange={(e) => {
                      const height_cm = parseFloat(e.target.value || '0');
                      const weight_kg = form.weight_kg ?? 0;
                      const bmi = height_cm > 0 && weight_kg > 0 ? +(weight_kg / Math.pow(height_cm / 100, 2)).toFixed(1) : undefined;
                      setForm({ ...(form as AdminUser), height_cm: isNaN(height_cm) ? undefined : height_cm, bmi });
                    }}
                  />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Weight (kg)</div>
                  <input
                    type="number"
                    disabled={!edit}
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm disabled:bg-slate-50"
                    value={form.weight_kg ?? ''}
                    onChange={(e) => {
                      const weight_kg = parseFloat(e.target.value || '0');
                      const height_cm = form.height_cm ?? 0;
                      const bmi = height_cm > 0 && weight_kg > 0 ? +(weight_kg / Math.pow(height_cm / 100, 2)).toFixed(1) : undefined;
                      setForm({ ...(form as AdminUser), weight_kg: isNaN(weight_kg) ? undefined : weight_kg, bmi });
                    }}
                  />
                </div>
                <div>
                  <div className="text-xs text-slate-500">BMI</div>
                  <input
                    type="number"
                    disabled={!edit}
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm disabled:bg-slate-50"
                    value={form.bmi ?? ''}
                    onChange={(e) => setForm({ ...(form as AdminUser), bmi: parseFloat(e.target.value || '0') || undefined })}
                  />
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <div className="text-xs text-slate-500">Address</div>
                  <input
                    disabled={!edit}
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm disabled:bg-slate-50"
                    value={form.address ?? ''}
                    onChange={(e) => setForm({ ...(form as AdminUser), address: e.target.value })}
                  />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Pincode</div>
                  <input
                    disabled={!edit}
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm disabled:bg-slate-50"
                    value={form.pincode ?? ''}
                    onChange={(e) => setForm({ ...(form as AdminUser), pincode: e.target.value })}
                  />
                </div>
              </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="text-sm font-semibold mb-3">Meta</div>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between"><span>Created</span><span>{form.created_at ? new Date(form.created_at).toLocaleString() : '—'}</span></div>
            <div className="flex items-center justify-between"><span>User ID</span><span className="font-mono text-xs">{form.id}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
