import React, { useState, useEffect } from "react";
import { Plus, Users, Shield, Store, Edit2, Clock, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import api from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import { optimizeImage } from "../../lib/imageOptimization";
import { ContentViewport } from "../../components/layout/ContentViewport";
import { Badge } from "../../components/ui/Badge";
import { useAuth } from "../../context/AuthContext";

export default function AdminUsers({ filterRole }: { filterRole?: string }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hasOrderSchedule, setHasOrderSchedule] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "loja",
    order_start_time: "",
    order_end_time: "",
    picking_start_time: "",
    picking_end_time: "",
    manager_name: "",
  });

  const fetchUsers = () => {
    api.get("/admin/users").then((res) => {
      let data = res.data as any[];
      
      data = data.filter((u: any) => {
         const isTecnico = u.name?.toLowerCase().includes("tecnico") || u.email?.toLowerCase().includes("tecnico") || u.role?.toLowerCase() === "tecnico";
         if (isTecnico) {
             const currentUserIsTecnico = currentUser?.name?.toLowerCase().includes("tecnico") || currentUser?.email?.toLowerCase().includes("tecnico") || currentUser?.role?.toLowerCase() === "tecnico";
             return currentUserIsTecnico;
         }
         return true;
      });
      
      if (filterRole) data = data.filter((u: any) => u.role === filterRole);
      setUsers(data);
    });
  };

  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel("admin-users-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "utilizadores" },
        () => {
          fetchUsers();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterRole, currentUser]);

  const openModal = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setSelectedFile(null);
      setHasOrderSchedule(Boolean(user.order_start_time && user.order_end_time));
      setFormData({
        name: user.name,
        email: user.email,
        password: "", // Don't show password
        role: user.role,
        order_start_time: user.order_start_time || "08:00",
        order_end_time: user.order_end_time || "18:00",
        picking_start_time: user.picking_start_time || "",
        picking_end_time: user.picking_end_time || "",
        manager_name: user.manager_name || "",
      });
    } else {
      setEditingUser(null);
      setSelectedFile(null);
      setHasOrderSchedule(false);
      setFormData({
        name: "",
        email: "",
        password: "",
        role: filterRole || "loja",
        order_start_time: "08:00",
        order_end_time: "18:00",
        picking_start_time: "",
        picking_end_time: "",
        manager_name: "",
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      // If not hasOrderSchedule and it's a time field, send empty string to clear it
      if (!hasOrderSchedule && (key === 'order_start_time' || key === 'order_end_time')) {
        data.append(key, "");
      } else {
        data.append(key, value as string);
      }
    });
    if (selectedFile) data.append("avatar", selectedFile);

    try {
      if (editingUser) {
        await api.put(`/admin/users/${editingUser.id}`, data);
        Swal.fire("Sucesso", "Utilizador atualizado", "success");
      } else {
        await api.post("/admin/users", data);
        Swal.fire("Sucesso", "Utilizador criado", "success");
      }
      setModalOpen(false);
      fetchUsers();
    } catch (error) {
      Swal.fire("Erro", "Falha ao processar utilizador", "error");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: 'Tem a certeza?',
      text: `Deseja apagar o utilizador ${name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3f3f46',
      confirmButtonText: 'Sim, apagar',
      cancelButtonText: 'Cancelar',
      background: '#18181b',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/admin/users/${id}`);
        Swal.fire({
          title: "Apagado!",
          text: "Utilizador removido com sucesso.",
          icon: "success",
          background: '#18181b',
          color: '#fff'
        });
        fetchUsers();
      } catch (error) {
        Swal.fire({
          title: "Erro",
          text: "Ocorreu um erro ao apagar.",
          icon: "error",
          background: '#18181b',
          color: '#fff'
        });
      }
    }
  };

  return (
    <ContentViewport
      title={filterRole === "loja" ? "Gestão de Lojas" : "Gestão de Utilizadores"}
      description="Gerencie os acessos, cargos e informações corporativas."
      actions={
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Adicionar {filterRole === "loja" ? "Loja" : "Utilizador"}
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {users.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              className="bg-zinc-900/50 border border-white/5 rounded-[2rem] p-6 hover:bg-white/[0.02] transition-colors relative overflow-hidden group flex flex-col"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  {u.role === "admin" ? (
                    <Shield size={24} className="text-red-400" />
                  ) : u.role === "loja" ? (
                    <Store size={24} className="text-emerald-400" />
                  ) : (
                    <Users size={24} className="text-blue-400" />
                  )}
                </div>
                <Badge variant="outline" className="border-white/10 uppercase tracking-widest text-[9px]">
                  {u.role}
                </Badge>
              </div>

              <div className="mb-6 flex-1">
                <h3 className="text-xl font-bold text-white mb-1">{u.name}</h3>
                <p className="text-sm text-slate-400 font-medium truncate">{u.email}</p>
              </div>

              {u.role === "loja" && (
                <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-white/5">
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">Gerente</p>
                  <p className="text-sm font-bold text-white mb-4 truncate">{u.manager_name || "Não atribuído"}</p>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <p className="text-[9px] uppercase font-black flex items-center gap-1.5 text-slate-500 mb-1">
                        <Clock size={10} /> Pedidos
                      </p>
                      <p className="text-xs font-bold text-slate-300">
                        {u.order_start_time && u.order_end_time 
                           ? `${u.order_start_time} - ${u.order_end_time}`
                           : <span className="text-emerald-400">Sem restrição</span>}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => openModal(u)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} /> Editar
                </button>
                <button
                  onClick={() => handleDelete(u.id, u.name)}
                  className="py-3 px-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/10 rounded-xl text-rose-500 hover:text-rose-400 transition-all flex items-center justify-center"
                  title="Apagar"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {users.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-500">
            <Users size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-bold">Nenhum registo encontrado</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80  z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-950 border border-white/10 rounded-[2rem] w-full max-w-md p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingUser ? "Editar" : "Novo"} Utilizador
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2 block">Nome Completo</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white focus:border-yellow-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2 block">Correio Eletrónico</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white focus:border-yellow-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2 block">
                  {editingUser ? "Nova Palavra-passe" : "Palavra-passe"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  placeholder={editingUser ? "(Opcional)" : ""}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white focus:border-yellow-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2 block">Avatar / Logotipo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const optimized = await optimizeImage(file);
                      setSelectedFile(optimized);
                    } else {
                      setSelectedFile(null);
                    }
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-yellow-500 file:text-black hover:file:bg-yellow-400 focus:border-yellow-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2 block">Tipo de Perfil</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white focus:border-yellow-500 transition-colors"
                >
                  <option value="loja">Loja (Franquia)</option>
                  <option value="admin">Administrador Corporativo</option>
                  <option value="armazem">Gestão de Armazém e Logística</option>
                </select>
              </div>

              {formData.role === "loja" && (
                <div className="space-y-4 pt-4 mt-6 border-t border-white/10">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2 block">Gerente Responsável</label>
                    <input
                      value={formData.manager_name}
                      onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white focus:border-yellow-500 transition-colors"
                    />
                  </div>

                  <div className="flex items-center justify-between mb-4 pt-2">
                    <h3 className="text-xs font-bold text-white">Horários de Pedidos</h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={hasOrderSchedule}
                        onChange={(e) => setHasOrderSchedule(e.target.checked)}
                        className="rounded border-none outline-none accent-yellow-500 w-4 h-4"
                      />
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Restringir</span>
                    </label>
                  </div>

                  {hasOrderSchedule && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2 block">Início Pedidos</label>
                        <input
                          type="time"
                          value={formData.order_start_time}
                          onChange={(e) => setFormData({ ...formData, order_start_time: e.target.value })}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white focus:border-yellow-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2 block">Fim Pedidos</label>
                        <input
                          type="time"
                          value={formData.order_end_time}
                          onChange={(e) => setFormData({ ...formData, order_end_time: e.target.value })}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white focus:border-yellow-500 transition-colors"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold text-sm transition-colors border border-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-3 px-4 bg-yellow-500 hover:bg-yellow-400 rounded-xl text-black font-bold text-sm transition-colors"
                >
                  {editingUser ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </ContentViewport>
  );
}


