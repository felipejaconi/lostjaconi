import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Car, Fuel, Wrench, AlertTriangle, Plus, Search, RefreshCw, Gauge
} from "lucide-react";
import Swal from "sweetalert2";
import api from "../../lib/api";
import { Modal } from "../../components/ui/Modal";
import { ContentViewport } from "../../components/layout/ContentViewport";
import { BrandTitle } from "../../components/BrandTitle";

// New Fleet Components
import { Veiculo } from "./fleet/types";
import { VehicleCard } from "./fleet/VehicleCard";
import { VehicleModal } from "./fleet/VehicleModal";
import { FuelModal } from "./fleet/FuelModal";
import { MaintModal } from "./fleet/MaintModal";
import { VehicleDetailModal } from "./fleet/VehicleDetailModal";
import { FleetSummaryCards } from "./fleet/FleetSummaryCards";

export default function AdminFleet() {
  const [vehicles, setVehicles] = useState<Veiculo[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<"veiculos" | "alertas" | "abastecimentos" | "manutencoes">("veiculos");
  const [search, setSearch] = useState("");
  const [filterStore, setFilterStore] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterOnlyAlerts, setFilterOnlyAlerts] = useState(false);

  // Modals
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Veiculo | null>(null);

  const [selectedVehicle, setSelectedVehicle] = useState<Veiculo | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [fuelTargetVehicle, setFuelTargetVehicle] = useState<Veiculo | null>(null);

  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [maintTargetVehicle, setMaintTargetVehicle] = useState<Veiculo | null>(null);

  const [isKmModalOpen, setIsKmModalOpen] = useState(false);
  const [kmTargetVehicle, setKmTargetVehicle] = useState<Veiculo | null>(null);
  const [quickKmInput, setQuickKmInput] = useState<number>(0);

  // Fetch initial data
  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setRefreshing(true);
    try {
      const [fleetRes, usersRes] = await Promise.all([
        api.get("/admin/fleet"),
        api.get("/admin/users").catch(() => ({ data: [] })),
      ]);

      setVehicles(fleetRes.data || []);
      const lojaUsers = (usersRes.data || []).filter((u: any) => u.role === "loja" || u.role === "armazem");
      setStores(lojaUsers);
    } catch (e) {
      console.error("Erro ao carregar dados de frotas:", e);
      Swal.fire({ icon: "error", title: "Erro ao carregar frota", text: "Não foi possível carregar a lista de viaturas.", background: "#18181b", color: "#fff" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log("AdminFleet mounted");
    fetchData();
    return () => console.log("AdminFleet unmounted");
  }, []);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = vehicles.length;
    const ativos = vehicles.filter((v) => v.status === "ativo").length;
    const manutencao = vehicles.filter((v) => v.status === "manutencao").length;
    const comAlertas = vehicles.filter((v) => v.temAlerta).length;
    const totalKm = vehicles.reduce((acc, v) => acc + (Number(v.km_atual) || 0), 0);
    const mediaKm = total > 0 ? Math.round(totalKm / total) : 0;

    let gastoCombustivelTotal = 0;
    let gastoManutencaoTotal = 0;

    vehicles.forEach((v) => {
      v.abastecimentos?.forEach((ab) => { gastoCombustivelTotal += Number(ab.valor_total || 0); });
      v.manutencoes?.forEach((mn) => { gastoManutencaoTotal += Number(mn.custo || 0); });
    });

    const alertasDetalhados = {
      oleosUrgentes: vehicles.filter((v) => v.oleoStatus === "alerta" || v.oleoStatus === "expirado"),
      inspecoesUrgentes: vehicles.filter((v) => v.inspecaoStatus === "alerta" || v.inspecaoStatus === "expirado"),
      segurosUrgentes: vehicles.filter((v) => v.seguroStatus === "alerta" || v.seguroStatus === "expirado"),
    };

    return { total, ativos, manutencao, comAlertas, totalKm, mediaKm, gastoCombustivelTotal, gastoManutencaoTotal, alertasDetalhados };
  }, [vehicles]);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch = !search ||
        v.matricula.toLowerCase().includes(search.toLowerCase()) ||
        v.modelo.toLowerCase().includes(search.toLowerCase()) ||
        v.marca.toLowerCase().includes(search.toLowerCase()) ||
        v.loja_nome.toLowerCase().includes(search.toLowerCase()) ||
        (v.responsavel_nome && v.responsavel_nome.toLowerCase().includes(search.toLowerCase()));

      const matchStore = filterStore === "todos" || v.loja_id === filterStore || v.loja_nome === filterStore;
      const matchStatus = filterStatus === "todos" || v.status === filterStatus;
      const matchAlerts = !filterOnlyAlerts || v.temAlerta;

      return matchSearch && matchStore && matchStatus && matchAlerts;
    });
  }, [vehicles, search, filterStore, filterStatus, filterOnlyAlerts]);

  // Save Vehicle
  const handleSaveVehicle = useCallback(async (data: any) => {
    try {
      if (editingVehicle) {
        const res = await api.put(`/admin/fleet/${editingVehicle.id}`, data);
        const updated = res.data as Veiculo;
        setVehicles((prev) => prev.map((v) => (v.id === editingVehicle.id ? updated : v)));
        Swal.fire({ icon: "success", title: "Viatura atualizada", timer: 1500, showConfirmButton: false, background: "#18181b", color: "#fff" });
      } else {
        const res = await api.post("/admin/fleet", data);
        const created = res.data as Veiculo;
        setVehicles((prev) => [created, ...prev]);
        Swal.fire({ icon: "success", title: "Viatura adicionada", timer: 1500, showConfirmButton: false, background: "#18181b", color: "#fff" });
      }
      setIsVehicleModalOpen(false);
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "Erro ao salvar", text: e.response?.data?.error || "Ocorreu um erro.", background: "#18181b", color: "#fff" });
    }
  }, [editingVehicle]);

  const handleDeleteVehicle = useCallback(async (v: Veiculo) => {
    const result = await Swal.fire({
      title: `Eliminar viatura ${v.matricula}?`,
      text: "Esta ação é irreversível.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, eliminar",
      confirmButtonColor: "#ef4444",
      background: "#18181b",
      color: "#fff",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/admin/fleet/${v.id}`);
        setVehicles((prev) => prev.filter((item) => item.id !== v.id));
        Swal.fire({ icon: "success", title: "Viatura removida", timer: 1500, showConfirmButton: false, background: "#18181b", color: "#fff" });
      } catch (e: any) {
        Swal.fire({ icon: "error", title: "Erro ao eliminar", background: "#18181b", color: "#fff" });
      }
    }
  }, []);

  const handleSaveFuel = useCallback(async (data: any) => {
    if (!fuelTargetVehicle) return;
    try {
      const res = await api.post(`/admin/fleet/${fuelTargetVehicle.id}/abastecimento`, data);
      const updated = res.data as Veiculo;
      setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      Swal.fire({ icon: "success", title: "Abastecimento registado", timer: 1500, showConfirmButton: false, background: "#18181b", color: "#fff" });
      setIsFuelModalOpen(false);
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "Erro", text: e.response?.data?.error || "Falha.", background: "#18181b", color: "#fff" });
    }
  }, [fuelTargetVehicle]);

  const handleSaveMaint = useCallback(async (data: any) => {
    if (!maintTargetVehicle) return;
    try {
      const res = await api.post(`/admin/fleet/${maintTargetVehicle.id}/manutencao`, data);
      const updated = res.data as Veiculo;
      setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      Swal.fire({ icon: "success", title: "Manutenção registada", timer: 1500, showConfirmButton: false, background: "#18181b", color: "#fff" });
      setIsMaintModalOpen(false);
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "Erro", background: "#18181b", color: "#fff" });
    }
  }, [maintTargetVehicle]);

  const handleSaveKm = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kmTargetVehicle) return;
    try {
      const res = await api.post(`/admin/fleet/${kmTargetVehicle.id}/km`, { km: quickKmInput });
      const updated = res.data as Veiculo;
      setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      Swal.fire({ icon: "success", title: "Quilometragem atualizada", timer: 1500, showConfirmButton: false, background: "#18181b", color: "#fff" });
      setIsKmModalOpen(false);
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "Erro", background: "#18181b", color: "#fff" });
    }
  }, [kmTargetVehicle, quickKmInput]);

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-[#050505]">
      <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
    </div>
  );

  return (
    <ContentViewport>
      <div className="flex flex-col gap-6 w-full max-w-[1700px] mx-auto pb-16">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <BrandTitle title="Frotas" hideUnderline titleClassName="p-0 m-0 !mb-0" />
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-800 border border-zinc-700 text-zinc-300">
                  {vehicles.length} Viaturas
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button onClick={() => fetchData(false)} disabled={refreshing} className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
            </button>
            <button onClick={() => { setEditingVehicle(null); setIsVehicleModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs tracking-wide shadow-lg shadow-amber-500/10 transition-all active:scale-[0.98]">
              <Plus className="w-4 h-4" />
              <span>Adicionar Viatura</span>
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <FleetSummaryCards stats={stats} onAlertsClick={() => { setActiveTab("alertas"); setFilterOnlyAlerts(true); }} />

        {/* Tab Navigation & Toolbar */}
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center bg-zinc-950 p-2 sm:p-3 rounded-2xl border border-zinc-800/80">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {[
              { id: "veiculos", label: "Viaturas", icon: <Car size={16} /> },
              { id: "alertas", label: "Alertas", icon: <AlertTriangle size={16} /> },
              { id: "abastecimentos", label: "Abastecimentos", icon: <Fuel size={16} /> },
              { id: "manutencoes", label: "Manutenções", icon: <Wrench size={16} /> }
            ].map((tab: any) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${activeTab === tab.id ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.id === 'veiculos' && <span className="ml-1 opacity-60">({vehicles.length})</span>}
                {tab.id === 'alertas' && stats.comAlertas > 0 && <span className="ml-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">{stats.comAlertas}</span>}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-60 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input type="text" placeholder="Pesquisar..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 outline-none h-[36px]" />
            </div>
            <select value={filterStore} onChange={(e) => setFilterStore(e.target.value)} className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 h-[36px]">
              <option value="todos">Todas Lojas</option>
              {stores.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={() => setFilterOnlyAlerts(!filterOnlyAlerts)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold h-[36px] border ${filterOnlyAlerts ? "bg-rose-500/20 border-rose-500/50 text-rose-300" : "bg-zinc-900 border-zinc-800 text-zinc-400"}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Só Alertas</span>
            </button>
          </div>
        </div>

        {/* Vehicle Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredVehicles.map((v: Veiculo) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              onClick={() => { setSelectedVehicle(v); setIsDetailModalOpen(true); }}
              onOpenKmModal={(v) => { setKmTargetVehicle(v); setQuickKmInput(v.km_atual); setIsKmModalOpen(true); }}
              onOpenFuelModal={(v) => { setFuelTargetVehicle(v); setIsFuelModalOpen(true); }}
              onOpenMaintModal={(v) => { setMaintTargetVehicle(v); setIsMaintModalOpen(true); }}
              onEdit={(v) => { setEditingVehicle(v); setIsVehicleModalOpen(true); }}
              onDelete={handleDeleteVehicle}
            />
          ))}
        </div>
      </div>

      {/* Modals */}
      <VehicleModal isOpen={isVehicleModalOpen} onClose={() => setIsVehicleModalOpen(false)} onSave={handleSaveVehicle} editingVehicle={editingVehicle} stores={stores} />
      <FuelModal isOpen={isFuelModalOpen} onClose={() => setIsFuelModalOpen(false)} onSave={handleSaveFuel} vehicle={fuelTargetVehicle} />
      <MaintModal isOpen={isMaintModalOpen} onClose={() => setIsMaintModalOpen(false)} onSave={handleSaveMaint} vehicle={maintTargetVehicle} />
      
      <Modal isOpen={isKmModalOpen} onClose={() => setIsKmModalOpen(false)} title={`Atualizar Km: ${kmTargetVehicle?.matricula}`} maxWidth="sm">
        <form onSubmit={handleSaveKm} className="space-y-4 pt-2">
          <input type="number" required value={quickKmInput} onChange={(e) => setQuickKmInput(Number(e.target.value))} className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-lg text-zinc-100 font-bold text-center outline-none" />
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsKmModalOpen(false)} className="px-4 py-2 text-zinc-400">Cancelar</button><button type="submit" className="px-5 py-2 bg-amber-500 rounded-xl font-bold">Atualizar</button></div>
        </form>
      </Modal>

      <VehicleDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        vehicle={selectedVehicle}
        onOpenFuelModal={(v) => { setFuelTargetVehicle(v); setIsFuelModalOpen(true); }}
        onOpenMaintModal={(v) => { setMaintTargetVehicle(v); setIsMaintModalOpen(true); }}
        onEdit={(v) => { setEditingVehicle(v); setIsVehicleModalOpen(true); }}
      />
    </ContentViewport>
  );
}
