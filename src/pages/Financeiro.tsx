import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Financeiro() {
  const [lotes, setLotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Calculate metrics based on lots
  const soldLots = lotes.filter(l => l.status === 'Vendido' || l.status === 'Reservado');
  
  // Total expected revenue (sum of all sold/reserved lots prices)
  const totalRevenue = soldLots.reduce((acc, l) => acc + (l.price || 0), 0);
  
  // Total down payments received
  const totalDownPayments = soldLots.reduce((acc, l) => acc + (l.downPayment || 0), 0);
  
  // Defaulted (atrasado)
  const defaultedLots = soldLots.filter(l => l.paymentStatus === 'atrasado');
  const totalDefaulted = defaultedLots.reduce((acc, l) => {
    // Estimate defaulted amount as 1 installment for simplicity
    const installmentValue = l.installments > 0 ? ((l.price || 0) - (l.downPayment || 0)) / l.installments : 0;
    return acc + installmentValue;
  }, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Módulo Financeiro</h2>
        <p className="text-neutral-400">Visão geral das transações, recebimentos e inadimplência baseada nos lotes vendidos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="flex items-center gap-1 text-emerald-400 text-sm font-medium">
              <ArrowUpRight className="w-4 h-4" /> Entradas
            </span>
          </div>
          <p className="text-neutral-400 text-sm mb-1">Total de Entradas (Sinal)</p>
          <h3 className="text-3xl font-bold text-white">{formatCurrency(totalDownPayments)}</h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
            <span className="flex items-center gap-1 text-blue-400 text-sm font-medium">
              <ArrowUpRight className="w-4 h-4" /> VGV
            </span>
          </div>
          <p className="text-neutral-400 text-sm mb-1">Valor Geral de Vendas</p>
          <h3 className="text-3xl font-bold text-white">{formatCurrency(totalRevenue)}</h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-red-400" />
            </div>
            <span className="flex items-center gap-1 text-red-400 text-sm font-medium">
              <ArrowDownRight className="w-4 h-4" /> Atrasos
            </span>
          </div>
          <p className="text-neutral-400 text-sm mb-1">Inadimplência Estimada</p>
          <h3 className="text-3xl font-bold text-white">{formatCurrency(totalDefaulted)}</h3>
        </motion.div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-xl font-medium text-white">Últimas Vendas</h3>
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <FileText className="w-4 h-4" />
            {soldLots.length} lotes negociados
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-neutral-400 text-sm">
                <th className="p-4 font-medium">Lote</th>
                <th className="p-4 font-medium">Loteamento</th>
                <th className="p-4 font-medium">Comprador</th>
                <th className="p-4 font-medium">Valor</th>
                <th className="p-4 font-medium">Status Pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {soldLots.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-500">
                    Nenhuma venda registrada ainda. Defina o status de um lote como Vendido ou Reservado.
                  </td>
                </tr>
              ) : (
                soldLots.map((lote) => (
                  <tr key={lote.id} className="hover:bg-white/5 transition-colors text-sm text-neutral-300">
                    <td className="p-4 font-medium text-white">{lote.name}</td>
                    <td className="p-4">{lote.loteamentoName}</td>
                    <td className="p-4">{lote.buyerName || lote.owner || '-'}</td>
                    <td className="p-4 text-emerald-400 font-mono">{formatCurrency(lote.price || 0)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        lote.paymentStatus === 'em_dia' ? 'bg-emerald-500/20 text-emerald-400' :
                        lote.paymentStatus === 'atrasado' ? 'bg-red-500/20 text-red-400' :
                        lote.paymentStatus === 'quitado' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {lote.paymentStatus === 'em_dia' ? 'Em Dia' :
                         lote.paymentStatus === 'atrasado' ? 'Atrasado' :
                         lote.paymentStatus === 'quitado' ? 'Quitado' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
