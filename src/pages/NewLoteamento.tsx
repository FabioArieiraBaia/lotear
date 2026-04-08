import React, { useState, useEffect } from 'react';
import { resolveUrl } from '../utils/url';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Loader2, ArrowLeft, Building2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function NewLoteamento() {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const isPdfFile = selected.type === 'application/pdf' || selected.name.toLowerCase().endsWith('.pdf');
      setIsPdf(isPdfFile);

      if (isPdfFile) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
          try {
            const pdf = await pdfjs.getDocument(resolveUrl(typedarray)).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.8 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (context) {
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              await page.render({ canvasContext: context, viewport, canvas } as any).promise;
              setPreview(canvas.toDataURL());
            }
          } catch (err) {
            console.error("Error generating PDF preview:", err);
          }
        };
        reader.readAsArrayBuffer(selected);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selected);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !file) {
      setError("Preencha o nome e selecione um arquivo.");
      return;
    }

    setLoading(true);
    setError(null);

    const token = localStorage.getItem('adminToken');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('image', file);

      const response = await fetch(import.meta.env.BASE_URL + 'api/loteamentos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('adminToken');
          navigate('/admin/login');
          return;
        }
        const errText = await response.text();
        throw new Error(`Erro do servidor: ${errText}`);
      }

      const data = await response.json();
      navigate(`/admin/loteamento/${data.id}`);
    } catch (err: any) {
      console.error("Error creating loteamento:", err);
      setError(err.message || "Ocorreu um erro ao processar a planta.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black font-sans text-white p-6 md:p-12 overflow-x-hidden relative">
      {/* Background Decorative Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Top Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-12"
        >
          <Link to="/admin" className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-neutral-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all group font-bold text-sm">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Voltar ao Painel
          </Link>
        </motion.div>

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center md:text-left"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
            <Sparkles className="w-3 h-3 fill-emerald-400" />
            SaaS Engine Modernization
          </div>
          <h1 className="text-5xl md:text-6xl font-black font-heading tracking-tighter leading-none mb-4 italic uppercase">
            Novo <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500 italic">Empreendimento</span>
          </h1>
          <p className="text-neutral-500 text-lg font-medium max-w-xl">
            Configure os parâmetros geodata e masterplan para iniciar a gestão inteligente de vendas.
          </p>
        </motion.div>

        {/* Main Form Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle line decoration */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-3xl mb-10 flex items-center gap-4 text-sm font-bold uppercase tracking-widest"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Input Name */}
            <div className="space-y-3">
              <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-[0.4em] px-1">
                Identificação do Projeto
              </label>
              <div className="relative group">
                <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-[2rem] pl-16 pr-8 py-6 text-white text-xl font-bold placeholder-neutral-800 focus:outline-none focus:border-emerald-500 focus:bg-white/[0.05] transition-all"
                  placeholder="Ex: Condomínio Royal Sunset"
                  required
                />
              </div>
            </div>

            {/* File Upload Area */}
            <div className="space-y-3">
              <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-[0.4em] px-1">
                Visualização de Engenharia (Planta PDF/IMG)
              </label>

              <div className={`relative mt-2 border-2 border-dashed rounded-[3rem] transition-all overflow-hidden min-h-[340px] flex flex-col items-center justify-center ${preview ? 'border-emerald-500/30' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'} group`}>
                <AnimatePresence mode="wait">
                  {preview ? (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute inset-0 w-full h-full flex flex-col"
                    >
                      <div className="flex-1 overflow-hidden p-6">
                        <img src={preview} alt="Masterplan Preview" className="w-full h-full object-contain rounded-2xl grayscale group-hover:grayscale-0 transition-all duration-700" />
                      </div>

                      {/* Meta Information Overlay */}
                      <div className="p-6 bg-black/60 backdrop-blur-xl border-t border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">{isPdf ? 'Documento PDF Digitalizado' : 'Mapa de Pixels Detectado'}</p>
                            <p className="text-xs font-bold text-neutral-400 truncate max-w-[200px]">{file?.name}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => { setPreview(null); setFile(null); }} className="text-[10px] font-black uppercase text-red-400 hover:text-white transition-colors border-b border-red-400/20">Descartar</button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center p-12 space-y-6"
                    >
                      <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 group-hover:border-emerald-500/30 transition-all duration-500 relative">
                        <div className="absolute inset-0 bg-emerald-500/20 blur-2xl opacity-0 group-hover:opacity-40 transition-opacity" />
                        <UploadCloud className="w-10 h-10 text-neutral-700 group-hover:text-emerald-500 relative z-10" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xl font-bold text-white tracking-tight italic">Arraste a planta para digitalizar</p>
                        <p className="text-neutral-600 text-[10px] font-bold uppercase tracking-[0.2em]">Formatos Aceitos: PDF de Engenharia ou Imagens (Máx 20MB)</p>
                      </div>
                      <div className="inline-block px-6 py-2 rounded-full border border-white/5 bg-white/5 text-[9px] font-black uppercase tracking-widest text-neutral-400 group-hover:border-emerald-500/20 group-hover:text-emerald-500 transition-all">
                        Clique para selecionar arquivo
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading || !file || !name}
                className="relative w-full h-20 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-600 text-black font-black uppercase tracking-[0.3em] text-xs rounded-[2rem] transition-all shadow-[0_20px_50px_rgba(16,185,129,0.25)] group active:scale-[0.98] overflow-hidden"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-4">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Processando Dados Geográficos...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <UploadCloud className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                    Finalizar Upload do Masterplan
                  </div>
                )}
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-[85%] transition-transform duration-500" />
              </button>
            </div>
          </form>
        </motion.div>

        {/* Info Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center text-neutral-600 text-[10px] font-bold uppercase tracking-[0.5em]"
        >
          Sistema de Digitalização Autônomo • LotearPro Advanced
        </motion.p>
      </div>
    </div>
  );
}
