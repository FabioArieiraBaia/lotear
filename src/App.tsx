import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import NewLoteamento from './pages/NewLoteamento';
import LoteamentoView from './pages/LoteamentoView';
import PublicHome from './pages/PublicHome';
import PublicLoteamentoView from './pages/PublicLoteamentoView';
import AdminLogin from './pages/AdminLogin';
import AdminLayout from './pages/AdminLayout';
import Financeiro from './pages/Financeiro';
import Compradores from './pages/Compradores';
import Contatos from './pages/Contatos';
import Corretores from './pages/Corretores';
import Usuarios from './pages/Usuarios';
import Apresentacao from './pages/Apresentacao';
import Configuracoes from './pages/Configuracoes';
import LoteDetail from './pages/LoteDetail';
import { Map, LogOut, ShieldAlert } from 'lucide-react';

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isPublicView = location.pathname.startsWith('/loteamento/') || location.pathname.startsWith('/lote/');
  const hasToken = !!localStorage.getItem('adminToken');

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/');
  };

  // Hide header completely on the public loteamento view since it has its own HUD
  if (isPublicView) return null;

  return (
    <header className="bg-neutral-950/80 backdrop-blur-xl border-b border-white/10 text-white p-4 sticky top-0 z-[100] flex justify-between items-center">
      <Link to="/" className="flex items-center gap-3 group">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)] group-hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] transition-all">
          <Map className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">
          Loteamentos<span className="text-emerald-500">Pro</span>
        </h1>
      </Link>
      
      <div className="flex items-center gap-4">
        {isAdminRoute && hasToken ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-all border border-white/5"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        ) : (
          <Link
            to="/admin"
            className="flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-emerald-400 bg-white/5 hover:bg-emerald-500/10 px-4 py-2 rounded-full transition-all border border-white/5 hover:border-emerald-500/30"
          >
            <ShieldAlert className="w-4 h-4" />
            Área Restrita
          </Link>
        )}
      </div>
    </header>
  );
}

export default function App() {
  // @ts-ignore
  const basename = import.meta.env.BASE_URL;

  return (
    <BrowserRouter basename={basename}>
      <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-200 selection:bg-emerald-500/30">
        <Header />
        <main className="flex-1 relative flex flex-col overflow-hidden">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<PublicHome />} />
            <Route path="/loteamento/:id" element={<PublicLoteamentoView />} />
            <Route path="/lote/:id" element={<LoteDetail />} />
            
            {/* Admin Login */}
            <Route path="/admin/login" element={<AdminLogin />} />
            
            {/* Admin Routes wrapped in Layout */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="financeiro" element={<Financeiro />} />
              <Route path="compradores" element={<Compradores />} />
              <Route path="contatos" element={<Contatos />} />
              <Route path="corretores" element={<Corretores />} />
              <Route path="usuarios" element={<Usuarios />} />
              <Route path="apresentacao" element={<Apresentacao />} />
              <Route path="configuracoes" element={<Configuracoes />} />
              <Route path="new" element={<NewLoteamento />} />
              <Route path="loteamento/:id" element={<LoteamentoView />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
