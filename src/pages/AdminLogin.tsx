import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Loader2, Map, ArrowLeft, Lock, User, Globe, Zap } from 'lucide-react';
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
      const res = await fetch(import.meta.env.BASE_URL + 'api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('adminToken', data.token);
        if (data.user) {
          localStorage.setItem('adminUser', JSON.stringify(data.user));
          localStorage.setItem('adminPermissions', JSON.stringify(data.user.permissions || []));
        }
        navigate('/admin');
      } else {
        setError('Credenciais inválidas. Verifique seu login.');
      }
    } catch (err) {
      setError('Falha na comunicação com o servidor de segurança.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#050505] font-sans">
      {/* Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Back to Home HUD */}
        <Link 
          to="/" 
          className="absolute -top-16 left-0 flex items-center gap-3 text-neutral-500 hover:text-white transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-all">
             <ArrowLeft className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Retornar ao Portal</span>
        </Link>

        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 shadow-[0_0_80px_rgba(0,0,0,0.5)] relative overflow-hidden sidebar-glow">
          {/* Subtle Glow Overlay */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative">
            {/* Header / Logo */}
            <div className="flex flex-col items-center mb-12">
               <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-2xl shadow-emerald-500/20 mb-6 group">
                  <Shield className="w-10 h-10 text-white group-hover:scale-110 transition-transform" />
               </div>
               <div className="text-center">
                  <h2 className="text-3xl font-bold text-white font-heading tracking-tight mb-2">Acesso <span className="text-emerald-500">Restrito</span></h2>
                  <p className="text-neutral-500 text-sm font-medium">Autenticação de Segurança - Lotear SaaS</p>
               </div>
            </div>
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest mb-8 text-center animate-pulse"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-2 px-2">Identificação do Usuário</label>
                <div className="relative">
                   <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
                   <input
                     type="text"
                     value={username}
                     onChange={(e) => setUsername(e.target.value)}
                     className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-neutral-700 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold transition-all"
                     placeholder="E-mail ou Login"
                     required
                   />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-2 px-2">Chave de Segurança</label>
                <div className="relative">
                   <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
                   <input
                     type="password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-neutral-700 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold transition-all"
                     placeholder="••••••••••••"
                     required
                   />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full h-16 rounded-[1.5rem] bg-emerald-500 text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 mt-10"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-black" />
                    Entrar no Sistema
                  </>
                )}
              </button>
            </form>

            <div className="mt-12 pt-8 border-t border-white/5 flex flex-col items-center gap-4">
               <div className="flex items-center gap-4 text-neutral-600">
                  <div className="flex items-center gap-1.5 grayscale opacity-50">
                     <Globe className="w-3.5 h-3.5" />
                     <span className="text-[10px] font-bold uppercase tracking-widest italic">Encrypted Connection</span>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                 <Map className="w-4 h-4 text-emerald-500" />
                 <span className="text-xs font-bold text-neutral-500">
                   LOTEAR<span className="text-white">PRO</span> <span className="text-[9px] text-neutral-600 font-medium ml-2">v2.0 Premium</span>
                 </span>
               </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}