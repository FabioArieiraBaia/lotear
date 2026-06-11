import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, ImageOverlay, Polygon, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MonitorPlay, MapPin, ChevronRight, Building,
  ArrowLeft, ArrowRight, Zap, Loader2, Info, Search, Filter,
  Globe2, Layers, Compass, LayoutGrid, TrendingUp, Tag,
  DollarSign, Ruler, Eye, ExternalLink, Sparkles, MousePointer2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjs from 'pdfjs-dist';
import { resolveUrl } from '../utils/url';
import PdfThumbnail from '../components/PdfThumbnail';
import LoteamentoQuickView from '../components/QuickView';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const IMAGE_BOUNDS: L.LatLngBoundsExpression = [[0, 0], [1000, 1000]];

const mapCoordinates = (polygon: number[][]): L.LatLngExpression[] =>
  polygon.map(([y, x]) => [1000 - y, x] as L.LatLngExpression);

/* ─────────── sub-components ─────────── */

function MapEvents({ onMapClick, activeLote }: { onMapClick: () => void, activeLote: any }) {
  const map = useMapEvents({ click: () => onMapClick() });

  useEffect(() => {
    if (activeLote?.polygon) {
      const coords = mapCoordinates(activeLote.polygon);
      map.flyToBounds(L.latLngBounds(coords), { padding: [100, 100], duration: 1, easeLinearity: 0.25 });
    }
  }, [activeLote, map]);

  return null;
}

function LotePolygon({ lote, isActive, isHovered, onClick, onHover, onUnhover }: any) {
  const statusColor: Record<string, string> = {
    'Disponível': '#10b981',
    'Vendido': '#ef4444',
    'Reservado': '#f59e0b',
  };
  const color = statusColor[lote.status] || '#3b82f6';
  const lit = isActive || isHovered;

  return (
    <Polygon
      positions={mapCoordinates(lote.polygon)}
      pathOptions={{
        color: lit ? '#fff' : color,
        fillColor: lit ? (lote.status === 'Vendido' ? '#ef4444' : '#fff') : color,
        fillOpacity: lit ? 0.55 : 0.2,
        weight: lit ? 3 : 1.5,
        dashArray: lit ? undefined : '4,6',
        className: 'cursor-pointer transition-all duration-500',
      }}
      eventHandlers={{
        click: (e) => { L.DomEvent.stopPropagation(e); onClick(); },
        mouseover: onHover,
        mouseout: onUnhover,
      }}
    />
  );
}

