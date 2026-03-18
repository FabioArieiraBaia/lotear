import React, { useEffect, useState } from 'react';
import { 
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2, FileText, 
  Calendar, CreditCard, Users, AlertTriangle, CheckCircle, Clock, ChevronDown, 
  ChevronUp, X, Check, Wallet, Building
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
};

interface Parcela {
  id: number;
  loteId: number;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string;
  status: string;
  paidAt: string | null;
  paidAmount: number;
  notes: string | null;
  loteName: string;
  buyerName: string;
  loteamentoName: string;
  corretorName?: string;
}

interface Pagamento {
  id: number;
  loteId: number;
  parcelaId: number | null;
  amount: number;
  type: string;
  paymentMethod: string | null;
  paidAt: string;
  notes: string | null;
  loteName: string;
}

interface ResumoFinanceiro {
  vgv: number;
  totalRecebido: number;
  aReceber: number;
  inadimplencia: number;
  comissoesPendentes: number;
  comissoesPagas: number;
  parcelasPorStatus: { status: string; count: number; total: number }[];
  proximosVencimentos: Parcela[];
  ultimosPagamentos: Pagamento[];
}

export default function Financeiro() {
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vendas' | 'parcelas' | 'pagamentos'>('vendas');
  const [selectedParcela, setSelectedParcela] = useState<Parcela | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('adminToken');
    try {
      // Buscar resumo financeiro
      const resResumo = await fetch('/api/financeiro/resumo', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resResumo.ok) {
        const dataResumo = await resResumo.json();
        setResumo(dataResumo);
      }

      // Buscar todas as parcelas
      const resParcelas = await fetch('/api/parcelas', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resParcelas.ok) {
        const dataParcelas = await resParcelas.json();
        setParcelas(dataParcelas);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
      setLoading(false);
    }
  };

  const handleRegistrarPagamento = async () => {
    if (!selectedParcela) return;
    
    setProcessingPayment(true);
    const token = localStorage.getItem('adminToken');
    
    try {
      const res = await fetch('/api/financeiro/pagamentos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parcelaId: selectedParcela.id,
          loteId: selectedParcela.loteId,
          amount: parseFloat(paymentAmount) || selectedParcela.amount,
          paymentMethod: paymentMethod,
          notes: paymentNotes
        })
      });

      if (res.ok) {
        setShowPaymentModal(false);
        setSelectedParcela(null);
        setPaymentAmount('');
        setPaymentNotes('');
        fetchData(); // Recarregar dados
      }
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err);
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const parcelasAtrasadas = parcelas.filter(p => {
    if (p.status === 'pago') return false;
    const dueDate = new Date(p.dueDate);
    return dueDate < new Date();
  });

  const parcelasEmDia = parcelas.filter(p => {
    if (p.status === 'pago') return false;
    const dueDate = new Date(p.dueDate);
    return dueDate >= new Date();
  });

  const parcelasPagas = parcelas.filter(p => p.status === 'pago');

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Módulo Financeiro</h2>
        <p className="text-neutral-400">Controle de parcelas, pagamentos e comissões.</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-emerald-400 text-xs font-medium">Recebido</span>
          </div>
          <p className="text-neutral-400 text-xs mb-1">Total Recebido</p>
          <h3 className="text-2xl font-bold text-white">{formatCurrency(resumo?.totalRecebido || 0)}</h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-blue-400 text-xs font-medium">VGV</span>
          </div>
          <p className="text-neutral-400 text-xs mb-1">Valor Geral de Vendas</p>
          <h3 className="text-2xl font-bold text-white">{formatCurrency(resumo?.vgv || 0)}</h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-amber-400 text-xs font-medium">A Receber</span>
          </div>
          <p className="text-neutral-400 text-xs mb-1">Parcelas Pendentes</p>
          <h3 className="text-2xl font-bold text-white">{formatCurrency(resumo?.aReceber || 0)}</h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-red-400 text-xs font-medium">Atrasado</span>
          </div>
          <p className="text-neutral-400 text-xs mb-1">Inadimplência</p>
          <h3 className="text-2xl font-bold text-white">{formatCurrency(resumo?.inadimplencia || 0)}</h3>
        </motion.div>
      </div>

      {/* Cards de Comissões */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-purple-400 text-xs font-medium">Comissões</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-neutral-400 text-xs mb-1">A Pagar</p>
              <h3 className="text-2xl font-bold text-white">{formatCurrency(resumo?.comissoesPendentes || 0)}</h3>
            </div>
            <div className="text-right">
              <p className="text-neutral-400 text-xs mb-1">Pagas</p>
              <h3 className="text-xl font-bold text-neutral-400">{formatCurrency(resumo?.comissoesPagas || 0)}</h3>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-cyan-400 text-xs font-medium">Parcelas</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-neutral-400 text-xs mb-1">Pagas</p>
              <h3 className="text-2xl font-bold text-white">{parcelasPagas.length}</h3>
            </div>
            <div className="text-right">
              <p className="text-neutral-400 text-xs mb-1">Pendentes</p>
              <h3 className="text-xl font-bold text-neutral-400">{parcelasEmDia.length + parcelasAtrasadas.length}</h3>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'vendas', label: 'Vendas', icon: FileText },
          { id: 'parcelas', label: 'Parcelas Pendentes', icon: CreditCard },
          { id: 'pagamentos', label: 'Histórico de Pagamentos', icon: CheckCircle }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo das Tabs */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'vendas' && (
            <motion.div
              key="vendas"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-lg font-medium text-white">Vendas Realizadas</h3>
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Building className="w-4 h-4" />
                  {resumo?.proximosVencimentos?.length || 0} parcelas no sistema
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-neutral-400 text-sm">
                      <th className="p-4 font-medium">Lote</th>
                      <th className="p-4 font-medium">Loteamento</th>
                      <th className="p-4 font-medium">Comprador</th>
                      <th className="p-4 font-medium">Valor Total</th>
                      <th className="p-4 font-medium">Entrada</th>
                      <th className="p-4 font-medium">Parcelas</th>
                      <th className="p-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(!resumo?.proximosVencimentos || resumo.proximosVencimentos.length === 0) ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-neutral-500">
                          Nenhuma venda registrada ainda.
                        </td>
                      </tr>
                    ) : (
                      // Agrupar parcelas por lote para mostrar vendas únicas
                      Array.from(new Set(resumo.proximosVencimentos.map(p => p.loteId))).map(loteId => {
                        const parcelasDoLote = resumo.proximosVencimentos.filter(p => p.loteId === loteId);
                        const primeiraParcela = parcelasDoLote[0];
                        const totalParcelas = primeiraParcela.totalInstallments;
                        const valorTotal = parcelasDoLote.reduce((acc, p) => acc + p.amount, 0) + (resumo?.totalRecebido || 0);
                        
                        // Calcular entrada baseado no VGV e parcelas
                        const entrada = resumo?.totalRecebido || 0;
                        const valorVenda = entrada + valorTotal;
                        
                        return (
                          <tr key={loteId} className="hover:bg-white/5 transition-colors text-sm text-neutral-300">
                            <td className="p-4 font-medium text-white">{primeiraParcela.loteName}</td>
                            <td className="p-4">{primeiraParcela.loteamentoName}</td>
                            <td className="p-4 font-medium text-emerald-400">{primeiraParcela.buyerName || '-'}</td>
                            <td className="p-4 text-white font-mono">{formatCurrency(valorVenda)}</td>
                            <td className="p-4 text-emerald-400 font-mono">{formatCurrency(entrada)}</td>
                            <td className="p-4">{totalParcelas}x de {formatCurrency(primeiraParcela.amount)}</td>
                            <td className="p-4">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                                Pendente
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'parcelas' && (
            <motion.div
              key="parcelas"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-lg font-medium text-white">Controle de Parcelas</h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                    {parcelasAtrasadas.length} atrasadas
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    {parcelasPagas.length} pagas
                  </span>
                </div>
              </div>
              
              {/* Kanban de Parcelas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
                {/* Atrasadas */}
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Atrasadas
                    </h4>
                    <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                      {parcelasAtrasadas.length}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {parcelasAtrasadas.map(parcela => (
                      <ParcelaCard 
                        key={parcela.id} 
                        parcela={parcela} 
                        onPay={() => {
                          setSelectedParcela(parcela);
                          setPaymentAmount(parcela.amount.toString());
                          setShowPaymentModal(true);
                        }}
                        isLate
                      />
                    ))}
                    {parcelasAtrasadas.length === 0 && (
                      <p className="text-neutral-500 text-sm text-center py-4">Nenhuma parcela atrasada</p>
                    )}
                  </div>
                </div>

                {/* Pendentes */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-amber-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Pendentes
                    </h4>
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
                      {parcelasEmDia.length}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {parcelasEmDia.map(parcela => (
                      <ParcelaCard 
                        key={parcela.id} 
                        parcela={parcela} 
                        onPay={() => {
                          setSelectedParcela(parcela);
                          setPaymentAmount(parcela.amount.toString());
                          setShowPaymentModal(true);
                        }}
                      />
                    ))}
                    {parcelasEmDia.length === 0 && (
                      <p className="text-neutral-500 text-sm text-center py-4">Nenhuma parcela pendente</p>
                    )}
                  </div>
                </div>

                {/* Pagas */}
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-emerald-400 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Pagas
                    </h4>
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">
                      {parcelasPagas.length}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {parcelasPagas.map(parcela => (
                      <ParcelaCard 
                        key={parcela.id} 
                        parcela={parcela} 
                        paid
                      />
                    ))}
                    {parcelasPagas.length === 0 && (
                      <p className="text-neutral-500 text-sm text-center py-4">Nenhuma parcela paga</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'pagamentos' && (
            <motion.div
              key="pagamentos"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-lg font-medium text-white">Histórico de Pagamentos</h3>
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <CheckCircle className="w-4 h-4" />
                  {resumo?.ultimosPagamentos?.length || 0} registros
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-neutral-400 text-sm">
                      <th className="p-4 font-medium">Data</th>
                      <th className="p-4 font-medium">Lote</th>
                      <th className="p-4 font-medium">Comprador</th>
                      <th className="p-4 font-medium">Tipo</th>
                      <th className="p-4 font-medium">Valor</th>
                      <th className="p-4 font-medium">Observações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(!resumo?.ultimosPagamentos || resumo.ultimosPagamentos.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-neutral-500">
                          Nenhum pagamento registrado.
                        </td>
                      </tr>
                    ) : (
                      resumo.ultimosPagamentos.map((pagamento) => (
                        <tr key={pagamento.id} className="hover:bg-white/5 transition-colors text-sm text-neutral-300">
                          <td className="p-4">{formatDate(pagamento.paidAt)}</td>
                          <td className="p-4 font-medium text-white">{pagamento.loteName}</td>
                          <td className="p-4">-</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              pagamento.type === 'sinal' ? 'bg-emerald-500/20 text-emerald-400' :
                              pagamento.type === 'parcela' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-purple-500/20 text-purple-400'
                            }`}>
                              {pagamento.type === 'sinal' ? 'Sinal' : 
                               pagamento.type === 'parcela' ? 'Parcela' : 'Comissão'}
                            </span>
                          </td>
                          <td className="p-4 text-emerald-400 font-mono">{formatCurrency(pagamento.amount)}</td>
                          <td className="p-4 text-neutral-500 text-xs">{pagamento.notes || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
              className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md"
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

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Valor do Pagamento</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                    placeholder="Valor"
                    step="0.01"
                  />
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

// Componente Card de Parcela
function ParcelaCard({ parcela, onPay, paid = false, isLate = false }: { 
  parcela: Parcela; 
  onPay?: () => void; 
  paid?: boolean;
  isLate?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div 
      className={`rounded-lg p-3 transition-colors cursor-pointer ${
        paid 
          ? 'bg-emerald-500/10 border border-emerald-500/20' 
          : isLate
            ? 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/20'
            : 'bg-white/5 border border-white/10 hover:bg-white/10'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-medium ${
          paid ? 'text-emerald-400' : isLate ? 'text-red-400' : 'text-white'
        }`}>
          {parcela.installmentNumber}/{parcela.totalInstallments}
        </span>
        <span className="text-sm text-emerald-400 font-mono">
          {formatCurrency(parcela.amount)}
        </span>
      </div>
      
      <p className="text-xs text-neutral-300 truncate">{parcela.loteName}</p>
      <p className="text-xs text-neutral-500 truncate">{parcela.buyerName}</p>
      
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
        <span className={`text-xs ${
          paid ? 'text-emerald-400' : isLate ? 'text-red-400' : 'text-amber-400'
        }`}>
          {paid ? `Pago em ${formatDate(parcela.paidAt || '')}` : `Vence ${formatDate(parcela.dueDate)}`}
        </span>
        
        {!paid && onPay && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPay();
            }}
            className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded hover:bg-emerald-500/30 transition-colors"
          >
            Pagar
          </button>
        )}
      </div>
    </div>
  );
}