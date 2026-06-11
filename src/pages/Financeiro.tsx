import React, { useEffect, useState } from 'react';
import { 
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2, FileText, 
  Calendar, CreditCard, Users, AlertTriangle, CheckCircle, Clock, ChevronDown, 
  ChevronUp, X, Check, Wallet, Building, Search, Filter, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LoteamentoQuickView from '../components/QuickView';
import { Link } from 'react-router-dom';

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
  buyerName?: string;
  corretorName?: string;
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
  const [vendas, setVendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vendas' | 'parcelas' | 'pagamentos'>('vendas');
  const [selectedParcela, setSelectedParcela] = useState<Parcela | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOverride, setPaymentOverride] = useState<string | null>(null); // null = use computed
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [juros, setJuros] = useState('');
  const [multa, setMulta] = useState('');
  const [desconto, setDesconto] = useState('');
  const [forceQuitado, setForceQuitado] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [isAntecipado, setIsAntecipado] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<Pagamento | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // valorFinal: computed automatically from juros/desconto as PERCENTAGE
  const valorFinalCalculado = selectedParcela
    ? (selectedParcela.amount || 0) * (1 + (parseFloat(juros || '0') / 100)) - 
      ((selectedParcela.amount || 0) * (parseFloat(desconto || '0') / 100))
    : 0;
  const valorFinal = paymentOverride !== null ? parseFloat(paymentOverride) || 0 : valorFinalCalculado;

  const fetchData = async () => {
    const token = localStorage.getItem('adminToken');
    try {
      const [resResumo, resParcelas, resVendas] = await Promise.all([
        fetch(import.meta.env.BASE_URL + 'api/financeiro/resumo', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(import.meta.env.BASE_URL + 'api/parcelas', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(import.meta.env.BASE_URL + 'api/financeiro/vendas', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (resResumo.ok) {
        const data = await resResumo.json();
        setResumo(data);
      }
      
      if (resParcelas.ok) {
        const data = await resParcelas.json();
        setParcelas(Array.isArray(data) ? data : []);
      } else {
        setParcelas([]);
      }
      
      if (resVendas.ok) {
        const data = await resVendas.json();
        setVendas(Array.isArray(data) ? data : []);
      } else {
        setVendas([]);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
      setParcelas([]);
      setVendas([]);
      setLoading(false);
    }
  };

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
          amount: valorFinal,
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
        setPaymentOverride(null);
        setPaymentNotes('');
        setJuros('');
        setMulta('');
        setDesconto('');
        setForceQuitado(false);
        setIsAntecipado(false);
        fetchData();
      }
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err);
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-emerald-500" />
          </div>
        </div>
      </div>
    );
  }

  const filteredVendas = vendas.filter(v => 
    v.loteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.compradorNome && v.compradorNome.toLowerCase().includes(searchTerm.toLowerCase())) ||
    v.loteamentoName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const parcelasAtrasadas = parcelas.filter(p => {
    if (p.status === 'pago') return false;
    return new Date(p.dueDate) < new Date();
  });

  const parcelasPagas = parcelas.filter(p => p.status === 'pago');

  return (
    <div className="container mx-auto pb-12 font-sans overflow-visible">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-4xl font-bold text-white mb-2 font-heading tracking-tight">Fluxo <span className="text-emerald-500">Financeiro</span></h2>
          <p className="text-neutral-500 font-medium">Gestão inteligente de recebíveis, comissões e performance de vendas.</p>
        </motion.div>
        
        <div className="flex gap-3">
           <div className="relative group/search">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within/search:text-emerald-500 transition-colors" />
             <input 
               type="text" 
               placeholder="Buscar registros..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 min-w-[280px] transition-all"
             />
           </div>
        </div>
      </div>

      {/* Cards de Resumo Estilo SaaS Premium */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Receita Líquida', value: (resumo?.totalRecebido || 0) - (resumo?.comissoesPagas || 0), icon: Wallet, color: 'emerald', desc: 'Caixa Real (Após Comissões)' },
          { label: 'Entradas Brutas', value: resumo?.totalRecebido, icon: TrendingUp, color: 'blue', desc: 'Total pago pelos clientes' },
          { label: 'Comissões Pagas', value: resumo?.comissoesPagas, icon: Users, color: 'purple', desc: 'Saída/Repasse a corretores' },
          { label: 'A Receber', value: resumo?.aReceber, icon: Clock, color: 'amber', desc: 'Títulos pendentes futuros' }
        ].map((card, idx) => (
          <motion.div 
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-card p-6 rounded-[2.5rem] relative overflow-hidden group hover:bg-white/[0.08] transition-all duration-500 overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-${card.color}-500/10 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2 transition-colors group-hover:bg-${card.color}-500/20`} />
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-2xl bg-${card.color}-500/20 flex items-center justify-center border border-${card.color}-500/20 shadow-lg group-hover:scale-110 transition-transform`}>
                <card.icon className={`w-6 h-6 text-${card.color}-400`} />
              </div>
              <div>
                 <h4 className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-bold">{card.label}</h4>
                 <p className={`text-2xl font-bold text-white font-heading`}>{formatCurrency(card.value || 0)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">{card.desc}</span>
              <div className={`w-1.5 h-1.5 rounded-full bg-${card.color}-500 animate-pulse`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Comissões - Card Largo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 rounded-[2.5rem] p-8 relative flex flex-col sm:flex-row items-center gap-8 group"
          >
             <div className="w-16 h-16 rounded-3xl bg-purple-500/20 flex items-center justify-center border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.1)] group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-purple-400" />
             </div>
             <div className="flex-1 text-center sm:text-left">
                <h4 className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-1">Gestão de Comissões</h4>
                <div className="flex flex-col sm:flex-row sm:items-end gap-1 sm:gap-4">
                   <h3 className="text-3xl font-bold text-white font-heading">{formatCurrency(resumo?.comissoesPendentes || 0)}</h3>
                   <span className="text-neutral-500 text-sm mb-1.5">A pagar para corretores</span>
                </div>
             </div>
             <div className="h-px w-full sm:h-12 sm:w-px bg-white/10" />
             <div className="text-center sm:text-right">
                <p className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mb-1">Total Liquidado</p>
                <p className="text-xl font-bold text-white/50 font-mono">{formatCurrency(resumo?.comissoesPagas || 0)}</p>
             </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20 rounded-[2.5rem] p-8 flex items-center gap-8 group"
          >
             <div className="w-16 h-16 rounded-3xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.1)] group-hover:scale-110 transition-transform">
                <CreditCard className="w-8 h-8 text-cyan-400" />
             </div>
             <div className="flex-1">
                <h4 className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-1">Snapshot de Parcelas</h4>
                <div className="flex items-center gap-4">
                   <div>
                      <p className="text-3xl font-bold text-white font-heading">{parcelasPagas.length}</p>
                      <p className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest">Quitadas</p>
                   </div>
                   <ArrowRight className="text-neutral-600 w-4 h-4" />
                   <div>
                      <p className="text-3xl font-bold text-white font-heading">{parcelas.length - parcelasPagas.length}</p>
                      <p className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest">Pendentes</p>
                   </div>
                </div>
             </div>
          </motion.div>
      </div>

      {/* Tabs Modernas */}
      <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[3rem] p-3 mb-8 inline-flex gap-2">
        {[
          { id: 'vendas', label: 'Vendas', icon: FileText },
          { id: 'parcelas', label: 'Pendências', icon: CreditCard },
          { id: 'pagamentos', label: 'Histórico', icon: CheckCircle }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-8 py-4 rounded-[2.2rem] text-sm font-bold transition-all duration-300 ${
              activeTab === tab.id 
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                : 'text-neutral-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabela Master */}
      <motion.div 
        layout
        className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl sidebar-glow"
      >
        <AnimatePresence mode="wait">
          {activeTab === 'vendas' && (
            <motion.div
              key="vendas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-8"
            >
              <div className="flex justify-between items-center mb-8 px-2">
                <h3 className="text-xl font-bold text-white font-heading tracking-tight">Vendas Registradas</h3>
                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full text-[10px] uppercase font-bold tracking-widest border border-emerald-500/20">
                  <Building className="w-3.5 h-3.5" /> {vendas.length} Registros
                </div>
              </div>
              
               {/* Mobile View: Cards (MOB-01) */}
              <div className="md:hidden space-y-4">
                {filteredVendas.length === 0 ? (
                  <div className="py-20 text-center text-neutral-600 italic">
                    Ops! Nenhum registro encontrado para sua busca.
                  </div>
                ) : (
                  filteredVendas.map((venda) => (
                    <div key={venda.id} className="p-6 bg-white/[0.03] border border-white/10 rounded-[2rem] space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white text-base">{venda.loteName}</span>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          venda.statusPagamento === 'quitado' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {venda.statusPagamento === 'quitado' ? 'Liquidado' : 'Aberto'}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-400">
                        <span className="text-neutral-500 uppercase tracking-wider font-bold">Loteamento:</span> {venda.loteamentoName}
                      </div>
                      <div className="text-xs text-neutral-400">
                        <span className="text-neutral-500 uppercase tracking-wider font-bold">Comprador:</span> {venda.compradorNome}
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5 text-xs">
                        <div>
                          <span className="text-neutral-500 block text-[9px] uppercase tracking-wider font-bold">Total</span>
                          <span className="font-mono text-white font-bold">{formatCurrency(venda.valorTotal)}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block text-[9px] uppercase tracking-wider font-bold">Entrada</span>
                          <span className="font-mono text-emerald-400 font-bold">{formatCurrency(venda.entrada)}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block text-[9px] uppercase tracking-wider font-bold">Plano</span>
                          <span className="text-white font-bold">{venda.totalParcelas}x</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold">
                      <th className="px-6 py-4">Identificação</th>
                      <th className="px-6 py-4">Loteamento</th>
                      <th className="px-6 py-4">Comprador</th>
                      <th className="px-6 py-4">Total</th>
                      <th className="px-6 py-4">Entrada</th>
                      <th className="px-6 py-4">Plano</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-4">
                    {filteredVendas.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-20 text-center text-neutral-600 italic">
                          Ops! Nenhum registro encontrado para sua busca.
                        </td>
                      </tr>
                    ) : (
                      filteredVendas.map((venda, idx) => (
                        <motion.tr 
                          key={venda.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="group hover:bg-white/5 transition-all duration-300"
                        >
                          <td className="px-6 py-5 rounded-l-[1.5rem] font-bold text-white group-hover:text-emerald-400 transition-colors">{venda.loteName}</td>
                          <td className="px-6 py-5 text-neutral-400 text-sm font-medium">
                            <LoteamentoQuickView id={venda.loteamentoId}>
                              <Link to={`/admin/loteamento/${venda.loteamentoId}`} className="hover:text-emerald-400 transition-colors">
                                {venda.loteamentoName}
                              </Link>
                            </LoteamentoQuickView>
                          </td>
                          <td className="px-6 py-5">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center text-[10px] font-bold text-emerald-500 border border-emerald-500/10">
                                   {venda.compradorNome?.charAt(0) || 'C'}
                                </div>
                                <div>
                                   <p className="text-white font-bold text-sm leading-none">{venda.compradorNome}</p>
                                   <p className="text-[9px] text-neutral-500 font-mono tracking-tighter mt-1">CPF: {venda.compradorCpf}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-5 text-white font-mono font-bold">{formatCurrency(venda.valorTotal)}</td>
                          <td className="px-6 py-5 text-emerald-500 font-mono font-bold text-sm">{formatCurrency(venda.entrada)}</td>
                          <td className="px-6 py-5">
                             <span className="text-neutral-400 text-xs font-mono">{venda.totalParcelas}x de</span>
                             <p className="text-white font-bold text-sm">{formatCurrency(venda.valorParcela)}</p>
                          </td>
                          <td className="px-6 py-5 rounded-r-[1.5rem] text-center">
                            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                              venda.statusPagamento === 'quitado' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {venda.statusPagamento === 'quitado' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {venda.statusPagamento === 'quitado' ? 'Liquidado' : 'Aberto'}
                            </span>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'parcelas' && (
            <motion.div
              key="parcelas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-8"
            >
              <div className="flex justify-between items-center mb-8 px-2">
                <h3 className="text-xl font-bold text-white font-heading tracking-tight text-glow">Gestão de Pendências</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-red-500/20">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {parcelasAtrasadas.length} Atrasadas
                  </div>
              </div>
              
              {/* Mobile View: Cards (MOB-01) */}
              <div className="md:hidden space-y-4">
                {parcelas.length === 0 ? (
                  <div className="py-20 text-center text-neutral-600 italic">Nada por aqui ainda.</div>
                ) : (
                  [...parcelasAtrasadas, ...parcelas.filter(p => !parcelasAtrasadas.includes(p) && p.status !== 'pago')].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map((parcela) => {
                    const isAtrasado = new Date(parcela.dueDate) < new Date();
                    return (
                      <div key={parcela.id} className="p-6 bg-white/[0.03] border border-white/10 rounded-[2rem] space-y-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-white text-base uppercase">{parcela.loteName}</span>
                            <span className="text-[10px] text-neutral-500 font-mono block">Parc. {parcela.installmentNumber}/{parcela.totalInstallments}</span>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            isAtrasado ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {isAtrasado ? 'Atrasada' : 'Em Aberto'}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-400">
                          <span className="text-neutral-500 uppercase tracking-wider font-bold">Loteamento:</span> {parcela.loteamentoName}
                        </div>
                        <div className="text-xs text-neutral-400">
                          <span className="text-neutral-500 uppercase tracking-wider font-bold">Responsável:</span> {parcela.buyerName}
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5 text-xs items-center">
                          <div>
                            <span className="text-neutral-500 block text-[9px] uppercase tracking-wider font-bold">Valor</span>
                            <span className="font-mono text-white font-bold">{formatCurrency(parcela.amount)}</span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block text-[9px] uppercase tracking-wider font-bold">Vencimento</span>
                            <span className={`font-bold ${isAtrasado ? 'text-red-400' : 'text-neutral-400'}`}>{formatDate(parcela.dueDate)}</span>
                          </div>
                        </div>
                        <div className="pt-2">
                          <button
                            onClick={() => {
                              setSelectedParcela(parcela);
                              setPaymentOverride(null);
                              setJuros('');
                              setMulta('');
                              setDesconto('');
                              setShowPaymentModal(true);
                            }}
                            className="w-full py-3 bg-emerald-500 text-black rounded-xl hover:scale-102 active:scale-98 transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 min-h-[44px]"
                          >
                            Dar Baixa
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block w-full">
                <table className="w-full text-left border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold">
                      <th className="px-6 py-4">Contrato / Parcela</th>
                      <th className="px-6 py-4">Lote / Plano</th>
                      <th className="px-6 py-4">Responsável</th>
                      <th className="px-6 py-4">Vencimento</th>
                      <th className="px-6 py-4">Valor Nominal</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Controle</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-4">
                    {[...parcelasAtrasadas, ...parcelas.filter(p => !parcelasAtrasadas.includes(p) && p.status !== 'pago')].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map((parcela, idx) => {
                      const isAtrasado = new Date(parcela.dueDate) < new Date();
                      return (
                        <motion.tr 
                          key={parcela.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="group hover:bg-white/5 transition-all duration-300"
                        >
                          <td className="px-6 py-5 rounded-l-[1.5rem] font-bold text-white">
                             <div className="text-sm">Parc. {parcela.installmentNumber}/{parcela.totalInstallments}</div>
                             <div className="text-[10px] text-neutral-500 font-mono">ID: #{parcela.id}</div>
                          </td>
                          <td className="px-6 py-5">
                             <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors uppercase">{parcela.loteName}</div>
                             <LoteamentoQuickView id={parcela.loteamentoId}>
                                <Link to={`/admin/loteamento/${parcela.loteamentoId}`} className="text-[10px] text-neutral-500 font-medium hover:text-emerald-400 transition-colors">
                                  {parcela.loteamentoName}
                                </Link>
                             </LoteamentoQuickView>
                          </td>
                          <td className="px-6 py-5">
                             <div className="text-emerald-400 font-bold text-sm">{parcela.buyerName}</div>
                          </td>
                          <td className="px-6 py-5">
                             <div className={`text-sm font-bold flex items-center gap-1.5 ${isAtrasado ? 'text-red-400' : 'text-neutral-400'}`}>
                                <Calendar className="w-3.5 h-3.5" /> {formatDate(parcela.dueDate)}
                             </div>
                          </td>
                          <td className="px-6 py-5 font-mono text-white font-bold">{formatCurrency(parcela.amount)}</td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              isAtrasado ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {isAtrasado ? 'Atrasada' : 'Em Aberto'}
                            </span>
                          </td>
                          <td className="px-6 py-5 rounded-r-[1.5rem] text-right">
                            <button
                              onClick={() => {
                                setSelectedParcela(parcela);
                                setPaymentOverride(null);
                                setJuros('');
                                setMulta('');
                                setDesconto('');
                                setShowPaymentModal(true);
                              }}
                              className="px-4 py-2 bg-emerald-500 text-black rounded-xl hover:scale-105 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                            >
                              Dar Baixa
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>             </div>
            </motion.div>
          )}

          {activeTab === 'pagamentos' && (
            <motion.div
              key="pagamentos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-8"
            >
              <div className="flex justify-between items-center mb-8 px-2">
                <h3 className="text-xl font-bold text-white font-heading tracking-tight">Timeline de Recebimento</h3>
                <div className="flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-500/20 shadow-blue-500/5 shadow-lg">
                  <TrendingUp className="w-3.5 h-3.5" /> {resumo?.ultimosPagamentos?.length || 0} Registrados
                </div>
              </div>
              
              {/* Mobile View: Cards (MOB-01) */}
              <div className="md:hidden space-y-4">
                {(!resumo?.ultimosPagamentos || resumo.ultimosPagamentos.length === 0) ? (
                  <div className="py-20 text-center text-neutral-600 italic">Nada por aqui ainda.</div>
                ) : (
                  resumo.ultimosPagamentos.map((pagamento) => (
                    <div 
                      key={pagamento.id} 
                      onClick={() => setSelectedReport(pagamento)}
                      className="p-6 bg-white/[0.03] border border-white/10 rounded-[2rem] space-y-3 cursor-pointer hover:bg-white/5 transition-all"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-white text-base uppercase">{pagamento.loteName}</span>
                          <span className="text-[10px] text-neutral-500 block">{formatDate(pagamento.paidAt)}</span>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          pagamento.type === 'sinal' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                          pagamento.type === 'parcela' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                          'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                        }`}>
                          {pagamento.type === 'sinal' ? 'Sinal' : 
                           pagamento.type === 'parcela' ? 'Parcela' : 'Comissão'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        <div>
                          <span className="text-neutral-500 block text-[9px] uppercase tracking-wider font-bold">Meio</span>
                          <span className="text-white text-xs font-bold">{pagamento.paymentMethod || 'PIX'}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block text-[9px] uppercase tracking-wider font-bold text-right">Valor</span>
                          <span className={`font-mono font-bold text-base ${pagamento.type === 'comissao' ? 'text-red-500' : 'text-emerald-500'}`}>
                            {pagamento.type === 'comissao' ? '- ' : ''}{formatCurrency(pagamento.amount)}
                          </span>
                        </div>
                      </div>
                      {pagamento.notes && (
                        <div className="text-neutral-500 text-xs italic truncate pt-1">{pagamento.notes}</div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block w-full">
                <table className="w-full text-left border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold">
                      <th className="px-6 py-4">Data/Hora</th>
                      <th className="px-6 py-4">Lote / Ativo</th>
                      <th className="px-6 py-4">Operação</th>
                      <th className="px-6 py-4">Valor Bruto</th>
                      <th className="px-6 py-4">Meio de Pagamento</th>
                      <th className="px-6 py-4">Notas Internas</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-4">
                    {(!resumo?.ultimosPagamentos || resumo.ultimosPagamentos.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center text-neutral-600 italic">Nada por aqui ainda.</td>
                      </tr>
                    ) : (
                      resumo.ultimosPagamentos.map((pagamento, idx) => (
                        <motion.tr 
                          key={pagamento.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => setSelectedReport(pagamento)}
                          className="group hover:bg-white/5 transition-all duration-300 cursor-pointer relative"
                        >
                          <td className="px-6 py-5 rounded-l-[1.5rem] font-bold text-white relative">
                             <div className="absolute left-10 -top-10 bg-neutral-800 text-white text-[10px] uppercase font-bold tracking-widest px-4 py-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 shadow-2xl border border-white/10 pointer-events-none transform group-hover:-translate-y-1">
                                Ver Dossiê Completo • {pagamento.type === 'comissao' ? (pagamento.corretorName || 'Corretor') : (pagamento.buyerName || 'Comprador')}
                             </div>
                             <div className="text-sm">{formatDate(pagamento.paidAt)}</div>
                             <div className="text-[10px] text-neutral-500 font-medium">#{pagamento.id}</div>
                          </td>
                          <td className="px-6 py-5">
                             <div className="text-sm font-bold text-white uppercase group-hover:text-emerald-400 transition-colors">{pagamento.loteName}</div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              pagamento.type === 'sinal' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                              pagamento.type === 'parcela' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                              'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                            }`}>
                              {pagamento.type === 'sinal' ? 'Sinal / Entrada' : 
                               pagamento.type === 'parcela' ? 'Parcela Mensal' : 'Repasse Comissão'}
                            </span>
                          </td>
                          <td className={`px-6 py-5 font-mono font-bold text-lg ${pagamento.type === 'comissao' ? 'text-red-500' : 'text-emerald-500'}`}>
                             {pagamento.type === 'comissao' ? '- ' : ''}{formatCurrency(pagamento.amount)}
                          </td>
                          <td className="px-6 py-5">
                             <div className="flex items-center gap-2 text-white/70 text-sm font-bold uppercase tracking-tighter">
                                <CreditCard className="w-3.5 h-3.5" /> {pagamento.paymentMethod || 'PIX'}
                             </div>
                          </td>
                          <td className="px-6 py-5 rounded-r-[1.5rem] text-neutral-500 text-xs italic font-medium max-w-xs truncate">{pagamento.notes || 'Sem observações'}</td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modal de Pagamento - SaaS Design */}
      <AnimatePresence>
        {showPaymentModal && selectedParcela && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
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
                     <p className="text-neutral-500 text-sm font-medium mt-1">Confirmação de recebimento bancário</p>
                  </div>
                  <button onClick={() => setShowPaymentModal(false)} className="w-12 h-12 rounded-2xl bg-white/5 text-neutral-500 hover:bg-red-500/20 hover:text-red-500 transition-all flex items-center justify-center">
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
                    <div className="flex gap-4 pt-4 border-t border-white/5 items-center justify-between">
                       <div className="flex-1">
                          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Titular</p>
                          <p className="text-emerald-400 font-bold text-sm">{selectedParcela.buyerName}</p>
                       </div>
                       <div className="text-right flex flex-col items-end">
                          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Vencimento Original</p>
                          <p className="text-white font-bold text-sm tracking-tight">{formatDate(selectedParcela.dueDate)}</p>
                          {(() => {
                            const today = new Date(); today.setHours(0,0,0,0);
                            const dv = new Date(selectedParcela.dueDate); dv.setHours(23,59,59,999);
                            const diff = Math.ceil((dv.getTime() - today.getTime()) / (1000 * 3600 * 24));
                            if (diff < 0) return <span className="bg-red-500/10 text-red-500 text-[9px] font-black px-2 py-0.5 rounded mt-1 uppercase">Atrasado há {Math.abs(diff)} dias</span>;
                            if (diff === 0) return <span className="bg-amber-500/10 text-amber-500 text-[9px] font-black px-2 py-0.5 rounded mt-1 uppercase">Vence Hoje</span>;
                            return <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black px-2 py-0.5 rounded mt-1 uppercase">Adiantado em {diff} dias</span>;
                          })()}
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                       <div className="relative">
                          <label className="block text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-2 px-1">Juros (+ %)</label>
                          <div className="relative">
                            <input type="number" value={juros} onChange={(e) => setJuros(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-emerald-500 font-mono text-sm pr-10" placeholder="0" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600 font-bold text-xs">%</span>
                          </div>
                       </div>
                       <div className="relative">
                          <label className="block text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-2 px-1">Descontos (- %)</label>
                          <div className="relative">
                            <input type="number" value={desconto} onChange={(e) => setDesconto(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-emerald-500 font-mono text-sm pr-10" placeholder="0" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600 font-bold text-xs">%</span>
                          </div>
                       </div>
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 flex flex-col justify-center items-center">
                       <p className="text-[10px] text-emerald-500 uppercase font-bold tracking-widest mb-2">Total Ajustado</p>
                       <p className="text-3xl font-bold text-emerald-400 font-heading">
                          {formatCurrency(valorFinalCalculado)}
                       </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                    <div>
                       <label className="block text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-2 px-1">Valor Final Recebido</label>
                       <input
                         type="number"
                         value={paymentOverride !== null ? paymentOverride : valorFinalCalculado.toFixed(2)}
                         onChange={(e) => setPaymentOverride(e.target.value)}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500 font-bold text-xl font-heading shadow-inner"
                         placeholder="R$ 0.00"
                         step="0.01"
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-2 px-1">Método</label>
                      <select 
                        value={paymentMethod} 
                        onChange={(e) => setPaymentMethod(e.target.value)} 
                        className="w-full bg-neutral-800 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500 font-bold text-sm tracking-wider uppercase appearance-none cursor-pointer hover:bg-neutral-700 transition-colors"
                      >
                        <option value="pix" className="bg-neutral-900 text-white">PIX / Dinheiro</option>
                        <option value="dinheiro" className="bg-neutral-900 text-white">Espécie / Dinheiro</option>
                        <option value="boleto" className="bg-neutral-900 text-white">Boleto Bancário</option>
                        <option value="transferencia" className="bg-neutral-900 text-white">Transferência / TED</option>
                        <option value="cartao" className="bg-neutral-900 text-white">Cartão Débito/Crédito</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 group hover:bg-emerald-500/5 transition-colors cursor-pointer" onClick={() => {
                        const newVal = !isAntecipado;
                        setIsAntecipado(newVal);
                        if (newVal) setDesconto('5'); else setDesconto('0');
                    }}>
                      <input type="checkbox" id="isAntecipado" checked={isAntecipado} readOnly className="w-5 h-5 rounded-lg border-white/10 text-emerald-500 focus:ring-emerald-500/20 bg-neutral-900 cursor-pointer" />
                      <label htmlFor="isAntecipado" className="text-[10px] text-neutral-400 cursor-pointer uppercase font-bold tracking-widest py-1">Bonificação por Anticipação <span className="block text-emerald-500 font-normal normal-case mt-0.5">(Escolha o % sugerido no campo Desconto)</span></label>
                    </div>

                    <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 group hover:bg-blue-500/5 transition-colors cursor-pointer" onClick={() => setForceQuitado(!forceQuitado)}>
                      <input type="checkbox" id="forceQuitado" checked={forceQuitado} readOnly className="w-5 h-5 rounded-lg border-white/10 text-emerald-500 focus:ring-emerald-500/20 bg-neutral-900 cursor-pointer" />
                      <label htmlFor="forceQuitado" className="text-[10px] text-neutral-400 cursor-pointer uppercase font-bold tracking-widest py-1">Liquidação Integral <span className="block text-neutral-500 font-normal normal-case mt-0.5">(Considerar Parcela como Paga)</span></label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-12">
                   <button onClick={handleRegistrarPagamento} disabled={processingPayment} className="flex-[2] h-16 rounded-[1.5rem] bg-emerald-500 text-black font-black uppercase tracking-widest hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 group disabled:opacity-50">
                      {processingPayment ? <Loader2 className="w-6 h-6 animate-spin" /> : <> <Check className="w-6 h-6 group-hover:scale-125 transition-transform" /> Confirmar Recebimento </>}
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Relatório Completo do Pagamento */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedReport(null)} />
             <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-neutral-900 border border-white/10 rounded-[3rem] p-10 w-full max-w-xl relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                onClick={(e) => e.stopPropagation()}
             >
                <div className={`absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 ${selectedReport.type === 'comissao' ? 'bg-purple-500/10' : 'bg-emerald-500/10'}`} />
                
                <div className="flex items-center justify-between mb-8">
                  <div>
                     <h3 className="text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-3">
                       <FileText className="w-6 h-6 text-emerald-500" />
                       Dossiê de Transação
                     </h3>
                     <p className="text-neutral-500 text-sm font-medium mt-1 uppercase tracking-widest text-[10px]">Documento Nº {selectedReport.id.toString().padStart(6, '0')}</p>
                  </div>
                  <button onClick={() => setSelectedReport(null)} className="w-12 h-12 rounded-2xl bg-white/5 text-neutral-500 hover:bg-red-500/20 hover:text-red-500 transition-all flex items-center justify-center">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Bloco de Valor */}
                  <div className={`p-8 rounded-[2rem] border relative overflow-hidden flex flex-col items-center justify-center ${selectedReport.type === 'comissao' ? 'bg-purple-500/5 border-purple-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                     <div className="absolute top-4 right-6 text-[10px] uppercase font-black tracking-widest px-3 py-1 bg-white/10 rounded-full text-white/80">
                         {selectedReport.type === 'sinal' ? 'Entrada' : selectedReport.type === 'parcela' ? 'Parcelamento' : 'Comissão'}
                     </div>
                     <span className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${selectedReport.type === 'comissao' ? 'text-purple-400' : 'text-emerald-500'}`}>Valor Consolidado</span>
                     <div className={`text-4xl font-heading font-bold ${selectedReport.type === 'comissao' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {selectedReport.type === 'comissao' ? '- ' : ''}{formatCurrency(selectedReport.amount)}
                     </div>
                  </div>

                  {/* Informações Contextuais */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white/5 border border-white/5 rounded-3xl p-5">
                         <span className="block text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Data / Hora</span>
                         <span className="text-white font-bold text-sm">{formatDate(selectedReport.paidAt)}</span>
                     </div>
                     <div className="bg-white/5 border border-white/5 rounded-3xl p-5">
                         <span className="block text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><CreditCard className="w-3 h-3" /> Conciliação</span>
                         <span className="text-white font-bold text-sm uppercase">{selectedReport.paymentMethod || 'PIX'}</span>
                     </div>
                  </div>

                  {/* Atores */}
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4">
                     <div>
                        <span className="block text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Unidade / Ativo</span>
                        <div className="text-white font-bold text-lg uppercase tracking-tight">{selectedReport.loteName}</div>
                     </div>
                     <div className="h-px bg-white/5 w-full" />
                     {selectedReport.type === 'comissao' ? (
                       <div>
                          <span className="block text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Recebedor (Corretor)</span>
                          <div className="text-white font-bold">{selectedReport.corretorName || 'Não Informado'}</div>
                       </div>
                     ) : (
                       <div>
                          <span className="block text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Pagador (Comprador)</span>
                          <div className="text-white font-bold">{selectedReport.buyerName || 'Não Informado'}</div>
                       </div>
                     )}
                  </div>

                  {/* Histórico / Notas */}
                  {selectedReport.notes && (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-6">
                       <span className="block text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><FileText className="w-3 h-3" /> Histórico / Observações</span>
                       <p className="text-neutral-300 text-sm font-medium leading-relaxed italic border-l-2 border-amber-500/30 pl-4">{selectedReport.notes}</p>
                    </div>
                  )}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

