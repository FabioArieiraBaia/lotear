import React, { useEffect, useState } from 'react';
import { resolveUrl } from '../utils/url';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, ImageOverlay, Polygon, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Loader2, ArrowLeft, Image as ImageIcon, MapPin, Maximize,
  Info, CheckCircle2, Navigation, X, MessageCircle, Phone,
  Clock, Shield, Sparkles, Zap, Globe, Target, MonitorPlay
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function MapEvents({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: () => onMapClick(),
  });
  return null;
}

const IMAGE_BOUNDS: L.LatLngBoundsExpression = [[0, 0], [1000, 1000]];

const mapCoordinates = (polygon: number[][]): L.LatLngExpression[] => {
  return polygon.map(([y, x]) => [1000 - y, x] as L.LatLngExpression);
};

function ReadOnlyPolygon({ lote, isActive, isHovered, onClick, onHover, onUnhover }: any) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Disponível': return '#10b981';
      case 'Vendido': return '#ef4444';
      case 'Reservado': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  const color = getStatusColor(lote.status);
  const highlighted = isActive || isHovered;
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  return (
    <Polygon
      positions={mapCoordinates(lote.polygon)}
      pathOptions={{
        color: highlighted ? '#ffffff' : color,
        fillColor: highlighted ? '#ffffff' : color,
        fillOpacity: highlighted ? 0.4 : 0.1,
        weight: highlighted ? 3 : 1,
        dashArray: highlighted ? undefined : '4, 4',
        className: 'transition-all duration-300 ease-in-out cursor-pointer outline-none'
      }}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e);
          onClick();
        },
        mouseover: isTouchDevice ? undefined : onHover,
        mouseout: isTouchDevice ? undefined : onUnhover
      }}
    />
  );
}

