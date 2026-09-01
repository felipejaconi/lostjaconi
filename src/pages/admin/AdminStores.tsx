import React, { useState, useEffect, useRef } from "react";
import { Plus, Store, MapPin, Phone, User, ChevronRight, ArrowLeft, BarChart3, Package, ShoppingCart, FileText, Edit3, Trash2, Mail, TrendingUp, DollarSign, Download, Eye, Truck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Swal from "sweetalert2";
import api from "../../lib/api";
import { supabase, getPublicStorageUrl } from "../../lib/supabase";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { ContentViewport } from "../../components/layout/ContentViewport";
import { printGenericDocument } from "../../lib/printGenericDocument";
import { BrandTitle } from "../../components/BrandTitle";

const getStoreColor = (id?: string | number) => {
  if (id) {} // ignore unused
  return {
    bgFrom: "from-zinc-900", border: "border-white/5", hoverBorder: "hover:border-white/10", hoverBg: "hover:bg-white/[0.02]", gradientFrom: "from-white/10", blurBg: "bg-white/5", hoverBlurBg: "group-hover:bg-white/10", text: "text-white", textHover: "text-white", glow: "rgba(255,255,255,0.02)", glowHover: "rgba(255,255,255,0.05)"
  };
};

export default function AdminStores() {
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("info");
  
  const [storeOrders, setStoreOrders] = useState<any[]>([]);
  
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    address: "",
    phone: "",
    matricula: "",
    email: "",
    manager_name: "",
    manager_pin: "0000",
    password: "",
    avatar_url: "",
  });

  const fetchData = async () => {
    try {
      const res = await api.get("/admin/users");
      const allUsers = res.data as any[];
      setStores(allUsers.filter(u => u.role === 'loja').sort((a: any, b: any) => (a.nome || "").localeCompare(b.nome || "")));
    } catch (error) {
      console.error("Erro ao buscar lojas:", error);
    }
  };

  const fetchStoreDetails = async (storeId: number) => {
    try {
      const ordersRes = await api.get("/pedidos");
      const allOrders = ordersRes.data as any[];
      const sOrders = allOrders.filter(o => o.user_id === storeId);
      setStoreOrders(sOrders);
    } catch (error) {
      console.error("Erro ao buscar detalhes da loja:", error);
    }
  };

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("schema-db-changes-admin-stores")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => {
          if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = setTimeout(() => fetchData(), 500);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => {
          if (selectedStore) {
            if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
            fetchTimeoutRef.current = setTimeout(() => fetchStoreDetails(selectedStore.id), 500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [selectedStore]);

  useEffect(() => {
    if (selectedStore) {
      fetchStoreDetails(selectedStore.id);
    }
  }, [selectedStore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, role: 'loja' };
      if (editingStore) {
        await api.put(`/admin/users/${editingStore.id}`, payload);
        if (selectedStore && selectedStore.id === editingStore.id) {
          setSelectedStore({ ...selectedStore, ...payload });
        }
      } else {
        await api.post("/admin/users", payload);
      }
      Swal.fire("Sucesso", "Loja guardada com sucesso", "success");
      setModalOpen(false);
      setEditingStore(null);
      setFormData({
        id: "", name: "", address: "", phone: "", matricula: "", email: "", manager_name: "", manager_pin: "0000", password: "", avatar_url: "",
      });
      fetchData();
    } catch (error) {
      Swal.fire("Erro", "Falha ao guardar loja", "error");
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Tem a certeza?",
      text: "Esta ação não pode ser revertida!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, remover!",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/admin/users/${id}`);
        Swal.fire("Removido!", "A loja foi eliminada.", "success");
        if (selectedStore && selectedStore.id === id) {
          setSelectedStore(null);
        }
        fetchData();
      } catch (error) {
        Swal.fire("Erro", "Falha ao remover loja", "error");
      }
    }
  };

  const openEditModal = (store: any) => {
    setEditingStore(store);
    setFormData({
      id: store.id,
      name: store.name,
      address: store.address || "",
      phone: store.phone || "",
      matricula: store.matricula || "",
      email: store.email,
      manager_name: store.manager_name || "",
      manager_pin: store.manager_pin || "0000",
      password: "",
      avatar_url: store.avatar_url || "",
    });
    setModalOpen(true);
  };

  // --- Store Details Sub-components ---

  const renderInfo = () => {
    const colors = getStoreColor(selectedStore.id);
    const cardBgImage = getPublicStorageUrl(selectedStore.avatar_url || "[NOME_DO_ARQUIVO.PNG]");
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`bg-gradient-to-br ${colors.bgFrom} to-black/40 p-6 rounded-3xl border ${colors.border} shadow-[0_0_15px_${colors.glow}]  relative overflow-hidden group`}>
          <div 
            className="absolute inset-0 z-0 opacity-40 pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage: `url('${cardBgImage}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className={`absolute top-0 left-0 w-24 h-[2px] bg-gradient-to-r ${colors.gradientFrom} to-transparent`}></div>
          <div className={`absolute top-0 right-0 w-32 h-32 ${colors.blurBg} rounded-full blur-3xl -mr-10 -mt-10 opacity-50`}></div>
          
          <h3 className="text-lg font-bold text-yellow-400 mb-6 flex items-center gap-2 relative z-10">
            <Store className={colors.text} size={20} /> Detalhes da Loja
          </h3>
          <div className="space-y-4 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-yellow-500/80 shrink-0">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-widest">Morada</p>
                <p className="text-sm text-yellow-300 mt-1">{selectedStore.address || "Não definida"}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-yellow-500/80 shrink-0">
                <Phone size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-widest">Telefone</p>
                <p className="text-sm text-yellow-300 mt-1">{selectedStore.phone || "Não definido"}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-yellow-500/80 shrink-0">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-widest">Email</p>
                <p className="text-sm text-yellow-300 mt-1">{selectedStore.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-yellow-500/80 shrink-0">
                <User size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-widest">Responsável</p>
                <p className="text-sm text-yellow-300 mt-1">{selectedStore.manager_name || "Não definido"}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-yellow-500/80 shrink-0">
                <Truck size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-widest">Matrícula (Viatura)</p>
                <p className="text-sm text-yellow-300 mt-1 uppercase">{selectedStore.matricula || "Não definida"}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className={`bg-gradient-to-br ${colors.bgFrom} to-black/40 p-6 rounded-3xl border ${colors.border} shadow-[0_0_15px_${colors.glow}]  relative overflow-hidden flex flex-col justify-center items-center text-center`}>
          <div className={`absolute top-0 left-0 w-24 h-[2px] bg-gradient-to-r ${colors.gradientFrom} to-transparent`}></div>
          <div className={`absolute top-0 right-0 w-32 h-32 ${colors.blurBg} rounded-full blur-3xl -mr-10 -mt-10 opacity-50`}></div>

          <div className={`w-24 h-24 rounded-full bg-black/40 border ${colors.border} flex items-center justify-center mb-6 relative z-10`}>
            <Store size={40} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 relative z-10">{selectedStore.name}</h2>
          <p className="text-slate-400 text-sm mb-6 relative z-10">ID da Loja: {selectedStore.id}</p>
          <div className="flex gap-3 w-full max-w-xs relative z-10">
            <button onClick={() => openEditModal(selectedStore)} className={`flex-1 py-3 bg-white/5 hover:bg-white/10 border ${colors.border} rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2`}>
              <Edit3 size={16} /> Editar
            </button>
            <button onClick={() => handleDelete(selectedStore.id)} className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-sm font-bold text-red-400 transition-all flex items-center justify-center gap-2">
              <Trash2 size={16} /> Eliminar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderConsumo = () => {
    // Calculate monthly consumption
    const monthlyData = storeOrders.reduce((acc: any, order: any) => {
      const date = new Date(order.created_at);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      if (!acc[monthYear]) acc[monthYear] = { name: monthYear, total: 0, pedidos: 0 };
      acc[monthYear].total += Number(order.total);
      acc[monthYear].pedidos += 1;
      return acc;
    }, {});

    const chartData = Object.values(monthlyData).sort((a: any, b: any) => {
      const [m1, y1] = a.name.split('/');
      const [m2, y2] = b.name.split('/');
      return new Date(y1, m1 - 1).getTime() - new Date(y2, m2 - 1).getTime();
    });

    const totalGasto = storeOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const avgPedido = storeOrders.length > 0 ? totalGasto / storeOrders.length : 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Total Gasto",
              value: `€${totalGasto.toFixed(2)}`,
              icon: <DollarSign size={20} />,
              colorClasses: {
                bgFrom: "from-yellow-500/10", border: "border-yellow-500/30", hoverBorder: "hover:border-yellow-400/60", hoverBg: "hover:bg-yellow-500/20", gradientFrom: "from-yellow-400", blurBg: "bg-yellow-500/20", hoverBlurBg: "group-hover:bg-yellow-500/40", text: "text-yellow-400", textHover: "text-yellow-300"
              },
              glowColor: "rgba(234,179,8,0.1)",
              glowHoverColor: "rgba(234,179,8,0.2)"
            },
            {
              label: "Total Pedidos",
              value: storeOrders.length,
              icon: <ShoppingCart size={20} />,
              colorClasses: {
                bgFrom: "from-yellow-500/10", border: "border-yellow-500/30", hoverBorder: "hover:border-yellow-400/60", hoverBg: "hover:bg-yellow-500/20", gradientFrom: "from-yellow-400", blurBg: "bg-yellow-500/20", hoverBlurBg: "group-hover:bg-yellow-500/40", text: "text-yellow-400", textHover: "text-yellow-300"
              },
              glowColor: "rgba(234,179,8,0.1)",
              glowHoverColor: "rgba(234,179,8,0.2)"
            },
            {
              label: "Média / Pedido",
              value: `€${avgPedido.toFixed(2)}`,
              icon: <TrendingUp size={20} />,
              colorClasses: {
                bgFrom: "from-yellow-500/10", border: "border-yellow-500/30", hoverBorder: "hover:border-yellow-400/60", hoverBg: "hover:bg-yellow-500/20", gradientFrom: "from-yellow-400", blurBg: "bg-yellow-500/20", hoverBlurBg: "group-hover:bg-yellow-500/40", text: "text-yellow-400", textHover: "text-yellow-300"
              },
              glowColor: "rgba(234,179,8,0.1)",
              glowHoverColor: "rgba(234,179,8,0.2)"
            }
          ].map((stat, i) => (
            <div
              key={i}
              className={`bg-gradient-to-br ${stat.colorClasses.bgFrom} to-black/40 p-6 sm:p-8 rounded-3xl border ${stat.colorClasses.border} shadow-[0_0_15px_${stat.glowColor}]  relative overflow-hidden group ${stat.colorClasses.hoverBorder} hover:shadow-[0_0_25px_${stat.glowHoverColor}] ${stat.colorClasses.hoverBg} transition-all duration-500`}
            >
              <div className={`absolute top-0 left-0 w-24 h-[2px] bg-gradient-to-r ${stat.colorClasses.gradientFrom} to-transparent`}></div>
              <div className={`absolute top-0 right-0 w-32 h-32 ${stat.colorClasses.blurBg} rounded-full blur-3xl -mr-10 -mt-10 transition-all duration-500 ${stat.colorClasses.hoverBlurBg}`}></div>
              
              <p className={`${stat.colorClasses.text} text-xs sm:text-sm font-medium relative z-10 uppercase tracking-widest flex items-center gap-2`}>
                {React.cloneElement(stat.icon as React.ReactElement, { size: 16 })} {stat.label}
              </p>
              <p className="text-3xl sm:text-4xl font-bold text-white mt-3 relative z-10 tracking-tight">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="glass-card p-6 rounded-3xl border border-yellow-500/30">
          <h3 className="text-lg font-bold text-white mb-6">Evolução de Consumo</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(val) => `€${val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(10,10,10,0.9)", backdropFilter: "blur(10px)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Line type="monotone" dataKey="total" stroke="#eab308" strokeWidth={3} dot={{ r: 4, fill: "#eab308", strokeWidth: 2, stroke: "#000" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };


  const renderPedidos = () => {
    const colors = getStoreColor(selectedStore.id);
    return (
      <div className={`bg-gradient-to-br ${colors.bgFrom} to-black/40 rounded-3xl border ${colors.border} shadow-[0_0_15px_${colors.glow}]  overflow-hidden relative`}>
        <div className={`absolute top-0 left-0 w-24 h-[2px] bg-gradient-to-r ${colors.gradientFrom} to-transparent`}></div>

        <div className={`p-6 border-b ${colors.border} flex justify-between items-center bg-white/5 relative z-10`}>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingCart className={colors.text} size={20} /> Histórico de Pedidos
          </h3>
        </div>
        <div className="relative z-10">
          {storeOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
              <p>Nenhum pedido registado para esta loja.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Data</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Total</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {storeOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-sm text-white font-bold">#{order.id}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {new Date(order.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                          order.status === "enviado" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                          order.status === "concluido" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          order.status === "cancelado" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                          "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white font-bold">€{Number(order.total).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className={`p-2 bg-white/5 hover:bg-white/10 border ${colors.border} rounded-xl text-slate-300 transition-all inline-flex items-center justify-center`}
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order Details Modal */}
        <AnimatePresence>
          {selectedOrder && (
            <motion.div 
              key="store-order-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 ">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gradient-to-br from-orange-500/10 to-[#0a0500] border border-orange-500/30 rounded-[2rem] w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative"
              >
                <div className="absolute top-0 left-0 w-32 h-[2px] bg-gradient-to-r from-orange-400 to-transparent"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl -mr-10 -mt-10 opacity-50"></div>

                <div className="flex justify-between items-center mb-8 relative z-10">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Detalhes do Pedido #{selectedOrder.id}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {new Date(selectedOrder.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 hover:bg-white/5 rounded-full text-slate-400"
                  >
                    <Plus className="rotate-45" size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 relative z-10">
                  <div className="md:col-span-2 space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Produtos
                    </h4>
                    <div className="space-y-2">
                      {selectedOrder.itens?.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-black/20 rounded-lg border border-white/10 flex items-center justify-center text-slate-600">
                              <ShoppingCart size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">
                                {item.produto?.nome || item.produto_nome || "Produto Removido"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {item.quantidade} x €{item.preco_unitario}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-white">
                            €{(item.quantidade * item.preco_unitario).toFixed(2)}
                          </p>
                        </div>
                      ))}
                      {(!selectedOrder.itens || selectedOrder.itens.length === 0) && (
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center text-slate-500 text-sm">
                          Nenhum produto encontrado neste pedido.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">
                        Status Atual
                      </p>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider inline-block mb-4 ${
                        selectedOrder.status === "enviado" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                        selectedOrder.status === "concluido" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        selectedOrder.status === "cancelado" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                        "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {selectedOrder.status}
                      </span>
                      
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">
                        Resumo Total
                      </p>
                      <p className="text-3xl font-display font-bold text-white">
                        €{selectedOrder.total}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderRelatorios = () => {
    const colors = getStoreColor(selectedStore.id);
    const exportStoreReport = () => {
      const totalGasto = storeOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const tableData = storeOrders.map(o => [
        o.id,
        new Date(o.created_at).toLocaleDateString(),
        o.status.toUpperCase(),
        `€${Number(o.total).toFixed(2)}`
      ]);

      printGenericDocument({
        title: "RELATÓRIO DA LOJA",
        docNumber: `RL-${selectedStore.id}`,
        recipientName: selectedStore.name || "N/A",
        recipientEmail: `Tel: ${selectedStore.phone || 'N/A'} - Responsável: ${selectedStore.manager_name || 'N/A'}\nMorada: ${selectedStore.address || 'N/A'}`,
        headers: ['ID', 'DATA', 'STATUS', 'TOTAL'],
        data: tableData,
        totalValue: totalGasto,
        footerNotes: `Documento gerado internamente. Total Pedidos: ${storeOrders.length}`
      });
    };

    return (
      <div className={`bg-gradient-to-br ${colors.bgFrom} to-black/40 p-8 rounded-3xl border ${colors.border} shadow-[0_0_15px_${colors.glow}]  text-center max-w-lg mx-auto relative overflow-hidden group`}>
        <div className={`absolute top-0 left-0 w-24 h-[2px] bg-gradient-to-r ${colors.gradientFrom} to-transparent`}></div>
        <div className={`absolute top-0 right-0 w-32 h-32 ${colors.blurBg} rounded-full blur-3xl -mr-10 -mt-10 opacity-50`}></div>

        <div className={`w-20 h-20 rounded-full bg-white/5 border ${colors.border} flex items-center justify-center mx-auto mb-6 relative z-10`}>
          <FileText size={32} className={colors.text} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2 relative z-10">Relatório Completo</h3>
        <p className="text-slate-400 text-sm mb-8 relative z-10">
          Gere um relatório detalhado em PDF contendo todas as informações da loja, histórico de pedidos e resumo financeiro.
        </p>
        <button
          onClick={exportStoreReport}
          className={`w-full py-4 bg-gradient-to-r ${colors.bgFrom.replace('/10', '/80')} to-black/40 border ${colors.border} text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02] relative z-10`}
        >
          <Download size={20} /> Descarregar Relatório PDF
        </button>
      </div>
    );
  };

  // --- Main Render ---
  const bgImage = getPublicStorageUrl(selectedStore?.avatar_url || "[NOME_DO_ARQUIVO.PNG]");
  const BackgroundImage = () => (
    <div 
      className="fixed inset-0 z-0 opacity-10 pointer-events-none"
      style={{
        backgroundImage: `url('${bgImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    />
  );

  if (selectedStore) {
    return (
      <>
      <BackgroundImage />
      <div className="pt-2 px-4 md:pt-4 md:px-6 lg:px-8 ">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setSelectedStore(null)}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-yellow-500/30 flex items-center justify-center text-white transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{selectedStore.name}</h1>
            <p className="text-sm text-slate-400">Gestão detalhada da loja</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto custom-scrollbar gap-2 pb-2">
          {[
            { id: 'info', label: 'Informações', icon: <Store size={16} /> },
            { id: 'consumo', label: 'Consumo', icon: <BarChart3 size={16} /> },
            { id: 'pedidos', label: 'Pedidos', icon: <ShoppingCart size={16} /> },
            { id: 'relatorios', label: 'Relatórios', icon: <FileText size={16} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-6"
        >
          {activeTab === 'info' && renderInfo()}
          {activeTab === 'consumo' && renderConsumo()}
          {activeTab === 'pedidos' && renderPedidos()}
          {activeTab === 'relatorios' && renderRelatorios()}
        </motion.div>

        {/* Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 ">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-primary/10 to-[#0a0500] border border-primary/30 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative"
            >
              <div className="absolute top-0 left-0 w-32 h-[2px] bg-gradient-to-r from-primary to-transparent"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl -mr-10 -mt-10 opacity-50"></div>

              <div className="flex justify-between items-center mb-6 relative z-10">
                <h2 className="text-xl font-bold text-white">Editar Loja</h2>
                <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-400">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ID da Loja</label>
                    <input type="text" value={formData.id} onChange={(e) => setFormData({ ...formData, id: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" placeholder="Deixe vazio para manter" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome da Loja</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email de Login</label>
                    <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" />
                  </div>
                                    <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Responsável</label>
                    <input type="text" value={formData.manager_name} onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">PIN Gerência</label>
                    <input type="text" value={formData.manager_pin} onChange={(e) => setFormData({ ...formData, manager_pin: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" placeholder="0000" maxLength={8} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                    <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Matrícula (Veículo)</label>
                    <input type="text" value={formData.matricula} onChange={(e) => setFormData({ ...formData, matricula: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm uppercase" placeholder="XX-XX-XX" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Morada Completa</label>
                  <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">URL da Imagem de Fundo (Supabase)</label>
                  <input type="text" value={formData.avatar_url} onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password (Deixe vazio para manter)</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 bg-white/5 text-white font-bold rounded-2xl border border-yellow-500/30 hover:bg-white/10 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 bg-[length:200%_auto] text-white font-bold rounded-2xl shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] hover:bg-[position:right_center] transition-all">Atualizar Loja</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
      </>
    );
  }

  // --- Grid View ---
  return (
    <div className="pt-2 px-4 md:pt-4 md:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-32">
      <div className="flex flex-col gap-4 border-b border-white/5 pb-5 mb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center flex-wrap gap-4 pt-2">
             <BrandTitle title="Lojas" titleClassName="p-0 m-0 -mt-[18px]" hideUnderline />
          </div>
          
          <div className="flex gap-2 sm:gap-3 flex-wrap sm:flex-nowrap w-full lg:w-auto shrink-0 lg:justify-end mt-2 lg:mt-0">
             <button
               onClick={() => {
                 setEditingStore(null);
                 setFormData({ id: "", name: "", address: "", phone: "", email: "", manager_name: "", manager_pin: "0000", password: "", avatar_url: "" });
                 setModalOpen(true);
               }}
               className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap bg-purple-600 text-white shadow-xl shadow-purple-500/20 hover:bg-purple-500 active:scale-95 opacity-90 hover:opacity-100"
             >
               <Plus size={16} strokeWidth={3} /> 
               <span>Nova Loja</span>
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map((s, index) => {
          const colors = getStoreColor();
          const cardBgImage = getPublicStorageUrl(s.avatar_url || "[NOME_DO_ARQUIVO.PNG]");
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              key={s.id}
              onClick={() => {
                setSelectedStore(s);
                setActiveTab('info');
              }}
              className="bg-zinc-950/40  border border-white/5 p-6 rounded-3xl hover:bg-zinc-900/40 hover:border-white/10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative group flex flex-col h-full overflow-hidden cursor-pointer"
            >
              <div 
                className="absolute inset-0 z-0 opacity-10 pointer-events-none mix-blend-overlay group-hover:opacity-30 transition-opacity duration-500"
                style={{
                  backgroundImage: `url('${cardBgImage}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all duration-500 group-hover:bg-white/10"></div>
              
              <div className="flex items-center gap-4 relative z-10 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                  <Store size={24} className="text-white drop-shadow-md" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors uppercase tracking-tight line-clamp-1">
                    {s.name}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">
                    ID: {s.id}
                  </span>
                </div>
              </div>

              <div className="flex-1 relative z-10 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 shrink-0">
                    <MapPin size={14} className="text-slate-400" />
                  </div>
                  <div className="flex flex-col min-w-0 pr-2 pt-1">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Localização</span>
                    <span className="text-sm font-medium text-slate-300 line-clamp-2 leading-relaxed">{s.address || "Não definida"}</span>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 shrink-0">
                    <User size={14} className="text-slate-400" />
                  </div>
                  <div className="flex flex-col min-w-0 pr-2 pt-1">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Gerência</span>
                    <span className="text-sm font-medium text-slate-300 truncate">{s.manager_name || "Não definido"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 relative z-10 flex items-center justify-between">
                <span className="text-xs font-black text-slate-400 group-hover:text-white flex items-center gap-2 uppercase tracking-widest transition-colors">
                  Acessar Painel
                </span>
                
                <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-slate-400 group-hover:bg-white text-white group-hover:text-black transition-all">
                  <ArrowLeft size={16} className="-rotate-135 opacity-0 group-hover:opacity-100 absolute transition-opacity" />
                  <ChevronRight size={16} className="group-hover:opacity-0 transition-opacity" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Create Modal (only for creation in list view) */}
      {isModalOpen && !selectedStore && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 ">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-primary/10 to-[#0a0500] border border-primary/30 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative"
          >
            <div className="absolute top-0 left-0 w-32 h-[2px] bg-gradient-to-r from-primary to-transparent"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl -mr-10 -mt-10 opacity-50"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
              <h2 className="text-xl font-bold text-white">Nova Loja</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-400">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ID da Loja (Opcional)</label>
                  <input type="text" value={formData.id} onChange={(e) => setFormData({ ...formData, id: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" placeholder="Deixe vazio para auto-gerar" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome da Loja</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email de Login</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" />
                </div>
                                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Responsável</label>
                    <input type="text" value={formData.manager_name} onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">PIN Gerência</label>
                    <input type="text" value={formData.manager_pin} onChange={(e) => setFormData({ ...formData, manager_pin: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" placeholder="0000" maxLength={8} />
                  </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Morada Completa</label>
                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">URL da Imagem de Fundo (Supabase)</label>
                <input type="text" value={formData.avatar_url} onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 bg-white/5 text-white font-bold rounded-2xl border border-yellow-500/30 hover:bg-white/10 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 bg-[length:200%_auto] text-white font-bold rounded-2xl shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] hover:bg-[position:right_center] transition-all">Criar Loja</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
