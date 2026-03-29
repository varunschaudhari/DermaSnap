import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import './Dashboard.css';

export default function AdminDashboard() {
  const { data: stats } = useQuery({
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

  const totalUsers = stats?.users?.total || 0;
  const totalPatients = stats?.users?.patients || 0;
  const totalDoctors = stats?.users?.doctors || 0;
  const totalScans = stats?.scans?.total || 0;
  const totalTreatments = stats?.treatments?.total || 0;
  const totalRelationships = stats?.relationships?.total || 0;

  const latestUsers = Array.isArray(users) ? users.slice(0, 5) : [];

  return (
    <section className="admin-dashboard">
      <header className="dashboard-header rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold lg:text-3xl">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-slate-200">Monitor users, roles and overall system health.</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/admin/users"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Manage Users
            </Link>
            <Link
              to="/admin/roles"
              className="rounded-lg border border-white/40 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              View Roles
            </Link>
          </div>
        </div>
      </header>

      <div className="dashboard-content mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">Total Users</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalUsers}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">Patients</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalPatients}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">Doctors</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalDoctors}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">Total Scans</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalScans}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">Treatments</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalTreatments}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">Relationships</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalRelationships}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Users</h2>
            <Link to="/admin/users" className="text-sm font-medium text-slate-700 hover:text-slate-900">
              View all
            </Link>
          </div>
          {latestUsers.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
              No users found.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {latestUsers.map((u: any) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3 font-medium">{u.full_name}</td>
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3 capitalize">{u.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Role Summary</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="font-medium text-slate-700">Admin</span>
              <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-white">Full Access</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="font-medium text-slate-700">Doctor</span>
              <span className="rounded-full bg-teal-700 px-2 py-1 text-xs text-white">Clinical Modules</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="font-medium text-slate-700">Patient</span>
              <span className="rounded-full bg-slate-500 px-2 py-1 text-xs text-white">Limited</span>
            </div>
          </div>
          <Link
            to="/admin/roles"
            className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Open Roles Module
          </Link>
        </div>
      </div>
    </section>
  );
}
