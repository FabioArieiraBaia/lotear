import React, { useEffect, useState } from 'react';
import { MapContainer, ImageOverlay, Polygon, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, ArrowLeft, Image as ImageIcon, MapPin, Maximize, Navigation, X, DollarSign, Building } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjs from 'pdfjs-dist';
import { resolveUrl } from '../utils/url';
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
      <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-all">
        <Loader2 className="w-8 h-8 animate-spin mb-2 opacity-80" />
        <span className="text-[10px] uppercase tracking-widest font-mono opacity-60">Renderizando</span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 mix-blend-screen bg-white shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"
    />
  );
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const IMAGE_BOUNDS: L.LatLngBoundsExpression = [[0, 0], [1000, 1000]];

const mapCoordinates = (polygon: number[][]): L.LatLngExpression[] => {
  return polygon.map(([y, x]) => [1000 - y, x] as L.LatLngExpression);
};

function MapEvents({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: () => onMapClick(),
  });
  return null;
}

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
        fillOpacity: highlighted ? 0.5 : 0.2,
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

export default function Apresentacao() {
  const [loteamentos, setLoteamentos] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loteamento, setLoteamento] = useState<any>(null);
  const [lotes, setLotes] = useState<any[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);
  
  const [activeLote, setActiveLote] = useState<any>(null);
  const [hoveredLote, setHoveredLote] = useState<any>(null);
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [convertingPdf, setConvertingPdf] = useState(false);

  useEffect(() => {
    const fetchList = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch(import.meta.env.BASE_URL + 'api/loteamentos', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLoteamentos(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingList(false);
      }
    };
    fetchList();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setLoteamento(null);
      setLotes([]);
      setMapImageUrl(null);
      setActiveLote(null);
      return;
    }

    const fetchMap = async () => {
      setLoadingMap(true);
      try {
        const token = localStorage.getItem('adminToken');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const [lotRes, lotesRes] = await Promise.all([
          fetch(import.meta.env.BASE_URL + `api/loteamentos/${selectedId}`, { headers }),
          fetch(import.meta.env.BASE_URL + `api/loteamentos/${selectedId}/lotes`, { headers })
        ]);

        if (lotRes.ok) setLoteamento(await lotRes.json());
        if (lotesRes.ok) setLotes(await lotesRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMap(false);
      }
    };
    fetchMap();
  }, [selectedId]);

  useEffect(() => {
    if (!loteamento?.imageUrl) return;

    if (loteamento.imageUrl.toLowerCase().endsWith('.pdf')) {
      const convertPdf = async () => {
        setConvertingPdf(true);
        try {
          const loadingTask = pdfjs.getDocument(resolveUrl(loteamento.imageUrl));
          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(1);
          
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport, canvas }).promise;
            setMapImageUrl(canvas.toDataURL('image/png'));
          }
        } catch (err) {
          console.error(err);
        } finally {
          setConvertingPdf(false);
        }
      };
      convertPdf();
    } else {
      setMapImageUrl(loteamento.imageUrl);
    }
  }, [loteamento?.imageUrl]);

  if (loadingList) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // --- LISTA DE LOTEAMENTOS ---
  if (!selectedId) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Nossos Loteamentos</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loteamentos.map((lot) => (
            <motion.div
              key={lot.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedId(lot.id)}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all group"
            >
              <div className="h-48 relative overflow-hidden bg-neutral-900 flex items-center justify-center">
                {lot.imageUrl ? (
                  lot.imageUrl.toLowerCase().endsWith('.pdf') ? (
                    <PdfThumbnail url={resolveUrl(lot.imageUrl)} alt={lot.name} />
                  ) : (
                    <img src={resolveUrl(lot.imageUrl)} alt={lot.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 mix-blend-screen opacity-90 group-hover:opacity-100" />
                  )
                ) : (
                  <Building className="w-12 h-12 text-neutral-700" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
              </div>
              <div className="p-6 relative">
                <h3 className="text-xl font-bold text-white mb-2">{lot.name}</h3>
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mt-4">
                  Visualizar Mapa Interativo &rarr;
                </div>
              </div>
            </motion.div>
          ))}
          {loteamentos.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
              <p className="text-neutral-400">Nenhum loteamento disponível para apresentação.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- MODO MAPA INTERATIVO ---
  if (loadingMap || !loteamento || (loteamento?.imageUrl?.toLowerCase().endsWith('.pdf') && convertingPdf)) {
    return (
      <div className="flex items-center justify-center h-[80vh] w-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
          <p className="text-emerald-500/70 font-mono text-sm tracking-widest uppercase">
            {convertingPdf ? 'Processando Planta...' : 'Carregando Mapa...'}
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
    <div className="relative h-[calc(100vh-6rem)] -m-6 md:-m-8 overflow-hidden bg-neutral-950 font-sans rounded-none md:rounded-l-2xl selection:bg-emerald-500/30 border border-white/5 shadow-inner">
      
      {/* Top Navigation */}
      <div className="absolute top-4 left-4 right-4 md:right-auto z-[1000] pointer-events-none flex items-center gap-3">
        <button 
          onClick={() => setSelectedId(null)}
          className="pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white hover:bg-white/10 transition-all hover:scale-105 shadow-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="pointer-events-auto px-5 py-2.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center gap-3">
          <Navigation className="w-4 h-4 text-emerald-400" />
          <h1 className="font-semibold text-sm truncate tracking-wide">{loteamento.name}</h1>
        </div>
      </div>

      {/* Info Panel HUD */}
      <div className="absolute bottom-4 left-4 w-[calc(100%-2rem)] md:w-80 md:top-4 md:right-4 md:left-auto md:bottom-auto z-[1000] pointer-events-none flex flex-col justify-end md:justify-start">
        <AnimatePresence mode="wait">
          {displayLote ? (
            <motion.div
              key={displayLote.id}
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              className="pointer-events-auto bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-[0_0_50px_rgba(0,0,0,0.5)] text-white relative flex flex-col overflow-hidden"
            >
              {/* Colored left bar indicator */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${getStatusGradient(displayLote.status)}`} />
              
              <div className="flex justify-between items-start mb-5 pl-2">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-1">{displayLote.name}</h2>
                  <div className="flex items-center gap-2 mt-2 bg-white/5 py-1 px-3 rounded-full border border-white/5 w-fit">
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${getStatusGradient(displayLote.status)} shadow-lg`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${getStatusColorClass(displayLote.status)}`}>
                      {displayLote.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pl-2">
                <div className="grid grid-cols-2 gap-3">
                  {displayLote.area && (
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
                        <Maximize className="w-3.5 h-3.5" />
                        <span className="text-[10px] uppercase tracking-wider font-semibold">Área Total</span>
                      </div>
                      <span className="font-mono text-white font-medium">{displayLote.area} m²</span>
                    </div>
                  )}
                  
                  {displayLote.price > 0 && displayLote.status === 'Disponível' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span className="text-[10px] uppercase tracking-wider font-semibold">Valor Lote</span>
                      </div>
                      <span className="font-bold text-emerald-400 font-mono">{formatCurrency(displayLote.price)}</span>
                    </div>
                  )}
                </div>
              </div>

            </motion.div>
          ) : (
             <motion.div
               key="empty"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="pointer-events-auto bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center justify-center min-h-[150px]"
             >
               <MapPin className="w-8 h-8 text-neutral-400 mb-3 opacity-50" />
               <p className="text-neutral-300 text-sm leading-relaxed max-w-[200px]">Passe o mouse ou clique em um lote do mapa para visualizar as informações.</p>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Map Area */}
      <div className="absolute inset-0 z-0">
        <style>
          {`
            /* Move leaflet zoom control to bottom center */
            .leaflet-bottom.leaflet-right .leaflet-control-zoom {
              position: fixed;
              bottom: 30px;
              left: 50%;
              transform: translateX(-50%);
              margin: 0;
              display: flex;
              gap: 5px;
              border: none;
              background: transparent;
            }
            .leaflet-control-zoom a {
              background-color: rgba(0, 0, 0, 0.6) !important;
              color: white !important;
              border: 1px solid rgba(255, 255, 255, 0.2) !important;
              border-radius: 8px !important;
              backdrop-filter: blur(10px);
              display: flex !important;
              align-items: center;
              justify-content: center;
              width: 40px !important;
              height: 40px !important;
              box-shadow: 0 4px 15px rgba(0,0,0,0.5) !important;
            }
            .leaflet-control-zoom a:hover {
              background-color: rgba(16, 185, 129, 0.8) !important;
              border-color: rgba(16, 185, 129, 0.5) !important;
            }
          `}
        </style>
        <MapContainer 
          crs={L.CRS.Simple} 
          bounds={IMAGE_BOUNDS} 
          maxZoom={4}
          minZoom={-2}
          zoomSnap={0.5}
          zoomControl={false}
          className="w-full h-full bg-[#050505]"
          style={{ height: '100%', width: '100%', background: '#050505' }}
        >
          <ZoomControl position="bottomright" />
          {mapImageUrl && (
            <ImageOverlay url={resolveUrl(mapImageUrl)} bounds={IMAGE_BOUNDS} className="opacity-[0.85] mix-blend-screen" />
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
        
        {/* Dark vignette for cinematic presentation */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.95)] z-[500]" />
      </div>

      {/* Presentation Bottom Right Legend */}
      <div className="absolute bottom-4 right-4 z-[1000] pointer-events-none hidden md:flex items-center gap-4 bg-black/40 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] uppercase tracking-widest text-neutral-300">Disponível</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <span className="text-[10px] uppercase tracking-widest text-neutral-300">Reservado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
          <span className="text-[10px] uppercase tracking-widest text-neutral-300">Vendido</span>
        </div>
      </div>
    </div>
  );
}
