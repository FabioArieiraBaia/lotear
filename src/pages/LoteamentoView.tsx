import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, ImageOverlay, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { Loader2, ArrowLeft, Plus, Image as ImageIcon, MapPin, Maximize, Trash2, Check, X, Navigation, Save, Layers, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjs from 'pdfjs-dist';
import { resolveUrl } from '../utils/url';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(import.meta.env.BASE_URL + 'pdf.worker.min.js', window.location.origin).href;

const IMAGE_BOUNDS: L.LatLngBoundsExpression = [[0, 0], [1000, 1000]];

const mapCoordinates = (polygon: number[][]): L.LatLngExpression[] => {
  return polygon.map(([y, x]) => [1000 - y, x] as L.LatLngExpression);
};

const revertCoordinates = (latLngs: L.LatLng[]): number[][] => {
  return latLngs.map(ll => [1000 - ll.lat, ll.lng]);
};

function GeomanControl({ onLoteCreate }: { onLoteCreate: (polygon: number[][]) => void }) {
  const map = useMap();

  useEffect(() => {
    map.pm.setLang('pt_br');
    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawPolygon: true,
      drawCircle: false,
      drawText: false,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: false,
      rotateMode: false,
    });

    const handleCreate = (e: any) => {
      const layer = e.layer as L.Polygon;
      const latLngs = layer.getLatLngs();
      const ring = Array.isArray(latLngs[0]) ? latLngs[0] : latLngs;
      const polygon = revertCoordinates(ring as L.LatLng[]);
      
      onLoteCreate(polygon);
      layer.remove();
    };

    map.on('pm:create', handleCreate);

    return () => {
      map.pm.removeControls();
      map.off('pm:create', handleCreate);
    };
  }, [map, onLoteCreate]);

  return null;
}

