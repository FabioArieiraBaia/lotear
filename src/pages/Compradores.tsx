import React, { useEffect, useState } from 'react';
import { 
  Users, Search, Filter, Loader2, MapPin, DollarSign, Calendar, 
  User as UserIcon, Phone, Mail, CreditCard, ChevronDown, ChevronUp, 
  MessageCircle, Copy, Check, Clock, TrendingUp, X, ExternalLink, 
  ArrowRight, ShieldCheck, Map, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
};

export default function Compradores() {
  const [compradores, setCompradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modal de Pagamento
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedParcela, setSelectedParcela] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [juros, setJuros] = useState('');
  const [multa, setMulta] = useState('');
  const [desconto, setDesconto] = useState('');
  const [forceQuitado, setForceQuitado] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const fetchCompradores = () => {
    const token = localStorage.getItem('adminToken');
    fetch(import.meta.env.BASE_URL + 'api/financeiro/compradores', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setCompradores(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching compradores:", err);
        setCompradores([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCompradores();
  }, []);

  const handleRegistrarPagamento = async () => {
    if (!selectedParcela) return;
    setProcessingPayment(true);
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/pagamentos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parcelaId: selectedParcela.id,
          loteId: selectedParcela.loteId,
          amount: parseFloat(paymentAmount) || selectedParcela.amount,
          juros: parseFloat(juros) || 0,
          multa: parseFloat(multa) || 0,
          desconto: parseFloat(desconto) || 0,
          forceQuitado,
          paymentMethod,
          notes: paymentNotes
        })
      });

      if (res.ok) {
        setShowPaymentModal(false);
        setSelectedParcela(null);
        setPaymentAmount('');
        setPaymentNotes('');
        setJuros('');
        setMulta('');
        setDesconto('');
        setForceQuitado(false);
        fetchCompradores();
      }
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err);
    } finally {
      setProcessingPayment(false);
    }
  };

  const toggleCard = (cpf: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cpf)) {
      newExpanded.delete(cpf);
    } else {
      newExpanded.add(cpf);
    }
    setExpandedCards(newExpanded);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountryCode = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
    window.open(`https://wa.me/${phoneWithCountryCode}`, '_blank');
  };

  const filteredCompradores = compradores.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.cpf.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Users className="w-6 h-6 text-emerald-500" />
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
          <h2 className="text-4xl font-bold text-white mb-2 font-heading tracking-tight">Carteira de <span className="text-emerald-500">Clientes</span></h2>
          <p className="text-neutral-500 font-medium">Gestão centralizada de compradores, contratos e histórico financeiro.</p>
        </motion.div>
        
        <div className="flex gap-4 items-center">
           <div className="text-right hidden sm:block px-6 py-3 bg-white/5 border border-white/10 rounded-2xl">
              <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest leading-none mb-1">Total Ativos</p>
              <p className="text-2xl font-bold text-white leading-none font-heading">{compradores.length}</p>
           </div>
           <div className="relative group/search">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within/search:text-emerald-500 transition-colors" />
             <input 
               type="text" 
               placeholder="Buscar cliente ou CPF..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 min-w-[300px] transition-all"
             />
           </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Volume Negociado', value: compradores.reduce((acc, c) => acc + c.totalComprado, 0), icon: DollarSign, color: 'emerald', desc: 'Soma de todos os contratos' },
          { label: 'Entradas Recebidas', value: compradores.reduce((acc, c) => acc + c.totalEntrada, 0), icon: TrendingUp, color: 'blue', desc: 'Liquidez imediata' },
          { label: 'Parcelas Líquidas', value: compradores.reduce((acc, c) => acc + c.totalPago, 0), icon: CreditCard, color: 'amber', desc: 'Fluxo mensal amortizado' },
          { label: 'Saldo Devedor', value: compradores.reduce((acc, c) => acc + c.totalPendente, 0), icon: Clock, color: 'red', desc: 'Receita futura projetada' }
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
              <div className={`w-12 h-12 rounded-2xl bg-${card.color}-500/20 flex items-center justify-center border border-${card.color}-500/20 shadow-lg group-hover:scale-110 transition-transform`}>
                <card.icon className={`w-6 h-6 text-${card.color}-400`} />
              </div>
              <div>
                 <h4 className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-bold">{card.label}</h4>
                 <p className="text-2xl font-bold text-white font-heading">{formatCurrency(card.value)}</p>
              </div>
            </div>
            <p className="text-xs text-neutral-400 font-medium">{card.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Lista de Compradores */}
      <div className="space-y-6">
        {filteredCompradores.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/5 border border-dashed border-white/10 rounded-[3rem] p-20 text-center">
            <Users className="w-16 h-16 text-neutral-600 mx-auto mb-6 opacity-20" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhum cliente encontrado</h3>
            <p className="text-neutral-500 max-w-sm mx-auto">Tente ajustar seus termos de busca ou verifique se as vendas foram registradas corretamente.</p>
          </motion.div>
        ) : (
          filteredCompradores.map((comprador, idx) => (
            <motion.div 
              key={comprador.cpf}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group"
            >
              <div 
                className={`bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden transition-all duration-500 ${expandedCards.has(comprador.cpf) ? 'ring-2 ring-emerald-500/20 bg-white/[0.05]' : 'hover:bg-white/[0.05] hover:border-white/20'}`}
              >
                {/* Cabeçalho do Card */}
                <div 
                  className="p-8 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                  onClick={() => toggleCard(comprador.cpf)}
                >
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
                        <span className="text-white font-black text-2xl font-heading">
                          {comprador.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-black border border-white/10 flex items-center justify-center">
                         <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white font-heading tracking-tight group-hover:text-emerald-400 transition-colors">{comprador.nome}</h3>
                      <div className="flex flex-wrap items-center gap-4 mt-1.5">
                        <span className="text-neutral-500 text-xs font-mono font-medium flex items-center gap-1.5 bg-black/20 px-2 py-0.5 rounded">
                           <UserIcon className="w-3 h-3" /> CPF: {comprador.cpf}
                        </span>
                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-500/10">
                          {comprador.lotes.length} CONTRATO{comprador.lotes.length > 1 ? 'S' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-8 lg:gap-12">
                    <div className="flex gap-8">
                       <div className="text-center">
                         <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-1">Volume</p>
                         <p className="text-lg font-bold text-white font-heading">{formatCurrency(comprador.totalComprado)}</p>
                       </div>
                       <div className="text-center">
                         <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-1">Exposição</p>
                         <p className="text-lg font-bold text-red-400 font-heading">{formatCurrency(comprador.totalPendente)}</p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                       <div className="h-10 w-px bg-white/10 hidden lg:block" />
                       <motion.div 
                         animate={{ rotate: expandedCards.has(comprador.cpf) ? 180 : 0 }}
                         className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-neutral-400 group-hover:text-white transition-colors"
                       >
                         <ChevronDown className="w-6 h-6" />
                       </motion.div>
                    </div>
                  </div>
                </div>

                {/* Conteúdo Detalhado */}
                <AnimatePresence>
                  {expandedCards.has(comprador.cpf) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                    >
                      <div className="px-8 pb-8 space-y-8">
                        {comprador.lotes.map((lote: any, idx: number) => (
                          <div key={lote.loteId} className="relative">
                            {idx > 0 && <div className="h-px w-full bg-white/5 mb-8" />}
                            
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                               {/* Coluna 1: Lote Info */}
                               <div className="xl:col-span-4 space-y-6">
                                  <div className="bg-black/40 border border-white/5 rounded-[2rem] p-6 group/lote hover:border-emerald-500/30 transition-all">
                                     <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover/lote:scale-110 transition-transform">
                                           <Map className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <div>
                                           <h4 className="text-xl font-bold text-white tracking-tight leading-none mb-1">{lote.loteName}</h4>
                                           <p className="text-neutral-500 text-sm font-medium">{lote.loteamentoName}</p>
                                        </div>
                                     </div>
                                     
                                     <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white/[0.02] rounded-2xl">
                                           <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest mb-1">Status</p>
                                           <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter ${
                                             lote.statusPagamento === 'quitado' ? 'text-blue-400' :
                                             lote.statusPagamento === 'atrasado' ? 'text-red-400' : 'text-emerald-400'
                                           }`}>
                                              {lote.statusPagamento === 'quitado' ? 'Liquidado' :
                                               lote.statusPagamento === 'atrasado' ? 'EM ATRASO' : 'EM DIA'}
                                           </span>
                                        </div>
                                        <div className="p-4 bg-white/[0.02] rounded-2xl">
                                           <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest mb-1">Assinatura</p>
                                           <p className="text-white font-bold text-xs">{formatDate(lote.dataVenda)}</p>
                                        </div>
                                     </div>

                                     {lote.corretor && (
                                       <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                             <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/10">
                                                <UserIcon className="w-4 h-4 text-purple-400" />
                                             </div>
                                             <div>
                                                <p className="text-[10px] text-purple-400 uppercase font-black tracking-widest leading-none">Corretor</p>
                                                <p className="text-white font-bold text-xs mt-1">{lote.corretor.nome}</p>
                                             </div>
                                          </div>
                                          <div className="flex gap-2">
                                             <button onClick={() => openWhatsApp(lote.corretor.phone)} className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all flex items-center justify-center">
                                                <MessageCircle className="w-4 h-4" />
                                             </button>
                                          </div>
                                       </div>
                                     )}
                                  </div>
                               </div>

                               {/* Coluna 2: Financeiro Snapshot */}
                               <div className="xl:col-span-8 flex flex-col gap-6">
                                  <div className="flex items-center justify-between px-2">
                                     <h5 className="text-[11px] text-neutral-500 uppercase font-black tracking-[0.2em]">Detalhamento de Fluxo</h5>
                                     <div className="flex items-center gap-4 text-[10px]">
                                        <span className="text-emerald-400 font-bold flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> {lote.parcelasPagas} Pagas</span>
                                        <span className="text-neutral-500 font-bold">/</span>
                                        <span className="text-white font-bold">{lote.parcelas.length} Totais</span>
                                     </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                     {[
                                       { label: 'Valor Total', val: lote.valorTotal, color: 'text-white' },
                                       { label: 'Entrada', val: lote.entrada, color: 'text-emerald-400' },
                                       { label: 'Saldo Pago', val: lote.totalPago, color: 'text-blue-400' },
                                       { label: 'Saldo Devedor', val: lote.valorPendente, color: 'text-amber-400' }
                                     ].map(s => (
                                       <div key={s.label} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                          <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest mb-1.5">{s.label}</p>
                                          <p className={`text-sm font-bold font-mono ${s.color}`}>{formatCurrency(s.val)}</p>
                                       </div>
                                     ))}
                                  </div>

                                  {/* Tabela de Parcelas Compacta */}
                                  <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden">
                                     <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 bg-neutral-900 border-b border-white/10 z-10 transition-colors">
                                               <tr className="text-[9px] text-neutral-500 uppercase font-black tracking-widest">
                                                  <th className="px-6 py-4">Nº Parcela</th>
                                                  <th className="px-6 py-4">Vencimento</th>
                                                  <th className="px-6 py-4">Valor</th>
                                                  <th className="px-6 py-4">Status</th>
                                                  <th className="px-6 py-4 text-right">Ação</th>
                                               </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                               {lote.parcelas.map((parcela: any) => (
                                                 <tr key={parcela.id} className="group/row hover:bg-white/[0.03] transition-colors">
                                                    <td className="px-6 py-3 font-bold text-white text-xs">{parcela.installmentNumber < 10 ? `0${parcela.installmentNumber}` : parcela.installmentNumber} / {lote.totalParcelas}</td>
                                                    <td className="px-6 py-3 text-neutral-400 text-xs font-medium">{formatDate(parcela.dueDate)}</td>
                                                    <td className="px-6 py-3 font-mono font-bold text-white text-xs">{formatCurrency(parcela.amount)}</td>
                                                    <td className="px-6 py-3 font-bold">
                                                       <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                         parcela.status === 'pago' ? 'text-emerald-500 bg-emerald-500/10' :
                                                         parcela.status === 'atrasado' ? 'text-red-500 bg-red-500/10' : 'text-amber-500 bg-amber-500/10'
                                                       }`}>
                                                          {parcela.status === 'pago' ? 'Comprovado' : parcela.status === 'atrasado' ? 'EM ATRASO' : 'ABERTO'}
                                                       </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                       {parcela.status !== 'pago' ? (
                                                         <button 
                                                           onClick={() => {
                                                              setSelectedParcela({ ...parcela, loteName: lote.loteName, buyerName: comprador.nome, loteId: lote.loteId });
                                                              setPaymentAmount(parcela.amount.toString());
                                                              setShowPaymentModal(true);
                                                           }}
                                                           className="p-2 bg-emerald-500 text-black rounded-lg hover:scale-110 active:scale-95 transition-all shadow-lg shadow-emerald-500/10"
                                                         >
                                                            <Check className="w-3.5 h-3.5" />
                                                         </button>
                                                       ) : (
                                                         <div className="flex flex-col items-end">
                                                            <span className="text-[10px] text-emerald-500 font-bold lowercase tracking-tight">{formatDate(parcela.paidAt)}</span>
                                                            <span className="text-[8px] text-neutral-600 uppercase font-black">{parcela.paymentMethod || 'PIX'}</span>
                                                         </div>
                                                       )}
                                                    </td>
                                                 </tr>
                                               ))}
                                            </tbody>
                                        </table>
                                     </div>
                                  </div>
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal de Pagamento - Consistente com Financeiro */}
      <AnimatePresence>
        {showPaymentModal && selectedParcela && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowPaymentModal(false)} />
             <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-neutral-900 border border-white/10 rounded-[3rem] p-10 w-full max-w-xl relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                onClick={(e) => e.stopPropagation()}
             >
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
                
                <div className="flex items-center justify-between mb-10">
                  <div>
                     <h3 className="text-2xl font-bold text-white font-heading tracking-tight">Baixa de Título</h3>
                     <p className="text-neutral-500 text-sm font-medium mt-1">Confirmar recebimento do cliente</p>
                  </div>
                  <button onClick={() => setShowPaymentModal(false)} className="w-12 h-12 rounded-2xl bg-white/5 text-neutral-500 hover:bg-white/10 transition-all flex items-center justify-center">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-6">
                    <div className="flex justify-between items-start mb-4">
                       <div>
                          <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-1">Contrato / Lote</p>
                          <p className="text-white font-bold text-lg">{selectedParcela.loteName}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-1">Parcela</p>
                          <p className="text-white font-bold text-lg">{selectedParcela.installmentNumber}/{selectedParcela.totalInstallments}</p>
                       </div>
                    </div>
                    <div>
                       <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Titular</p>
                       <p className="text-emerald-400 font-bold text-sm">{selectedParcela.buyerName}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                       <div>
                          <label className="block text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-2">Juros (+ R$)</label>
                          <input type="number" value={juros} onChange={(e) => setJuros(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-emerald-500 font-mono text-sm" placeholder="0.00" />
                       </div>
                       <div>
                          <label className="block text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-2">Descontos (- R$)</label>
                          <input type="number" value={desconto} onChange={(e) => setDesconto(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-emerald-500 font-mono text-sm" placeholder="0.00" />
                       </div>
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 flex flex-col justify-center items-center">
                       <p className="text-[10px] text-emerald-500 uppercase font-bold tracking-widest mb-2">Valor Ajustado</p>
                       <p className="text-2xl font-bold text-emerald-400 font-heading">
                          {formatCurrency(
                            (selectedParcela.amount || 0) + 
                            (parseFloat(juros) || 0) + 
                            (parseFloat(multa) || 0) - 
                            (parseFloat(desconto) || 0)
                          )}
                       </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-2">Valor Total Recebido</label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500 font-bold text-xl font-heading"
                      placeholder="R$ 0.00"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                       <label className="block text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-2">Forma de Pagamento</label>
                       <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-emerald-500 font-bold text-xs uppercase bg-neutral-900">
                         <option value="pix">PIX / Dinheiro</option>
                         <option value="boleto">Boleto</option>
                         <option value="transferencia">Transferência</option>
                         <option value="cartao">Cartão</option>
                       </select>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 mt-auto">
                      <input type="checkbox" id="forceQuitado" checked={forceQuitado} onChange={(e) => setForceQuitado(e.target.checked)} className="w-5 h-5 rounded border-white/10 text-emerald-500 bg-neutral-900" />
                      <label htmlFor="forceQuitado" className="text-[10px] text-neutral-400 font-bold leading-tight">Liquidar parcela integralmente</label>
                    </div>
                  </div>
                </div>

                <button onClick={handleRegistrarPagamento} disabled={processingPayment} className="w-full h-16 rounded-[1.5rem] bg-emerald-500 text-black font-black uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 mt-10 disabled:opacity-50">
                  {processingPayment ? <Loader2 className="w-6 h-6 animate-spin" /> : <> <Check className="w-6 h-6" /> Confirmar Baixa </>}
                </button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}