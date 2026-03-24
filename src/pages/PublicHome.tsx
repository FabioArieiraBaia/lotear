import React, { useEffect, useState } from 'react';
import { resolveUrl } from '../utils/url';
import { Link } from 'react-router-dom';
import { 
  Map, Calendar, Loader2, ArrowRight, MapPin, MessageCircle, 
  ChevronLeft, ChevronRight, Layout, Zap, ShieldCheck, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function PublicHome() {
  const [loteamentos, setLoteamentos] = useState<any[]>([]);
  const [lotesCounts, setLotesCounts] = useState<Record<string, { total: number; disponiveis: number; vendidos: number; reservados: number }>>({});
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [allLotes, setAllLotes] = useState<any[]>([]);

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'api/loteamentos')
      .then(res => res.json())
      .then(data => {
        setLoteamentos(data);
        setLoading(false);
        
        data.forEach((loteamento: any) => {
          fetch(import.meta.env.BASE_URL + `api/loteamentos/${loteamento.id}/lotes`)
            .then(res => res.json())
            .then(lotes => {
              const counts = {
                total: lotes.length,
                disponiveis: lotes.filter((l: any) => l.status === 'Disponível').length,
                vendidos: lotes.filter((l: any) => l.status === 'Vendido').length,
                reservados: lotes.filter((l: any) => l.status === 'Reservado').length
              };
              setLotesCounts(prev => ({ ...prev, [loteamento.id]: counts }));
              const lotesWithImages = lotes.filter((l: any) => l.photoUrl);
              setAllLotes(prev => [...prev, ...lotesWithImages.map((l: any) => ({ ...l, loteamentoName: loteamento.name, loteamentoId: loteamento.id }))]);
            })
            .catch(err => console.error("Error fetching lotes:", err));
        });
      })
      .catch(err => {
        console.error("Error fetching loteamentos:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (allLotes.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % allLotes.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [allLotes.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
             <Globe className="w-8 h-8 text-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050505] font-sans selection:bg-emerald-500/30">
      {/* Background Map Cinematic */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none grayscale">
        <MapContainer center={[-15.78, -47.92]} zoom={5} zoomControl={false} attributionControl={false} className="w-full h-full bg-black">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        </MapContainer>
        <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black z-10" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto p-6 md:p-12 min-h-screen flex flex-col">
        {/* Glow Effects */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none" />

        {/* Hero Section */}
        <header className="flex flex-col md:flex-row items-center justify-between mb-20">
           <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="mb-8 md:mb-0">
              <div className="flex items-center gap-3 mb-6 bg-white/5 border border-white/10 px-4 py-2 rounded-full w-fit backdrop-blur-xl">
                 <Zap className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                 <span className="text-[10px] text-white font-black uppercase tracking-[0.3em]">Empreendimentos Exclusivos</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 font-heading tracking-tight leading-[1.1]">
                Encontre o seu <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-cyan-500">Espaço Ideal</span>
              </h1>
              <p className="text-neutral-400 text-lg md:text-xl max-w-xl leading-relaxed font-medium">
                Sistemas de geoprocessamento em tempo real para visualização de plantas e aquisição inteligente de lotes.
              </p>
           </motion.div>

           <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative group">
              <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative w-72 h-72 md:w-96 md:h-96 rounded-[3rem] bg-neutral-900 border border-white/10 overflow-hidden shadow-2xl sidebar-glow">
                 <AnimatePresence mode="wait">
                   {allLotes.length > 0 ? (
                     <motion.img 
                        key={currentSlide} 
                        initial={{ opacity: 0, scale: 1.1 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0 }} 
                        transition={{ duration: 1 }}
                        src={allLotes[currentSlide].photoUrl} 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                        alt="Background"
                     />
                   ) : (
                     <div className="flex items-center justify-center h-full">
                        <Map className="w-16 h-16 text-neutral-800" />
                     </div>
                   )}
                 </AnimatePresence>
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                 <div className="absolute bottom-8 left-8">
                    <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest mb-2">Visão Aérea</p>
                    <div className="flex items-center gap-2">
                       <ShieldCheck className="w-5 h-5 text-emerald-500" />
                       <span className="text-white font-bold text-lg">100% Verificado</span>
                    </div>
                 </div>
              </div>
           </motion.div>
        </header>

        {/* Loteamentos Cards */}
        <section className="relative">
           <div className="flex items-end justify-between mb-12">
              <div>
                 <h2 className="text-3xl font-bold text-white font-heading tracking-tight">Empreendimentos <span className="text-emerald-500">Disponíveis</span></h2>
                 <p className="text-neutral-500 font-medium">Explore as plantas interativas e escolha seu lote</p>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/50 to-transparent mx-8 mb-4 hidden lg:block" />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {loteamentos.map((lot, idx) => (
                <motion.div 
                  key={lot.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Link
                    to={`/loteamento/${lot.id}`}
                    className="group block bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:bg-white/[0.06] hover:border-emerald-500/30 hover:shadow-[0_0_50px_rgba(16,185,129,0.15)] relative sidebar-glow"
                  >
                    <div className="aspect-[16/10] relative overflow-hidden bg-neutral-900">
                       {lot.imageUrl ? (
                         <img src={resolveUrl(lot.imageUrl)} className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700 opacity-60 group-hover:opacity-100" alt={lot.name} />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-neutral-800"><Map className="w-12 h-12" /></div>
                       )}
                       <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                       <div className="absolute top-6 left-6 flex gap-2">
                          <span className="bg-emerald-500 text-black px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl">Ativo</span>
                       </div>
                    </div>

                    <div className="p-8">
                       <div className="flex justify-between items-start mb-6">
                          <div>
                             <h3 className="text-2xl font-bold text-white font-heading tracking-tight mb-1 group-hover:text-emerald-400 transition-colors uppercase">{lot.name}</h3>
                             <div className="flex items-center gap-2 text-neutral-500">
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold uppercase tracking-widest">Planta Interativa</span>
                             </div>
                          </div>
                          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 transition-transform group-hover:rotate-45">
                             <ArrowRight className="w-6 h-6 text-emerald-500" />
                          </div>
                       </div>

                       {lotesCounts[lot.id] && (
                          <div className="grid grid-cols-2 gap-3 mb-8">
                             <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-3">
                                <p className="text-[9px] text-emerald-500/70 font-black uppercase tracking-widest mb-1.5">Disponíveis</p>
                                <p className="text-xl font-bold text-white font-heading leading-none">{lotesCounts[lot.id].disponiveis}</p>
                             </div>
                             <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                                <p className="text-[9px] text-neutral-600 font-black uppercase tracking-widest mb-1.5">Unidades Totais</p>
                                <p className="text-xl font-bold text-white font-heading leading-none">{lotesCounts[lot.id].total}</p>
                             </div>
                          </div>
                       )}

                       <div className="flex items-center justify-between text-[10px] text-neutral-600 font-black uppercase tracking-[0.2em] pt-6 border-t border-white/5">
                          <span>{new Date(lot.createdAt).toLocaleDateString()}</span>
                          <span className="text-emerald-500/50">Explorar Unidades</span>
                       </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
           </div>
        </section>

        {/* Floating Call to Action */}
        <div className="mt-auto pt-20 pb-10 flex flex-col items-center">
           <p className="text-neutral-500 text-sm font-bold uppercase tracking-[0.4em] mb-4">Interessado em negociar?</p>
           <a 
              href="https://wa.me/5500000000000" 
              className="px-12 py-5 bg-white text-black font-black uppercase text-xs tracking-[0.3em] rounded-full hover:bg-emerald-500 hover:text-black hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] flex items-center gap-4"
           >
              <MessageCircle className="w-5 h-5" /> Falar com Especialista
           </a>
        </div>
      </div>
    </div>
  );
}
