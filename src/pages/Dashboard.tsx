import React, { useEffect, useState, useMemo } from 'react';
import { resolveUrl } from '../utils/url';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Map, Calendar, Loader2, Building2, CheckCircle,
  Clock, TrendingUp, Users, Trash2, X, AlertTriangle,
  Sparkles, Zap, ChevronRight, BarChart3, PieChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjs from 'pdfjs-dist';
import LoteamentoQuickView from '../components/QuickView';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function PdfThumbnail({ url, alt }: { url: string, alt: string }) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadPdf = async () => {
      try {
        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;
        if (!active) return;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport, canvas } as any).promise;
          if (active) setImgSrc(canvas.toDataURL());
        }
      } catch (err) {
        console.error("PDF preview error:", err);
      }
    };
    loadPdf();
    return () => { active = false; };
  }, [url]);

  if (!imgSrc) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-500/5 text-emerald-400 group-hover/card:bg-emerald-500/10 transition-all">
        <Loader2 className="w-8 h-8 animate-spin mb-2 opacity-80" />
        <span className="text-[10px] uppercase tracking-widest font-mono opacity-40">Renderizando</span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-1000 opacity-60 group-hover/card:opacity-100 grayscale group-hover/card:grayscale-0"
    />
  );
}

export default function Dashboard() {
  const [loteamentos, setLoteamentos] = useState<any[]>([]);
  const [lotesData, setLotesData] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; loteamento: any | null }>({ open: false, loteamento: null });
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const fetchAllData = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/loteamentos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Não foi possível carregar os loteamentos');

      const data = await res.json();
      setLoteamentos(data);

      // Fetch lotes for each loteamento to compute detailed stats
      const lotesPromises = data.map((l: any) =>
        fetch(import.meta.env.BASE_URL + `api/loteamentos/${l.id}/lotes`).then(r => r.json())
      );
      const results = await Promise.all(lotesPromises);
      const newLotesData: Record<number, any[]> = {};
      results.forEach((lotes, idx) => {
        newLotesData[data[idx].id] = lotes;
      });
      setLotesData(newLotesData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [navigate]);

  const stats = useMemo(() => {
    let totalLotes = 0;
    let disponiveis = 0;
    let vendidos = 0;
    let reservados = 0;
    let receita = 0;

    Object.values(lotesData).flat().forEach((lote: any) => {
      totalLotes++;
      if (lote.status === 'Disponível') disponiveis++;
      if (lote.status === 'Vendido') {
        vendidos++;
        receita += lote.price || 0;
      }
      if (lote.status === 'Reservado') reservados++;
    });

    return { totalLotes, disponiveis, vendidos, reservados, receita };
  }, [lotesData]);

  const handleDeleteLoteamento = async () => {
    if (!deleteModal.loteamento) return;
    setDeleting(true);
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(import.meta.env.BASE_URL + `api/loteamentos/${deleteModal.loteamento.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao deletar');
      setLoteamentos(prev => prev.filter(l => l.id !== deleteModal.loteamento.id));
      setDeleteModal({ open: false, loteamento: null });
    } catch (err) {
      alert('Erro ao deletar loteamento.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[70vh] gap-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-2 border-emerald-500/10 rounded-full" />
          <div className="absolute inset-0 border-t-2 border-emerald-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="w-6 h-6 text-emerald-500 animate-pulse" />
          </div>
        </div>
        <p className="text-neutral-500 font-bold uppercase tracking-[0.3em] text-xs animate-pulse">Sincronizando Ecossistema</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-24 relative">

      {/* BACKGROUND DECORATION */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      {/* DASHBOARD HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 relative z-10 p-2">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <PieChart className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.4em]">Visão Estratégica</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black font-heading tracking-tighter leading-none italic uppercase">
            Dashboard <span className="text-emerald-500 not-italic">Pro</span>
          </h1>
          <p className="text-neutral-500 text-lg mt-4 max-w-lg font-medium">Controle total sobre seu portfólio de empreendimentos e rentabilidade operacional.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Link
            to="/admin/new"
            className="group relative flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-emerald-500 hover:text-black hover:scale-105 transition-all shadow-[0_0_30px_rgba(16,185,129,0.1)] active:scale-95"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            Novo Empreendimento
          </Link>
        </motion.div>
      </div>

      {/* STATS ENGINE (GLYPH DESIGN) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {[
          { label: 'Unidades Totais', val: stats.totalLotes, icon: Building2, color: 'emerald', trend: 'Portfólio Ativo' },
          { label: 'Unidades Livres', val: stats.disponiveis, icon: CheckCircle, color: 'blue', trend: 'Pronto p/ Venda' },
          { label: 'Reservas Ativas', val: stats.reservados, icon: Clock, color: 'amber', trend: 'Em Negociação' },
          { label: 'VGV Consolidado', val: stats.receita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }), icon: BarChart3, color: 'emerald', trend: 'Receita Operacional' },
        ].map((s, idx) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 group hover:bg-white/[0.05] hover:border-white/10 transition-all shadow-2xl"
          >
            <div className="flex justify-between items-start mb-8">
              <div className={`w-14 h-14 rounded-2xl bg-${s.color}-500/10 border border-${s.color}-500/20 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <s.icon className={`w-6 h-6 text-${s.color}-500`} />
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-500/20 group-hover:text-emerald-500 transition-colors" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{s.label}</p>
              <h4 className="text-3xl font-black text-white font-heading tracking-tight">{s.val}</h4>
            </div>
            <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase text-neutral-600 tracking-widest">{s.trend}</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* LOTEAMENTOS GRID */}
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-10 px-2">
          <div className="h-px bg-white/10 flex-1" />
          <span className="text-[10px] font-black uppercase text-neutral-600 tracking-[0.5em]">Gerenciamento de Ativos</span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        {loteamentos.length === 0 ? (
          <div className="bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10 py-32 text-center group cursor-pointer hover:bg-white/[0.03] transition-colors" onClick={() => navigate('/admin/new')}>
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10 group-hover:scale-110 transition-transform">
              <Map className="w-10 h-10 text-neutral-800" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">Nenhum Ativo Detectado</h3>
            <p className="text-neutral-500 font-medium">Inicie o sistema fazendo upload de um novo masterplan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {loteamentos.map((l) => {
              const lotes = lotesData[l.id] || [];
              const disp = lotes.filter(x => x.status === 'Disponível').length;
              const pct = lotes.length > 0 ? Math.round(((lotes.length - disp) / lotes.length) * 100) : 0;

              return (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group/card relative"
                >
                  <LoteamentoQuickView id={l.id}>
                    <Link
                      to={`/admin/loteamento/${l.id}`}
                      className="block bg-neutral-900/50 rounded-[3rem] border border-white/5 overflow-hidden ring-1 ring-white/0 hover:ring-emerald-500/30 transition-all duration-700 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]"
                    >
                      <div className="aspect-[16/10] w-full bg-black relative overflow-hidden">
                        {l.imageUrl ? (
                          l.imageUrl.toLowerCase().endsWith('.pdf') ? (
                            <PdfThumbnail url={resolveUrl(l.imageUrl)} alt={l.name} />
                          ) : (
                            <img src={resolveUrl(l.imageUrl)} alt={l.name} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-[2000ms] opacity-40 group-hover/card:opacity-100 grayscale group-hover/card:grayscale-0" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white/5 text-neutral-800"><Building2 className="w-14 h-14" /></div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
                        <div className="absolute top-6 left-6 z-20">
                          <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase text-white tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]" />
                            {pct}% Comercializado
                          </div>
                        </div>
                      </div>

                      <div className="p-10 pt-4 relative z-20">
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-6 group-hover/card:text-emerald-400 transition-colors">{l.name}</h3>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-neutral-500">
                            <span>Inventário Livre</span>
                            <span className="text-white">{disp} de {lotes.length} Unid.</span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                          </div>
                        </div>

                        <div className="mt-8 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                          <div className="flex items-center gap-2 text-neutral-500 group-hover/card:text-white transition-colors">
                            <div className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center group-hover/card:border-emerald-500/50 transition-all">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                            Explorar Masterplan
                          </div>
                          <span className="text-neutral-600 font-mono italic">#{l.id}</span>
                        </div>
                      </div>
                    </Link>
                  </LoteamentoQuickView>

                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteModal({ open: true, loteamento: l }); }}
                    className="absolute top-6 right-6 p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl opacity-0 group-hover/card:opacity-100 transition-all shadow-xl z-30 border border-red-500/20 backdrop-blur-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (SaaS 2027 Style) */}
      <AnimatePresence>
        {deleteModal.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex items-center justify-center z-[1000] p-6" onClick={() => !deleting && setDeleteModal({ open: false, loteamento: null })}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }} className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-12 max-w-xl w-full shadow-[0_0_100px_rgba(239,68,68,0.1)] relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500/40 blur-sm" />
              <div className="flex items-center gap-6 mb-10">
                <div className="w-20 h-20 rounded-[2rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-red-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Deletar Ativo</h3>
                  <p className="text-neutral-500 text-sm font-medium">Esta operação é irreversível e atômica.</p>
                </div>
              </div>
              <div className="bg-red-500/5 border border-red-500/10 rounded-[2rem] p-8 mb-10 space-y-4 text-xs font-bold uppercase tracking-widest text-red-400">
                <p>O encerramento deste ativo removerá:</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Geodata & Polígonos</div>
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Fluxo Financeiro</div>
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Extrato de Comissões</div>
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Títulos & Recebíveis</div>
                </div>
              </div>
              <p className="text-white mb-10 text-lg font-medium">Confirma a exclusão de <span className="text-red-500 font-black italic uppercase">{deleteModal.loteamento?.name}</span>?</p>
              <div className="flex gap-4">
                <button onClick={() => setDeleteModal({ open: false, loteamento: null })} disabled={deleting} className="flex-1 px-8 py-5 bg-white/5 hover:bg-white/10 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all">Abandonar</button>
                <button onClick={handleDeleteLoteamento} disabled={deleting} className="flex-1 px-8 py-5 bg-red-500 hover:bg-red-600 text-black rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3">
                  {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
