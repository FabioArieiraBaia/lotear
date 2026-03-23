import React, { useEffect, useState } from 'react';
import { resolveUrl } from '../utils/url';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, ImageOverlay, Polygon, useMapEvents } from 'react-leaflet';

// Add this component before PublicLoteamentoView
function MapEvents({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: () => {
      onMapClick();
    },
  });
  return null;
}
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, ArrowLeft, Image as ImageIcon, MapPin, Maximize, Info, CheckCircle2, Navigation, X, Send, MessageCircle, Phone, Clock, Shield, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjs from 'pdfjs-dist';
// @ts-ignore
// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(import.meta.env.BASE_URL + 'pdf.worker.min.js', window.location.origin).href;

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
  
  // Check if device supports touch to prevent hover flickering on mobile
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  return (
    <Polygon
      positions={mapCoordinates(lote.polygon)}
      pathOptions={{ 
        color: highlighted ? '#ffffff' : color, 
        fillColor: highlighted ? '#ffffff' : color,
        fillOpacity: highlighted ? 0.4 : 0.15,
        weight: highlighted ? 3 : 1,
        dashArray: highlighted ? undefined : '4, 4',
        className: 'transition-all duration-300 ease-in-out cursor-pointer outline-none'
      }}
      eventHandlers={{
        click: (e) => {
          // Stop propagation to prevent map click from immediately unselecting
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

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [loteamentoRes, lotesRes] = await Promise.all([
          fetch(import.meta.env.BASE_URL + `api/loteamentos/${id}`),
          fetch(import.meta.env.BASE_URL + `api/loteamentos/${id}/lotes`)
        ]);

        if (loteamentoRes.ok) {
          const loteamentoData = await loteamentoRes.json();
          setLoteamento(loteamentoData);
        }

        if (lotesRes.ok) {
          const lotesData = await lotesRes.json();
          setLotes(lotesData);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Handle PDF to Image conversion
  useEffect(() => {
    if (!loteamento?.imageUrl) return;

    if (loteamento.imageUrl.toLowerCase().endsWith('.pdf')) {
      const convertPdf = async () => {
        setConvertingPdf(true);
        try {
          const loadingTask = pdfjs.getDocument(resolveUrl(loteamento.imageUrl));
          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(1);
          
          const viewport = page.getViewport({ scale: 2.0 }); // Use high scale for quality
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
              canvasContext: context,
              viewport: viewport,
              canvas: canvas
            } as any).promise;
            
            setMapImageUrl(canvas.toDataURL('image/png'));
          }
        } catch (err) {
          console.error("Error converting PDF to image:", err);
        } finally {
          setConvertingPdf(false);
        }
      };
      convertPdf();
    } else {
      setMapImageUrl(loteamento.imageUrl);
    }
  }, [loteamento?.imageUrl]);

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
      <div className="flex items-center justify-center h-screen w-screen bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
          <p className="text-emerald-500/70 font-mono text-sm tracking-widest uppercase">
            {convertingPdf ? 'Processando Planta...' : 'Inicializando Sistema...'}
          </p>
        </div>
      </div>
    );
  }

  const displayLote = hoveredLote || activeLote;

  const getStatusGradient = (status: string) => {
    switch (status) {
      case 'Disponível': return 'from-emerald-500 to-emerald-300 shadow-emerald-500/50';
      case 'Vendido': return 'from-red-500 to-red-300 shadow-red-500/50';
      case 'Reservado': return 'from-amber-500 to-amber-300 shadow-amber-500/50';
      default: return 'from-blue-500 to-blue-300 shadow-blue-500/50';
    }
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'Disponível': return 'text-emerald-400';
      case 'Vendido': return 'text-red-400';
      case 'Reservado': return 'text-amber-400';
      default: return 'text-blue-400';
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-neutral-950 font-sans selection:bg-emerald-500/30">
      {/* Top Navigation HUD */}
      <div className="absolute top-4 left-4 right-4 md:top-6 md:left-6 md:right-auto z-[1000] pointer-events-none flex items-center gap-3 md:gap-4">
        <Link 
          to="/" 
          className="pointer-events-auto flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white hover:bg-white/10 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] shrink-0"
        >
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
        </Link>
        <div className="pointer-events-auto px-4 md:px-6 py-2 md:py-3 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center gap-2 md:gap-3 flex-1 md:flex-none min-w-0">
          <Navigation className="w-3 h-3 md:w-4 md:h-4 text-emerald-400 shrink-0" />
          <h1 className="font-semibold tracking-wide text-sm md:text-base truncate">{loteamento.name}</h1>
        </div>
      </div>

      {/* Info HUD */}
      <div className="absolute bottom-0 left-0 right-0 md:top-0 md:bottom-auto md:right-0 md:left-auto h-auto md:h-full p-4 md:p-6 z-[1000] pointer-events-none flex flex-col justify-end md:justify-start w-full md:w-[420px] pb-6 md:pb-6">
        <AnimatePresence mode="wait">
          {displayLote ? (
            <motion.div
              key={displayLote.id}
              initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="pointer-events-auto bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-1 shadow-[0_0_50px_rgba(0,0,0,0.5)] text-white overflow-hidden relative group max-h-[60vh] md:max-h-none flex flex-col"
            >
              {/* Animated Border Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${getStatusGradient(displayLote.status)} opacity-20 group-hover:opacity-30 transition-opacity duration-500`} />
              
              <div className="relative bg-neutral-950/80 rounded-[22px] p-4 md:p-6 h-full backdrop-blur-sm border border-white/5 overflow-y-auto custom-scrollbar">
                {/* Mobile Close Button */}
                <button 
                  onClick={() => {
                    setActiveLote(null);
                    setHoveredLote(null);
                  }}
                  className="md:hidden absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Header */}
                <div className="flex justify-between items-start mb-4 md:mb-6 pr-8 md:pr-0">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">{displayLote.name}</h2>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${getStatusGradient(displayLote.status)} shadow-lg`} />
                      <span className={`text-xs md:text-sm font-medium uppercase tracking-wider ${getStatusColorClass(displayLote.status)}`}>
                        {displayLote.status}
                      </span>
                    </div>
                  </div>
                  {displayLote.area && (
                    <div className="text-right">
                      <p className="text-[10px] md:text-xs text-neutral-400 uppercase tracking-wider mb-1">Área Total</p>
                      <p className="text-lg md:text-xl font-mono text-white">{displayLote.area} <span className="text-xs md:text-sm text-neutral-500">m²</span></p>
                    </div>
                  )}
                </div>

                {/* Virtualized Image */}
                <div className="relative w-full h-32 md:h-48 rounded-xl overflow-hidden mb-4 md:mb-6 bg-neutral-900 border border-white/5 group/image shrink-0">
                  {displayLote.photoUrl ? (
                    <>
                      <motion.img 
                        initial={{ scale: 1.1, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        src={resolveUrl(displayLote.photoUrl)} 
                        alt={displayLote.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover/image:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-600">
                      <ImageIcon className="w-8 h-8 md:w-10 md:h-10 mb-2 opacity-50" />
                      <span className="text-[10px] md:text-xs uppercase tracking-widest font-mono">Sem Imagem</span>
                    </div>
                  )}
                  
                  {/* Scanning line effect */}
                  <motion.div 
                    initial={{ top: '-10%' }}
                    animate={{ top: '110%' }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className={`absolute left-0 w-full h-[2px] bg-gradient-to-r ${getStatusGradient(displayLote.status)} opacity-30 blur-[1px]`}
                  />
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6 shrink-0">
                  <div className="bg-white/5 rounded-xl p-3 md:p-4 border border-white/5">
                    <MapPin className="w-3 h-3 md:w-4 md:h-4 text-neutral-400 mb-1 md:mb-2" />
                    <p className="text-[10px] md:text-xs text-neutral-500 uppercase tracking-wider mb-1">Localização</p>
                    <p className="text-xs md:text-sm font-medium text-neutral-200 truncate">{loteamento.name}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 md:p-4 border border-white/5">
                    <Maximize className="w-3 h-3 md:w-4 md:h-4 text-neutral-400 mb-1 md:mb-2" />
                    <p className="text-[10px] md:text-xs text-neutral-500 uppercase tracking-wider mb-1">Dimensões</p>
                    <p className="text-xs md:text-sm font-medium text-neutral-200">{displayLote.area ? `${displayLote.area} m²` : 'N/A'}</p>
                  </div>
                </div>

                {/* Notes */}
                {displayLote.notes && displayLote.status === 'Disponível' && (
                  <div className="mb-4 md:mb-6 bg-white/5 rounded-xl p-3 md:p-4 border border-white/5 shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-3 h-3 md:w-4 md:h-4 text-emerald-400" />
                      <p className="text-[10px] md:text-xs text-emerald-400/80 uppercase tracking-wider">Informações</p>
                    </div>
                    <p className="text-xs md:text-sm text-neutral-300 leading-relaxed">{displayLote.notes}</p>
                  </div>
                )}

                {/* Action Button */}
                {displayLote.status === 'Disponível' && (
                  <button 
                    onClick={() => setShowLeadModal(true)}
                    className="w-full relative group/btn overflow-hidden rounded-xl p-[1px] shrink-0 mt-auto"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl opacity-70 group-hover/btn:opacity-100 transition-opacity duration-300" />
                    <div className="relative bg-black/50 backdrop-blur-md px-4 py-2.5 md:py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 group-hover/btn:bg-transparent">
                      <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
                      <span className="font-bold text-sm md:text-base text-white tracking-wide">Tenho Interesse</span>
                    </div>
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
              className="pointer-events-auto bg-black/40 backdrop-blur-xl border border-white/10 rounded-full md:rounded-3xl p-4 md:p-8 shadow-[0_0_30px_rgba(0,0,0,0.5)] text-center flex flex-row md:flex-col items-center justify-center md:min-h-[300px] gap-4 md:gap-0"
            >
              <div className="hidden md:flex w-16 h-16 rounded-full bg-white/5 items-center justify-center mb-6 border border-white/10">
                <MapPin className="w-6 h-6 text-neutral-400" />
              </div>
              
              <div className="flex-1 md:flex-none text-left md:text-center">
                <h3 className="text-sm md:text-xl font-bold text-white mb-1 md:mb-2 tracking-wide">Explorar Lotes</h3>
                <p className="text-neutral-400 text-xs md:text-sm max-w-[250px] leading-relaxed hidden md:block">
                  Passe o mouse ou clique sobre os lotes no mapa para visualizar informações detalhadas em tempo real.
                </p>
                <p className="text-neutral-400 text-xs leading-relaxed md:hidden">
                  Toque em um lote no mapa para ver detalhes.
                </p>
              </div>
              
              <div className="flex md:mt-8 gap-3 md:gap-4 justify-center">
                <div className="flex md:flex-col items-center gap-1.5 md:gap-2">
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-neutral-500 hidden md:block">Disponível</span>
                </div>
                <div className="flex md:flex-col items-center gap-1.5 md:gap-2">
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                  <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-neutral-500 hidden md:block">Reservado</span>
                </div>
                <div className="flex md:flex-col items-center gap-1.5 md:gap-2">
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                  <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-neutral-500 hidden md:block">Vendido</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lead Modal */}
      <AnimatePresence>
        {showLeadModal && activeLote && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLeadModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-gradient-to-b from-neutral-900 to-neutral-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header com gradiente */}
              <div className="relative bg-gradient-to-r from-emerald-600/20 to-teal-600/20 p-6 border-b border-white/5">
                <button 
                  onClick={() => setShowLeadModal(false)}
                  className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Garanta Este Lote!</h3>
                    <p className="text-sm text-emerald-400">Reserve agora antes que alguém leve</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {leadSuccess ? (
                  <div className="py-6 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </motion.div>
                    <h4 className="text-lg font-medium text-white mb-2">Solicitação Enviada!</h4>
                    <p className="text-neutral-400 text-sm mb-4">Nossa equipe entrará em contato em breve.</p>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                      <p className="text-emerald-400 text-sm font-medium">⏱️ Ligamos em até 30 minutos!</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleLeadSubmit} className="space-y-4">
                    {/* Lote selecionado */}
                    <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-emerald-400 mb-1">LOTE SELECIONADO</p>
                          <p className="text-lg font-bold text-white">{activeLote.name}</p>
                        </div>
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-emerald-400" />
                        </div>
                      </div>
                    </div>

                    {/* Badges de benefícios */}
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs text-neutral-300">Retorno 30min</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1.5">
                        <Shield className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs text-neutral-300">100% Seguro</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1.5">
                        <Phone className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-xs text-neutral-300">Via WhatsApp</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-1">Nome Completo *</label>
                      <input
                        type="text"
                        required
                        value={leadForm.name}
                        onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-1">Telefone / WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        value={leadForm.phone}
                        onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-1">E-mail</label>
                      <input
                        type="email"
                        value={leadForm.email}
                        onChange={e => setLeadForm({...leadForm, email: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                        placeholder="seu@email.com (opcional)"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingLead}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02]"
                    >
                      {submittingLead ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Phone className="w-5 h-5" />
                          Quero Ser Contactado
                        </>
                      )}
                    </button>
                    
                    <p className="text-center text-xs text-neutral-500 mt-3">
                      🔒 Seus dados estão seguros e não serão compartilhados
                    </p>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Map Area */}
      <div className="absolute inset-0 z-0">
        <MapContainer 
          crs={L.CRS.Simple} 
          bounds={IMAGE_BOUNDS} 
          maxZoom={4}
          minZoom={-2}
          zoomSnap={0.5}
          className="w-full h-full bg-[#0a0a0a]"
          style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
        >
          {mapImageUrl && (
            <ImageOverlay
              url={resolveUrl(mapImageUrl)}
              bounds={IMAGE_BOUNDS}
              className="opacity-80 mix-blend-screen"
            />
          )}
          
          <MapEvents onMapClick={() => {
            setActiveLote(null);
            setHoveredLote(null);
          }} />
          
          {lotes.map((lote) => (
            <ReadOnlyPolygon
              key={lote.id}
              lote={lote}
              isActive={activeLote?.id === lote.id}
              isHovered={hoveredLote?.id === lote.id}
              onClick={() => setActiveLote(lote)}
              onHover={() => setHoveredLote(lote)}
              onUnhover={() => setHoveredLote(null)}
            />
          ))}
        </MapContainer>
        
        {/* Vignette overlay for cinematic feel */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] z-[500]" />
      </div>

      {/* Floating WhatsApp Button */}
      <a
        href={`https://wa.me/5500000000000?text=Olá! Vi o loteamento ${loteamento?.name} no site e gostaria de mais informações.`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[3000] flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white px-5 py-3.5 rounded-full shadow-[0_4px_20px_rgba(34,197,94,0.4)] hover:shadow-[0_6px_30px_rgba(34,197,94,0.5)] transition-all duration-300 hover:scale-105 group"
      >
        <MessageCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <span className="font-semibold text-sm hidden sm:block">Fale Conosco</span>
      </a>
    </div>
  );
}
