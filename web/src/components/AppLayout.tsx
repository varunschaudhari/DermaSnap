import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../config/rbac';
import type { ReactNode } from 'react';
import { useState } from 'react';
import './AppLayout.css';

type AppLayoutProps = {
  children: ReactNode;
};

function NavIcon({ icon }: { icon: 'dashboard' | 'users' | 'roles' | 'doctor' | 'reports' }) {
  const common = 'h-4 w-4 shrink-0';
  if (icon === 'users') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="3.5" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a3.5 3.5 0 0 1 0 6.75" />
      </svg>
    );
  }
  if (icon === 'roles') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
        <path d="M12 15l-3.5 2 1-3.9L6.5 10l4-.3L12 6l1.5 3.7 4 .3-3 3.1 1 3.9z" />
      </svg>
    );
  }
  if (icon === 'doctor') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
        <path d="M12 2v20M2 12h20" />
      </svg>
    );
  }
  if (icon === 'reports') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
        <path d="M4 19h16" />
        <path d="M7 15V9" />
        <path d="M12 15V5" />
        <path d="M17 15v-3" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const navItems = getSidebarItems(user?.role);
  const adminTheme = user?.role === 'admin';
  const [open, setOpen] = useState(false);

  return (
    <div className={`app-shell min-h-screen ${adminTheme ? 'bg-slate-100' : 'bg-teal-50'} lg:flex`}>
      <button
        className={`app-mobile-toggle lg:hidden ${
          adminTheme ? 'bg-slate-900 text-white' : 'bg-teal-900 text-white'
        }`}
        aria-label="Toggle navigation"
        onClick={() => setOpen((v) => !v)}
      >
        ☰
      </button>
      <aside
        className={`app-sidebar w-full lg:w-72 ${open ? 'open' : ''} ${
          adminTheme ? 'bg-slate-900 text-slate-100' : 'bg-teal-900 text-teal-50'
        } px-5 py-6`}
      >
        <div className="mb-8">
          <h2 className="text-2xl font-heading font-bold">DermaSnap</h2>
          <p className={`mt-1 text-xs tracking-wider ${adminTheme ? 'text-slate-300' : 'text-teal-200'}`}>
            {user?.role?.toUpperCase()} PANEL
          </p>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin' || item.path === '/doctor' || item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? adminTheme
                      ? 'bg-slate-700 text-white'
                      : 'bg-teal-700 text-white'
                    : adminTheme
                    ? 'text-slate-200 hover:bg-slate-800'
                    : 'text-teal-100 hover:bg-teal-800'
                }`
              }
              onClick={() => setOpen(false)}
            >
              <NavIcon icon={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={`mt-10 border-t pt-4 ${adminTheme ? 'border-slate-700' : 'border-teal-700'}`}>
          <div className="mb-3">
            <p className="text-sm font-semibold">{user?.full_name}</p>
            <p className={`text-xs ${adminTheme ? 'text-slate-300' : 'text-teal-200'}`}>{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="w-full rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500"
          >
            Logout
          </button>
        </div>
      </aside>

      {open && <div className="app-overlay lg:hidden" onClick={() => setOpen(false)} />}

      <main className="app-main-content flex-1 min-w-0">
        <div className="app-container">{children}</div>
      </main>
    </div>
  );
}
