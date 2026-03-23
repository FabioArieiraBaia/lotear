import React from 'react';
import { resolveUrl } from '../utils/url';
import { Outlet, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Map, DollarSign, Users, Contact, Briefcase, LayoutDashboard, ShieldAlert, MonitorPlay } from 'lucide-react';

export default function AdminLayout() {
  const location = useLocation();
  const hasToken = !!localStorage.getItem('adminToken');

  if (!hasToken) {
    return <Navigate to="/admin/login" replace />;
  }

  const menuItems = [
    { id: 'loteamentos', path: '/admin', icon: LayoutDashboard, label: 'Loteamentos' },
    { id: 'apresentacao', path: '/admin/apresentacao', icon: MonitorPlay, label: 'Apresentação' },
    { id: 'financeiro', path: '/admin/financeiro', icon: DollarSign, label: 'Financeiro' },
    { id: 'compradores', path: '/admin/compradores', icon: Users, label: 'Compradores' },
    { id: 'contatos', path: '/admin/contatos', icon: Contact, label: 'Contatos' },
    { id: 'corretores', path: '/admin/corretores', icon: Briefcase, label: 'Corretores' },
    { id: 'usuarios', path: '/admin/usuarios', icon: ShieldAlert, label: 'Usuários' },
  ];

  let permissions: string[] = [];
  try {
    permissions = JSON.parse(localStorage.getItem('adminPermissions') || '[]');
    // Se for admin antigo que logou antes do módulo Apresentação existir, forçamos o acesso sem pedir re-login
    if (permissions.length > 0 && permissions.includes('usuarios') && !permissions.includes('apresentacao')) {
      permissions.push('apresentacao');
    }
  } catch (e) {
    permissions = [];
  }

  // fallback to full access if permissions is empty but token exists (e.g. legacy admin)
  const allowedMenuItems = permissions.length > 0 
    ? menuItems.filter(item => permissions.includes(item.id))
    : menuItems;

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-neutral-900 border-r border-white/10 flex flex-col hidden md:flex">
        <div className="p-6">
          <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">Módulos</h2>
          <nav className="space-y-2">
            {allowedMenuItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200 border border-transparent'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Nav (Bottom) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-white/10 z-50 flex justify-around p-3 pb-safe">
        {allowedMenuItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                isActive ? 'text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-neutral-950 p-6 md:p-8 pb-24 md:pb-8">
        <Outlet />
      </main>
    </div>
  );
}
