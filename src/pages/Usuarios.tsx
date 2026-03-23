import React, { useEffect, useState } from 'react';
import { resolveUrl } from '../utils/url';
import { Loader2, Plus, Edit2, Trash2, ShieldAlert, Check } from 'lucide-react';
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
  { id: 'loteamentos', label: 'Loteamentos' },
  { id: 'apresentacao', label: 'Apresentação (Modo Cliente)' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'compradores', label: 'Compradores' },
  { id: 'contatos', label: 'Contatos' },
  { id: 'corretores', label: 'Corretores' },
  { id: 'usuarios', label: 'Usuários (Permite criar/editar usuários)' },
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
    const url = editingId ? `/api/usuarios/${editingId}` : '/api/usuarios';
    
    // Default to sending everything
    const payload: any = { name, email, role, permissions };
    
    // Only send password if it's new, or if editing and filled
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
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Usuários do Sistema</h2>
          <p className="text-neutral-400">Gerencie quem tem acesso ao painel e seus níveis de permissão.</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Usuário
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-neutral-400 text-sm">
                <th className="p-4 font-medium">Nome / Cargo</th>
                <th className="p-4 font-medium">E-mail</th>
                <th className="p-4 font-medium">Módulos Permitidos</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors group text-sm">
                  <td className="p-4">
                    <p className="text-white font-medium">{u.name}</p>
                    <p className="text-neutral-500 text-xs mt-1 bg-white/10 inline-block px-2 py-0.5 rounded">{u.role}</p>
                  </td>
                  <td className="p-4 text-neutral-300">{u.email}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {(u.permissions || []).map(p => (
                        <span key={p} className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded border border-emerald-500/20 capitalize">
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenEdit(u)}
                        className="p-2 text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id)}
                        className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-neutral-500">
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl"
            >
              <form onSubmit={handleSubmit} className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {editingId ? 'Editar Usuário' : 'Novo Usuário'}
                  </h3>
                </div>

                {error && (
                  <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Nome Completo</label>
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-neutral-400 mb-1">Cargo / Função</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: Secretaria"
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-neutral-400 mb-1">E-mail (Login)</label>
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Senha {editingId && <span className="opacity-50">(deixe em branco para não alterar)</span>}</label>
                    <input 
                      type="password" 
                      required={!editingId}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  
                  <div className="pt-2">
                    <label className="block text-sm font-medium text-white mb-3">Permissões de Acesso</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {AVAILABLE_PERMISSIONS.map(pm => {
                        const hasPerm = permissions.includes(pm.id);
                        return (
                          <div 
                            key={pm.id}
                            onClick={() => togglePermission(pm.id)}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                              hasPerm ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              hasPerm ? 'bg-emerald-500 border-emerald-500' : 'border-neutral-500'
                            }`}>
                              {hasPerm && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm ${hasPerm ? 'text-emerald-400 font-medium' : 'text-neutral-300'}`}>
                              {pm.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 flex justify-center items-center"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Usuário'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
