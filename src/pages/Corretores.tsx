import React, { useEffect, useState } from 'react';
import { resolveUrl } from '../utils/url';
import { Briefcase, Plus, Search, Loader2, MapPin, Edit2, Trash2, X, Check, DollarSign, Phone, Mail, User } from 'lucide-react';
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
    commissionRate: 0
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
        setCorretores(data);
      }
    } catch (err) {
      console.error("Error fetching corretores:", err);
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
      commissionRate: 0
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

      if (editingCorretor) {
        await fetch(import.meta.env.BASE_URL + `api/corretores/${editingCorretor.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch(import.meta.env.BASE_URL + 'api/corretores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      setShowModal(false);
      fetchCorretores();
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
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Corretores</h2>
          <p className="text-neutral-400">Gerencie a equipe de vendas e suas comissões.</p>
        </div>
        <button
          onClick={openNewCorretor}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl transition-colors font-medium"
        >
          <Plus className="w-5 h-5" /> Novo Corretor
        </button>
      </div>

      {/* Search */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
        <div className="relative">
          <Search className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome ou CRECI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 transition-all"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-neutral-400 text-xs mb-1">Total Corretores</p>
          <p className="text-2xl font-bold text-white">{corretores.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-neutral-400 text-xs mb-1">Ativos</p>
          <p className="text-2xl font-bold text-emerald-400">{corretores.filter(c => c.active).length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-neutral-400 text-xs mb-1">Total VGV</p>
          <p className="text-lg font-bold text-blue-400">
            {formatCurrency(corretores.reduce((acc, c) => acc + (c.totalVgv || 0), 0))}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-neutral-400 text-xs mb-1">Comissões Pendentes</p>
          <p className="text-lg font-bold text-amber-400">
            {formatCurrency(corretores.reduce((acc, c) => acc + (c.comissaoPendente || 0), 0))}
          </p>
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCorretores.length === 0 ? (
          <div className="col-span-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <Briefcase className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">Nenhum corretor encontrado</h3>
            <p className="text-neutral-400">Clique em "Novo Corretor" para adicionar.</p>
          </div>
        ) : (
          filteredCorretores.map((corretor) => (
            <motion.div
              key={corretor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white/5 border rounded-2xl p-5 hover:border-white/20 transition-all ${
                corretor.active ? 'border-white/10' : 'border-red-500/30 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    corretor.active ? 'bg-emerald-500/20' : 'bg-red-500/20'
                  }`}>
                    <span className={`font-bold text-lg ${
                      corretor.active ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {corretor.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{corretor.name}</h3>
                    {corretor.creci && (
                      <p className="text-xs text-neutral-500">CRECI: {corretor.creci}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditCorretor(corretor)}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(corretor)}
                    className={`p-2 rounded-lg transition-colors ${
                      corretor.active
                        ? 'text-emerald-400 hover:bg-emerald-500/10'
                        : 'text-red-400 hover:bg-red-500/10'
                    }`}
                    title={corretor.active ? 'Desativar' : 'Ativar'}
                  >
                    {corretor.active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                {corretor.phone && (
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <Phone className="w-3 h-3" />
                    <span>{corretor.phone}</span>
                  </div>
                )}
                {corretor.email && (
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{corretor.email}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                <div>
                  <p className="text-xs text-neutral-500">Vendas</p>
                  <p className="text-sm font-bold text-white">{corretor.totalSales || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">VGV Total</p>
                  <p className="text-sm font-mono text-blue-400">
                    {formatCurrency(corretor.totalVgv || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">A Receber</p>
                  <p className="text-sm font-mono text-amber-400">
                    {formatCurrency(corretor.comissaoPendente || 0)}
                  </p>
                </div>
              </div>

              {/* Histórico de Vendas Recentes */}
              {corretor.recentCommissions && corretor.recentCommissions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-2">Vendas Recentes</p>
                  <div className="space-y-2">
                    {corretor.recentCommissions.map((comm: any) => (
                      <div key={comm.id} className="flex justify-between items-center bg-black/20 rounded-lg p-2 text-[11px] border border-white/5">
                        <div className="flex flex-col">
                          <span className="text-white font-medium truncate max-w-[120px]">
                            {comm.loteName}
                          </span>
                          <span className="text-neutral-500 text-[9px]">{comm.loteamentoName}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-amber-400 font-mono font-bold">
                            {formatCurrency(comm.commissionAmount)}
                          </p>
                          <p className="text-neutral-500 text-[9px]">
                            {(comm.commissionRate * 100).toFixed(1)}% de {formatCurrency(comm.saleAmount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delete Button */}
              {showDeleteConfirm === corretor.id ? (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
                  <button
                    onClick={() => handleDelete(corretor.id)}
                    className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(corretor.id)}
                  className="w-full mt-4 pt-4 border-t border-white/10 text-red-400 hover:text-red-300 text-sm flex items-center justify-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Excluir
                </button>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {editingCorretor ? 'Editar Corretor' : 'Novo Corretor'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Telefone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">CRECI</label>
                    <input
                      type="text"
                      value={formData.creci}
                      onChange={(e) => setFormData({ ...formData, creci: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">CPF</label>
                    <input
                      type="text"
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Taxa de comissão removida pois é definida individualmente por venda */}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white rounded-xl transition-colors font-medium"
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
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