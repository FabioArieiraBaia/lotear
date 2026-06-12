import React, { useEffect, useState } from 'react';
import { resolveUrl } from '../utils/url';
import { Link } from 'react-router-dom';
import {
  Map, Calendar, Loader2, ArrowRight, MapPin, MessageCircle,
  ChevronLeft, ChevronRight, Layout, Zap, ShieldCheck, Globe,
  Sparkles, TrendingUp, Building, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import PdfThumbnail from '../components/PdfThumbnail';

export default function PublicHome() {
  const [loteamentos, setLoteamentos] = useState<any[]>([]);
  const [lotesCounts, setLotesCounts] = useState<Record<string, { total: number; disponiveis: number; vendidos: number; reservados: number }>>({});
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [allLotes, setAllLotes] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({});

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

    fetch(import.meta.env.BASE_URL + 'api/configuracoes')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error("Error fetching config:", err));
  }, []);

  useEffect(() => {
    if (allLotes.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % allLotes.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [allLotes.length]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-6">
        <div className="relative">
          <div className="w-24 h-24 border border-white/5 rounded-full bg-emerald-500/5 flex items-center justify-center">
             <div className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
             <Globe className="w-6 h-6 text-emerald-500 animate-pulse" />
          </div>
        </div>
        <p className="text-emerald-500/50 text-[10px] font-black uppercase tracking-[0.4em] font-mono">Synchronizing Global Inventory</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#020202] font-sans selection:bg-emerald-500/30">

      {/* BACKGROUND VIDEO OR MAP (YOUTUBE BG CONFIGURADO) */}
      {(() => {
        const getYoutubeId = (url: string) => {
          if (!url) return null;
          const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
          const match = url.match(regExp);
          return (match && match[2].length === 11) ? match[2] : null;
        };
        const videoId = getYoutubeId(config.hero_video_url);

        if (videoId) {
          return (
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20 grayscale brightness-75 scale-105">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&showinfo=0&rel=0&iv_load_policy=3&playsinline=1`}
                className="w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                title="Hero Background Video"
              ></iframe>
              <div className="absolute inset-0 bg-black/60" />
            </div>
          );
        }

        return (
          /* BACKGROUND MAP (DIMMED) (FALLBACK) */
          <div className="absolute inset-0 z-1 opacity-[0.08] pointer-events-none grayscale brightness-50">
            <MapContainer center={[-15.78, -47.92]} zoom={5} zoomControl={false} attributionControl={false} className="w-full h-full bg-black">
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            </MapContainer>
            <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
          </div>
        );
      })()}

      {/* BACKGROUND AMBIENT LAYER */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-emerald-500/10 blur-[180px] rounded-full opacity-40 animate-pulse" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-blue-500/10 blur-[150px] rounded-full opacity-30" />
         <div className="absolute top-[40%] left-[60%] w-[400px] h-[400px] bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto p-8 md:p-16 min-h-screen flex flex-col">

        {/* HERO SECTION 2027 */}
        <section className="flex flex-col lg:flex-row items-center justify-between pt-6 md:pt-12 pb-16 md:pb-32 gap-10 md:gap-20">
           <motion.div
             initial={{ opacity: 0, y: 50 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] }}
             className="flex-1 w-full text-center lg:text-left"
           >
              <div className="inline-flex items-center gap-3 mb-6 md:mb-8 bg-white/5 border border-white/10 px-4 py-2 md:px-6 md:py-2.5 rounded-full backdrop-blur-3xl mx-auto lg:mx-0">
                 <Sparkles className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                 <span className="text-[8px] md:text-[10px] text-white font-black uppercase tracking-[0.3em] md:tracking-[0.4em]">Próxima Geração de Loteamentos</span>
              </div>

              <h1 className="text-4xl md:text-7xl lg:text-9xl font-bold text-white mb-6 md:mb-8 font-heading tracking-tighter leading-[0.95] md:leading-[0.9] bg-gradient-to-b from-white via-white to-white/30 bg-clip-text text-transparent">
                Viva sua <br className="hidden md:inline" />
                <span className="text-emerald-500 italic">Liberdade.</span>
              </h1>

              <p className="text-neutral-400 text-base md:text-xl lg:text-2xl max-w-xl leading-relaxed font-medium mb-8 md:mb-12 mx-auto lg:mx-0">
                Experiência imersiva em masterplans digitais. Onde seus sonhos encontram o solo perfeito.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 md:gap-6 w-full">
                 <button 
                    onClick={() => document.getElementById('inventory')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full sm:w-auto px-8 py-5 md:px-12 md:py-6 bg-emerald-500 text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl md:rounded-3xl hover:bg-white hover:scale-105 transition-all shadow-[0_20px_50px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3 group"
                  >
                    Explorar Agora <ArrowRight className="w-4 h-4 md:w-5 h-5 group-hover:translate-x-1 transition-transform" />
                 </button>
                 <div className="flex items-center gap-4 md:gap-6 px-6 py-3.5 md:px-8 md:py-4 bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl backdrop-blur-xl w-full sm:w-auto justify-center">
                    <div className="flex -space-x-2.5 md:-space-x-3">
                       {[1,2,3].map(i => (
                         <div key={i} className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-black bg-neutral-800 flex items-center justify-center text-[9px] md:text-[10px] font-bold text-white">
                            +
                         </div>
                       ))}
                    </div>
                    <p className="text-[9px] md:text-xs text-neutral-400 font-bold uppercase tracking-widest"><span className="text-white">+500</span> Vizinhos felizes</p>
                 </div>
              </div>
           </motion.div>

           {/* VISUAL SHOWCASE */}
           <motion.div
             initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
             animate={{ opacity: 1, scale: 1, rotate: 0 }}
             transition={{ duration: 1.2, ease: [0.19, 1, 0.22, 1] }}
             className="relative w-full max-w-[500px] aspect-square lg:aspect-[4/5]"
           >
              <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full mix-blend-screen animate-pulse" />
              <div className="relative h-full w-full rounded-[4rem] overflow-hidden border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] sidebar-glow group">
                 <AnimatePresence mode="wait">
                    {allLotes.length > 0 ? (
                      <motion.img
                        key={currentSlide}
                        initial={{ opacity: 0, scale: 1.2, filter: 'blur(20px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
                        transition={{ duration: 1.5, ease: [0.19, 1, 0.22, 1] }}
                        src={resolveUrl(allLotes[currentSlide].photoUrl)}
                        className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-1000"
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                         <Building className="w-20 h-20 text-neutral-800" />
                      </div>
                    )}
                 </AnimatePresence>

                 {/* HUD OVERLAY ON IMAGE */}
                 <div className="absolute inset-x-0 bottom-0 p-10 bg-gradient-to-t from-black via-black/40 to-transparent">
                    <div className="flex items-center gap-3 mb-4">
                       <div className="px-3 py-1 rounded-lg bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest">
                          Destaque
                       </div>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-2 font-heading tracking-tight">
                       {allLotes[currentSlide]?.loteName || 'Carregando...'}
                    </h3>
                    <p className="text-white/50 text-[11px] uppercase font-black tracking-widest mb-6">Em {allLotes[currentSlide]?.loteamentoName}</p>

                    <Link
                      to={`/loteamento/${allLotes[currentSlide]?.loteamentoId}`}
                      className="inline-flex items-center gap-3 text-emerald-400 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors"
                    >
                       Ver Mapa Dinâmico <ArrowUpRight className="w-4 h-4" />
                    </Link>
                 </div>
              </div>
           </motion.div>
        </section>

         <section id="inventory" className="relative pt-10 md:pt-20 w-full">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 md:mb-20 gap-6 md:gap-8 w-full">
               <div className="flex-1 min-w-0">
                  <h2 className="text-3xl md:text-5xl font-bold text-white font-heading tracking-tighter mb-3 md:mb-4 leading-tight md:leading-none break-words">
                     Empreendimentos <br className="hidden md:inline" /><span className="text-emerald-500">Exclusivos</span>
                  </h2>
                  <p className="text-neutral-500 font-medium text-sm md:text-lg max-w-md italic leading-relaxed">
                     Tecnologia avançada para você escolher onde construir sua história.
                  </p>
               </div>
               <div className="flex items-center gap-6 md:gap-12 text-[9px] md:text-[10px] text-white/30 uppercase font-black tracking-[0.2em] md:tracking-[0.4em] w-full md:w-auto justify-start md:justify-end">
                  <div className="flex flex-col items-start md:items-end">
                     <span>Total Lotes</span>
                     <span className="text-xl md:text-2xl text-white font-mono mt-1.5 md:mt-2">{loteamentos.length}</span>
                  </div>
                  <div className="w-px h-8 md:h-12 bg-white/10" />
                  <div className="flex flex-col items-start md:items-end">
                     <span>Disponíveis</span>
                     <span className="text-xl md:text-2xl text-emerald-500 font-mono mt-1.5 md:mt-2">{Object.values(lotesCounts).reduce((acc: number, c: any) => acc + (c.disponiveis || 0), 0)}</span>
                  </div>
               </div>
            </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {loteamentos.map((lot, idx) => (
                <motion.div
                  key={lot.id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.8 }}
                >
                  <Link
                    to={`/loteamento/${lot.id}`}
                    className="group flex flex-col h-full bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[3.5rem] overflow-hidden transition-all duration-700 hover:bg-white/[0.05] hover:border-emerald-500/20 hover:shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative"
                  >
                    <div className="aspect-[16/11] relative overflow-hidden bg-neutral-900 shadow-inner">
                       {lot.imageUrl ? (
                         lot.imageUrl.toLowerCase().endsWith('.pdf') ? (
                           <PdfThumbnail
                             url={resolveUrl(lot.imageUrl)}
                             alt={lot.name}
                             scale={1.0}
                             className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-[2000ms] opacity-60 group-hover:opacity-100"
                           />
                         ) : (
                           <img src={resolveUrl(lot.imageUrl)} className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-[2000ms] opacity-60 group-hover:opacity-100" alt={lot.name} />
                         )
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-neutral-800"><Map className="w-16 h-16 opacity-20" /></div>
                       )}

                       <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-80" />

                       {/* BADGE ON IMAGE */}
                       <div className="absolute bottom-6 right-8">
                          <div className="w-14 h-14 rounded-2xl bg-black/60 backdrop-blur-3xl border border-white/10 flex items-center justify-center text-emerald-500 shadow-2xl group-hover:rotate-12 transition-transform">
                             <ArrowUpRight className="w-7 h-7" />
                          </div>
                       </div>
                    </div>

                    <div className="p-10 flex flex-col flex-1">
                       <h3 className="text-3xl font-bold text-white font-heading tracking-tight mb-6 group-hover:text-emerald-400 transition-colors">{lot.name}</h3>

                       <div className="grid grid-cols-2 gap-4 mb-10">
                          <div className="bg-white/5 rounded-3xl p-6 border border-white/5 group-hover:bg-emerald-500/5 group-hover:border-emerald-500/10 transition-colors">
                             <p className="text-[9px] text-neutral-600 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                <MapPin className="w-3 h-3" /> Status
                             </p>
                             <p className="text-emerald-400 font-bold text-lg uppercase tracking-widest">Ativo</p>
                          </div>
                          <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                             <p className="text-[9px] text-neutral-600 font-black uppercase tracking-widest mb-2">Unidades</p>
                             <p className="text-white font-mono font-bold text-2xl">{lotesCounts[lot.id]?.disponiveis || 0}<span className="text-[10px] text-neutral-500 ml-1">/{lotesCounts[lot.id]?.total || 0}</span></p>
                          </div>
                       </div>

                       <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-8">
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                             <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Masterplan Digital</span>
                          </div>
                          <span className="text-white font-bold text-xs group-hover:translate-x-1 transition-transform">Explorar &rarr;</span>
                       </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
           </div>
        </section>

        {/* FOOTER CALL TO ACTION 2027 */}
        <section className="mt-20 md:mt-40 mb-10 md:mb-20 w-full">
           <div className="relative p-6 md:p-20 rounded-3xl md:rounded-[4rem] bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent border border-white/10 overflow-hidden text-center sidebar-glow">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
                 <h2 className="text-2xl md:text-5xl lg:text-6xl font-bold text-white font-heading tracking-tighter mb-6 md:mb-8 leading-tight md:leading-none">
                    Interessado em negociar <br className="hidden md:inline" />
                    <span className="text-emerald-500">direto da fonte?</span>
                 </h2>
                 <p className="text-neutral-400 text-sm md:text-lg mb-8 md:mb-12 font-medium leading-relaxed max-w-lg">
                    Nossos corretores estão prontos para oferecer condições exclusivas usando geoprocessamento inteligente.
                 </p>

                 <a
                    href={`https://wa.me/${config.whatsapp || '5500000000000'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-3 w-full md:w-auto px-8 py-5 md:px-16 md:py-7 bg-white text-black rounded-2xl md:rounded-full font-black uppercase text-xs tracking-[0.2em] md:tracking-[0.3em] hover:bg-emerald-500 hover:scale-105 active:scale-95 transition-all shadow-2xl"
                 >
                    <MessageCircle className="w-5 h-5 md:w-6 md:h-6 fill-black" /> Falar com Especialista
                 </a>
              </div>
           </div>
        </section>

      </div>
    </div>
  );
}
