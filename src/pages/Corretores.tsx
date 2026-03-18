import React, { useEffect, useState } from 'react';
import { Briefcase, Plus, Search, Filter, Star, Loader2, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Corretores() {
  const [lotes, setLotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    fetch('/api/lotes', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setLotes(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching lotes:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Extract unique brokers from sold/reserved lots
  const soldLots = lotes.filter(l => l.status === 'Vendido' || l.status === 'Reservado');
  
  // Group by broker name
  const brokersMap = new Map();
  soldLots.forEach(lote => {
    const brokerKey = lote.brokerName || 'Sem Corretor';
    if (!brokerKey || brokerKey === 'Sem Corretor') return; // Skip empty
    
    if (!brokersMap.has(brokerKey)) {
      brokersMap.set(brokerKey, {
        name: brokerKey,
        lotes: [],
        totalSales: 0
      });
    }
    const broker = brokersMap.get(brokerKey);
    broker.lotes.push(lote);
    broker.totalSales += (lote.price || 0);
  });

  const brokers = Array.from(brokersMap.values());
  const filteredBrokers = brokers.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Corretores e Imobiliárias</h2>
          <p className="text-neutral-400">Gerencie a equipe de vendas e parceiros comerciais.</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar por nome do corretor..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
            />
          </div>
          <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-xl transition-colors">
            <Filter className="w-5 h-5" />
            Filtros
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBrokers.length === 0 ? (
          <div className="col-span-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <Briefcase className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">Nenhum corretor encontrado</h3>
            <p className="text-neutral-400 max-w-md mx-auto">
              Os corretores aparecerão aqui automaticamente quando você registrar a venda de um lote e informar o corretor responsável.
            </p>
          </div>
        ) : (
          filteredBrokers.map((broker, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-emerald-500/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-blue-400 font-bold text-lg">
                    {broker.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">VGV Total</p>
                  <p className="text-emerald-400 font-mono font-bold">{formatCurrency(broker.totalSales)}</p>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-4 truncate">{broker.name}</h3>
              
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex justify-between">
                  <span>Lotes Vendidos</span>
                  <span>{broker.lotes.length}</span>
                </h4>
                <div className="max-h-40 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                  {broker.lotes.map((lote: any) => (
                    <div key={lote.id} className="flex items-center justify-between bg-black/40 rounded-lg p-3 border border-white/5">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-white">{lote.name}</p>
                          <p className="text-xs text-neutral-500">{lote.loteamentoName}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-neutral-400">
                        {formatCurrency(lote.price || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
