import React, { useState, useEffect } from 'react';
import { Save, Loader2, Settings, MessageSquare, Globe, ShieldCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Configuracoes() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>({
    whatsapp: '',
    nome_empresa: 'LotearPro',
    cor_primaria: '#10b981'
  });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'api/configuracoes')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object') {
          setConfig(prev => ({ ...prev, ...data }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/configuracoes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-12">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-4">
           <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Settings className="w-6 h-6 text-emerald-500" />
           </div>
           <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white font-heading">Configurações <span className="text-emerald-500">Globais</span></h1>
              <p className="text-neutral-500 font-medium">Parâmetros centrais do sistema e integração CRM.</p>
           </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Navigation Sidebar-like Tabs */}
        <div className="space-y-2">
           <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3 font-bold cursor-pointer">
              <MessageSquare className="w-5 h-5" /> Canais de Conversão
           </div>
           <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-neutral-500 flex items-center gap-3 font-bold hover:bg-white/10 transition-all cursor-not-allowed opacity-50">
              <Globe className="w-5 h-5" /> Domínio & SEO
           </div>
           <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-neutral-500 flex items-center gap-3 font-bold hover:bg-white/10 transition-all cursor-not-allowed opacity-50">
              <ShieldCheck className="w-5 h-5" /> Segurança
           </div>
        </div>

        {/* Content Area */}
        <div className="md:col-span-2 space-y-8">
           <form onSubmit={handleSave} className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl space-y-8 relative overflow-hidden sidebar-glow">
              <div className="space-y-6">
                 <div>
                    <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-[0.3em] mb-3 px-1 flex items-center gap-2">
                       <Zap className="w-3 h-3 text-emerald-500" /> WhatsApp Central (CRM)
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: 5511999999999"
                      value={config.whatsapp || ''}
                      onChange={e => setConfig({...config, whatsapp: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all"
                    />
                    <p className="text-xs text-neutral-600 mt-3 px-1 italic">Este número será usado para o redirecionamento automático de leads da página pública.</p>
                 </div>

                 <div>
                    <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-[0.3em] mb-3 px-1">Nome da Plataforma</label>
                    <input 
                      type="text" 
                      value={config.nome_empresa || ''}
                      onChange={e => setConfig({...config, nome_empresa: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all"
                    />
                 </div>
              </div>

              <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                 <AnimatePresence>
                    {success && (
                      <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-emerald-500 font-bold text-xs">
                         Configurações Salvas com Sucesso!
                      </motion.span>
                    )}
                 </AnimatePresence>
                 
                 <button 
                   disabled={saving}
                   type="submit"
                   className="px-12 py-5 bg-emerald-500 text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-white transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-3 active:scale-95 disabled:opacity-50"
                 >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Salvar Alterações
                 </button>
              </div>
           </form>

           <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] p-8 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                 <Globe className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-neutral-500 text-sm leading-relaxed">
                 <span className="text-emerald-400 font-bold">Dica:</span> As alterações de WhatsApp refletem instantaneamente em todos os botões "Tenho Interesse" do portal público, gerando logs automáticos no dashboard de leads.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
