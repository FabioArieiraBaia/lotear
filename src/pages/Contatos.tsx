import React, { useEffect, useState } from 'react';
import { 
  Search, Mail, Loader2, Calendar, MapPin, Copy, Check, 
  MessageCircle, GripVertical, Plus, User, 
  TrendingUp, Users, Target, MousePointer2, ChevronRight, X
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

const COLUMNS = [
  { id: 'Novo', title: 'Novos Leads', color: 'blue', bgColor: 'from-blue-500/10 to-blue-500/5', borderColor: 'border-blue-500/20', textColor: 'text-blue-400', dotColor: 'bg-blue-400' },
  { id: 'Em Atendimento', title: 'Atendimento', color: 'amber', bgColor: 'from-amber-500/10 to-amber-500/5', borderColor: 'border-amber-500/20', textColor: 'text-amber-400', dotColor: 'bg-amber-400' },
  { id: 'Convertido', title: 'Convertidos', color: 'emerald', bgColor: 'from-emerald-500/10 to-emerald-500/5', borderColor: 'border-emerald-500/20', textColor: 'text-emerald-400', dotColor: 'bg-emerald-400' },
  { id: 'Perdido', title: 'Perdidos', color: 'red', bgColor: 'from-red-500/10 to-red-500/5', borderColor: 'border-red-500/20', textColor: 'text-red-400', dotColor: 'bg-red-400' },
];

export default function Contatos() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [draggedLead, setDraggedLead] = useState<any | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const getWhatsAppLink = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullNumber = cleanPhone.length === 11 ? `55${cleanPhone}` : 
                       cleanPhone.length === 13 ? cleanPhone : 
                       `55${cleanPhone}`;
    return `https://wa.me/${fullNumber}`;
  };

  const copyEmail = async (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/leads', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.error("Error fetching leads:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(import.meta.env.BASE_URL + `api/leads/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setLeads(leads.map(lead => lead.id === id ? { ...lead, status } : lead));
      }
    } catch (err) {
      console.error("Error updating lead status:", err);
    }
  };

  const handleDragStart = (e: React.DragEvent, lead: any) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', lead.id.toString());
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedLead && draggedLead.status !== newStatus) {
      updateLeadStatus(draggedLead.id, newStatus);
    }
    setDraggedLead(null);
    setDragOverColumn(null);
  };

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone.includes(searchTerm)
  );

  const getLeadsByStatus = (status: string) => {
    return filteredLeads.filter(lead => lead.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Target className="w-6 h-6 text-emerald-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto pb-12 font-sans flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 shrink-0">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-4xl font-bold text-white mb-2 font-heading tracking-tight">Conversão de <span className="text-emerald-500">Leads</span></h2>
          <p className="text-neutral-500 font-medium">Pipeline comercial interativo para gestão de prospects e negociações.</p>
        </motion.div>
        
        <div className="flex gap-4">
           <div className="relative group/search">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within/search:text-emerald-500 transition-colors" />
             <input 
               type="text" 
               placeholder="Buscar prospect..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 min-w-[300px] transition-all"
             />
           </div>
           <div className="text-right hidden sm:block px-6 py-2.5 bg-white/5 border border-white/10 rounded-2xl">
              <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest leading-none mb-1">Taxa Conversão</p>
              <p className="text-xl font-bold text-white leading-none font-heading">
                {leads.length > 0 ? ((leads.filter(l => l.status === 'Convertido').length / leads.length) * 100).toFixed(0) : 0}%
              </p>
           </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-6 scrollbar-hide">
        <div className="flex gap-6 min-w-max h-full">
          {COLUMNS.map((column) => {
            const columnLeads = getLeadsByStatus(column.id);
            const isOver = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => handleDrop(e, column.id)}
                className="w-80 flex flex-col h-full"
              >
                {/* Column Header */}
                <div className={`shrink-0 p-5 rounded-t-[2rem] bg-gradient-to-b ${column.bgColor} border-t border-x ${column.borderColor} flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${column.dotColor} shadow-[0_0_10px_rgba(255,255,255,0.1)]`} />
                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${column.textColor}`}>{column.title}</h3>
                  </div>
                  <span className="bg-white/5 border border-white/10 text-white/50 px-3 py-1 rounded-full text-[10px] font-black">
                    {columnLeads.length}
                  </span>
                </div>

                {/* Column Content */}
                <div className={`flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 border-x border-b rounded-b-[2rem] ${column.borderColor} ${isOver ? 'bg-white/[0.04]' : 'bg-white/[0.01]'} transition-all`}>
                  <AnimatePresence>
                    {columnLeads.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 pointer-events-none">
                         <Target className="w-8 h-8 text-neutral-500 mb-2" />
                         <p className="text-[10px] uppercase font-black tracking-widest">Vazio</p>
                      </div>
                    ) : (
                      columnLeads.map((lead) => (
                        <motion.div
                          key={lead.id}
                          layoutId={lead.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead)}
                          onDragEnd={handleDragEnd}
                          className={`bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-5 cursor-grab active:cursor-grabbing hover:bg-white/[0.06] hover:border-white/20 transition-all group relative sidebar-glow ${
                            draggedLead?.id === lead.id ? 'opacity-30' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                                  <span className="text-white font-black text-sm">{lead.name.charAt(0).toUpperCase()}</span>
                               </div>
                               <div>
                                  <p className="text-[13px] font-bold text-white group-hover:text-emerald-400 transition-colors leading-tight">{lead.name}</p>
                                  <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</p>
                               </div>
                            </div>
                            <GripVertical className="w-4 h-4 text-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>

                          <div className="space-y-3">
                             <div className="flex flex-col gap-1.5">
                                <button
                                  onClick={(e) => copyEmail(e, lead.email)}
                                  className="flex items-center gap-2 text-[11px] text-neutral-400 hover:text-white transition-colors w-full group/email"
                                >
                                  <Mail className="w-3.5 h-3.5 text-emerald-500/50" />
                                  <span className="truncate flex-1 text-left">{lead.email}</span>
                                  {copiedEmail === lead.email ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-0 group-hover/email:opacity-100" />}
                                </button>

                                <a
                                  href={getWhatsAppLink(lead.phone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-[11px] text-neutral-400 hover:text-green-400 transition-colors"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-green-500/50" />
                                  <span className="font-bold">{lead.phone}</span>
                                </a>
                             </div>

                             {lead.loteName && (
                               <div className="pt-3 border-t border-white/5 flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                     <MapPin className="w-3 h-3 text-emerald-500" />
                                  </div>
                                  <span className="text-[10px] text-neutral-300 font-bold uppercase tracking-tight truncate">{lead.loteName}</span>
                               </div>
                             )}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}