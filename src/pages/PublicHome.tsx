import React, { useEffect, useState } from 'react';
import { resolveUrl } from '../utils/url';
import { Link } from 'react-router-dom';
import { Map, Calendar, Loader2, ArrowRight, MapPin, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
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
        
        // Fetch lote counts for each loteamento
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
              // Collect all lotes with images for carousel
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

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    if (allLotes.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % allLotes.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [allLotes.length]);

  const nextSlide = () => {
    if (allLotes.length > 0) {
      setCurrentSlide(prev => (prev + 1) % allLotes.length);
    }
  };

  const prevSlide = () => {
    if (allLotes.length > 0) {
      setCurrentSlide(prev => (prev - 1 + allLotes.length) % allLotes.length);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] bg-neutral-950">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
        <p className="text-emerald-500/70 font-mono text-sm tracking-widest uppercase">Carregando Loteamentos...</p>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-neutral-950 font-sans selection:bg-emerald-500/30">
      {/* Background Map */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
        <MapContainer 
          center={[-15.7801, -47.9292]} // Center of Brazil
          zoom={4} 
          zoomControl={false}
          attributionControl={false}
          className="w-full h-full bg-[#0a0a0a]"
          style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        </MapContainer>
        {/* Vignette overlay for cinematic feel */}
        <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] z-10" />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 w-full max-w-7xl mx-auto p-6 md:p-12 min-h-screen flex flex-col">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

        {/* Hero with Carousel */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-16 relative mt-8"
        >
          {/* Carousel */}
          {allLotes.length > 0 && (
            <div className="mb-12 rounded-3xl overflow-hidden border border-white/10 group">
              <div className="relative aspect-[16/9] md:aspect-[21/9] w-full bg-neutral-900 overflow-hidden">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0"
                >
                  <img
                    src={allLotes[currentSlide].photoUrl}
                    alt={allLotes[currentSlide].name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                </motion.div>

                {/* Carousel Content Overlay */}
                <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16 z-20">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="max-w-2xl"
                  >
                    <p className="text-emerald-400 font-mono text-sm uppercase tracking-widest mb-3 drop-shadow-lg">
                      Lote {allLotes[currentSlide].number || allLotes[currentSlide].id}
                    </p>
                    <h3 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-2xl">
                      {allLotes[currentSlide].loteamentoName}
                    </h3>
                    <p className="text-neutral-200 text-lg md:text-xl drop-shadow-lg mb-6">
                      {allLotes[currentSlide].description || 'Terreno disponível para construção de sua moradia'}
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <Link
                        to={`/loteamento/${allLotes[currentSlide].loteamentoId}`}
                        className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-full hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
                      >
                        Ver Detalhes <ArrowRight className="w-5 h-5" />
                      </Link>
                      <a
                        href={`https://wa.me/5500000000000?text=Olá! Estou interessado no lote ${allLotes[currentSlide].number || allLotes[currentSlide].id} de ${allLotes[currentSlide].loteamentoName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-full transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
                      >
                        <MessageCircle className="w-5 h-5" /> Tenho Interesse
                      </a>
                    </div>
                  </motion.div>
                </div>

                {/* Navigation Buttons */}
                <button
                  onClick={prevSlide}
                  className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 bg-black/40 backdrop-blur-md hover:bg-black/60 text-white p-3 rounded-full transition-all duration-300 hover:scale-110 border border-white/20 hover:border-emerald-500/50"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 bg-black/40 backdrop-blur-md hover:bg-black/60 text-white p-3 rounded-full transition-all duration-300 hover:scale-110 border border-white/20 hover:border-emerald-500/50"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Carousel Indicators */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                  {allLotes.map((_, index) => (
                    <motion.button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        index === currentSlide ? 'bg-emerald-500 w-8' : 'bg-white/30 hover:bg-white/50'
                      }`}
                      whileHover={{ scale: 1.2 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Title Section */}
          <div className="text-center">
            <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight drop-shadow-2xl">
              Loteamentos <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Disponíveis</span>
            </h2>
            <p className="text-neutral-300 max-w-2xl mx-auto text-lg md:text-xl leading-relaxed drop-shadow-md">
              Explore nossos empreendimentos, visualize as plantas interativas em tempo real e encontre o terreno perfeito para o seu futuro.
            </p>
          </div>
        </motion.div>

        {loteamentos.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24 bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-2xl mx-auto w-full"
          >
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
              <Map className="w-10 h-10 text-neutral-500" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2 tracking-wide">Nenhum loteamento disponível</h3>
            <p className="text-neutral-500">Volte mais tarde para conferir novos empreendimentos.</p>
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {loteamentos.map((loteamento) => (
              <motion.div key={loteamento.id} variants={itemVariants}>
                <Link
                  to={`/loteamento/${loteamento.id}`}
                  className="group block bg-black/60 backdrop-blur-2xl rounded-3xl border border-white/10 overflow-hidden hover:bg-black/80 transition-all duration-500 hover:shadow-[0_0_50px_rgba(16,185,129,0.2)] hover:border-emerald-500/50 relative"
                >
                  {/* Image Container */}
                  <div className="aspect-[4/3] w-full bg-neutral-900 relative overflow-hidden">
                    {loteamento.imageUrl ? (
                      <>
                        <img
                          src={resolveUrl(loteamento.imageUrl)}
                          alt={loteamento.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out opacity-80 group-hover:opacity-100 mix-blend-screen"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 bg-neutral-900/50">
                        <Map className="w-12 h-12 mb-3 opacity-50" />
                        <span className="text-xs uppercase tracking-widest font-mono">Sem Imagem</span>
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
                      <span className="text-xs font-medium text-white tracking-wider uppercase">Ativo</span>
                    </div>
                    
                    {/* New Badge - for loteamentos created in the last 30 days */}
                    {(Date.now() - new Date(loteamento.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000 && (
                      <div className="absolute top-4 left-4 bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 rounded-full">
                        <span className="text-xs font-bold text-white tracking-wider uppercase drop-shadow-md">Novo</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6 relative">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">{loteamento.name}</h3>
                        <div className="flex items-center text-sm text-neutral-400 gap-2">
                          <MapPin className="w-4 h-4 text-emerald-500/70" />
                          <span>Planta Interativa</span>
                        </div>
                      </div>
                    </div>

                    {/* Lotes Count */}
                    {lotesCounts[loteamento.id] && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-medium">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {lotesCounts[loteamento.id].disponiveis} disponíveis
                        </div>
                        {lotesCounts[loteamento.id].reservados > 0 && (
                          <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full text-xs font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            {lotesCounts[loteamento.id].reservados} reservados
                          </div>
                        )}
                        {lotesCounts[loteamento.id].vendidos > 0 && (
                          <div className="flex items-center gap-1.5 bg-red-500/20 text-red-400 px-3 py-1.5 rounded-full text-xs font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            {lotesCounts[loteamento.id].vendidos} vendidos
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
                      <div className="flex items-center text-xs text-neutral-500 font-mono gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(loteamento.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm group-hover:translate-x-1 transition-transform">
                        Explorar <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/5500000000000?text=Olá! Gostaria de saber mais sobre os loteamentos disponíveis."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white px-5 py-3.5 rounded-full shadow-[0_4px_20px_rgba(34,197,94,0.4)] hover:shadow-[0_6px_30px_rgba(34,197,94,0.5)] transition-all duration-300 hover:scale-105 group"
      >
        <MessageCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <span className="font-semibold text-sm hidden sm:block">Fale Conosco</span>
      </a>
    </div>
  );
}
