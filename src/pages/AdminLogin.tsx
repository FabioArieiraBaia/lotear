import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Loader2, Map, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('adminToken', data.token);
        navigate('/admin');
      } else {
        setError('Usuário ou senha incorretos');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-md w-full overflow-hidden"
      >
        {/* Animated border gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 opacity-50" />
        
        <div className="relative p-8">
          {/* Back Button */}
          <Link 
            to="/" 
            className="absolute top-4 left-4 flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all hover:scale-105"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/30 blur-xl rounded-full" />
              <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-white mb-2">Acesso Restrito</h2>
          <p className="text-sm text-neutral-400 text-center mb-8">
            Área administrativa do sistema
          </p>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-6 text-center"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                placeholder="Digite seu usuário"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                placeholder="Digite sua senha"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-xl p-[1px] mt-6"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative bg-black/50 backdrop-blur-md px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 group-hover:bg-transparent">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <>
                    <span className="font-bold text-white tracking-wide">Entrar</span>
                  </>
                )}
              </div>
            </button>
          </form>

          {/* Brand footer */}
          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <Map className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-neutral-400">
              Loteamentos<span className="text-emerald-500">Pro</span>
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}