import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, ImageOverlay, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { Loader2, ArrowLeft, Save, Image as ImageIcon, X, Trash2, MapPin, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
        color: isActive ? '#000' : color, 
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
  const [loading, setLoading] = useState(true);
  const [activeLote, setActiveLote] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [loteamentoRes, lotesRes] = await Promise.all([
          fetch(`/api/loteamentos/${id}`),
          fetch(`/api/loteamentos/${id}/lotes`)
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

  const handleSaveLote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLote) return;
    setSaving(true);
    const token = localStorage.getItem('adminToken');
    try {
      await fetch(`/api/lotes/${activeLote.id}`, {
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
          brokerName: activeLote.brokerName,
          paymentStatus: activeLote.paymentStatus,
          downPayment: activeLote.downPayment,
          installments: activeLote.installments
        })
      });
      
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
      
      const res = await fetch('/api/lotes', {
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
      await fetch(`/api/lotes/${loteId}`, {
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
      await fetch(`/api/lotes/${activeLote.id}`, {
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

  if (loading || !loteamento) {
    return (
      <div className="flex items-center justify-center h-full min-h-[100vh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin text-emerald-400 mx-auto mb-4" />
          <p className="text-gray-400">Carregando loteamento...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Sidebar */}
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`w-full md:w-96 bg-gray-900/80 backdrop-blur-xl border-r border-white/10 shadow-2xl z-20 flex flex-col transition-transform duration-300 ${activeLote ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-900/50 to-teal-900/50">
          <Link to="/" className="text-emerald-400 hover:text-emerald-300 flex items-center gap-2 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <h2 className="font-bold text-white truncate max-w-[200px]">{loteamento.name}</h2>
          </div>
        </div>

        {activeLote ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 overflow-y-auto p-6"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Editar Lote</h3>
                <p className="text-sm text-gray-400 mt-1">{activeLote.name}</p>
              </div>
              <button onClick={() => { setActiveLote(null); setShowDeleteConfirm(false); }} className="text-gray-500 hover:text-gray-300 md:hidden transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveLote} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Identificação</label>
                <input
                  type="text"
                  value={activeLote.name}
                  onChange={(e) => setActiveLote({ ...activeLote, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-white/10 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder-gray-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  value={activeLote.status}
                  onChange={(e) => setActiveLote({ ...activeLote, status: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-white/10 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-white transition-all"
                >
                  <option value="Disponível" className="bg-gray-800">Disponível</option>
                  <option value="Reservado" className="bg-gray-800">Reservado</option>
                  <option value="Vendido" className="bg-gray-800">Vendido</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Área (m²)</label>
                  <input
                    type="text"
                    value={activeLote.area}
                    onChange={(e) => setActiveLote({ ...activeLote, area: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-white/10 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder-gray-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    value={activeLote.price || ''}
                    onChange={(e) => setActiveLote({ ...activeLote, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-white/10 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder-gray-500 transition-all"
                    placeholder="150.000"
                  />
                </div>
              </div>

              {(activeLote.status === 'Vendido' || activeLote.status === 'Reservado') && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                  <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2">Dados da Venda</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nome do Comprador</label>
                      <input
                        type="text"
                        value={activeLote.buyerName || ''}
                        onChange={(e) => setActiveLote({ ...activeLote, buyerName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">CPF do Comprador</label>
                      <input
                        type="text"
                        value={activeLote.buyerCpf || ''}
                        onChange={(e) => setActiveLote({ ...activeLote, buyerCpf: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Corretor Responsável</label>
                    <input
                      type="text"
                      value={activeLote.brokerName || ''}
                      onChange={(e) => setActiveLote({ ...activeLote, brokerName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Valor da Entrada (R$)</label>
                      <input
                        type="number"
                        value={activeLote.downPayment || ''}
                        onChange={(e) => setActiveLote({ ...activeLote, downPayment: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nº de Parcelas</label>
                      <input
                        type="number"
                        value={activeLote.installments || ''}
                        onChange={(e) => setActiveLote({ ...activeLote, installments: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status do Pagamento</label>
                    <select
                      value={activeLote.paymentStatus || 'pendente'}
                      onChange={(e) => setActiveLote({ ...activeLote, paymentStatus: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_dia">Em Dia</option>
                      <option value="atrasado">Atrasado</option>
                      <option value="quitado">Quitado</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto do Lote</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md relative overflow-hidden group">
                  {activeLote.photoUrl ? (
                    <div className="absolute inset-0 w-full h-full">
                      <img src={activeLote.photoUrl} alt="Lote" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-sm font-medium flex items-center gap-1">
                          <ImageIcon className="w-4 h-4" /> Trocar
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 text-center">
                      <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                      <div className="flex text-sm text-gray-600 justify-center">
                        <span className="relative cursor-pointer bg-white rounded-md font-medium text-emerald-600 hover:text-emerald-500">
                          Adicionar foto
                        </span>
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Anotações</label>
                <textarea
                  value={activeLote.notes}
                  onChange={(e) => setActiveLote({ ...activeLote, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  placeholder="Detalhes sobre o terreno, negociação, etc."
                />
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </button>
                
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2 bg-red-50 p-1 rounded-md border border-red-200">
                    <button
                      type="button"
                      onClick={handleDeleteLote}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded"
                    >
                      Excluir
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium rounded"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium py-2 px-4 rounded-md transition-colors"
                    title="Excluir Lote"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
            <div className="w-16 h-16 bg-gray-800/50 backdrop-blur rounded-full flex items-center justify-center mb-4 border border-white/10">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
            <p className="text-lg font-medium text-white mb-2">Nenhum lote selecionado</p>
            <p className="text-sm mb-6">Clique em um lote no mapa para visualizar e editar suas informações.</p>
            
            <div className="bg-emerald-900/30 text-emerald-300 p-4 rounded-lg text-sm text-left mb-8 border border-emerald-500/20 backdrop-blur">
              <p className="font-semibold mb-1">Ferramentas do Mapa:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Use o ícone de polígono na esquerda para desenhar novos lotes.</li>
                <li>Use o ícone de edição para ajustar os pontos de um lote existente.</li>
              </ul>
            </div>

            <div className="w-full text-left">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Legenda</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Disponível
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div> Reservado
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div> Vendido
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Map Area */}
      <div className="flex-1 relative bg-gray-900">
        <MapContainer 
          crs={L.CRS.Simple} 
          bounds={IMAGE_BOUNDS} 
          maxZoom={4}
          minZoom={-2}
          className="w-full h-full"
          style={{ height: '100%', width: '100%' }}
        >
          <ImageOverlay
            url={loteamento.imageUrl}
            bounds={IMAGE_BOUNDS}
          />
          
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
