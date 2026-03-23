import React, { useEffect, useState } from 'react';
import { Search, Mail, Loader2, Calendar, MapPin, Copy, Check, MessageCircle, GripVertical, Plus, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COLUMNS = [
  { id: 'Novo', title: 'Novos Leads', color: 'blue', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', textColor: 'text-blue-400', dotColor: 'bg-blue-400' },
  { id: 'Em Atendimento', title: 'Em Atendimento', color: 'amber', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', textColor: 'text-amber-400', dotColor: 'bg-amber-400' },
  { id: 'Convertido', title: 'Convertidos', color: 'emerald', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', textColor: 'text-emerald-400', dotColor: 'bg-emerald-400' },
  { id: 'Perdido', title: 'Perdidos', color: 'red', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', textColor: 'text-red-400', dotColor: 'bg-red-400' },
];

export default function Contatos() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [draggedLead, setDraggedLead] = useState<any | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Função para limpar número e criar link do WhatsApp
  const getWhatsAppLink = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullNumber = cleanPhone.length === 11 ? `55${cleanPhone}` : 
                       cleanPhone.length === 13 ? cleanPhone : 
                       `55${cleanPhone}`;
    return `https://wa.me/${fullNumber}`;
  };

  // Função para copiar email
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

  // Drag and Drop handlers
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

  const handleDragLeave = () => {
    setDragOverColumn(null);
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
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
        <p className="text-emerald-500/70 font-mono text-sm tracking-widest uppercase">Carregando Leads...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Kanban de Contatos</h2>
          <p className="text-neutral-400">Arraste os cards entre as colunas para mudar o status.</p>
        </div>
        
        {/* Busca */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max h-full">
          {COLUMNS.map((column) => {
            const columnLeads = getLeadsByStatus(column.id);
            const isOver = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                className={`w-80 flex flex-col rounded-2xl transition-all duration-200 ${
                  isOver ? 'ring-2 ring-white/30 scale-[1.02]' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column Header */}
                <div className={`${column.bgColor} ${column.borderColor} border rounded-t-2xl p-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${column.dotColor}`} />
                    <h3 className={`font-semibold ${column.textColor}`}>{column.title}</h3>
                  </div>
                  <span className={`${column.textColor} bg-black/20 px-2 py-0.5 rounded-full text-sm font-medium`}>
                    {columnLeads.length}
                  </span>
                </div>

                {/* Column Content */}
                <div className={`flex-1 ${column.bgColor} ${column.borderColor} border-x border-b rounded-b-2xl p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-220px)]`}>
                  <AnimatePresence mode="popLayout">
                    {columnLeads.length === 0 ? (
                      <div className="text-center py-8 text-neutral-500 text-sm">
                        {isOver ? (
                          <p className="text-white/70">Solte aqui</p>
                        ) : (
                          <p>Nenhum lead</p>
                        )}
                      </div>
                    ) : (
                      columnLeads.map((lead) => (
                        <motion.div
                          key={lead.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead)}
                          onDragEnd={handleDragEnd}
                          className={`bg-neutral-900/80 border border-white/10 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-white/20 transition-all group ${
                            draggedLead?.id === lead.id ? 'opacity-50 scale-95' : ''
                          }`}
                        >
                          {/* Drag Handle */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full ${column.bgColor} flex items-center justify-center shrink-0`}>
                                <span className={`${column.textColor} font-bold text-lg`}>
                                  {lead.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-white">{lead.name}</p>
                              </div>
                            </div>
                            <GripVertical className="w-4 h-4 text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>

                          {/* Contact Info */}
                          <div className="space-y-2">
                            <button
                              onClick={(e) => copyEmail(e, lead.email)}
                              className="flex items-center gap-2 text-xs text-neutral-400 hover:text-emerald-400 transition-colors w-full"
                            >
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate">{lead.email}</span>
                              {copiedEmail === lead.email ? (
                                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                              ) : (
                                <Copy className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100" />
                              )}
                            </button>

                            <a
                              href={getWhatsAppLink(lead.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-2 text-xs text-neutral-400 hover:text-green-400 transition-colors"
                            >
                              <MessageCircle className="w-3 h-3 shrink-0" />
                              <span className="underline underline-offset-2">{lead.phone}</span>
                            </a>

                            {lead.loteName && (
                              <div className="flex items-center gap-2 text-xs text-neutral-400 pt-1">
                                <MapPin className="w-3 h-3 shrink-0 text-emerald-400" />
                                <span className="truncate">{lead.loteName}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 text-xs text-neutral-500 pt-1">
                              <Calendar className="w-3 h-3 shrink-0" />
                              <span>{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</span>
                            </div>
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