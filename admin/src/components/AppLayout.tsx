import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../config/rbac';
import type { ReactNode } from 'react';
import { useState } from 'react';

type AppLayoutProps = { children: ReactNode };

// ─── Icons ───────────────────────────────────────────────────────────────────
const icons: Record<string, JSX.Element> = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  roles: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  doctor: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  ),
  relationships: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
};

// ─── Nav groups ──────────────────────────────────────────────────────────────
const patientGroups = [
  {
    label: 'My Health',
    items: ['My Dashboard'],
  },
];

const adminGroups = [
  {
    label: 'Platform',
    items: ['Admin Dashboard'],
  },
  {
    label: 'Management',
    items: ['Users', 'Roles', 'Relationships'],
  },
  {
    label: 'Clinical',
    items: ['Doctor Dashboard', 'Reports'],
  },
];

const doctorGroups = [
  {
    label: 'Clinical',
    items: ['Doctor Dashboard', 'Reports'],
  },
];

// ─── Top bar label from path ──────────────────────────────────────────────────
function usePageTitle() {
  const { pathname } = useLocation();
  const map: Record<string, string> = {
    '/admin': 'Dashboard',
    '/admin/users': 'Users',
    '/admin/roles': 'Roles',
    '/admin/relationships': 'Relationships',
    '/doctor': 'Dashboard',
    '/doctor/reports': 'Reports',
    '/patient': 'My Dashboard',
  };
  if (pathname.startsWith('/admin/users/')) return 'User Detail';
  if (pathname.startsWith('/doctor/patient/')) return 'Patient Detail';
  if (pathname.startsWith('/doctor/scan/')) return 'Scan Detail';
  return map[pathname] ?? 'Overview';
}

// ─── Layout ──────────────────────────────────────────────────────────────────
export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const navItems = getSidebarItems(user?.role);
  const isAdmin = user?.role === 'admin';
  const isPatient = user?.role === 'patient';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pageTitle = usePageTitle();

  const groups = isAdmin ? adminGroups : isPatient ? patientGroups : doctorGroups;

  // Map group item labels → navItem
  const itemByLabel = Object.fromEntries(navItems.map((n) => [n.label, n]));

  const initials = user?.full_name
    ? user.full_name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : '?';

  // Theme tokens
  const accentHex = isAdmin ? '#6366f1' : isPatient ? '#10b981' : '#0d9488';
  const sidebarBg = isAdmin ? '#0f1117' : isPatient ? '#052e16' : '#0d1f1e';
  const activeBg = isAdmin ? 'rgba(99,102,241,0.15)' : isPatient ? 'rgba(16,185,129,0.15)' : 'rgba(13,148,136,0.15)';
  const activeText = isAdmin ? '#a5b4fc' : isPatient ? '#6ee7b7' : '#5eead4';
  const hoverBg = 'rgba(255,255,255,0.05)';
  const groupLabelColor = isAdmin ? '#4b5563' : '#374151';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100" style={{ background: isAdmin ? '#f0f2f8' : '#f0f7f6' }}>

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col transition-transform duration-300 lg:static lg:!translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: sidebarBg }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white font-bold text-sm"
            style={{ background: accentHex }}
          >
            DS
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">DermaSnap</p>
            <p className="text-[10px] font-medium tracking-widest uppercase" style={{ color: groupLabelColor, filter: 'brightness(1.8)' }}>
              {user?.role} panel
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((group) => {
            const groupNavItems = group.items
              .map((label) => itemByLabel[label])
              .filter(Boolean);
            if (!groupNavItems.length) return null;
            return (
              <div key={group.label}>
                <p
                  className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: groupLabelColor, filter: 'brightness(1.6)' }}
                >
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {groupNavItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/admin' || item.path === '/doctor'}
                      onClick={() => setSidebarOpen(false)}
                      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150"
                      style={({ isActive }) => ({
                        background: isActive ? activeBg : 'transparent',
                        color: isActive ? activeText : 'rgba(255,255,255,0.55)',
                      })}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        if (!el.dataset.active) el.style.background = hoverBg;
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget;
                        if (!el.dataset.active) el.style.background = 'transparent';
                      }}
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className="shrink-0 transition-colors"
                            style={{ color: isActive ? activeText : 'rgba(255,255,255,0.4)' }}
                          >
                            {icons[item.icon]}
                          </span>
                          <span className="truncate">{item.label}</span>
                          {isActive && (
                            <span
                              className="ml-auto h-1.5 w-1.5 rounded-full shrink-0"
                              style={{ background: accentHex }}
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User card */}
        <div className="border-t border-white/[0.06] p-4">
          <div className="mb-3 flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: accentHex }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.full_name}</p>
              <p className="truncate text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-400 ring-1 ring-rose-400/30 hover:bg-rose-500/10 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header
          className="flex shrink-0 items-center justify-between border-b px-4 py-3 lg:px-6"
          style={{
            background: '#ffffff',
            borderColor: isAdmin ? '#e5e7f0' : '#d1faf5',
          }}
        >
          {/* Left: hamburger + breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <p className="text-xs text-slate-400 capitalize hidden sm:block">{user?.role} / {pageTitle}</p>
              <h2 className="text-base font-semibold text-slate-800 leading-tight">{pageTitle}</h2>
            </div>
          </div>

          {/* Right: badge + avatar */}
          <div className="flex items-center gap-2">
            <span
              className="hidden sm:inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
              style={{
                background: isAdmin ? 'rgba(99,102,241,0.1)' : 'rgba(13,148,136,0.1)',
                color: accentHex,
              }}
            >
              {user?.role}
            </span>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: accentHex }}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
