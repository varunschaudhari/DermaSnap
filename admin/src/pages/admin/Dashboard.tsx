import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';


const COLORS = {
  patients: '#6366f1',
  doctors: '#06b6d4',
  admins: '#f59e0b',
  scans: '#10b981',
  treatments: '#ec4899',
  relationships: '#8b5cf6',
};

const ROLE_COLORS = [COLORS.patients, COLORS.doctors, COLORS.admins];

function StatCard({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${color}18` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl bg-white px-3 py-2 shadow-lg ring-1 ring-slate-200 text-sm">
        {label && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="font-medium">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await api.get('/api/admin/stats');
      return response.json();
    },
  });

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await api.get('/api/admin/users');
      return response.json();
    },
  });

  const totalUsers = stats?.users?.total ?? 0;
  const totalPatients = stats?.users?.patients ?? 0;
  const totalDoctors = stats?.users?.doctors ?? 0;
  const totalAdmins = Math.max(0, totalUsers - totalPatients - totalDoctors);
  const totalScans = stats?.scans?.total ?? 0;
  const totalTreatments = stats?.treatments?.total ?? 0;
  const totalRelationships = stats?.relationships?.total ?? 0;

  const recentUsers = Array.isArray(users) ? users.slice(0, 8) : [];

  const roleData = [
    { name: 'Patients', value: totalPatients },
    { name: 'Doctors', value: totalDoctors },
    { name: 'Admins', value: totalAdmins },
  ].filter((d) => d.value > 0);

  const systemData = [
    { name: 'Users', value: totalUsers, fill: COLORS.patients },
    { name: 'Scans', value: totalScans, fill: COLORS.scans },
    { name: 'Treatments', value: totalTreatments, fill: COLORS.treatments },
    { name: 'Relations', value: totalRelationships, fill: COLORS.relationships },
  ];

  // Build a simple mock growth trend using available totals
  const trendData = [
    { month: 'Jan', users: Math.round(totalUsers * 0.4), scans: Math.round(totalScans * 0.3) },
    { month: 'Feb', users: Math.round(totalUsers * 0.52), scans: Math.round(totalScans * 0.42) },
    { month: 'Mar', users: Math.round(totalUsers * 0.61), scans: Math.round(totalScans * 0.55) },
    { month: 'Apr', users: Math.round(totalUsers * 0.7), scans: Math.round(totalScans * 0.63) },
    { month: 'May', users: Math.round(totalUsers * 0.8), scans: Math.round(totalScans * 0.75) },
    { month: 'Jun', users: totalUsers, scans: totalScans },
  ];

  return (
    <section className="space-y-6 p-6 lg:p-8">
      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-6 py-7 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 right-24 h-28 w-28 rounded-full bg-white/5" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Overview</p>
            <h1 className="mt-1 text-2xl font-bold lg:text-3xl">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-slate-300">
              Monitor platform health, users, scans and analytics.
            </p>
          </div>
          {/* <div className="flex gap-2">
            <Link
              to="/admin/users"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Manage Users
            </Link>
            <Link
              to="/admin/roles"
              className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Roles
            </Link>
          </div> */}
        </div>
      </header>

      {/* KPI Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Total Users"
            value={totalUsers}
            color={COLORS.patients}
            sub="All roles"
            icon={
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            }
          />
          <StatCard
            label="Patients"
            value={totalPatients}
            color={COLORS.patients}
            sub={`${totalUsers ? Math.round((totalPatients / totalUsers) * 100) : 0}% of users`}
            icon={
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path d="M12 12c2.7 0 5.8 1.29 6 4.01L18 18H6l.01-1.99C6.2 13.29 9.3 12 12 12zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
              </svg>
            }
          />
          <StatCard
            label="Doctors"
            value={totalDoctors}
            color={COLORS.doctors}
            sub="Active clinicians"
            icon={
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
              </svg>
            }
          />
          <StatCard
            label="Total Scans"
            value={totalScans}
            color={COLORS.scans}
            sub="Skin analyses"
            icon={
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path d="M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M19 5h-6v6h6V5zm-6 8h1.5v1.5H13V13zm1.5 1.5H16V16h-1.5v-1.5zM16 13h1.5v1.5H16V13zm-3 3h1.5v1.5H13V16zm1.5 1.5H16V19h-1.5v-1.5zM16 16h1.5v1.5H16V16zm1.5-1.5H19V16h-1.5v-1.5zM19 13h-1.5v-1.5H19V13z" />
              </svg>
            }
          />
          <StatCard
            label="Treatments"
            value={totalTreatments}
            color={COLORS.treatments}
            sub="Prescribed plans"
            icon={
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
              </svg>
            }
          />
          <StatCard
            label="Relationships"
            value={totalRelationships}
            color={COLORS.relationships}
            sub="Doctor–patient links"
            icon={
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Growth trend area chart */}
        <div className="col-span-1 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Growth Trend</h2>
              <p className="text-xs text-slate-400">Users & Scans over time</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.patients} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={COLORS.patients} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.scans} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={COLORS.scans} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              />
              <Area
                type="monotone"
                dataKey="users"
                name="Users"
                stroke={COLORS.patients}
                strokeWidth={2}
                fill="url(#colorUsers)"
              />
              <Area
                type="monotone"
                dataKey="scans"
                name="Scans"
                stroke={COLORS.scans}
                strokeWidth={2}
                fill="url(#colorScans)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* User role donut */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-2">
            <h2 className="text-base font-semibold text-slate-900">User Roles</h2>
            <p className="text-xs text-slate-400">Distribution by role</p>
          </div>
          {roleData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {roleData.map((_, index) => (
                    <Cell key={index} fill={ROLE_COLORS[index % ROLE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          {/* Totals below donut */}
          <div className="mt-2 grid grid-cols-3 divide-x divide-slate-100 text-center">
            {[
              { label: 'Patients', value: totalPatients, color: COLORS.patients },
              { label: 'Doctors', value: totalDoctors, color: COLORS.doctors },
              { label: 'Admins', value: totalAdmins, color: COLORS.admins },
            ].map((item) => (
              <div key={item.label} className="px-2">
                <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
                <p className="text-xs text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System overview bar chart + recent users */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Bar chart */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Platform Overview</h2>
            <p className="text-xs text-slate-400">Total counts per entity</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={systemData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={65} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Count" radius={[0, 6, 6, 0]}>
                {systemData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent users table */}
        <div className="col-span-1 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recent Users</h2>
              <p className="text-xs text-slate-400">Latest registered accounts</p>
            </div>
            <Link
              to="/admin/users"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              View all
            </Link>
          </div>
          {recentUsers.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
              No users yet
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl ring-1 ring-slate-100">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{
                              background:
                                u.role === 'doctor'
                                  ? COLORS.doctors
                                  : u.role === 'admin'
                                  ? COLORS.admins
                                  : COLORS.patients,
                            }}
                          >
                            {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                          <span className="font-medium text-slate-800 truncate max-w-[120px]">{u.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 truncate max-w-[160px]">{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-semibold capitalize"
                          style={{
                            background:
                              u.role === 'doctor'
                                ? `${COLORS.doctors}18`
                                : u.role === 'admin'
                                ? `${COLORS.admins}18`
                                : `${COLORS.patients}18`,
                            color:
                              u.role === 'doctor'
                                ? COLORS.doctors
                                : u.role === 'admin'
                                ? COLORS.admins
                                : COLORS.patients,
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