function EditablePolygon({ lote, isActive, onClick, onEdit }: { key?: any, lote: any, isActive: boolean, onClick: () => void, onEdit: (id: string, polygon: number[][]) => void }) {
  const polygonRef = useRef<any>(null);

  const handleEdit = useCallback(() => {
    const layer = polygonRef.current;
    if (!layer) return;
    const latLngs = layer.getLatLngs();
    if (!latLngs || latLngs.length === 0) return;
    const ring = Array.isArray(latLngs[0]) ? latLngs[0] : latLngs;
    const polygon = revertCoordinates(ring as L.LatLng[]);
    onEdit(lote.id, polygon);
  }, [lote.id, onEdit]);

  useEffect(() => {
    const layer = polygonRef.current;
    if (!layer) return;

    layer.on('pm:edit', handleEdit);
    layer.on('pm:dragend', handleEdit);
    layer.on('pm:markerdragend', handleEdit);

    return () => {
      layer.off('pm:edit', handleEdit);
      layer.off('pm:dragend', handleEdit);
      layer.off('pm:markerdragend', handleEdit);
    };
  }, [handleEdit]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Disponível': return '#10b981';
      case 'Vendido': return '#ef4444';
      case 'Reservado': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  const color = getStatusColor(lote.status);

  return (
    <Polygon
      ref={polygonRef}
      positions={mapCoordinates(lote.polygon)}
      pathOptions={{ 
        color: isActive ? '#fff' : color, 
        fillColor: color,
        fillOpacity: isActive ? 0.7 : 0.4,
        weight: isActive ? 3 : 2,
        dashArray: isActive ? '5, 5' : undefined
      }}
      eventHandlers={{
        click: onClick
      }}
    />
  );
}

export default function LoteamentoView() {
  const { id } = useParams<{ id: string }>();
  const [loteamento, setLoteamento] = useState<any>(null);
  const [lotes, setLotes] = useState<any[]>([]);
  const [corretores, setCorretores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLote, setActiveLote] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [convertingPdf, setConvertingPdf] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const [loteamentoRes, lotesRes, corretoresRes] = await Promise.all([
          fetch(import.meta.env.BASE_URL + `api/loteamentos/${id}`),
          fetch(import.meta.env.BASE_URL + `api/loteamentos/${id}/lotes`),
          fetch(import.meta.env.BASE_URL + 'api/corretores', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (loteamentoRes.ok) {
          const loteamentoData = await loteamentoRes.json();
          setLoteamento(loteamentoData);
        }

        if (lotesRes.ok) {
          const lotesData = await lotesRes.json();
          setLotes(lotesData);
        }

        if (corretoresRes.ok) {
          const corretoresData = await corretoresRes.json();
          setCorretores(corretoresData.filter((c: any) => c.active !== 0));
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
          
          const viewport = page.getViewport({ scale: 2.0 }); 
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

  const handleSaveLote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLote || saving) return;
    setSaving(true);
    const token = localStorage.getItem('adminToken');
    try {
      await fetch(import.meta.env.BASE_URL + `api/lotes/${activeLote.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: activeLote.name,
          area: activeLote.area,
          status: activeLote.status,
          owner: activeLote.owner,
          notes: activeLote.notes,
          photoUrl: activeLote.photoUrl,
          price: activeLote.price,
          buyerName: activeLote.buyerName,
          buyerCpf: activeLote.buyerCpf,
          corretorId: activeLote.corretorId,
          paymentStatus: activeLote.paymentStatus,
          downPayment: activeLote.downPayment,
          installments: activeLote.installments,
          saleDate: activeLote.saleDate || new Date().toISOString().split('T')[0],
          commissionRate: activeLote.commissionRate
        })
      });
      
      if ((activeLote.status === 'Vendido' || activeLote.status === 'Reservado') && activeLote.installments > 0) {
        await fetch(import.meta.env.BASE_URL + `api/parcelas/generate/${activeLote.id}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            downPayment: activeLote.downPayment || 0,
            installments: activeLote.installments,
            startDate: activeLote.saleDate || new Date().toISOString().split('T')[0],
            dayOfMonth: 10,
            commissionRate: activeLote.commissionRate
          })
        });
      }
      
      if (activeLote.status === 'Disponível' || activeLote.status === 'Livre') {
        await fetch(import.meta.env.BASE_URL + `api/financeiro/lote/${activeLote.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      
      setLotes(prev => prev.map(l => l.id === activeLote.id ? activeLote : l));
      setSaving(false);
    } catch (err) {
      console.error("Error saving lote:", err);
      setSaving(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeLote) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setActiveLote({ ...activeLote, photoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateLote = useCallback(async (polygon: number[][]) => {
    if (!id) return;
    const token = localStorage.getItem('adminToken');
    try {
      const newLote = {
        loteamentoId: id,
        name: `Novo Lote`,
        polygon,
        area: '',
        status: 'Disponível',
        owner: '',
        photoUrl: '',
        notes: '',
        price: 0,
        buyerName: '',
        buyerCpf: '',
        brokerName: '',
        paymentStatus: 'pendente',
        downPayment: 0,
        installments: 1
      };
      
      const res = await fetch(import.meta.env.BASE_URL + 'api/lotes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newLote)
      });
      
      if (res.ok) {
        const data = await res.json();
        const createdLote = { id: data.id, ...newLote };
        setLotes(prev => [...prev, createdLote]);
        setActiveLote(createdLote);
      }
    } catch (err) {
      console.error("Error creating lote:", err);
    }
  }, [id]);

  const handleEditPolygon = useCallback(async (loteId: string, newPolygon: number[][]) => {
    const token = localStorage.getItem('adminToken');
    try {
      await fetch(import.meta.env.BASE_URL + `api/lotes/${loteId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ polygon: newPolygon })
      });
      
      setLotes(prev => prev.map(l => l.id === loteId ? { ...l, polygon: newPolygon } : l));
      
      if (activeLote?.id === loteId) {
        setActiveLote((prev: any) => ({ ...prev, polygon: newPolygon }));
      }
    } catch (err) {
      console.error("Error updating polygon:", err);
    }
  }, [activeLote]);

  const handleDeleteLote = async () => {
    if (!activeLote) return;
    const token = localStorage.getItem('adminToken');
    try {
      await fetch(import.meta.env.BASE_URL + `api/lotes/${activeLote.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setLotes(prev => prev.filter(l => l.id !== activeLote.id));
      setActiveLote(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error("Error deleting lote:", err);
    }
  };

  if (loading || !loteamento || (loteamento.imageUrl?.toLowerCase().endsWith('.pdf') && convertingPdf)) {
    return (
      <div className="flex items-center justify-center h-full min-h-[100vh] bg-black">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-neutral-500 font-medium">
            {convertingPdf ? 'Processando planta PDF...' : 'Carregando loteamento...'}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-black font-sans">
      {/* Sidebar - Using new design tokens */}
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`w-full md:w-[420px] bg-white/[0.03] backdrop-blur-3xl border-r border-white/10 shadow-2xl z-20 flex flex-col transition-transform duration-300 ${activeLote ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-transparent">
          <Link to="/admin" className="text-emerald-400 hover:text-emerald-300 flex items-center gap-2 font-bold transition-all hover:-translate-x-1">
            <ArrowLeft className="w-5 h-5" /> Painel
          </Link>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-500" />
            <h2 className="font-bold text-white truncate max-w-[220px] font-heading">{loteamento.name}</h2>
          </div>
        </div>

        {activeLote ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 overflow-y-auto p-8 custom-scrollbar"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-bold text-white font-heading tracking-tight">Editar Lote</h3>
                <p className="text-sm text-neutral-500 mt-1 uppercase tracking-widest font-bold">{activeLote.name}</p>
              </div>
              <button onClick={() => { setActiveLote(null); setShowDeleteConfirm(false); }} className="p-2 rounded-xl bg-white/5 text-neutral-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLote} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-2">Identificação</label>
                  <input
                    type="text"
                    value={activeLote.name}
                    onChange={(e) => setActiveLote({ ...activeLote, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-neutral-600 transition-all font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-2">Status</label>
                  <select
                    value={activeLote.status}
                    onChange={(e) => setActiveLote({ ...activeLote, status: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-emerald-500/50 focus:border-emerald-500 text-white transition-all font-medium"
                  >
                    <option value="Disponível" className="bg-neutral-900">Disponível</option>
                    <option value="Reservado" className="bg-neutral-900">Reservado</option>
                    <option value="Vendido" className="bg-neutral-900">Vendido</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-2">Área (m²)</label>
                  <input
                    type="text"
                    value={activeLote.area}
                    onChange={(e) => setActiveLote({ ...activeLote, area: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-neutral-600 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-2">Valor (R$)</label>
                  <input
                    type="number"
                    value={activeLote.price || ''}
                    onChange={(e) => setActiveLote({ ...activeLote, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-neutral-600 transition-all font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {(activeLote.status === 'Vendido' || activeLote.status === 'Reservado') && (
                <div className="p-6 bg-white/[0.03] rounded-3xl border border-white/5 space-y-5">
                  <h4 className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest mb-4">
                    <DollarSign className="w-4 h-4 text-emerald-500" /> Detalhes Comerciais
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-2">Comprador</label>
                        <input
                          type="text"
                          value={activeLote.buyerName || ''}
                          onChange={(e) => setActiveLote({ ...activeLote, buyerName: e.target.value })}
                          className="w-full px-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-2">CPF</label>
                        <input
                          type="text"
                          value={activeLote.buyerCpf || ''}
                          onChange={(e) => setActiveLote({ ...activeLote, buyerCpf: e.target.value })}
                          className="w-full px-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-white text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-2">Corretor / Taxa %</label>
                      <div className="flex gap-2">
                        <select
                          value={activeLote.corretorId || ''}
                          onChange={(e) => {
                            const cid = e.target.value ? parseInt(e.target.value) : null;
                            const corretor = corretores.find(c => c.id === cid);
                            setActiveLote({ 
                              ...activeLote, 
                              corretorId: cid,
                              commissionRate: corretor ? corretor.commissionRate : activeLote.commissionRate
                            });
                          }}
                          className="flex-1 px-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-white text-sm"
                        >
                          <option value="">Selecione...</option>
                          {corretores.map((corretor) => (
                            <option key={corretor.id} value={corretor.id} className="bg-neutral-900">
                              {corretor.name}
                            </option>
                          ))}
                        </select>
                        <div className="w-24 relative">
                          <input
                            type="number"
                            step="0.1"
                            value={activeLote.commissionRate !== undefined && activeLote.commissionRate !== null ? (activeLote.commissionRate * 100).toFixed(1) : ''}
                            onChange={(e) => setActiveLote({ ...activeLote, commissionRate: parseFloat(e.target.value) / 100 })}
                            className="w-full px-3 py-2.5 bg-black/40 border border-white/5 rounded-xl text-white text-sm pr-7"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-[10px]">%</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-2">Entrada (R$)</label>
                        <input
                          type="number"
                          value={activeLote.downPayment || ''}
                          onChange={(e) => setActiveLote({ ...activeLote, downPayment: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-2">Nº Parcelas</label>
                        <input
                          type="number"
                          value={activeLote.installments || ''}
                          onChange={(e) => setActiveLote({ ...activeLote, installments: parseInt(e.target.value) || 1 })}
                          className="w-full px-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-white text-sm"
                        />
                      </div>
                    </div>

                    {/* Resumo Glow */}
                    {activeLote.price > 0 && activeLote.installments > 0 && (
                      <div className="mt-6 p-5 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-[2rem] shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]">
                        <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3">Plano de Pagamento</h5>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-neutral-400">Total Financiar:</span>
                            <span className="text-white font-bold">R$ {((activeLote.price || 0) - (activeLote.downPayment || 0)).toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between items-center bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                            <span className="text-emerald-400 font-bold">{activeLote.installments}x de:</span>
                            <span className="text-emerald-400 text-lg font-bold font-mono">
                               R$ {(((activeLote.price || 0) - (activeLote.downPayment || 0)) / (activeLote.installments || 1)).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <label className="block text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Multimídia & Notas</label>
                <div className="grid grid-cols-1 gap-4">
                   <div className="aspect-video bg-white/[0.03] border border-white/5 rounded-3xl overflow-hidden group/photo relative cursor-pointer">
                      {activeLote.photoUrl ? (
                         <img src={resolveUrl(activeLote.photoUrl)} alt="Lote" className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform duration-500" />
                      ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600">
                            <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Sem Foto</span>
                         </div>
                      )}
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handlePhotoUpload} />
                   </div>
                   <textarea
                     value={activeLote.notes}
                     onChange={(e) => setActiveLote({ ...activeLote, notes: e.target.value })}
                     rows={3}
                     className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-3xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 resize-none transition-all"
                     placeholder="Anotações internas..."
                   />
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 group"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                  Salvar Alterações
                </button>
                
                <button
                   type="button"
                   onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                   className={`w-14 h-14 rounded-2xl border transition-all flex items-center justify-center ${showDeleteConfirm ? 'bg-red-500 border-red-500 text-white' : 'bg-white/5 border-white/10 text-red-400 hover:bg-red-500/10'}`}
                >
                   {showDeleteConfirm ? <Check onClick={handleDeleteLote} className="w-6 h-6" /> : <Trash2 className="w-5 h-5" />}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-24 h-24 bg-white/[0.03] rounded-full flex items-center justify-center mb-8 border border-white/10 relative">
               <div className="absolute inset-0 bg-emerald-500/10 blur-xl animate-pulse rounded-full" />
               <Navigation className="w-10 h-10 text-emerald-500 relative z-10" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 font-heading tracking-tight">Otimize a Gestão</h3>
            <p className="text-neutral-500 text-sm max-w-[280px] leading-relaxed">Clique em um lote no mapa interativo ao lado para gerenciar vendas, pagamentos e fotos.</p>
            
            <div className="mt-12 space-y-4 w-full">
              <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest text-left px-2">Guia de Cores</h4>
              <div className="grid grid-cols-3 gap-2">
                 <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Livre</span>
                 </div>
                 <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                    <span className="text-[10px] font-bold text-amber-400 uppercase">Reserva</span>
                 </div>
                 <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                    <span className="text-[10px] font-bold text-red-400 uppercase">Venda</span>
                 </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Map Area */}
      <div className="flex-1 relative bg-black">
        <MapContainer 
          crs={L.CRS.Simple} 
          bounds={IMAGE_BOUNDS} 
          maxZoom={4}
          minZoom={-2}
          className="w-full h-full"
          style={{ height: '100%', width: '100%' }}
        >
          {mapImageUrl && (
            <ImageOverlay
              url={resolveUrl(mapImageUrl)}
              bounds={IMAGE_BOUNDS}
            />
          )}
          
          <GeomanControl onLoteCreate={handleCreateLote} />
          
          {lotes.map((lote) => (
            <EditablePolygon
              key={lote.id}
              lote={lote}
              isActive={activeLote?.id === lote.id}
              onClick={() => {
                setActiveLote(lote);
                setShowDeleteConfirm(false);
              }}
              onEdit={handleEditPolygon}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
