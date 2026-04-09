import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

type Relationship = {
  id: string;
  doctor_id: string;
  doctor_name: string;
  doctor_email: string;
  patient_id: string;
  patient_name: string;
  patient_email: string;
  status: string;
  created_at: string | null;
};

type User = { id: string; full_name: string; email: string; role: string };

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ background: color }}
    >
      {initials || '?'}
    </div>
  );
}

export default function AdminRelationships() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ doctor_id: '', patient_id: '' });

  const { data: relationships, isLoading } = useQuery<Relationship[]>({
    queryKey: ['admin-relationships'],
    queryFn: async () => {
      const res = await api.get('/api/admin/relationships');
      return res.json();
    },
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/api/admin/users');
      return res.json();
    },
  });

  const doctors = useMemo(() => (users ?? []).filter((u) => u.role === 'doctor'), [users]);
  const patients = useMemo(() => (users ?? []).filter((u) => u.role === 'patient'), [users]);

  const filtered = useMemo(() => {
    const list = Array.isArray(relationships) ? relationships : [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.doctor_name.toLowerCase().includes(q) ||
        r.patient_name.toLowerCase().includes(q) ||
        r.doctor_email.toLowerCase().includes(q) ||
        r.patient_email.toLowerCase().includes(q)
    );
  }, [relationships, search]);

  const assignMutation = useMutation({
    mutationFn: async ({ doctor_id, patient_id }: { doctor_id: string; patient_id: string }) => {
      const res = await api.post(
        `/api/relationships/assign?patient_id=${patient_id}&doctor_id=${doctor_id}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to assign');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-relationships'] });
      setAssignOpen(false);
      setAssignForm({ doctor_id: '', patient_id: '' });
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

  const totalActive = (relationships ?? []).filter((r) => r.status === 'active').length;
  const totalPending = (relationships ?? []).filter((r) => r.status === 'pending').length;
  const uniqueDoctors = new Set((relationships ?? []).map((r) => r.doctor_id)).size;
  const uniquePatients = new Set((relationships ?? []).map((r) => r.patient_id)).size;

  return (
    <section className="space-y-6 p-6 lg:p-8">
      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-6 py-7 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 right-20 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Admin</p>
          <h1 className="mt-1 text-2xl font-bold lg:text-3xl">Relationships</h1>
          <p className="mt-1 text-sm text-slate-300">Manage doctor–patient assignments across the platform.</p>
        </div>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Total Links', value: (relationships ?? []).length, color: '#6366f1' },
          { label: 'Active', value: totalActive, color: '#10b981' },
          { label: 'Pending', value: totalPending, color: '#f59e0b' },
          { label: 'Doctors Linked', value: uniqueDoctors, color: '#06b6d4' },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}>
              <div className="h-3 w-3 rounded-full" style={{ background: s.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search doctor or patient..."
          className="flex-1 min-w-[220px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <button
          onClick={() => setAssignOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Assign Relationship
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 h-10 w-10">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p className="text-sm font-medium">No relationships found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Doctor</th>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((rel) => (
                  <tr key={rel.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={rel.doctor_name} color="#06b6d4" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{rel.doctor_name}</p>
                          <p className="text-xs text-slate-400 truncate">{rel.doctor_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={rel.patient_name} color="#6366f1" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{rel.patient_name}</p>
                          <p className="text-xs text-slate-400 truncate">{rel.patient_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
                        style={{
                          background: rel.status === 'active' ? '#d1fae5' : '#fef3c7',
                          color: rel.status === 'active' ? '#065f46' : '#92400e',
                        }}
                      >
                        {rel.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {rel.created_at ? new Date(rel.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => {
                          if (!confirm(`Remove link between ${rel.doctor_name} and ${rel.patient_name}?`)) return;
                          removeMutation.mutate(rel.id);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                        </svg>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {assignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAssignOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900">Assign Relationship</h3>
            <p className="mt-1 text-xs text-slate-500">Link a doctor to a patient directly.</p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Doctor</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  value={assignForm.doctor_id}
                  onChange={(e) => setAssignForm({ ...assignForm, doctor_id: e.target.value })}
                >
                  <option value="">Select a doctor...</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.full_name} — {d.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Patient</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  value={assignForm.patient_id}
                  onChange={(e) => setAssignForm({ ...assignForm, patient_id: e.target.value })}
                >
                  <option value="">Select a patient...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name} — {p.email}</option>
                  ))}
                </select>
              </div>
            </div>

            {assignMutation.isError && (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
                {(assignMutation.error as Error)?.message || 'Failed to assign'}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                onClick={() => setAssignOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                disabled={!assignForm.doctor_id || !assignForm.patient_id || assignMutation.isPending}
                onClick={() => assignMutation.mutate(assignForm)}
              >
                {assignMutation.isPending ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
