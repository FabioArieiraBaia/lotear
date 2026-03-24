import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, TrendingUp, CheckCircle, Clock, DollarSign, Loader2 } from 'lucide-react';
import { resolveUrl } from '../utils/url';
import PdfThumbnail from './PdfThumbnail';

interface QuickViewProps {
  id: string | number;
  children: React.ReactNode;
}

export default function LoteamentoQuickView({ id, children }: QuickViewProps) {
  const [show, setShow] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (show && !data && !loading) {
      setLoading(true);
      fetch(import.meta.env.BASE_URL + `api/loteamentos/${id}`)
        .then(res => res.json())
        .then(loteamento => {
          // Fetch additional stats
          return fetch(import.meta.env.BASE_URL + `api/loteamentos/${id}/lotes`)
            .then(res => res.json())
            .then(lotes => {
              const stats = {
                total: lotes.length,
                disponiveis: lotes.filter((l: any) => l.status === 'Disponível').length,
                vendidos: lotes.filter((l: any) => l.status === 'Vendido').length,
                vgv: lotes.reduce((acc: number, l: any) => acc + (l.price || 0), 0)
              };
              setData({ ...loteamento, stats });
              setLoading(false);
            });
        })
        .catch(() => setLoading(false));
    }
  }, [show, id, data, loading]);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div 
      className="inline-block relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onMouseMove={handleMouseMove}
    >
      {children}

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            style={{ 
              position: 'fixed',
              left: mousePos.x + 20,
              top: mousePos.y - 100,
              zIndex: 9999,
              pointerEvents: 'none'
            }}
            className="w-80 glass-card rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-emerald-500/20"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full" />
            
            {loading && !data ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
                <span className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Sincronizando Dados</span>
              </div>
            ) : data ? (
              <div className="relative">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20 shadow-lg">
                    <Map className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white leading-tight font-heading">{data.name}</h4>
                    <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Preview Estratégico</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                    <p className="text-[8px] text-neutral-500 uppercase font-bold mb-1">Ocupação</p>
                    <div className="flex items-center gap-2">
                       <CheckCircle className="w-3 h-3 text-emerald-500" />
                       <span className="text-sm font-bold text-white">{data.stats.vendidos}/{data.stats.total}</span>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                    <p className="text-[8px] text-neutral-500 uppercase font-bold mb-1">Disponíveis</p>
                    <div className="flex items-center gap-2">
                       <Clock className="w-3 h-3 text-amber-500" />
                       <span className="text-sm font-bold text-white">{data.stats.disponiveis}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] text-neutral-400 uppercase font-bold">VGV Estimado</span>
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                  </div>
                  <p className="text-xl font-bold text-white font-heading">
                    {data.stats.vgv.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                  </p>
                </div>

                {data.imageUrl && (
                   <div className="aspect-video rounded-xl overflow-hidden border border-white/10 opacity-70 group-hover:opacity-100 transition-opacity">
                      {data.imageUrl.toLowerCase().endsWith('.pdf') ? (
                         <PdfThumbnail 
                           url={resolveUrl(data.imageUrl)} 
                           alt={data.name} 
                           className="w-full h-full object-cover grayscale brightness-[0.4]" 
                           scale={0.4} 
                         />
                      ) : (
                         <img 
                           src={resolveUrl(data.imageUrl)} 
                           alt={data.name} 
                           className="w-full h-full object-cover grayscale brightness-[0.4]" 
                         />
                      )}
                   </div>
                )}
                
                <div className="mt-4 flex items-center gap-2 justify-center">
                   <div className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                   <span className="text-[8px] text-emerald-500 uppercase font-black tracking-widest">Visão HUD Ativa</span>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
