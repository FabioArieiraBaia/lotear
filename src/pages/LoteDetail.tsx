import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { resolveUrl } from '../utils/url';
import { 
  ArrowLeft, MapPin, Maximize, Target, Building, 
  ImageIcon, MonitorPlay, MessageCircle, Zap, Shield, 
  CheckCircle2, Loader2, Globe, Clock, ChevronRight, X, Eye,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lote, setLote] = useState<any>(null);
  const [loteamento, setLoteamento] = useState<any>(null);
  const [midias, setMidias] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeMedia, setActiveMedia] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setActiveMedia(0);
  }, [midias]);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const [loteRes, midiaRes, configRes] = await Promise.all([
          fetch(import.meta.env.BASE_URL + `api/lotes/${id}`),
          fetch(import.meta.env.BASE_URL + `api/lotes/${id}/midia`),
          fetch(import.meta.env.BASE_URL + 'api/configuracoes')
        ]);
        
        if (loteRes.ok) {
           const l = await loteRes.json();
           setLote(l);
           const ltRes = await fetch(import.meta.env.BASE_URL + `api/loteamentos/${l.loteamentoId}`);
           if (ltRes.ok) setLoteamento(await ltRes.json());
        }
        if (midiaRes.ok) setMidias(await midiaRes.json());
        if (configRes.ok) setConfig(await configRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleWhatsApp = () => {
    const phone = config.whatsapp || '5500000000000';
    const message = encodeURIComponent(`Olá, tenho interesse no lote ${lote.name} do empreendimento ${loteamento.name}. Poderia me enviar mais informações?`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-emerald-500/50 text-xs font-black uppercase tracking-widest animate-pulse">Carregando Detalhes</p>
      </div>
    );
  }

  if (!lote) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white gap-6">
        <Target className="w-16 h-16 text-neutral-800" />
        <h2 className="text-2xl font-bold font-heading">Lote não encontrado</h2>
        <Link to="/" className="px-8 py-3 bg-white/5 border border-white/10 rounded-full hover:bg-emerald-500 hover:text-black transition-all">Voltar ao Início</Link>
      </div>
    );
  }

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30">
      
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 blur-[150px] rounded-full" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[150px] rounded-full" />
      </div>

      {/* HEADER HUD */}
      <header className="fixed top-0 inset-x-0 z-[100] p-6 lg:p-10 pointer-events-none">
         <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate(-1)}
              className="pointer-events-auto flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 backdrop-blur-3xl border border-white/10 text-white hover:bg-emerald-500 hover:text-black transition-all hover:scale-110 shadow-2xl"
            >
               <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="pointer-events-auto hidden md:flex items-center gap-4 bg-white/5 backdrop-blur-3xl border border-white/10 px-8 py-4 rounded-3xl shadow-2xl">
               <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-500" />
               </div>
               <span className="text-[10px] uppercase font-black tracking-[0.4em] text-neutral-400">Verificação de Unidade Ativa</span>
            </div>
         </div>
      </header>

      <main className="relative z-10 pt-32 pb-20 px-6 lg:px-20 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
         
         {/* LEFT COLLUMN: MEDIA VISUALIZER */}
         <div className="lg:col-span-7 space-y-8">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="relative aspect-[16/10] bg-neutral-900 rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] sidebar-glow group cursor-pointer"
               onClick={() => { if (midias.length > 0) setLightboxIndex(activeMedia); }}
            >
               <AnimatePresence mode="wait">
                  {midias.length > 0 ? (
                    midias[activeMedia].type === 'image' ? (
                       <motion.img 
                          key={midias[activeMedia].id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          src={resolveUrl(midias[activeMedia].url)} 
                          className="w-full h-full object-cover" 
                       />
                    ) : (
                       <motion.div 
                          key={midias[activeMedia].id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="w-full h-full"
                       >
                          <iframe 
                            src={`https://www.youtube.com/embed/${getYoutubeId(midias[activeMedia].url)}?autoplay=0&controls=1&rel=0&modestbranding=1`}
                            className="w-full h-full"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                       </motion.div>
                    )
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-neutral-800">
                       <ImageIcon className="w-20 h-20 mb-4 opacity-20" />
                       <span className="text-xs font-black uppercase tracking-widest">Sem Mídia Registrada</span>
                    </div>
                  )}
               </AnimatePresence>
                {midias.length > 0 && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                     <Maximize className="w-8 h-8 text-white" />
                  </div>
                )}
            </motion.div>

            {/* THUMBNAILS BAR */}
            {midias.length > 1 && (
               <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                  {midias.map((m, idx) => (
                     <button 
                        key={m.id}
                        onClick={() => setActiveMedia(idx)}
                        className={`flex-shrink-0 w-24 h-16 rounded-xl border-2 transition-all overflow-hidden ${activeMedia === idx ? 'border-emerald-500 scale-105' : 'border-white/5 opacity-40 hover:opacity-100'}`}
                     >
                        {m.type === 'image' ? (
                           <img src={resolveUrl(m.url)} className="w-full h-full object-cover" />
                        ) : (
                           <div className="w-full h-full bg-red-500/20 flex items-center justify-center">
                              <MonitorPlay className="w-6 h-6 text-red-500" />
                           </div>
                        )}
                     </button>
                  ))}
               </div>
            )}

            {/* DESCRIPTION SECTION */}
            <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-[3.5rem] p-12 space-y-8">
               <h3 className="text-2xl font-black italic uppercase tracking-tighter">Memorial <span className="text-emerald-500">Descritivo</span></h3>
               <p className="text-neutral-400 text-lg leading-relaxed font-medium">
                  {lote.notes || "Nenhuma descrição adicional cadastrada para este lote."}
               </p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="flex items-center gap-4 text-neutral-500">
                     <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                     <span className="text-sm font-bold uppercase tracking-widest font-mono">Topografia Plana</span>
                  </div>
                  <div className="flex items-center gap-4 text-neutral-500">
                     <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                     <span className="text-sm font-bold uppercase tracking-widest font-mono">Infraestrutura Completa</span>
                  </div>
                  <div className="flex items-center gap-4 text-neutral-500">
                     <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                     <span className="text-sm font-bold uppercase tracking-widest font-mono">Matrícula Individualizada</span>
                  </div>
                  <div className="flex items-center gap-4 text-neutral-500">
                     <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                     <span className="text-sm font-bold uppercase tracking-widest font-mono">Monitoramento 24h</span>
                  </div>
               </div>
            </div>
         </div>

         {/* RIGHT COLLUMN: SPECIFICATIONS & CRM */}
         <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-32 h-fit">
            <motion.div 
               initial={{ opacity: 0, x: 50 }}
               animate={{ opacity: 1, x: 0 }}
               className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3.5rem] p-12 shadow-2xl sidebar-glow relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 p-12 text-emerald-500/5 rotate-12">
                  <Zap className="w-40 h-40" />
               </div>

               <div className="relative z-10 space-y-10">
                  <header>
                     <div className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-xl border mb-6 ${
                        lote.status === 'Disponível' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-500'
                     }`}>
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${lote.status === 'Disponível' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{lote.status}</span>
                     </div>
                     <h2 className="text-6xl font-black italic uppercase tracking-tighter leading-none mb-4">{lote.name}</h2>
                     <p className="text-white/40 text-xs font-black uppercase tracking-[0.4em] mb-12 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> {loteamento?.name}
                     </p>
                  </header>

                  <div className="grid grid-cols-2 gap-6">
                     <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 group hover:bg-emerald-500/5 transition-colors">
                        <Maximize className="w-5 h-5 text-emerald-500 mb-4" />
                        <p className="text-[10px] text-neutral-600 font-black uppercase tracking-widest mb-1">Área Total</p>
                        <p className="text-3xl font-black italic tracking-tighter">{lote.area} <span className="text-xs text-neutral-500 not-italic">m²</span></p>
                     </div>
                     <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5">
                        <Globe className="w-5 h-5 text-emerald-500 mb-4" />
                        <p className="text-[10px] text-neutral-600 font-black uppercase tracking-widest mb-1">Tipo de Lote</p>
                        <p className="text-xl font-bold uppercase tracking-tight">Residencial</p>
                     </div>
                  </div>

                  <div className="space-y-4 pt-6">
                     <button 
                        onClick={handleWhatsApp}
                        className="w-full py-7 bg-emerald-500 text-black font-black uppercase text-xs tracking-[0.3em] rounded-[2rem] hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-emerald-500/20 flex items-center justify-center gap-3 group"
                     >
                        <MessageCircle className="w-5 h-5 fill-black group-hover:rotate-12 transition-transform" />
                        Quero Saber Mais
                     </button>
                     <p className="text-center text-[9px] text-neutral-600 font-black uppercase tracking-widest">Atendimento Digital Imediato</p>
                  </div>

                  <div className="pt-8 border-t border-white/5 flex items-center justify-around">
                     <div className="text-center space-y-2">
                        <Clock className="w-4 h-4 text-emerald-500/40 mx-auto" />
                        <p className="text-[8px] text-neutral-600 uppercase font-black">Última Ref.</p>
                        <p className="text-[10px] text-white/50 font-bold">Hoje</p>
                     </div>
                     <div className="w-px h-8 bg-white/5" />
                     <div className="text-center space-y-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500/40 mx-auto" />
                        <p className="text-[8px] text-neutral-600 uppercase font-black">Disponib.</p>
                        <p className="text-[10px] text-white/50 font-bold">Realtime</p>
                     </div>
                  </div>
               </div>
            </motion.div>

            {/* CONTEXT CARDS */}
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-6 rounded-[2rem]">
               <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-blue-500" />
               </div>
               <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-white mb-0.5 italic">Geofencing Ativado</h4>
                  <p className="text-[9px] text-neutral-500 uppercase font-bold tracking-widest">Coordenadas Verificadas</p>
               </div>
               <ChevronRight className="w-4 h-4 text-neutral-500 ml-auto" />
            </div>
         </div>
      </main>

      {/* LIGHTBOX MODAL */}
      <AnimatePresence>
        {lightboxIndex !== null && midias[lightboxIndex] && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/95 backdrop-blur-xl" 
              onClick={() => setLightboxIndex(null)} 
            />
            
            <button 
              onClick={() => setLightboxIndex(null)} 
              className="absolute top-6 right-6 z-10 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all flex items-center justify-center border border-white/10 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            {midias.length > 1 && (
              <>
                <button 
                  onClick={() => setLightboxIndex(prev => prev !== null ? (prev - 1 + midias.length) % midias.length : null)} 
                  className="absolute left-6 z-10 w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all flex items-center justify-center border border-white/10 cursor-pointer"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setLightboxIndex(prev => prev !== null ? (prev + 1) % midias.length : null)} 
                  className="absolute right-6 z-10 w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all flex items-center justify-center border border-white/10 cursor-pointer"
                >
                  <ArrowRight className="w-6 h-6" />
                </button>
              </>
            )}

            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-5xl w-full aspect-[16/10] bg-neutral-950 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl z-20 flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {midias[lightboxIndex].type === 'image' ? (
                <img 
                  src={resolveUrl(midias[lightboxIndex].url)} 
                  className="w-full h-full object-contain" 
                  alt="Lote" 
                />
              ) : (
                <iframe 
                  src={`https://www.youtube.com/embed/${getYoutubeId(midias[lightboxIndex].url)}?autoplay=1&controls=1&rel=0`}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              )}
              
              {/* Media Info / Counter */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-xs font-bold text-neutral-400">
                {lightboxIndex + 1} / {midias.length}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
