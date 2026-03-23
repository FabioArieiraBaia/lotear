import React, { useEffect, useState } from 'react';
import { resolveUrl } from '../utils/url';
import { Users, Search, Filter, Loader2, MapPin, DollarSign, Calendar, User, Phone, Mail, CreditCard, ChevronDown, ChevronUp, MessageCircle, Copy, Check, Clock, TrendingUp, X } from 'lucide-react';
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
        setCompradores(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching compradores:", err);
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
      const res = await fetch(import.meta.env.BASE_URL + 'api/financeiro/pagamentos', {
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
          paymentMethod: paymentMethod,
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
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Compradores</h2>
          <p className="text-neutral-400">Gerencie a carteira de clientes e acompanhe pagamentos.</p>
        </div>
        <div className="text-right">
          <p className="text-neutral-400 text-sm">Total de Compradores</p>
          <p className="text-2xl font-bold text-white">{compradores.length}</p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-neutral-400 text-xs">Total Vendido</p>
              <p className="text-lg font-bold text-white">
                {formatCurrency(compradores.reduce((acc, c) => acc + c.totalComprado, 0))}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-neutral-400 text-xs">Total Entradas</p>
              <p className="text-lg font-bold text-white">
                {formatCurrency(compradores.reduce((acc, c) => acc + c.totalEntrada, 0))}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-neutral-400 text-xs">Total Recebido</p>
              <p className="text-lg font-bold text-white">
                {formatCurrency(compradores.reduce((acc, c) => acc + c.totalPago, 0))}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-neutral-400 text-xs">A Receber</p>
              <p className="text-lg font-bold text-white">
                {formatCurrency(compradores.reduce((acc, c) => acc + c.totalPendente, 0))}
              </p>
            </div>
          </div>
        </motion.div>
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

      <div className="space-y-4">
        {filteredCompradores.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <Users className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">Nenhum comprador encontrado</h3>
            <p className="text-neutral-400 max-w-md mx-auto">
              Os compradores aparecerão aqui automaticamente quando você registrar a venda de um lote.
            </p>
          </div>
        ) : (
          filteredCompradores.map((comprador, idx) => (
            <motion.div 
              key={comprador.cpf}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-emerald-500/30 transition-colors"
            >
              {/* Header do Card */}
              <div 
                className="p-6 cursor-pointer"
                onClick={() => toggleCard(comprador.cpf)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        {comprador.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{comprador.nome}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-neutral-400 text-sm font-mono">CPF: {comprador.cpf}</span>
                        <span className="bg-white/10 text-neutral-300 text-xs px-2 py-0.5 rounded">
                          {comprador.lotes.length} lote{comprador.lotes.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    {/* Resumo Financeiro Rápido */}
                    <div className="hidden md:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-neutral-500 text-xs">Total</p>
                        <p className="text-white font-semibold">{formatCurrency(comprador.totalComprado)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-neutral-500 text-xs">Entrada</p>
                        <p className="text-emerald-400 font-semibold">{formatCurrency(comprador.totalEntrada)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-neutral-500 text-xs">Pago</p>
                        <p className="text-blue-400 font-semibold">{formatCurrency(comprador.totalPago)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-neutral-500 text-xs">Pendente</p>
                        <p className="text-amber-400 font-semibold">{formatCurrency(comprador.totalPendente)}</p>
                      </div>
                    </div>
                    
                    {expandedCards.has(comprador.cpf) ? (
                      <ChevronUp className="w-5 h-5 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Conteúdo Expandido */}
              <AnimatePresence>
                {expandedCards.has(comprador.cpf) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 border-t border-white/10 pt-4">
                      {comprador.lotes.map((lote: any, loteIdx: number) => (
                        <div 
                          key={lote.loteId}
                          className={`bg-black/40 rounded-xl p-5 border border-white/5 ${loteIdx > 0 ? 'mt-4' : ''}`}
                        >
                          {/* Header do Lote */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <MapPin className="w-5 h-5 text-emerald-400" />
                              </div>
                              <div>
                                <h4 className="text-lg font-semibold text-white">{lote.loteName}</h4>
                                <p className="text-neutral-400 text-sm">{lote.loteamentoName}</p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              lote.statusPagamento === 'quitado' ? 'bg-blue-500/20 text-blue-400' :
                              lote.statusPagamento === 'em_dia' ? 'bg-emerald-500/20 text-emerald-400' :
                              lote.statusPagamento === 'atrasado' ? 'bg-red-500/20 text-red-400' :
                              'bg-amber-500/20 text-amber-400'
                            }`}>
                              {lote.statusPagamento === 'quitado' ? 'Quitado' :
                               lote.statusPagamento === 'em_dia' ? 'Em Dia' :
                               lote.statusPagamento === 'atrasado' ? 'Atrasado' : 'Pendente'}
                            </span>
                          </div>
                          
                          {/* Informações em Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-white/5 rounded-lg p-3">
                              <p className="text-neutral-500 text-xs mb-1">Valor Total</p>
                              <p className="text-white font-semibold">{formatCurrency(lote.valorTotal)}</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                              <p className="text-neutral-500 text-xs mb-1">Entrada</p>
                              <p className="text-emerald-400 font-semibold">{formatCurrency(lote.entrada)}</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                              <p className="text-neutral-500 text-xs mb-1">Parcelas</p>
                              <p className="text-white font-semibold">
                                {lote.totalParcelas}x de {formatCurrency(lote.valorParcela)}
                              </p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                              <p className="text-neutral-500 text-xs mb-1">Data da Venda</p>
                              <p className="text-white font-semibold">{formatDate(lote.dataVenda)}</p>
                            </div>
                          </div>
                          
                          {/* Progresso de Pagamento */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-neutral-400">Progresso de Pagamento</span>
                              <span className="text-white">
                                {lote.parcelasPagas}/{lote.parcelas.length} parcelas pagas
                              </span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                              <div 
                                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${lote.parcelas.length > 0 ? (lote.parcelasPagas / lote.parcelas.length) * 100 : 0}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs mt-2">
                              <span className="text-emerald-400">Pago: {formatCurrency(lote.totalPago)}</span>
                              <span className="text-amber-400">Pendente: {formatCurrency(lote.valorPendente)}</span>
                            </div>
                          </div>
                          
                          {/* Corretor Responsável */}
                          {lote.corretor && (
                            <div className="bg-white/5 rounded-lg p-4 mb-4">
                              <p className="text-neutral-500 text-xs mb-2 flex items-center gap-2">
                                <User className="w-3 h-3" /> Corretor Responsável
                              </p>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-white font-medium">{lote.corretor.nome}</p>
                                  <p className="text-neutral-400 text-sm">Taxa: {(lote.corretor.taxa * 100).toFixed(1)}%</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {lote.corretor.phone && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openWhatsApp(lote.corretor.phone);
                                      }}
                                      className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors group"
                                      title="Abrir WhatsApp"
                                    >
                                      <MessageCircle className="w-4 h-4 text-green-400" />
                                    </button>
                                  )}
                                  {lote.corretor.email && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(lote.corretor.email, `email-${lote.loteId}`);
                                      }}
                                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                      title="Copiar Email"
                                    >
                                      {copiedField === `email-${lote.loteId}` ? (
                                        <Check className="w-4 h-4 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-4 h-4 text-neutral-400" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Lista de Parcelas */}
                          {lote.parcelas.length > 0 && (
                            <div>
                              <p className="text-neutral-500 text-xs mb-2 flex items-center gap-2">
                                <CreditCard className="w-3 h-3" /> Detalhamento das Parcelas
                              </p>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-neutral-400 text-xs border-b border-white/10">
                                      <th className="py-2 text-left font-medium">Nº</th>
                                      <th className="py-2 text-left font-medium">Valor</th>
                                      <th className="py-2 text-left font-medium">Vencimento</th>
                                      <th className="py-2 text-left font-medium">Status</th>
                                      <th className="py-2 text-left font-medium">Pago</th>
                                      <th className="py-2 text-right font-medium">Ação</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {lote.parcelas.map((parcela: any) => (
                                      <tr key={parcela.id} className="text-neutral-300">
                                        <td className="py-2 text-white font-medium">{parcela.installmentNumber}</td>
                                        <td className="py-2">{formatCurrency(parcela.amount)}</td>
                                        <td className="py-2">{formatDate(parcela.dueDate)}</td>
                                        <td className="py-2">
                                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                            parcela.status === 'pago' ? 'bg-emerald-500/20 text-emerald-400' :
                                            parcela.status === 'atrasado' ? 'bg-red-500/20 text-red-400' :
                                            'bg-amber-500/20 text-amber-400'
                                          }`}>
                                            {parcela.status === 'pago' ? 'Pago' :
                                             parcela.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                                          </span>
                                        </td>
                                        <td className="py-2">
                                          {parcela.paidAmount ? formatCurrency(parcela.paidAmount) : '-'}
                                        </td>
                                        <td className="py-2 text-right">
                                          {parcela.status !== 'pago' && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedParcela({ ...parcela, loteName: lote.loteName, buyerName: comprador.nome, loteId: lote.loteId });
                                                setPaymentAmount(parcela.amount.toString());
                                                setShowPaymentModal(true);
                                              }}
                                              className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-md transition-colors text-xs font-medium"
                                            >
                                              Baixar
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal de Pagamento */}
      <AnimatePresence>
        {showPaymentModal && selectedParcela && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPaymentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-white">Registrar Pagamento</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-neutral-400 mb-1">Parcela</p>
                  <p className="text-white font-medium">
                    {selectedParcela.installmentNumber}/{selectedParcela.totalInstallments} - {selectedParcela.loteName}
                  </p>
                  <p className="text-sm text-neutral-400 mt-2">
                    Comprador: <span className="text-white">{selectedParcela.buyerName}</span>
                  </p>
                  <p className="text-sm text-neutral-400">
                    Vencimento: <span className="text-white">{formatDate(selectedParcela.dueDate)}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Acréscimos (Juros R$)</label>
                    <input
                      type="number"
                      value={juros}
                      onChange={(e) => setJuros(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Multa (R$)</label>
                    <input
                      type="number"
                      value={multa}
                      onChange={(e) => setMulta(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Descontos (- R$)</label>
                    <input
                      type="number"
                      value={desconto}
                      onChange={(e) => setDesconto(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Total Calculado</label>
                    <div className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-2 text-emerald-400 font-mono flex items-center h-[42px]">
                      {formatCurrency(
                        (selectedParcela.amount || 0) + 
                        (parseFloat(juros) || 0) + 
                        (parseFloat(multa) || 0) - 
                        (parseFloat(desconto) || 0)
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Valor Efetivamente Pago</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 font-bold"
                    placeholder="Valor"
                    step="0.01"
                  />
                  <div className="mt-3 flex items-start gap-2">
                    <input 
                      type="checkbox" 
                      id="forceQuitadoComp"
                      checked={forceQuitado}
                      onChange={(e) => setForceQuitado(e.target.checked)}
                      className="mt-1 rounded border-white/10 text-emerald-500 focus:ring-emerald-500/50 bg-black/20 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="forceQuitadoComp" className="text-xs text-neutral-400 cursor-pointer">
                      Dar baixa/Quitar esta parcela (mesmo parcial)
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Forma de Pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="pix">PIX</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="boleto">Boleto</option>
                    <option value="transferencia">Transferência</option>
                    <option value="cartao">Cartão</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Observações</label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 resize-none"
                    placeholder="Observações opcionais"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-3 rounded-lg bg-white/5 text-neutral-400 hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRegistrarPagamento}
                  disabled={processingPayment}
                  className="flex-1 px-4 py-3 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingPayment ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Confirmar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}