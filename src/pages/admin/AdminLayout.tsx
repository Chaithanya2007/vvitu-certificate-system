import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  FileCheck2,
  ScrollText,
  Award,
  BarChart3,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/students', label: 'Students & Classes', icon: Users },
  { to: '/admin/import', label: 'Excel Student Import', icon: FileSpreadsheet },
  { to: '/admin/requests', label: 'Certificate Requests', icon: FileCheck2 },
  { to: '/admin/issued', label: 'Issued Certificates', icon: Award },
  { to: '/admin/templates', label: 'Types & Templates', icon: ScrollText },
  { to: '/admin/reports', label: 'Reports & Audit Logs', icon: BarChart3 },
];

export default function AdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-68 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-20 px-5 flex items-center justify-between border-b border-slate-800 bg-white">
          <Link to="/admin" className="flex items-center gap-2.5">
            <img src="/vvit-logo.png" alt="VVITU" className="h-12 w-auto object-contain" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#D9785D]">VVITU Admin</p>
              <p className="text-sm font-extrabold text-slate-900">CertManager</p>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-[#D9785D] text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <Link
            to="/verify"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
          >
            <span>Public Verification Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <div className="px-2">
            <p className="text-xs font-semibold text-white truncate">{profile?.display_name || 'Administrator'}</p>
            <p className="text-[11px] text-slate-400 uppercase">{profile?.role || 'admin'}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-sm sm:text-base font-bold text-slate-800">
              Vasireddy Venkatadri International Technological University — Certificate Administration
            </h1>
          </div>
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            A.Y. 2025–2026 • CSE (AI & DS)
          </span>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
