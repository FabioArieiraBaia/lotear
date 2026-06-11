import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { 
  Map, DollarSign, Users, Contact, Briefcase, 
  LayoutDashboard, ShieldAlert, MonitorPlay, Settings,
  LogOut, User, ChevronRight, Menu, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const hasToken = !!localStorage.getItem('adminToken');
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('adminUser');
      if (stored) setUserData(JSON.parse(stored));
    } catch (e) {
      console.error("Error reading user data", e);
    }
  }, []);

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!hasToken) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminPermissions');
    navigate('/admin/login');
  };

  const menuItems = [
    { id: 'loteamentos', path: '/admin', icon: LayoutDashboard, label: 'Loteamentos' },
    { id: 'apresentacao', path: '/admin/apresentacao', icon: MonitorPlay, label: 'Apresentação' },
    { id: 'financeiro', path: '/admin/financeiro', icon: DollarSign, label: 'Financeiro' },
    { id: 'compradores', path: '/admin/compradores', icon: Users, label: 'Compradores' },
    { id: 'contatos', path: '/admin/contatos', icon: Contact, label: 'Contatos' },
    { id: 'corretores', path: '/admin/corretores', icon: Briefcase, label: 'Corretores' },
    { id: 'usuarios', path: '/admin/usuarios', icon: ShieldAlert, label: 'Usuários' },
    { id: 'configuracoes', path: '/admin/configuracoes', icon: Settings, label: 'Configurações' },
  ];

  let permissions: string[] = [];
  try {
    permissions = JSON.parse(localStorage.getItem('adminPermissions') || '[]');
    if (permissions.length > 0 && permissions.includes('usuarios') && !permissions.includes('apresentacao')) {
      permissions.push('apresentacao');
    }
  } catch (e) {
    permissions = [];
  }

  const allowedMenuItems = permissions.length > 0 
    ? menuItems.filter(item => permissions.includes(item.id))
    : menuItems;

  return (
    <div className="flex h-screen bg-black overflow-hidden font-sans">
      
      {/* Dynamic Background Glows */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none" />

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 p-4 h-full relative z-[20]">
        <div className="flex-1 bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl sidebar-glow">
          
          {/* Logo / Header */}
          <div className="p-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Map className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight font-heading">
                  Lotear<span className="text-emerald-500">Pro</span>
                </h1>
                <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-medium leading-none mt-0.5">Gestão Imobiliária</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-8 space-y-2 custom-scrollbar overflow-y-auto">
            {allowedMenuItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all duration-300 relative ${
                    isActive 
                      ? 'bg-emerald-500 text-white shadow-[0_10px_20px_rgba(16,185,129,0.2)]' 
                      : 'text-neutral-400 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <item.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="font-semibold tracking-wide">{item.label}</span>
                  </div>
                  {isActive && (
                    <motion.div layoutId="activeNav" className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl" />
                  )}
                  <ChevronRight className={`w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-60 group-hover:translate-x-0 transition-all ${isActive ? 'hidden' : ''}`} />
                </Link>
              );
            })}
          </nav>

          {/* User Profile Area */}
          <div className="p-6 border-t border-white/5">
            <div className="flex flex-col gap-4">
              {userData && (
                <div className="flex items-center gap-3 px-2">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center p-0.5 overflow-hidden ring-2 ring-emerald-500/20">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center">
                      <User className="w-5 h-5 text-neutral-400" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{userData.name || 'Usuário'}</p>
                    <p className="text-[10px] text-neutral-500 uppercase font-medium tracking-wider truncate">{userData.role || 'Membro'}</p>
                  </div>
                </div>
              )}
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/[0.03] hover:bg-red-500/10 text-neutral-400 hover:text-red-400 transition-all border border-white/5 hover:border-red-500/20 group font-bold text-sm"
              >
                <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Sair do Sistema
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      {!isDesktop && (
        <header className="fixed top-0 left-0 right-0 h-16 bg-black/90 backdrop-blur-2xl border-b border-white/10 z-[30] flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Map className="w-5 h-5 text-emerald-500" />
            <span className="font-bold text-white tracking-tight">Lotear<span className="text-emerald-500">Pro</span></span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-white"
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </header>
      )}

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 bg-black z-[40] pt-20 px-6 md:hidden"
          >
            <nav className="space-y-4">
              {allowedMenuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl text-white font-bold"
                >
                  <item.icon className="w-6 h-6 text-emerald-500" />
                  {item.label}
                </Link>
              ))}
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-4 p-4 bg-red-500/10 rounded-2xl text-red-500 font-bold mt-8 border border-red-500/20"
              >
                <LogOut className="w-6 h-6" />
                Sair
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Viewport */}
      <main className={`flex-1 h-screen overflow-hidden flex flex-col ${isDesktop ? 'pt-0' : 'pt-16'}`}>
        <div className="flex-1 overflow-y-auto custom-scrollbar outline-none pt-4 md:pt-8">
          <div className="p-6 md:p-10 lg:p-12 pb-24 md:pb-12 max-w-[1750px] mx-auto w-full">
             <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

