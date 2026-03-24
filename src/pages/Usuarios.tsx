import React, { useEffect, useState } from 'react';
import { 
  Loader2, Plus, Edit2, Trash2, ShieldAlert, Check, User as UserIcon, 
  Mail, ShieldCheck, Key, Lock, ChevronRight, X, Layout, Map, DollarSign, 
  Users as UsersIcon, Contact, Briefcase, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Usuario {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  active: number;
  createdAt: string;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'loteamentos', label: 'Loteamentos', icon: Layout },
  { id: 'apresentacao', label: 'Modo Apresentação', icon: Map },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'compradores', label: 'Compradores', icon: UsersIcon },
  { id: 'contatos', label: 'Contatos', icon: Contact },
  { id: 'corretores', label: 'Corretores', icon: Briefcase },
  { id: 'usuarios', label: 'Administração', icon: ShieldCheck },
];

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Secretaria');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchUsuarios = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(import.meta.env.BASE_URL + 'api/usuarios', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('Secretaria');
    setPermissions([]);
    setEditingId(null);
    setError('');
  };

  const handleOpenNew = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (user: Usuario) => {
    resetForm();
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setPermissions(user.permissions || []);
    setShowModal(true);
  };

  const togglePermission = (permId: string) => {
    if (permissions.includes(permId)) {
      setPermissions(permissions.filter(p => p !== permId));
    } else {
      setPermissions([...permissions, permId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    const token = localStorage.getItem('adminToken');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId 
      ? import.meta.env.BASE_URL + `api/usuarios/${editingId}` 
      : import.meta.env.BASE_URL + 'api/usuarios';
    
    const payload: any = { name, email, role, permissions };
    if (!editingId || password) {
      payload.password = password;
    }
    
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        fetchUsuarios();
      } else {
        setError(data.error || 'Erro ao salvar o usuário');
      }
    } catch (err) {
      setError('Erro de conexão ao salvar usuário');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir este usuário?')) return;
    
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(import.meta.env.BASE_URL + `api/usuarios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsuarios();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir');
      }
    } catch (err) {
      alert('Erro de conexão.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="w-6 h-6 text-emerald-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto pb-12 font-sans overflow-visible">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-4xl font-bold text-white mb-2 font-heading tracking-tight">Gestão de <span className="text-emerald-500">Acessos</span></h2>
          <p className="text-neutral-500 font-medium">Controle de credenciais, permissões por módulo e logs de segurança.</p>
        </motion.div>
        
        <button 
          onClick={handleOpenNew}
          className="bg-emerald-500 text-black px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-xl shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" /> Registrar Usuário
        </button>
      </div>

      {/* Grid de Usuários Estilo SaaS */}
      <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl sidebar-glow">
        <div className="p-10 border-b border-white/5 flex items-center justify-between">
           <h3 className="text-xl font-bold text-white font-heading tracking-tight">Base de Operadores</h3>
           <div className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-white font-black uppercase tracking-widest">{usuarios.length} Usuários</span>
           </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold border-b border-white/5 bg-white/[0.01]">
                <th className="px-8 py-5">Colaborador / Perfil</th>
                <th className="px-8 py-5">Credencial de Acesso</th>
                <th className="px-8 py-5">Ecossistema Disponível</th>
                <th className="px-8 py-5 text-right">Controle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {usuarios.map((u, idx) => (
                <motion.tr 
                  key={u.id} 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: idx * 0.05 }}
                  className="group hover:bg-white/[0.03] transition-all duration-300"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 flex items-center justify-center border border-emerald-500/10 group-hover:scale-110 transition-transform">
                          <UserIcon className="w-6 h-6 text-emerald-400" />
                       </div>
                       <div>
                          <p className="text-white font-bold tracking-tight text-lg group-hover:text-emerald-400 transition-colors leading-none mb-1.5">{u.name}</p>
                          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{u.role}</span>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                     <div className="flex items-center gap-2 text-neutral-400 text-sm font-medium">
                        <Mail className="w-4 h-4 text-emerald-500/50" /> {u.email}
                     </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-1.5">
                      {(u.permissions || []).map(p => (
                        <span key={p} className="bg-white/5 text-neutral-400 text-[9px] font-black tracking-widest px-2 py-1 rounded-full border border-white/5 text-center transition-all group-hover:bg-emerald-500/10 group-hover:text-emerald-400 group-hover:border-emerald-500/20">
                          {p.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => handleOpenEdit(u)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-neutral-400 hover:text-white border border-white/5 hover:bg-white/10 transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-lg hover:shadow-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-neutral-600 italic font-medium">
                    Nenhum operador registrado no sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - SaaS Premium Style */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowModal(false)} />
             <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-neutral-900 border border-white/10 rounded-[3rem] p-10 w-full max-w-2xl relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                onClick={(e) => e.stopPropagation()}
             >
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
                
                <div className="flex items-center justify-between mb-10">
                  <div>
                     <h3 className="text-3xl font-bold text-white font-heading tracking-tight">
                       {editingId ? 'Editar Perfil' : 'Provisionar Acesso'}
                     </h3>
                     <p className="text-neutral-500 text-sm font-medium mt-1">Definição de privilégios e credenciais de segurança</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-2xl bg-white/5 text-neutral-500 hover:bg-white/10 transition-all flex items-center justify-center border border-white/5">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {error && (
                  <div className="mb-8 bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-xs font-bold uppercase tracking-widest text-center animate-pulse">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-6">
                         <div>
                            <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-2 px-1 text-glow">Nome do Operador</label>
                            <div className="relative">
                               <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
                               <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-emerald-500 font-bold transition-all" required />
                            </div>
                         </div>
                         <div>
                            <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-2 px-1">E-mail Corporativo</label>
                            <div className="relative">
                               <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
                               <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-emerald-500 font-bold transition-all" required />
                            </div>
                         </div>
                      </div>

                      <div className="space-y-6">
                         <div>
                            <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-2 px-1">Função / Cargo</label>
                            <div className="relative">
                               <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
                               <input type="text" value={role} onChange={e => setRole(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-emerald-500 font-bold transition-all" placeholder="Ex: Financeiro" required />
                            </div>
                         </div>
                         <div>
                            <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-2 px-1">Segurança Corporativa (Senha)</label>
                            <div className="relative">
                               <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
                               <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-emerald-500 font-bold transition-all" placeholder={editingId ? 'Manter atual...' : 'No mínimo 6 caracteres'} required={!editingId} />
                            </div>
                         </div>
                      </div>
                   </div>

                   <div>
                      <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-4 px-1 flex items-center gap-2">
                         <ShieldCheck className="w-3.5 h-3.5" /> Matriz de Permissões Disponíveis
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {AVAILABLE_PERMISSIONS.map(pm => {
                          const hasPerm = permissions.includes(pm.id);
                          return (
                            <div 
                              key={pm.id}
                              onClick={() => togglePermission(pm.id)}
                              className={`group/perm flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                                hasPerm 
                                  ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/10' 
                                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                              }`}
                            >
                               <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                  hasPerm ? 'bg-black/10' : 'bg-white/5 group-hover/perm:bg-white/10'
                               }`}>
                                  <pm.icon className={`w-4 h-4 ${hasPerm ? 'text-black' : 'text-neutral-500 group-hover/perm:text-white'}`} />
                               </div>
                               <span className={`text-[10px] font-black uppercase tracking-tight ${hasPerm ? 'text-black' : 'text-neutral-400 group-hover/perm:text-white'}`}>
                                 {pm.label}
                               </span>
                               {hasPerm && <Check className="w-3.5 h-3.5 ml-auto text-black" />}
                            </div>
                          );
                        })}
                      </div>
                   </div>

                   <button type="submit" disabled={saving} className="w-full h-16 rounded-[1.5rem] bg-emerald-500 text-black font-black uppercase tracking-widest hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 mt-4 disabled:opacity-50">
                      {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <> <ShieldCheck className="w-6 h-6" /> {editingId ? 'Salvar Alterações' : 'Concluir Provisionamento'} </>}
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
