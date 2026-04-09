import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const TYPE_COLORS: Record<string, string> = {
  acne: '#6366f1',
  pigmentation: '#f59e0b',
  wrinkles: '#10b981',
  full: '#06b6d4',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl bg-white px-3 py-2 shadow-lg ring-1 ring-slate-100 text-sm">
        {label && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color ?? p.fill }} className="font-medium">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
        <div className="h-3 w-3 rounded-full" style={{ background: color }} />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function calcAge(dob?: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--;
  return age;
}

export default function PatientDashboard() {
  const { user } = useAuth();

  // Full profile (includes health fields from updated /auth/me)
  const { data: profile } = useQuery({
    queryKey: ['patient-me'],
    queryFn: async () => {
      const res = await api.get('/api/auth/me');
      return res.json();
    },
  });

  // Assigned doctors
  const { data: doctors } = useQuery({
    queryKey: ['patient-doctors'],
    queryFn: async () => {
      const res = await api.get('/api/relationships/doctors');
      return res.json();
    },
  });

  // Scans
  const { data: scans, isLoading: scansLoading } = useQuery({
    queryKey: ['patient-scans', user?.id],
    queryFn: async () => {
      const res = await api.get(`/api/scans?patient_id=${user?.id}&limit=100`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Treatments
  const { data: treatments } = useQuery({
    queryKey: ['patient-treatments'],
    queryFn: async () => {
      const res = await api.get('/api/treatments');
      return res.json();
    },
  });

  const scanList = Array.isArray(scans) ? scans : [];
  const treatmentList = Array.isArray(treatments) ? treatments : [];
  const activeTreatments = treatmentList.filter((t: any) => t.status === 'active' || !t.status);
  const doctorList = Array.isArray(doctors) ? doctors : [];

  // Scan type distribution for pie chart
  const typeCounts: Record<string, number> = {};
  for (const s of scanList) {
    const t = s.analysisType || 'unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  const pieData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

  // Scan trend (group by week/month approximation using last 8 scans reversed)
  const recentScans = [...scanList].slice(0, 20).reverse();
  const trendData = recentScans.map((s: any, i: number) => ({
    label: `#${i + 1}`,
    scans: 1,
    date: s.timestamp ? new Date(s.timestamp).toLocaleDateString() : '',
  }));

  // Cumulative trend
  const cumulativeTrend = trendData.map((_, i) => ({
    label: trendData[i].date || `#${i + 1}`,
    total: i + 1,
  }));

  const age = calcAge(profile?.dob);
  const assignedDoctor = doctorList[0];

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl px-6 py-7 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)' }}>
        <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-24 h-20 w-20 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">Patient Portal</p>
            <h1 className="mt-1 text-2xl font-bold lg:text-3xl">
              Welcome back, {user?.full_name?.split(' ')[0] ?? 'Patient'}
            </h1>
            <p className="mt-1 text-sm text-emerald-100">{user?.email}</p>
          </div>
          {assignedDoctor && (
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium text-emerald-100 mb-0.5">Assigned Doctor</p>
              <p className="font-semibold text-white">{assignedDoctor.full_name}</p>
              <p className="text-xs text-emerald-200">{assignedDoctor.email}</p>
            </div>
          )}
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Scans" value={scanList.length} sub="All time" color="#6366f1" />
        <StatCard label="Active Treatments" value={activeTreatments.length} sub="In progress" color="#10b981" />
        <StatCard
          label="BMI"
          value={profile?.bmi ? parseFloat(profile.bmi).toFixed(1) : '—'}
          sub={profile?.weight_kg && profile?.height_cm ? `${profile.weight_kg}kg · ${profile.height_cm}cm` : undefined}
          color="#f59e0b"
        />
        <StatCard
          label="Age"
          value={age ?? '—'}
          sub={profile?.gender ? profile.gender.replace('_', ' ') : undefined}
          color="#06b6d4"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Scan trend */}
        <div className="col-span-1 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Scan Progress</h2>
            <p className="text-xs text-slate-400">Cumulative scans over time</p>
          </div>
          {cumulativeTrend.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">No scans recorded yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={cumulativeTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" name="Total Scans" stroke="#0d9488" strokeWidth={2} fill="url(#scanGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Scan type donut */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-2">
            <h2 className="text-base font-semibold text-slate-900">Scan Types</h2>
            <p className="text-xs text-slate-400">Distribution by analysis type</p>
          </div>
          {pieData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={TYPE_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Scans + Treatments row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent scans */}
        <div className="col-span-1 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recent Scans</h2>
              <p className="text-xs text-slate-400">Latest skin analyses</p>
            </div>
          </div>
          {scansLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />)}</div>
          ) : scanList.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-slate-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 h-8 w-8">
                <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
              </svg>
              <p className="text-sm">No scans yet</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl ring-1 ring-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {scanList.slice(0, 8).map((s: any) => {
                    const type = s.analysisType || 'unknown';
                    const result = s[type];
                    return (
                      <tr key={s._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
                            style={{ background: `${TYPE_COLORS[type] ?? '#94a3b8'}18`, color: TYPE_COLORS[type] ?? '#64748b' }}
                          >
                            {type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {s.timestamp ? new Date(s.timestamp).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {result?.severity ?? result?.percentage != null
                            ? `${result.percentage ?? ''}${result.severity ? ` · ${result.severity}` : ''}`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Active Treatments */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Active Treatments</h2>
            <p className="text-xs text-slate-400">{activeTreatments.length} in progress</p>
          </div>
          {activeTreatments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-slate-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 h-8 w-8">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" /><path d="M12 8v8M8 12h8" />
              </svg>
              <p className="text-sm">No active treatments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTreatments.slice(0, 5).map((t: any) => (
                <div key={t.id} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 leading-tight">{t.product_name}</p>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Active
                    </span>
                  </div>
                  {t.diagnosis && <p className="mt-1 text-xs text-slate-500 line-clamp-1">{t.diagnosis}</p>}
                  <div className="mt-2 flex gap-3 text-[11px] text-slate-400">
                    <span>{t.frequency}</span>
                    {t.duration_days && <span>· {t.duration_days}d</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Health Profile card */}
      {(profile?.height_cm || profile?.weight_kg || profile?.bmi || profile?.dob) && (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Health Profile</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {[
              { label: 'Height', value: profile?.height_cm ? `${profile.height_cm} cm` : null },
              { label: 'Weight', value: profile?.weight_kg ? `${profile.weight_kg} kg` : null },
              { label: 'BMI', value: profile?.bmi ? parseFloat(profile.bmi).toFixed(1) : null },
              { label: 'Age', value: age != null ? `${age} yrs` : null },
              { label: 'Gender', value: profile?.gender?.replace('_', ' ') ?? null },
              { label: 'Mobile', value: profile?.mobile ?? null },
            ]
              .filter((f) => f.value)
              .map((f) => (
                <div key={f.label} className="rounded-xl bg-slate-50 px-4 py-3 text-center">
                  <p className="text-xs text-slate-400">{f.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800 capitalize">{f.value}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
