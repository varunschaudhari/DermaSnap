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

type Tab = 'profile' | 'scans' | 'treatments' | 'relationships';

const TABS: { key: Tab; label: string; roles?: string[] }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'scans', label: 'Scans', roles: ['patient'] },
  { key: 'treatments', label: 'Treatments', roles: ['patient', 'doctor'] },
  { key: 'relationships', label: 'Relationships', roles: ['patient', 'doctor'] },
];

// ─── Sub-components ─────────────────────────────────────────────────────────

function ScansTab({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { data: scans, isLoading } = useQuery({
    queryKey: ['admin-scans', userId],
    queryFn: async () => {
      const res = await api.get(`/api/scans?patient_id=${userId}`);
      return res.json();
    },
  });

  if (isLoading) return <Skeleton />;
  const list = Array.isArray(scans) ? scans : [];

  if (!list.length)
    return <EmptyState icon="scan" message="No scans found for this patient." />;

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-slate-100">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3 text-left">Type</th>
            <th className="px-5 py-3 text-left">Date</th>
            <th className="px-5 py-3 text-left">Status</th>
            <th className="px-5 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 bg-white">
          {list.map((scan: any) => (
            <tr key={scan._id || scan.id} className="hover:bg-slate-50/60 transition-colors">
              <td className="px-5 py-3.5 font-medium capitalize text-slate-800">
                {scan.analysisType || scan.analysis_type || '—'}
              </td>
              <td className="px-5 py-3.5 text-slate-500 text-xs">
                {scan.timestamp ? new Date(scan.timestamp).toLocaleString() : '—'}
              </td>
              <td className="px-5 py-3.5">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {scan.status || 'Completed'}
                </span>
              </td>
              <td className="px-5 py-3.5 text-right">
                <button
                  onClick={() => navigate(`/doctor/scan/${scan._id || scan.id}`)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TreatmentsTab({ userId }: { userId: string }) {
  const { data: treatments, isLoading } = useQuery({
    queryKey: ['admin-treatments', userId],
    queryFn: async () => {
      const res = await api.get(`/api/treatments?patient_id=${userId}`);
      return res.json();
    },
  });

  if (isLoading) return <Skeleton />;
  const list = Array.isArray(treatments) ? treatments : [];
  if (!list.length) return <EmptyState icon="treatment" message="No treatments found." />;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {list.map((t: any) => (
        <div key={t.id} className="rounded-2xl bg-white p-5 ring-1 ring-slate-100 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-slate-900">{t.product_name}</p>
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
              style={{
                background: t.status === 'active' ? '#d1fae5' : t.status === 'completed' ? '#e0e7ff' : '#fef3c7',
                color: t.status === 'active' ? '#065f46' : t.status === 'completed' ? '#3730a3' : '#92400e',
              }}
            >
              {t.status || 'active'}
            </span>
          </div>
          {t.diagnosis && <p className="mt-2 text-xs text-slate-500">{t.diagnosis}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div><span className="text-slate-400">Frequency</span><br />{t.frequency || '—'}</div>
            <div><span className="text-slate-400">Duration</span><br />{t.duration_days ? `${t.duration_days} days` : '—'}</div>
          </div>
          {t.notes && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{t.notes}</p>}
          <p className="mt-3 text-[11px] text-slate-400">
            {t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}
          </p>
        </div>
      ))}
    </div>
  );
}

function RelationshipsTab({ userId, role }: { userId: string; role: string }) {
  const queryClient = useQueryClient();

  const { data: relationships, isLoading } = useQuery({
    queryKey: ['admin-relationships'],
    queryFn: async () => {
      const res = await api.get('/api/admin/relationships');
      return res.json();
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/admin/relationships/${id}`);
      if (!res.ok) throw new Error('Failed to remove');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-relationships'] }),
  });

  if (isLoading) return <Skeleton />;

  const list = Array.isArray(relationships) ? relationships : [];
  const relevant =
    role === 'patient'
      ? list.filter((r: any) => r.patient_id === userId)
      : list.filter((r: any) => r.doctor_id === userId);

  if (!relevant.length)
    return <EmptyState icon="link" message={`No relationships found for this ${role}.`} />;

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-slate-100">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3 text-left">{role === 'patient' ? 'Doctor' : 'Patient'}</th>
            <th className="px-5 py-3 text-left">Status</th>
            <th className="px-5 py-3 text-left">Since</th>
            <th className="px-5 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 bg-white">
          {relevant.map((r: any) => {
            const name = role === 'patient' ? r.doctor_name : r.patient_name;
            const email = role === 'patient' ? r.doctor_email : r.patient_email;
            return (
              <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="font-medium text-slate-800">{name}</p>
                  <p className="text-xs text-slate-400">{email}</p>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
                    style={{
                      background: r.status === 'active' ? '#d1fae5' : '#fef3c7',
                      color: r.status === 'active' ? '#065f46' : '#92400e',
                    }}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-500">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => {
                      if (!confirm('Remove this relationship?')) return;
                      removeMutation.mutate(r.id);
                    }}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-14 text-slate-400">
      {icon === 'scan' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 h-10 w-10">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
        </svg>
      )}
      {icon === 'treatment' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 h-10 w-10">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" /><path d="M12 8v8M8 12h8" />
        </svg>
      )}
      {icon === 'link' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 h-10 w-10">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      )}
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AdminUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
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
      const body: any = {};
      if (typeof updates.height_cm !== 'undefined') body.height_cm = updates.height_cm;
      if (typeof updates.weight_kg !== 'undefined') body.weight_kg = updates.weight_kg;
      if (typeof updates.bmi !== 'undefined') body.bmi = updates.bmi;
      if (typeof updates.address !== 'undefined') body.address = updates.address;
      if (typeof updates.pincode !== 'undefined') body.pincode = updates.pincode;
      if (typeof updates.dob !== 'undefined') body.dob = updates.dob;
      if (typeof updates.gender !== 'undefined') body.gender = updates.gender;
      if (typeof updates.mobile !== 'undefined') body.mobile = updates.mobile;
      const res = await api.put(`/api/admin/users/${userId}?${params.toString()}`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEdit(false);
    },
  });

  const canSave = useMemo(() => !!form && typeof form.is_active === 'boolean' && !!form.role, [form]);
  const visibleTabs = TABS.filter((t) => !t.roles || t.roles.includes(form?.role ?? ''));

  if (isLoading) return <div className="p-8 text-sm text-slate-500">Loading...</div>;
  if (error) return <div className="p-8 text-sm text-rose-500">Failed to load user.</div>;
  if (!form) return null;

  const initials = form.full_name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const roleColor = form.role === 'doctor' ? '#06b6d4' : form.role === 'admin' ? '#f59e0b' : '#6366f1';

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Header card */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-sm"
            style={{ background: roleColor }}
          >
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{form.full_name}</h1>
            <p className="text-sm text-slate-500">{form.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
                style={{ background: `${roleColor}18`, color: roleColor }}
              >
                {form.role}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  form.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {form.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'profile' && (
            <>
              {!edit ? (
                <button
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  onClick={() => setEdit(true)}
                >
                  Edit
                </button>
              ) : (
                <>
                  <button
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    disabled={!canSave || updateMutation.isPending}
                    onClick={() => updateMutation.mutate(form)}
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    onClick={() => { setForm(data as AdminUser); setEdit(false); }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </>
          )}
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-all"
            style={{
              background: activeTab === t.key ? '#fff' : 'transparent',
              color: activeTab === t.key ? '#1e293b' : '#64748b',
              boxShadow: activeTab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Profile card */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <p className="mb-4 text-sm font-semibold text-slate-800">Profile Information</p>
            <div className="space-y-3 text-sm">
              <Field label="Full Name">
                <input className="input" disabled value={form.full_name} readOnly />
              </Field>
              <Field label="Email">
                <input className="input" disabled value={form.email} readOnly />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Role">
                  <select
                    disabled={!edit}
                    className="input"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    {(Array.isArray(roles) ? roles : []).map((r) => (
                      <option key={r.id} value={r.key}>{r.name || r.key}</option>
                    ))}
                    {roles && Array.isArray(roles) && roles.findIndex((r) => r.key === form.role) === -1 && (
                      <option value={form.role}>{form.role}</option>
                    )}
                  </select>
                </Field>
                <Field label="Status">
                  <button
                    disabled={!edit}
                    className={`w-full rounded-lg px-3 py-2 text-sm font-semibold ${form.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'} ${!edit ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                    onClick={() => edit && setForm({ ...form, is_active: !form.is_active })}
                  >
                    {form.is_active ? 'Active' : 'Inactive'}
                  </button>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Date of Birth">
                  <input type="date" disabled={!edit} className="input" value={form.dob ?? ''} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
                </Field>
                <Field label="Gender">
                  <select disabled={!edit} className="input" value={form.gender ?? ''} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </Field>
                <Field label="Mobile">
                  <input disabled={!edit} className="input" value={form.mobile ?? ''} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Height (cm)">
                  <input type="number" disabled={!edit} className="input" value={form.height_cm ?? ''} onChange={(e) => {
                    const height_cm = parseFloat(e.target.value || '0');
                    const bmi = height_cm > 0 && (form.weight_kg ?? 0) > 0 ? +((form.weight_kg!) / Math.pow(height_cm / 100, 2)).toFixed(1) : undefined;
                    setForm({ ...form, height_cm: isNaN(height_cm) ? undefined : height_cm, bmi });
                  }} />
                </Field>
                <Field label="Weight (kg)">
                  <input type="number" disabled={!edit} className="input" value={form.weight_kg ?? ''} onChange={(e) => {
                    const weight_kg = parseFloat(e.target.value || '0');
                    const bmi = (form.height_cm ?? 0) > 0 && weight_kg > 0 ? +(weight_kg / Math.pow((form.height_cm!) / 100, 2)).toFixed(1) : undefined;
                    setForm({ ...form, weight_kg: isNaN(weight_kg) ? undefined : weight_kg, bmi });
                  }} />
                </Field>
                <Field label="BMI">
                  <input type="number" disabled={!edit} className="input" value={form.bmi ?? ''} onChange={(e) => setForm({ ...form, bmi: parseFloat(e.target.value) || undefined })} />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Field label="Address">
                    <input disabled={!edit} className="input" value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </Field>
                </div>
                <Field label="Pincode">
                  <input disabled={!edit} className="input" value={form.pincode ?? ''} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
                </Field>
              </div>
            </div>
          </div>

          {/* Meta card */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <p className="mb-4 text-sm font-semibold text-slate-800">Meta</p>
            <div className="space-y-3 text-sm">
              <MetaRow label="User ID" value={<span className="font-mono text-xs text-slate-600">{form.id}</span>} />
              <MetaRow label="Created" value={form.created_at ? new Date(form.created_at).toLocaleString() : '—'} />
              <MetaRow label="Role" value={<span className="capitalize">{form.role}</span>} />
              <MetaRow label="Account" value={
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${form.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {form.is_active ? 'Active' : 'Inactive'}
                </span>
              } />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'scans' && userId && <ScansTab userId={userId} />}
      {activeTab === 'treatments' && userId && <TreatmentsTab userId={userId} />}
      {activeTab === 'relationships' && userId && <RelationshipsTab userId={userId} role={form.role} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs text-slate-500">{label}</p>
      {children}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}
