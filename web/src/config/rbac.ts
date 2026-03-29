import type { User } from '../services/auth';

export type AppRole = User['role'];

export type AppModule =
  | 'adminDashboard'
  | 'adminUsers'
  | 'adminRoles'
  | 'doctorDashboard'
  | 'reports'
  | 'patientManagement'
  | 'scanDetails';

export type SidebarItem = {
  label: string;
  path: string;
  module: AppModule;
  icon: 'dashboard' | 'users' | 'roles' | 'doctor' | 'reports';
};

const rolePermissions: Record<AppRole, AppModule[]> = {
  patient: [],
  doctor: ['doctorDashboard', 'reports', 'patientManagement', 'scanDetails'],
  admin: [
    'adminDashboard',
    'adminUsers',
    'adminRoles',
    'doctorDashboard',
    'reports',
    'patientManagement',
    'scanDetails',
  ],
};

const roleSidebarItems: Record<AppRole, SidebarItem[]> = {
  patient: [],
  doctor: [
    { label: 'Doctor Dashboard', path: '/doctor', module: 'doctorDashboard', icon: 'doctor' },
    { label: 'Reports', path: '/doctor/reports', module: 'reports', icon: 'reports' },
  ],
  admin: [
    { label: 'Admin Dashboard', path: '/admin', module: 'adminDashboard', icon: 'dashboard' },
    { label: 'Users', path: '/admin/users', module: 'adminUsers', icon: 'users' },
    { label: 'Roles', path: '/admin/roles', module: 'adminRoles', icon: 'roles' },
    { label: 'Doctor Dashboard', path: '/doctor', module: 'doctorDashboard', icon: 'doctor' },
    { label: 'Reports', path: '/doctor/reports', module: 'reports', icon: 'reports' },
  ],
};

export function getDefaultRouteForRole(role: AppRole | undefined): string {
  if (role === 'admin') return '/admin';
  if (role === 'doctor') return '/doctor';
  return '/login';
}

export function canAccessModule(role: AppRole | undefined, module: AppModule): boolean {
  if (!role) return false;
  return rolePermissions[role]?.includes(module) ?? false;
}

export function getSidebarItems(role: AppRole | undefined): SidebarItem[] {
  if (!role) return [];
  return roleSidebarItems[role] ?? [];
}
