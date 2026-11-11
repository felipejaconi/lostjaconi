import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Save, Building, Phone, Mail, MapPin, Tag, Truck } from "lucide-react";
import Swal from "sweetalert2";
import api from "../../lib/api";

export default function AdminWarehouseConfig() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    nome: "Lost Wind, Lda",
    responsavel: "RAYLTSON CELIO DOMINGUES",
    telefone: "",
    email: "lostwind18@gmail.com",
    endereco: "",
    horario: "08:00 as 18:00",
    dias_operacao: "Seg a Sex",
    tempo_entrega_padrao: "48h",
    capacidade_max: ""
  });

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data } = await api.get('/admin/config/armazem');
        if (data && Object.keys(data).length > 0) {
          setConfig(data);
        }
      } catch (e) {
        console.error("Erro ao carregar configurações", e);
      }
    };
    loadConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/admin/config/armazem', config);
      Swal.fire({
        icon: "success",
        title: "Sucesso",
        text: "Configurações do armazém atualizadas com sucesso!",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        background: "#050505",
        color: "#fff"
      });
    } catch (error) {
      console.error(error);
      Swal.fire("Erro", "Falha ao gravar configurações.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-[#050505] text-slate-200 font-sans pt-2 lg:pt-4 px-4 lg:px-8 pb-8 flex flex-col relative w-full">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-white uppercase flex items-center gap-3">
            <Building className="text-yellow-500" size={32} />
            Configuração do Armazém
          </h1>
          <p className="text-slate-500 mt-1">Gerencie os dados e parâmetros gerais do centro de distribuição operacional.</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        <form onSubmit={handleSave} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 sm:p-8 space-y-8 shadow-xl">
          
          <div className="space-y-6">
             <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-white/5 pb-2">Informações Base</h3>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-400">Nome do Armazém</label>
                 <div className="relative">
                   <Building size={16} className="absolute left-3 top-3.5 text-slate-500" />
                   <input
                     name="nome"
                     value={config.nome}
                     onChange={handleChange}
                     className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-10 py-3 text-sm text-white focus:border-yellow-500/50 outline-none transition-colors"
                   />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-400">Responsável / Gerente</label>
                 <div className="relative">
                   <Tag size={16} className="absolute left-3 top-3.5 text-slate-500" />
                   <input
                     name="responsavel"
                     value={config.responsavel}
                     onChange={handleChange}
                     className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-10 py-3 text-sm text-white focus:border-yellow-500/50 outline-none transition-colors"
                   />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-400">Telefone de Contato</label>
                 <div className="relative">
                   <Phone size={16} className="absolute left-3 top-3.5 text-slate-500" />
                   <input
                     name="telefone"
                     value={config.telefone}
                     onChange={handleChange}
                     className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-10 py-3 text-sm text-white focus:border-yellow-500/50 outline-none transition-colors"
                   />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-400">Email de Contato</label>
                 <div className="relative">
                   <Mail size={16} className="absolute left-3 top-3.5 text-slate-500" />
                   <input
                     name="email"
                     type="email"
                     value={config.email}
                     onChange={handleChange}
                     className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-10 py-3 text-sm text-white focus:border-yellow-500/50 outline-none transition-colors"
                   />
                 </div>
               </div>
             </div>

             <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-400">Endereço Físico</label>
                 <div className="relative">
                   <MapPin size={16} className="absolute left-3 top-4 text-slate-500" />
                   <textarea
                     name="endereco"
                     value={config.endereco}
                     onChange={handleChange}
                     rows={3}
                     className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-yellow-500/50 outline-none transition-colors resize-none"
                   />
                 </div>
             </div>
          </div>

          <div className="space-y-6 pt-4">
             <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-white/5 pb-2">Parâmetros Operacionais</h3>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-400">Horário de Funcionamento</label>
                 <input
                   name="horario"
                   value={config.horario}
                   onChange={handleChange}
                   className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-yellow-500/50 outline-none transition-colors"
                 />
               </div>
               
               <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-400">Dias de Operação</label>
                 <input
                   name="dias_operacao"
                   value={config.dias_operacao}
                   onChange={handleChange}
                   className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-yellow-500/50 outline-none transition-colors"
                 />
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-400">Capacidade Máxima (Paletes/Vol)</label>
                 <input
                   name="capacidade_max"
                   value={config.capacidade_max}
                   onChange={handleChange}
                   placeholder="Ex: 5000"
                   className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-yellow-500/50 outline-none transition-colors"
                 />
               </div>

               <div className="space-y-2 lg:col-span-3">
                 <label className="text-xs font-bold text-slate-400">Tempo Padrão de Expedição/Entrega</label>
                 <div className="relative">
                   <Truck size={16} className="absolute left-3 top-3.5 text-slate-500" />
                   <input
                     name="tempo_entrega_padrao"
                     value={config.tempo_entrega_padrao}
                     onChange={handleChange}
                     className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-10 py-3 text-sm text-white focus:border-yellow-500/50 outline-none transition-colors"
                   />
                 </div>
               </div>
             </div>
          </div>

          <div className="pt-6 border-t border-white/5 flex gap-4 justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-bold tracking-wide transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <img src={`${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`} alt="Carregando..." className="w-5 h-5 animate-spin opacity-80" />
              ) : (
                <>
                  <Save size={18} /> Gravar
                </>
              )}
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}