export default function Apresentacao() {
  const navigate = useNavigate();
  const [loteamentos, setLoteamentos] = useState<any[]>([]);
  const [loteCounts, setLoteCounts] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loteamento, setLoteamento] = useState<any>(null);
  const [lotes, setLotes] = useState<any[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);
  const [activeLote, setActiveLote] = useState<any>(null);
  const [hoveredLote, setHoveredLote] = useState<any>(null);

  // States restaurados e expandidos
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [convertingPdf, setConvertingPdf] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [midias, setMidias] = useState<any[]>([]);
  const [loadingMidia, setLoadingMidia] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'api/configuracoes')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error(err));
    fetchLoteamentos();
  }, []);

  const fetchLoteamentos = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(import.meta.env.BASE_URL + 'api/loteamentos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoteamentos(data);
        data.forEach((l: any) => fetchLoteCounts(l.id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoteCounts = async (id: number) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(import.meta.env.BASE_URL + `api/loteamentos/${id}/lotes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoteCounts(prev => ({
          ...prev,
          [id]: {
            total: data.length,
            disp: data.filter((x: any) => x.status === 'Disponível').length,
            vend: data.filter((x: any) => x.status === 'Vendido').length,
            vgv: data.reduce((acc: number, x: any) => acc + (x.price || 0), 0)
          }
        }));
      }
    } catch (e) { }
  };

  useEffect(() => {
    if (!selectedId) { setLoteamento(null); setLotes([]); setMapImageUrl(null); setActiveLote(null); return; }
    (async () => {
      setLoadingMap(true);
      try {
        const token = localStorage.getItem('adminToken');
        const h = { Authorization: `Bearer ${token}` };
        const [a, b] = await Promise.all([
          fetch(import.meta.env.BASE_URL + `api/loteamentos/${selectedId}`, { headers: h }),
          fetch(import.meta.env.BASE_URL + `api/loteamentos/${selectedId}/lotes`, { headers: h }),
        ]);
        if (a.ok) setLoteamento(await a.json());
        if (b.ok) setLotes(await b.json());
      } catch (err) { console.error(err); }
      finally { setLoadingMap(false); }
    })();
  }, [selectedId]);

  useEffect(() => {
    if (!loteamento?.imageUrl) return;
    if (loteamento.imageUrl.toLowerCase().endsWith('.pdf')) {
      (async () => {
        setConvertingPdf(true);
        try {
          const pdf = await pdfjs.getDocument(resolveUrl(loteamento.imageUrl)).promise;
          const page = await pdf.getPage(1);
          const vp = page.getViewport({ scale: 2.5 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.height = vp.height;
            canvas.width = vp.width;
            await page.render({ canvasContext: ctx, viewport: vp, canvas } as any).promise;
            setMapImageUrl(canvas.toDataURL('image/png'));
          }
        } catch (e) { console.error(e); }
        finally { setConvertingPdf(false); }
      })();
    } else { setMapImageUrl(loteamento.imageUrl); }
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

  const stats = useMemo(() => {
    if (!lotes.length) return { total: 0, disponiveis: 0, vendidos: 0, reservados: 0, vgv: 0 };
    return {
      total: lotes.length,
      disponiveis: lotes.filter(l => l.status === 'Disponível').length,
      vendidos: lotes.filter(l => l.status === 'Vendido').length,
      reservados: lotes.filter(l => l.status === 'Reservado').length,
      vgv: lotes.reduce((s, l) => s + (l.price || 0), 0),
    };
  }, [lotes]);

  const filteredLoteamentos = useMemo(() => {
    return loteamentos.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [loteamentos, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!selectedId) {
    return (
      <div className="container mx-auto pb-24 px-4 min-h-screen font-sans flex flex-col items-center">
        {/* BACKGROUND GLOWS */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
        </div>

        {/* HEADER SECTION */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16 mt-16 max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] mb-8 shadow-2xl shadow-emerald-500/10">
            <Sparkles className="w-3.5 h-3.5 fill-emerald-400" />
            Apresentação Executiva V.2027
          </div>
          <h2 className="text-6xl md:text-7xl font-black text-white mb-8 font-heading tracking-tighter leading-[0.9] drop-shadow-2xl">
            O Futuro da <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">Gestão Imobiliária</span>
          </h2>
          <p className="text-neutral-500 text-xl font-medium leading-relaxed max-w-2xl mx-auto mb-12">
            Explore masterplans interativos de alta fidelidade e visualize o potencial de rentabilidade em tempo real.
          </p>

          {/* SEARCH BAR FUTURISTA */}
          <div className="relative max-w-md mx-auto group">
            <div className="absolute inset-0 bg-emerald-500/20 blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
            <div className="relative flex items-center bg-white/5 border border-white/10 rounded-3xl px-6 py-4 focus-within:border-emerald-500/50 transition-all backdrop-blur-3xl">
              <Search className="w-5 h-5 text-neutral-500 mr-4" />
              <input
                type="text"
                placeholder="Pesquisar empreendimento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-white font-bold w-full placeholder-neutral-600"
              />
            </div>
          </div>
        </motion.div>

        {/* GRID DE EMPREENDIMENTOS */}
        <div className="w-full max-w-7xl relative z-10">
          <div className="flex flex-wrap justify-center gap-12">
            {filteredLoteamentos.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                  <Building className="w-8 h-8 text-neutral-700" />
                </div>
                <p className="text-neutral-600 font-bold uppercase tracking-widest text-xs">Nenhum empreendimento encontrado</p>
              </motion.div>
            ) : (
              filteredLoteamentos.map((lot, idx) => {
                const c = loteCounts[lot.id];
                const pct = c ? Math.round((c.vend / c.total) * 100 || 0) : 0;
                return (
                  <motion.div
                    key={lot.id}
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * .1, duration: 0.8, ease: [.19, 1, .22, 1] }}
                    onClick={() => setSelectedId(lot.id)}
                    className="group relative w-full sm:w-[380px] h-[540px] rounded-[3.5rem] overflow-hidden cursor-pointer shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] bg-neutral-900 border border-white/5 hover:border-emerald-500/30 transition-all duration-700"
                  >
                    <div className="w-full h-full relative">
                      {/* Background Layer */}
                      <div className="absolute inset-0 z-0 overflow-hidden">
                        {lot.imageUrl ? (
                          lot.imageUrl.toLowerCase().endsWith('.pdf') ? (
                            <PdfThumbnail url={resolveUrl(lot.imageUrl)} alt={lot.name} scale={1}
                              className="w-full h-full object-cover grayscale brightness-[0.3] group-hover:grayscale-0 group-hover:brightness-110 group-hover:scale-110 transition-all duration-[2500ms] ease-out" />
                          ) : (
                            <img src={resolveUrl(lot.imageUrl)} alt={lot.name}
                              className="w-full h-full object-cover grayscale brightness-[0.3] group-hover:grayscale-0 group-hover:brightness-110 group-hover:scale-110 transition-all duration-[2500ms] ease-out" />
                          )
                        ) : (
                          <div className="w-full h-full bg-neutral-900 flex items-center justify-center"><Building className="w-24 h-24 text-neutral-800" /></div>
                        )}

                        {/* Deep Overlay */}
                        <div className="absolute inset-x-0 bottom-0 h-[80%] bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
                        <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-colors duration-700 z-10" />
                        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/40 blur-sm opacity-0 group-hover:animate-scan z-20" />
                      </div>

                      {/* CONTENT LAYER */}
                      <div className="absolute inset-0 z-20 p-12 flex flex-col justify-end">
                        <div className="translate-y-8 group-hover:translate-y-0 transition-transform duration-700 ease-out">
                          <div className="mb-6">
                            <div className="flex items-center gap-2.5 mb-3">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,1)] animate-pulse" />
                              <span className="text-[10px] text-emerald-500 font-extrabold uppercase tracking-[0.4em]">Active Portfolio</span>
                            </div>
                            <h3 className="text-4xl font-black text-white font-heading tracking-tighter leading-[0.8] mb-4 group-hover:text-emerald-400 transition-colors uppercase italic">{lot.name}</h3>
                            <div className="flex items-center gap-4 text-neutral-500 text-[10px] font-bold uppercase tracking-widest">
                              <span className="bg-white/5 px-2 py-1 rounded border border-white/5 flex items-center gap-1.5"><MapPin className="w-3 h-3 text-emerald-500" /> Localização: Residencial</span>
                            </div>
                          </div>

                          {c ? (
                            <div className="space-y-6 mb-10">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tighter">
                                  <span className="text-neutral-500">Ocupação Atual</span>
                                  <span className="text-white bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">{pct}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ delay: 0.5, duration: 1.5 }}
                                    className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-6 text-[11px] font-black uppercase tracking-widest">
                                <div className="flex flex-col">
                                  <span className="text-emerald-400 mb-1">{c.disp}</span>
                                  <span className="text-neutral-600 text-[8px]">Disponível</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-white mb-1">{c.total}</span>
                                  <span className="text-neutral-600 text-[8px]">Unidades</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-blue-400 mb-1">{formatCurrency(c.vgv / 1000000)}M</span>
                                  <span className="text-neutral-600 text-[8px]">Potencial VGV</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="h-32 mb-10 border-t border-white/5 pt-6">
                              <div className="flex items-center gap-2 text-neutral-700 animate-pulse">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Computando dados estratégicos...</span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-3 text-emerald-500 font-black text-[11px] uppercase tracking-[0.3em] group-hover:gap-6 transition-all duration-500">
                            INICIAR APRESENTAÇÃO <MonitorPlay className="w-5 h-5 group-hover:scale-125 transition-transform" />
                          </div>
                        </div>
                      </div>

                      {/* Interactive Hint */}
                      <div className="absolute top-10 right-10 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-3xl border border-white/10 flex items-center justify-center text-white">
                          <MousePointer2 className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Border Glow */}
                      <div className="absolute inset-0 border-2 border-emerald-500/0 group-hover:border-emerald-500/20 rounded-[3.5rem] transition-all duration-700 z-30 pointer-events-none" />
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* FOOTER / CONTACT INFO */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-40 text-center pb-20 relative z-10">
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent mx-auto mb-10 opacity-30" />
          <p className="text-neutral-600 text-[10px] font-black uppercase tracking-[0.5em] mb-4">{config.nome_empresa || 'LotearPro'} Advanced Systems</p>
          <p className="text-neutral-500 text-sm font-medium">Plataforma de Alta Performance para Gestão e Lançamentos v2027.04</p>
        </motion.div>
      </div>
    );
  }

  const displayLote = hoveredLote || activeLote;
  const occupationPct = stats.total > 0 ? Math.round((stats.vendidos / stats.total) * 100) : 0;

  if (loadingMap || !loteamento || (loteamento?.imageUrl?.toLowerCase().endsWith('.pdf') && convertingPdf)) {
    return (
      <div className="flex flex-col items-center justify-center h-[85vh] gap-6 bg-black">
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 border-2 border-emerald-500/5 rounded-full" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-t-2 border-emerald-500 rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Globe2 className="w-8 h-8 text-emerald-500 animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-white font-black text-2xl mb-2 tracking-tight group">
            {convertingPdf ? 'DECIFRANDO VETORES PDF' : 'MAPEANDO TERRITÓRIO'}
            <span className="inline-block animate-bounce ml-1 text-emerald-500">.</span>
          </p>
          <p className="text-neutral-600 text-[10px] uppercase font-black tracking-[0.4em] font-mono opacity-50">Sincronização em tempo real ativa</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-64px)] -m-6 md:-m-8 overflow-hidden bg-black font-sans">
      {/* MAP HUD OVERLAY */}
      <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .7, ease: [.19, 1, .22, 1] }} className="absolute top-6 left-6 right-6 z-[1000] pointer-events-none flex justify-between items-start">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button onClick={() => setSelectedId(null)} className="w-14 h-14 rounded-3xl bg-black/60 backdrop-blur-3xl border border-white/10 text-white hover:bg-emerald-500 hover:text-black hover:border-emerald-500 transition-all flex items-center justify-center group shadow-2xl">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="h-14 px-8 rounded-3xl bg-black/60 backdrop-blur-3xl border border-white/10 flex items-center gap-6 shadow-2xl">
            <div className="flex items-center gap-3 pr-6 border-r border-white/10">
              <Compass className="w-5 h-5 text-emerald-400 animate-spin-slow" />
              <span className="font-black text-white text-base tracking-tighter uppercase italic">{loteamento.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em]">Sessão Interativa</span>
            </div>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-3 pointer-events-auto">
          {[
            { label: 'Unidades', val: `${stats.disponiveis}/${stats.total}`, icon: LayoutGrid, accent: 'text-emerald-400' },
            { label: 'Inventory vgv', val: formatCurrency(stats.vgv).replace('R$', ''), icon: TrendingUp, accent: 'text-white' },
            { label: 'Ocupação Solo', val: `${occupationPct}%`, icon: Tag, accent: 'text-emerald-400' },
          ].map(h => (
            <div key={h.label} className="h-14 px-6 rounded-3xl bg-black/60 backdrop-blur-3xl border border-white/10 flex items-center gap-4 shadow-2xl">
              <h.icon className={`w-5 h-5 ${h.accent}`} />
              <div>
                <p className="text-[8px] text-neutral-500 uppercase font-black tracking-widest leading-none mb-1">{h.label}</p>
                <p className="text-sm font-black text-white font-mono leading-none">{h.val}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <AnimatePresence>
        {displayLote && (
          <motion.div key={displayLote.id} initial={{ x: 80, opacity: 0, scale: .96 }} animate={{ x: 0, opacity: 1, scale: 1 }} exit={{ x: 80, opacity: 0, scale: .96 }} transition={{ type: 'spring', damping: 28, stiffness: 300 }} className="absolute top-28 right-6 w-[400px] z-[1000] pointer-events-none">
            <div className="pointer-events-auto bg-black/70 backdrop-blur-[50px] border border-white/10 rounded-[3rem] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-y-auto max-h-[calc(100vh-160px)] custom-scrollbar">
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${displayLote.status === 'Disponível' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : displayLote.status === 'Vendido' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]'}`} />

              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-4xl font-black text-white tracking-tighter mb-3 uppercase italic leading-none">{displayLote.name}</h2>
                  <div className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${displayLote.status === 'Disponível' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      displayLote.status === 'Vendido' ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${displayLote.status === 'Disponível' ? 'bg-emerald-500' : displayLote.status === 'Vendido' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    {displayLote.status}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                  <p className="text-neutral-500 text-[10px] uppercase font-black tracking-widest mb-2 flex items-center gap-2"><Ruler className="w-3.5 h-3.5" /> Área Total</p>
                  <p className="text-2xl font-black text-white font-mono">{displayLote.area}<span className="text-xs ml-1 opacity-40">m²</span></p>
                </div>
                <div className={`rounded-3xl p-6 border transition-colors ${displayLote.status === 'Disponível' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/5 grayscale'}`}>
                  <p className={`text-[10px] uppercase font-black tracking-widest mb-2 flex items-center gap-2 ${displayLote.status === 'Disponível' ? 'text-emerald-500' : 'text-neutral-500'}`}><DollarSign className="w-3.5 h-3.5" /> Valor Ativo</p>
                  <p className={`text-2xl font-black font-mono ${displayLote.status === 'Disponível' ? 'text-white' : 'text-neutral-600'}`}>{displayLote.price > 0 ? formatCurrency(displayLote.price) : 'Sob Consulta'}</p>
                </div>
              </div>

              {displayLote.notes && (
                <div className="bg-white/5 rounded-3xl p-6 border border-white/5 mb-6">
                  <p className="text-neutral-500 text-[10px] uppercase font-black tracking-widest mb-3 flex items-center gap-2"><Info className="w-3.5 h-3.5" /> Descrição do Ativo</p>
                  <p className="text-sm text-neutral-300 leading-relaxed font-medium line-clamp-4">{displayLote.notes}</p>
                </div>
              )}

              {/* GALERIA PREMIUM */}
              {midias.length > 0 && (
                <div className="mb-8 space-y-4">
                  <p className="text-neutral-500 text-[10px] uppercase font-black tracking-widest flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> Galeria Multimídia</p>
                  <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                    {midias.map((m, idx) => (
                      <div 
                        key={m.id} 
                        onClick={() => setLightboxIndex(idx)}
                        className="flex-shrink-0 w-32 aspect-square rounded-2xl bg-neutral-800 border border-white/5 overflow-hidden group/m relative cursor-pointer"
                      >
                        {m.type === 'image' ? (
                          <>
                            <img src={resolveUrl(m.url)} className="w-full h-full object-cover group-hover/m:scale-110 transition-transform duration-500" alt="Lote" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="w-5 h-5 text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/10">
                            <MonitorPlay className="w-6 h-6 text-red-500 mb-1" />
                            <span className="text-[7px] font-black text-red-500 uppercase">Assistir</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button onClick={() => navigate(`/admin/loteamento/${selectedId}`)} className="flex-1 h-14 rounded-3xl bg-emerald-500 text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/20 active:scale-95 group">
                  {displayLote.status === 'Disponível' ? 'SOLICITAR RESERVA' : 'VER COMPROVANTES'}
                  <ExternalLink className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                </button>
              </div>

              {/* AMBIENT GLOW */}
              <div className={`absolute -bottom-24 -left-24 w-48 h-48 blur-[100px] rounded-full opacity-30 pointer-events-none transition-colors duration-1000 ${displayLote.status === 'Disponível' ? 'bg-emerald-500' :
                  displayLote.status === 'Vendido' ? 'bg-red-500' : 'bg-amber-500'
                }`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 z-0">
        <style>{`
          .leaflet-container { background: #000 !important; cursor: crosshair !important; }
          .leaflet-image-layer { filter: saturate(1.2) contrast(1.1) brightness(0.85); transition: opacity 1.5s ease-out; }
          .leaflet-zoom-animated { transition-timing-function: cubic-bezier(.19,1,.22,1) !important; }
          .leaflet-control-zoom { display: none !important; }
          @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
          .animate-scan { animation: scan 3s linear infinite; }
          .animate-spin-slow { animation: spin 8s linear infinite; }
        `}</style>
        <MapContainer crs={L.CRS.Simple} bounds={IMAGE_BOUNDS} maxZoom={4} minZoom={-1} zoomSnap={0.5} zoomControl={false} className="w-full h-full" style={{ height: '100%', width: '100%' }}>
          {mapImageUrl && <ImageOverlay url={resolveUrl(mapImageUrl)} bounds={IMAGE_BOUNDS} />}
          <MapEvents onMapClick={() => { setActiveLote(null); setHoveredLote(null); }} activeLote={activeLote} />
          {lotes.map(lote => (
            <LotePolygon key={lote.id} lote={lote} isActive={activeLote?.id === lote.id} isHovered={hoveredLote?.id === lote.id} onClick={() => setActiveLote(lote)} onHover={() => setHoveredLote(lote)} onUnhover={() => setHoveredLote(null)} />
          ))}
        </MapContainer>
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_200px_rgba(0,0,0,0.95)] z-[500]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-[501]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/60 via-black/30 to-transparent pointer-events-none z-[501]" />
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex gap-10 px-12 py-5 rounded-[2.5rem] bg-black/60 backdrop-blur-3xl border border-white/10 shadow-2xl">
        {[
          { label: 'Disponível', color: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' },
          { label: 'Reservado', color: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]' },
          { label: 'Vendido', color: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${l.color}`} />
            <span className="text-[11px] uppercase font-black tracking-[0.2em] text-neutral-400">{l.label}</span>
          </div>
        ))}
      </div>

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