export default function PublicLoteamentoView() {
  const { id } = useParams<{ id: string }>();
  const [loteamento, setLoteamento] = useState<any>(null);
  const [lotes, setLotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLote, setActiveLote] = useState<any>(null);
  const [hoveredLote, setHoveredLote] = useState<any>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '' });
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [convertingPdf, setConvertingPdf] = useState(false);
  const [midias, setMidias] = useState<any[]>([]);
  const [loadingMidia, setLoadingMidia] = useState(false);
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'api/configuracoes')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const [loteamentoRes, lotesRes] = await Promise.all([
          fetch(import.meta.env.BASE_URL + `api/loteamentos/${id}`),
          fetch(import.meta.env.BASE_URL + `api/loteamentos/${id}/lotes`)
        ]);
        if (loteamentoRes.ok) setLoteamento(await loteamentoRes.json());
        if (lotesRes.ok) setLotes(await lotesRes.json());
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!loteamento?.imageUrl) return;
    if (loteamento.imageUrl.toLowerCase().endsWith('.pdf')) {
      const convertPdf = async () => {
        setConvertingPdf(true);
        let active = true;
        try {
          const loadingTask = pdfjs.getDocument(resolveUrl(loteamento.imageUrl));
          const pdf = await loadingTask.promise;
          if (!active) return;
          const page = await pdf.getPage(1);
          
          const isMobile = window.innerWidth < 768;
          const scale = isMobile ? 1.2 : 2.0;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport, canvas: canvas } as any).promise;
            if (active) setMapImageUrl(canvas.toDataURL('image/png'));
          }
        } catch (err) {
          console.error("Error converting PDF to image in public view:", err);
          // Fallback rendering
          try {
            const loadingTask = pdfjs.getDocument(resolveUrl(loteamento.imageUrl));
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (context) {
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              await page.render({ canvasContext: context, viewport, canvas } as any).promise;
              if (active) setMapImageUrl(canvas.toDataURL('image/png'));
            }
          } catch (fallbackErr) {
            console.error("Fallback PDF render in public view failed:", fallbackErr);
          }
        } finally {
          if (active) setConvertingPdf(false);
        }
      };
      convertPdf();
    } else {
      setMapImageUrl(loteamento.imageUrl);
    }
  }, [loteamento?.imageUrl]);

  // Fetch midias when activeLote or hoveredLote changes
  useEffect(() => {
    const loteId = activeLote?.id || hoveredLote?.id;
    if (!loteId) {
      setMidias([]);
      return;
    }
    (async () => {
      setLoadingMidia(true);
      try {
        const res = await fetch(import.meta.env.BASE_URL + `api/lotes/${loteId}/midia`);
        if (res.ok) setMidias(await res.json());
      } catch (err) { console.error(err); }
      finally { setLoadingMidia(false); }
    })();
  }, [activeLote?.id, hoveredLote?.id]);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLote) return;
    setSubmittingLead(true);
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loteamentoId: id,
          loteId: activeLote.id,
          ...leadForm
        })
      });
      if (res.ok) {
        setLeadSuccess(true);
        setTimeout(() => {
          setShowLeadModal(false);
          setLeadSuccess(false);
          setLeadForm({ name: '', email: '', phone: '' });
        }, 3000);
      }
    } catch (err) {
      console.error("Error submitting lead:", err);
    } finally {
      setSubmittingLead(false);
    }
  };

  if (loading || !loteamento || (loteamento.imageUrl?.toLowerCase().endsWith('.pdf') && convertingPdf)) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-950">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Target className="w-8 h-8 text-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const displayLote = hoveredLote || activeLote;

  const getStatusGradient = (status: string) => {
    switch (status) {
      case 'Disponível': return 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 text-emerald-400';
      case 'Vendido': return 'from-red-500/10 to-red-500/5 border-red-500/30 text-red-400';
      case 'Reservado': return 'from-amber-500/10 to-amber-500/5 border-amber-500/30 text-amber-400';
      default: return 'from-blue-500/10 to-blue-500/5 border-blue-500/30 text-blue-400';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'Disponível': return 'bg-emerald-500 shadow-emerald-500/50';
      case 'Vendido': return 'bg-red-500 shadow-red-500/50';
      case 'Reservado': return 'bg-amber-500 shadow-amber-500/50';
      default: return 'bg-blue-500 shadow-blue-500/50';
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#050505] font-sans selection:bg-emerald-500/30">
      {/* HUD Header */}
      <div className="absolute top-4 left-4 right-4 md:top-6 md:left-6 md:right-auto z-[1000] pointer-events-none flex items-center gap-3 md:gap-4">
        <Link
          to="/"
          className="pointer-events-auto flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-black/60 md:bg-white/5 backdrop-blur-3xl border border-white/10 text-white hover:bg-emerald-500 hover:text-black transition-all hover:scale-105 shadow-2xl shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="pointer-events-auto px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl bg-black/60 md:bg-white/5 backdrop-blur-3xl border border-white/10 text-white shadow-2xl flex items-center gap-3 md:gap-4 min-w-0 flex-1 md:flex-initial">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <Navigation className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold tracking-tight text-sm md:text-lg leading-none mb-1 truncate">{loteamento.name}</h1>
            <p className="text-[8px] md:text-[9px] text-neutral-500 uppercase font-black tracking-widest leading-none">Planta Georeferenciada</p>
          </div>
        </div>
      </div>

      {/* Info HUD Side Panel */}
      <div className="absolute bottom-0 md:top-0 md:bottom-auto right-0 left-0 md:left-auto z-[1000] pointer-events-none flex flex-col justify-end md:justify-center items-end p-4 md:p-6 w-full md:w-[480px]">
        <AnimatePresence mode="wait">
          {displayLote ? (
            <motion.div
              key={displayLote.id}
              initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
              className="pointer-events-auto bg-black/90 backdrop-blur-3xl border border-white/10 rounded-t-[2rem] md:rounded-[3rem] p-1 shadow-[0_0_80px_rgba(0,0,0,0.8)] text-white overflow-y-auto max-h-[50vh] md:max-h-[85vh] w-full relative group sidebar-glow custom-scrollbar"
            >
              <div className="p-4 md:p-8 space-y-4 md:space-y-8 flex flex-col">
                <div className="flex justify-between items-start">
                  <div>
                    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gradient-to-r ${getStatusGradient(displayLote.status)} border mb-2 md:mb-4 shadow-lg`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(displayLote.status)} animate-pulse`} />
                      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">{displayLote.status}</span>
                    </div>
                    <h2 className="text-xl md:text-4xl font-bold tracking-tight font-heading leading-tight uppercase">{displayLote.name}</h2>
                  </div>
                  {displayLote.area && (
                    <div className="text-right">
                      <p className="text-[8px] md:text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-1">Área</p>
                      <p className="text-lg md:text-2xl font-bold text-white font-heading">{displayLote.area} m²</p>
                    </div>
                  )}
                </div>
                <div className="relative aspect-[16/9] rounded-xl md:rounded-[2rem] overflow-hidden bg-neutral-900 border border-white/5 shadow-2xl flex flex-col shrink-0">
                  {midias.length > 0 ? (
                    <div className="w-full h-full flex gap-2 overflow-x-auto p-2 custom-scrollbar scroll-smooth snap-x">
                      {midias.map((m, idx) => (
                        <div key={m.id} className="flex-shrink-0 w-full h-full snap-center relative group/img">
                          {m.type === 'image' ? (
                            <img src={resolveUrl(m.url)} className="w-full h-full object-cover rounded-xl md:rounded-2xl" alt={`Slide ${idx}`} />
                          ) : (
                            <div className="w-full h-full bg-red-500/10 rounded-xl md:rounded-2xl flex flex-col items-center justify-center cursor-pointer" onClick={() => window.open(m.url, '_blank')}>
                              <MonitorPlay className="w-8 h-8 md:w-12 md:h-12 text-red-500 mb-1 md:mb-2" />
                              <span className="text-[8px] md:text-[10px] font-black text-red-500 uppercase">Assistir Tour Virtual</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    displayLote.photoUrl ? (
                      <img src={resolveUrl(displayLote.photoUrl)} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-neutral-800">
                        <ImageIcon className="w-8 h-8 md:w-12 md:h-12 mb-1 md:mb-2" />
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Sem Registro Fotográfico</span>
                      </div>
                    )
                  )}
                  <motion.div initial={{ top: '-10%' }} animate={{ top: '110%' }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute left-0 w-full h-px bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] z-10 pointer-events-none" />
                  <Link to={`/lote/${displayLote.id}`} className="absolute inset-0 z-20"></Link>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4 shrink-0">
                  <div className="bg-white/5 p-3 md:p-5 rounded-xl md:rounded-[1.5rem] border border-white/5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500 mb-2" />
                    <p className="text-[8px] md:text-[9px] text-neutral-500 uppercase font-black mb-1">Localização</p>
                    <p className="text-xs md:text-sm font-bold text-white leading-tight uppercase truncate">{loteamento.name}</p>
                  </div>
                  <div className="bg-white/5 p-3 md:p-5 rounded-xl md:rounded-[1.5rem] border border-white/5">
                    <Maximize className="w-3.5 h-3.5 text-emerald-500 mb-2" />
                    <p className="text-[8px] md:text-[9px] text-neutral-500 uppercase font-black mb-1">VGV Sugerido</p>
                    <p className="text-xs md:text-sm font-bold text-emerald-400 leading-tight">Consulte-nos</p>
                  </div>
                </div>

                <div className="space-y-3 md:space-y-4 shrink-0">
                  {displayLote.status === 'Disponível' ? (
                    <Link
                      to={`/lote/${displayLote.id}`}
                      className="w-full py-3.5 md:py-5 bg-emerald-500 text-black font-black uppercase text-[10px] md:text-xs tracking-[0.2em] md:tracking-[0.3em] rounded-xl md:rounded-2xl hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 md:gap-3"
                    >
                      <Zap className="w-4 h-4 md:w-5 h-5 fill-black" /> Saber Mais & Fotos
                    </Link>
                  ) : (
                    <div className="w-full py-3.5 md:py-5 bg-white/5 border border-white/10 text-neutral-600 font-black uppercase text-[10px] md:text-xs tracking-[0.2em] md:tracking-[0.3em] rounded-xl md:rounded-2xl text-center">
                      Unidade Indisponível
                    </div>
                  )}
                  <button
                    onClick={() => setActiveLote(null)}
                    className="w-full py-2 text-neutral-600 hover:text-white text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-colors"
                  >
                    Voltar à Navegação
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="hidden md:block pointer-events-auto bg-[#0a0a0a]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl text-center space-y-6 sidebar-glow w-full"
            >
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <MapPin className="w-10 h-10 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white font-heading tracking-tight mb-2 uppercase">Explorar Unidades</h3>
                <p className="text-neutral-500 text-sm font-medium leading-relaxed">
                  Selecione um lote no mapa interativo para visualizar dimensões, fotos e disponibilidade em tempo real.
                </p>
              </div>
              <div className="flex justify-center gap-6 pt-4">
                {['Disponível', 'Reservado', 'Vendido'].map(s => (
                  <div key={s} className="flex flex-col items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusDot(s)}`} />
                    <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500">{s}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Map & Background */}
      <div className="absolute inset-0 z-0">
        <MapContainer crs={L.CRS.Simple} bounds={IMAGE_BOUNDS} maxZoom={4} minZoom={-2} zoomSnap={0.5} className="w-full h-full bg-[#050505]" zoomControl={false}>
          {mapImageUrl && <ImageOverlay url={resolveUrl(mapImageUrl)} bounds={IMAGE_BOUNDS} className="opacity-80 mix-blend-screen" />}
          <MapEvents onMapClick={() => { setActiveLote(null); setHoveredLote(null); }} />
          {lotes.map((l) => (
            <ReadOnlyPolygon key={l.id} lote={l} isActive={activeLote?.id === l.id} isHovered={hoveredLote?.id === l.id} onClick={() => setActiveLote(l)} onHover={() => setHoveredLote(l)} onUnhover={() => setHoveredLote(null)} />
          ))}
        </MapContainer>
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.95)] z-[500]" />
      </div>

      {/* Floating WhatsApp CTA */}
      <a href={`https://wa.me/${config.whatsapp || '5500000000000'}`} target="_blank" rel="noopener noreferrer" className="fixed bottom-8 right-8 z-[3000] p-5 bg-green-500 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group">
        <MessageCircle className="w-8 h-8 group-hover:rotate-12 transition-transform" />
      </a>

      {/* Modal Lead - Unificado */}
      <AnimatePresence>
        {showLeadModal && activeLote && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowLeadModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-neutral-900 border border-white/10 rounded-[3rem] p-12 w-full max-w-xl shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
              <button onClick={() => setShowLeadModal(false)} className="absolute top-8 right-8 text-neutral-500 hover:text-white"><X className="w-6 h-6" /></button>

              {leadSuccess ? (
                <div className="text-center py-10 space-y-6">
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-3xl font-bold text-white font-heading">Sua reserva foi <span className="text-emerald-500">Solicitada!</span></h3>
                  <p className="text-neutral-500 font-medium">Um corretor especialista entrará em contato em instantes.</p>
                </div>
              ) : (
                <>
                  <div className="mb-10 text-center">
                    <h3 className="text-3xl font-bold text-white font-heading tracking-tight mb-2">Interesse na Unidade <span className="text-emerald-500">{activeLote.name}</span></h3>
                    <p className="text-neutral-500 text-sm font-medium">Informe seus dados para receber o fluxo de pagamento</p>
                  </div>

                  <form onSubmit={handleLeadSubmit} className="space-y-6">
                    <div>
                      <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-2 px-1">Nome Completo</label>
                      <input type="text" required value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 font-bold transition-all" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-2 px-1">WhatsApp</label>
                        <input type="tel" required value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 font-bold transition-all" placeholder="(00) 00000-0000" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-2 px-1">E-mail</label>
                        <input type="email" value={leadForm.email} onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 font-bold transition-all" />
                      </div>
                    </div>
                    <button type="submit" disabled={submittingLead} className="w-full py-6 bg-emerald-500 text-black font-black uppercase text-xs tracking-[0.3em] rounded-2xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-3">
                      {submittingLead ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirmar Solicitação'}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
