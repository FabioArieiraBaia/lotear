import React, { useEffect, useState } from 'react';
import { 
  Briefcase, Plus, Search, Loader2, MapPin, Edit2, Trash2, X, Check, 
  DollarSign, Phone, Mail, User, ShieldCheck, TrendingUp, Award, ExternalLink, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Corretores() {
  const [corretores, setCorretores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCorretor, setEditingCorretor] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    creci: '',
    commissionRate: 5
  });

  useEffect(() => {
    fetchCorretores();
  }, []);

  const fetchCorretores = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(import.meta.env.BASE_URL + 'api/corretores', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCorretores(Array.isArray(data) ? data : []);
      } else {
        setCorretores([]);
      }
    } catch (err) {
      console.error("Error fetching corretores:", err);
      setCorretores([]);
    } finally {
      setLoading(false);
    }
  };

  const openNewCorretor = () => {
    setEditingCorretor(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      cpf: '',
      creci: '',
      commissionRate: 5
    });
    setShowModal(true);
  };

  const openEditCorretor = (corretor: any) => {
    setEditingCorretor(corretor);
    setFormData({
      name: corretor.name || '',
      email: corretor.email || '',
      phone: corretor.phone || '',
      cpf: corretor.cpf || '',
      creci: corretor.creci || '',
      commissionRate: (corretor.commissionRate || 0.05) * 100
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem('adminToken');

    try {
      const payload = {
        ...formData,
        commissionRate: formData.commissionRate / 100
      };

      const res = await fetch(import.meta.env.BASE_URL + `api/corretores${editingCorretor ? `/${editingCorretor.id}` : ''}`, {
        method: editingCorretor ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowModal(false);
        fetchCorretores();
      }
    } catch (err) {
      console.error("Error saving corretor:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(import.meta.env.BASE_URL + `api/corretores/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setCorretores(corretores.filter(c => c.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir corretor');
      }
    } catch (err) {
      console.error("Error deleting corretor:", err);
    }
    setShowDeleteConfirm(null);
  };

  const handleToggleActive = async (corretor: any) => {
    try {
      const token = localStorage.getItem('adminToken');
      await fetch(import.meta.env.BASE_URL + `api/corretores/${corretor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ active: corretor.active ? 0 : 1 })
      });
      fetchCorretores();
    } catch (err) {
      console.error("Error toggling corretor:", err);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const filteredCorretores = corretores.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.creci || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-emerald-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto pb-12 font-sans overflow-visible">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-4xl font-bold text-white mb-2 font-heading tracking-tight">Equipe de <span className="text-emerald-500">Vendas</span></h2>
          <p className="text-neutral-500 font-medium">Gestão de corretores, performance comercial e repasse de comissões.</p>
        </motion.div>
        
        <div className="flex gap-4">
           <div className="relative group/search">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within/search:text-emerald-500 transition-colors" />
             <input 
               type="text" 
               placeholder="Buscar corretor ou CRECI..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 min-w-[280px] transition-all"
             />
           </div>
           <button 
             onClick={openNewCorretor}
             className="bg-emerald-500 text-black px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-xl shadow-emerald-500/20"
           >
             <Plus className="w-4 h-4" /> Novo Corretor
           </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Time Comercial', value: corretores.length, icon: Users, color: 'emerald', suffix: ' Corretor(es)' },
          { label: 'Membros Ativos', value: corretores.filter(c => c.active).length, icon: ShieldCheck, color: 'blue', suffix: ' em operação' },
          { label: 'VGV Acumulado', value: formatCurrency(corretores.reduce((acc, c) => acc + (c.totalVgv || 0), 0)), icon: TrendingUp, color: 'amber', isCurrency: true },
          { label: 'Comissões Pendentes', value: formatCurrency(corretores.reduce((acc, c) => acc + (c.comissaoPendente || 0), 0)), icon: Award, color: 'purple', isCurrency: true }
        ].map((card, idx) => (
          <motion.div 
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-card p-6 rounded-[2.5rem] relative overflow-hidden group hover:bg-white/[0.08] transition-all duration-500"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-${card.color}-500/10 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-${card.color}-500/20 transition-colors`} />
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-2xl bg-${card.color}-500/20 flex items-center justify-center border border-${card.color}-500/20 group-hover:scale-110 transition-transform`}>
                <card.icon className={`w-6 h-6 text-${card.color}-400`} />
              </div>
              <div>
                 <h4 className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-bold">{card.label}</h4>
                 <p className="text-2xl font-bold text-white font-heading">{card.value}</p>
              </div>
            </div>
            <p className="text-xs text-neutral-400 font-medium">{card.suffix}</p>
          </motion.div>
        ))}
      </div>

      {/* Grid de Corretores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCorretores.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white/5 border border-dashed border-white/10 rounded-[3rem]">
            <Briefcase className="w-16 h-16 text-neutral-600 mx-auto mb-6 opacity-20" />
            <h3 className="text-xl font-bold text-white mb-2">Sem resultados</h3>
            <p className="text-neutral-500">Nenhum corretor encontrado com os critérios de busca.</p>
          </div>
        ) : (
          filteredCorretores.map((corretor, idx) => (
            <motion.div
              key={corretor.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className={`group bg-white/[0.03] backdrop-blur-3xl border rounded-[2.5rem] p-8 transition-all duration-500 hover:bg-white/[0.06] ${
                corretor.active ? 'border-white/10 hover:border-emerald-500/30' : 'border-red-500/20 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${
                    corretor.active ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-neutral-800'
                  }`}>
                    <span className="font-black text-2xl text-white font-heading">
                      {corretor.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white font-heading tracking-tight leading-none mb-1.5 group-hover:text-emerald-400 transition-colors">{corretor.name}</h3>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] text-neutral-500 font-black uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded">
                          CRECI: {corretor.creci || '---'}
                       </span>
                       <div className={`w-2 h-2 rounded-full ${corretor.active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditCorretor(corretor)} className="w-10 h-10 rounded-xl bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center border border-white/5">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleToggleActive(corretor)} className={`w-10 h-10 rounded-xl border border-white/5 transition-all flex items-center justify-center ${corretor.active ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black' : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'}`}>
                    {corretor.active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                 <div className="flex items-center gap-3 text-neutral-400 hover:text-white transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                       <Phone className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold tracking-tight">{corretor.phone || 'Sem telefone'}</span>
                 </div>
                 <div className="flex items-center gap-3 text-neutral-400 hover:text-white transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                       <Mail className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold tracking-tight truncate">{corretor.email || 'Sem email'}</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-6 border-t border-white/5">
                 <div>
                    <p className="text-[9px] text-neutral-600 font-black uppercase tracking-widest mb-1.5">Métrica de Vendas</p>
                    <div className="flex items-end gap-2">
                       <p className="text-xl font-bold text-white font-heading leading-none">{corretor.totalSales || 0}</p>
                       <span className="text-[10px] text-neutral-500 mb-0.5 font-medium">Contratos</span>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-[9px] text-neutral-600 font-black uppercase tracking-widest mb-1.5">VGV Total</p>
                    <p className="text-lg font-bold text-blue-400 font-mono leading-none">{formatCurrency(corretor.totalVgv || 0)}</p>
                 </div>
              </div>

              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                 <div className="flex justify-between items-center">
                    <p className="text-[9px] text-emerald-500/70 font-black uppercase tracking-widest">A Receber</p>
                    <span className="text-xs font-black text-emerald-400 font-mono">{formatCurrency(corretor.comissaoPendente || 0)}</span>
                 </div>
              </div>

              {showDeleteConfirm === corretor.id ? (
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <button onClick={() => handleDelete(corretor.id)} className="h-10 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/20">Confirmar</button>
                  <button onClick={() => setShowDeleteConfirm(null)} className="h-10 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-xl">Cancelar</button>
                </div>
              ) : (
                <button onClick={() => setShowDeleteConfirm(corretor.id)} className="w-full mt-6 h-10 text-neutral-600 hover:text-red-400 transition-colors text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                  <Trash2 className="w-3 h-3" /> Remover da Base
                </button>
              )}
            </motion.div>
          ))
        )}
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
              className="bg-neutral-900 border border-white/10 rounded-[3rem] p-10 w-full max-w-lg relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
              
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-2xl font-bold text-white font-heading tracking-tight">
                    {editingCorretor ? 'Perfil do Corretor' : 'Ingresso de Corretor'}
                  </h3>
                  <p className="text-neutral-500 text-sm font-medium mt-1">Cadastro técnico de membros do time comercial</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-2xl bg-white/5 text-neutral-500 hover:bg-white/10 transition-all flex items-center justify-center">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-2 px-1">Nome Completo do Corretor</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 font-bold transition-all" required />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-2 px-1">Telefone / WhatsApp</label>
                    <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 font-bold transition-all" placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-2 px-1">CRECI Profissional</label>
                    <input type="text" value={formData.creci} onChange={(e) => setFormData({ ...formData, creci: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 font-bold transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-2 px-1">E-mail Corporativo</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 font-bold transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-2 px-1">Documento CPF</label>
                    <input type="text" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 font-bold transition-all" />
                  </div>
                </div>

                <button type="submit" disabled={saving} className="w-full h-16 rounded-[1.5rem] bg-emerald-500 text-black font-black uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 mt-4 disabled:opacity-50">
                  {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <> <ShieldCheck className="w-6 h-6" /> {editingCorretor ? 'Atualizar Perfil' : 'Finalizar Cadastro'} </>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}