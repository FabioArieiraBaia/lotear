import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Map, Calendar, Loader2, Building2, CheckCircle, Clock, TrendingUp, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [loteamentos, setLoteamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalLotes: 0, disponiveis: 0, vendidos: 0, reservados: 0, receita: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    fetch('/api/loteamentos', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(async res => {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('adminToken');
          throw new Error('Unauthorized');
        }
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Erro do servidor: ${errText}`);
        }
        return res.json();
      })
      .then(async data => {
        setLoteamentos(data);
        setLoading(false);
        
        // Fetch stats for all loteamentos
        try {
          const lotesPromises = data.map((loteamento: any) => 
            fetch(`/api/loteamentos/${loteamento.id}/lotes`).then(res => res.json())
          );
          
          const allLotes = await Promise.all(lotesPromises);
          
          let totalLotes = 0;
          let disponiveis = 0;
          let vendidos = 0;
          let reservados = 0;
          let receita = 0;
          
          allLotes.flat().forEach((lote: any) => {
            totalLotes++;
            if (lote.status === 'Disponível') disponiveis++;
            if (lote.status === 'Vendido') {
              vendidos++;
              receita += lote.price || 0;
            }
            if (lote.status === 'Reservado') reservados++;
          });
          
          setStats({ totalLotes, disponiveis, vendidos, reservados, receita });
        } catch (err) {
          console.error("Error fetching lotes stats:", err);
        }
      })
      .catch(err => {
        console.error("Error fetching loteamentos:", err);
        if (err.message === 'Unauthorized') {
          navigate('/admin/login');
        } else {
          setError(err.message);
          setLoading(false);
        }
      });
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs text-neutral-400 uppercase tracking-wider">Total</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalLotes}</p>
          <p className="text-xs text-neutral-500 mt-1">lotes cadastrados</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs text-neutral-400 uppercase tracking-wider">Disponíveis</span>
          </div>
          <p className="text-3xl font-bold text-emerald-400">{stats.disponiveis}</p>
          <p className="text-xs text-neutral-500 mt-1">prontos para vender</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-xs text-neutral-400 uppercase tracking-wider">Reservados</span>
          </div>
          <p className="text-3xl font-bold text-amber-400">{stats.reservados}</p>
          <p className="text-xs text-neutral-500 mt-1">em negociação</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs text-neutral-400 uppercase tracking-wider">Receita</span>
          </div>
          <p className="text-3xl font-bold text-purple-400">
            {stats.receita > 0 
              ? stats.receita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
              : 'R$ 0'
            }
          </p>
          <p className="text-xs text-neutral-500 mt-1">em vendas realizadas</p>
        </motion.div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Meus Loteamentos</h2>
          <p className="text-neutral-400">Gerencie seus empreendimentos e mapas interativos.</p>
        </div>
        <Link
          to="/admin/new"
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        >
          <Plus className="w-5 h-5" />
          Novo Loteamento
        </Link>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-8 border border-red-500/20">
          <p className="font-bold">Erro ao carregar dados:</p>
          <p>{error}</p>
        </div>
      )}

      {!error && loteamentos.length === 0 ? (
        <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
            <Map className="w-10 h-10 text-neutral-500" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">Nenhum loteamento encontrado</h3>
          <p className="text-neutral-400 mb-6">Comece fazendo o upload de uma planta de loteamento.</p>
          <Link
            to="/admin/new"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            <Plus className="w-5 h-5" />
            Adicionar Planta
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loteamentos.map((loteamento) => (
            <motion.div 
              key={loteamento.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Link
                to={`/admin/loteamento/${loteamento.id}`}
                className="group block bg-white/5 rounded-2xl border border-white/10 overflow-hidden hover:bg-white/10 transition-all hover:border-emerald-500/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]"
              >
                <div className="aspect-video w-full bg-neutral-900 relative overflow-hidden">
                  {loteamento.imageUrl ? (
                    <img
                      src={loteamento.imageUrl}
                      alt={loteamento.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100 mix-blend-screen"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600">
                      <Map className="w-12 h-12 opacity-50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent opacity-60" />
                </div>
                <div className="p-5 relative">
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">{loteamento.name}</h3>
                  <div className="flex items-center text-sm text-neutral-400 gap-2 font-mono">
                    <Calendar className="w-4 h-4" />
                    {new Date(loteamento.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
