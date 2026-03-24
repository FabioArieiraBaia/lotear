import React, { useEffect, useState } from 'react';
import { resolveUrl } from '../utils/url';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Map, Calendar, Loader2, Building2, CheckCircle, Clock, TrendingUp, Users, Trash2, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjs from 'pdfjs-dist';
pdfjs.GlobalWorkerOptions.workerSrc = new URL(import.meta.env.BASE_URL + 'pdf.worker.min.js', window.location.origin).href;

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
      <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-500/10 text-emerald-400 group-hover/card:bg-emerald-500/20 transition-all">
        <Loader2 className="w-8 h-8 animate-spin mb-2 opacity-80" />
        <span className="text-[10px] uppercase tracking-widest font-mono opacity-60">Renderizando</span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500 opacity-80 group-hover/card:opacity-100 mix-blend-screen bg-white shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"
    />
  );
}

export default function Dashboard() {
  const [loteamentos, setLoteamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalLotes: 0, disponiveis: 0, vendidos: 0, reservados: 0, receita: 0 });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; loteamento: any | null }>({ open: false, loteamento: null });
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const handleDeleteLoteamento = async () => {
    if (!deleteModal.loteamento) return;
    
    setDeleting(true);
    const token = localStorage.getItem('adminToken');
    
    try {
      const response = await fetch(import.meta.env.BASE_URL + `api/loteamentos/${deleteModal.loteamento.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao deletar loteamento');
      }
      
      // Remove from list
      setLoteamentos(prev => prev.filter(l => l.id !== deleteModal.loteamento.id));
      setDeleteModal({ open: false, loteamento: null });
    } catch (err) {
      console.error('Error deleting loteamento:', err);
      alert('Erro ao deletar loteamento. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    fetch(import.meta.env.BASE_URL + 'api/loteamentos', {
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
            fetch(import.meta.env.BASE_URL + `api/loteamentos/${loteamento.id}/lotes`).then(res => res.json())
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card p-6 rounded-[2rem] relative overflow-hidden group/stat hover:bg-white/[0.08] transition-all duration-500 shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover/stat:bg-blue-500/20 transition-colors" />
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)] group-hover/stat:scale-110 transition-transform">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
            <div>
               <h4 className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-bold">Lotes Totais</h4>
               <p className="text-3xl font-bold text-white font-heading">{stats.totalLotes}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">Cadastrados no sistema</span>
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-card p-6 rounded-[2rem] relative overflow-hidden group/stat hover:bg-white/[0.08] transition-all duration-500 shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover/stat:bg-emerald-500/20 transition-colors" />
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)] group-hover/stat:scale-110 transition-transform">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
               <h4 className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-bold">Disponíveis</h4>
               <p className="text-3xl font-bold text-emerald-400 font-heading">{stats.disponiveis}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">Prontos para venda</span>
            <div className="w-8 h-8 rounded-full bg-emerald-500/5 flex items-center justify-center">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass-card p-6 rounded-[2rem] relative overflow-hidden group/stat hover:bg-white/[0.08] transition-all duration-500 shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover/stat:bg-amber-500/20 transition-colors" />
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.15)] group-hover/stat:scale-110 transition-transform">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
            <div>
               <h4 className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-bold">Reservados</h4>
               <p className="text-3xl font-bold text-amber-400 font-heading">{stats.reservados}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">Em negociação aberta</span>
            <div className="w-8 h-8 rounded-full bg-amber-500/5 flex items-center justify-center">
               <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="glass-card p-6 rounded-[2rem] relative overflow-hidden group/stat hover:bg-white/[0.08] transition-all duration-500 shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover/stat:bg-purple-500/20 transition-colors" />
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)] group-hover/stat:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <div>
               <h4 className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-bold">Receita Estimada</h4>
               <p className="text-3xl font-bold text-purple-400 font-heading">
                {stats.receita > 0 
                  ? stats.receita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
                  : 'R$ 0'
                }
               </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">Vendas concretizadas</span>
            <div className="w-8 h-8 rounded-full bg-purple-500/5 flex items-center justify-center">
               <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            </div>
          </div>
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
              className="relative group/card"
            >
              <Link
                to={`/admin/loteamento/${loteamento.id}`}
                className="block bg-white/5 rounded-2xl border border-white/10 overflow-hidden hover:bg-white/10 transition-all hover:border-emerald-500/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]"
              >
                <div className="aspect-video w-full bg-neutral-900 relative overflow-hidden">
                  {loteamento.imageUrl ? (
                    loteamento.imageUrl.toLowerCase().endsWith('.pdf') ? (
                      <PdfThumbnail url={resolveUrl(loteamento.imageUrl)} alt={loteamento.name} />
                    ) : (
                      <img
                        src={resolveUrl(loteamento.imageUrl)}
                        alt={loteamento.name}
                        className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500 opacity-80 group-hover/card:opacity-100 mix-blend-screen"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600">
                      <Map className="w-12 h-12 opacity-50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent opacity-60" />
                </div>
                <div className="p-5 relative">
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover/card:text-emerald-400 transition-colors">{loteamento.name}</h3>
                  <div className="flex items-center text-sm text-neutral-400 gap-2 font-mono">
                    <Calendar className="w-4 h-4" />
                    {new Date(loteamento.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
              
              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeleteModal({ open: true, loteamento });
                }}
                className="absolute top-3 right-3 p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover/card:opacity-100 transition-all shadow-lg z-10"
                title="Deletar loteamento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !deleting && setDeleteModal({ open: false, loteamento: null })}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Deletar Loteamento</h3>
                  <p className="text-neutral-400 text-sm">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                <p className="text-red-300 text-sm">
                  <strong>Atenção:</strong> Você perderá todos os dados deste loteamento:
                </p>
                <ul className="text-red-300/80 text-sm mt-2 ml-4 list-disc space-y-1">
                  <li>Todos os lotes cadastrados</li>
                  <li>Parcelas e pagamentos registrados</li>
                  <li>Comissões de corretores</li>
                  <li>Histórico financeiro</li>
                </ul>
              </div>
              
              <p className="text-white mb-6">
                Tem certeza que deseja deletar <strong className="text-red-400">{deleteModal.loteamento?.name}</strong>?
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal({ open: false, loteamento: null })}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteLoteamento}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deletando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Deletar
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
