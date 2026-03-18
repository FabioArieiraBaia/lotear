import React, { useEffect, useState } from 'react';
import { Users, Search, Filter, Plus, Loader2, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Compradores() {
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

  // Extract unique buyers from sold/reserved lots
  const soldLots = lotes.filter(l => l.status === 'Vendido' || l.status === 'Reservado');
  
  // Group by buyer name/cpf
  const buyersMap = new Map();
  soldLots.forEach(lote => {
    const buyerKey = lote.buyerCpf || lote.buyerName || lote.owner || 'Desconhecido';
    if (!buyerKey || buyerKey === 'Desconhecido') return; // Skip empty
    
    if (!buyersMap.has(buyerKey)) {
      buyersMap.set(buyerKey, {
        name: lote.buyerName || lote.owner || 'Sem nome',
        cpf: lote.buyerCpf || '-',
        lotes: []
      });
    }
    buyersMap.get(buyerKey).lotes.push(lote);
  });

  const buyers = Array.from(buyersMap.values());
  const filteredBuyers = buyers.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.cpf.includes(searchTerm)
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Compradores</h2>
          <p className="text-neutral-400">Gerencie a carteira de clientes e proprietários de lotes.</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou CPF..." 
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
        {filteredBuyers.length === 0 ? (
          <div className="col-span-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <Users className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">Nenhum comprador encontrado</h3>
            <p className="text-neutral-400 max-w-md mx-auto">
              Os compradores aparecerão aqui automaticamente quando você registrar a venda de um lote.
            </p>
          </div>
        ) : (
          filteredBuyers.map((buyer, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-emerald-500/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-400 font-bold text-lg">
                    {buyer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="bg-white/10 text-neutral-300 text-xs px-2 py-1 rounded-md font-mono">
                  CPF: {buyer.cpf}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-4 truncate">{buyer.name}</h3>
              
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Lotes Adquiridos</h4>
                {buyer.lotes.map((lote: any) => (
                  <div key={lote.id} className="flex items-center justify-between bg-black/40 rounded-lg p-3 border border-white/5">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      <div>
                        <p className="text-sm font-medium text-white">{lote.name}</p>
                        <p className="text-xs text-neutral-500">{lote.loteamentoName}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      lote.status === 'Vendido' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {lote.status}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
