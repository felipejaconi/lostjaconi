import React, { useState, useEffect, useMemo } from "react";
import {
  Car,
  Fuel,
  Wrench,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Store,
  User,
  Phone,
  Gauge,
  FileText,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Edit2,
  Trash2,
  ChevronRight,
  MapPin,
  Sparkles,
  Info,
  Droplet,
  Settings,
  Layers,
  HelpCircle,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Swal from "sweetalert2";
import api from "../../lib/api";
import { Modal } from "../../components/ui/Modal";
import { ContentViewport } from "../../components/layout/ContentViewport";
import { BrandTitle } from "../../components/BrandTitle";

export interface Abastecimento {
  id: string;
  data: string;
  km: number;
  litros: number;
  preco_litro: number;
  valor_total: number;
  posto: string;
  condutor: string;
  nota?: string;
}

export interface Manutencao {
  id: string;
  data: string;
  tipo: "oleo" | "pneus" | "travoes" | "revisao" | "avaria" | "outro";
  descricao: string;
  km: number;
  custo: number;
  oficina: string;
  fatura_numero?: string;
}

export interface Veiculo {
  id: string;
  matricula: string;
  marca: string;
  modelo: string;
  ano: number;
  cor: string;
  combustivel: string;
  capacidade_deposito: number;
  km_atual: number;
  loja_id: string;
  loja_nome: string;
  responsavel_nome: string;
  responsavel_telefone: string;
  status: "ativo" | "manutencao" | "garagem" | "inativo";
  data_ultima_inspecao?: string;
  data_proxima_inspecao?: string;
  seguradora?: string;
  apolice_numero?: string;
  tipo_seguro?: string;
  data_validade_seguro?: string;
  km_ultima_troca_oleo: number;
  km_intervalo_troca_oleo: number;
  km_proxima_troca_oleo: number;
  data_ultima_troca_oleo?: string;
  mes_iuc?: number;
  ano_iuc_pago?: number;
  iuc_valor?: number;
  notas?: string;
  abastecimentos?: Abastecimento[];
  manutencoes?: Manutencao[];

  // Computed fields
  diasParaInspecao?: number;
  inspecaoStatus?: "valido" | "alerta" | "expirado";
  diasParaSeguro?: number;
  seguroStatus?: "valido" | "alerta" | "expirado";
  kmRestantesOleo?: number;
  oleoStatus?: "valido" | "alerta" | "expirado";
  iucStatus?: "pago" | "alerta" | "pendente";
  temAlerta?: boolean;
}

export default function AdminFleet() {
  const [vehicles, setVehicles] = useState<Veiculo[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<"veiculos" | "alertas" | "abastecimentos" | "manutencoes">("veiculos");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
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

  // Forms State
  const [formData, setFormData] = useState({
    matricula: "",
    marca: "Renault",
    modelo: "",
    ano: 2022,
    cor: "Branco",
    combustivel: "Gasóleo",
    capacidade_deposito: 50,
    km_atual: 0,
    loja_id: "",
    loja_nome: "Armazém Central",
    responsavel_nome: "",
    responsavel_telefone: "",
    status: "ativo" as "ativo" | "manutencao" | "garagem" | "inativo",
    data_proxima_inspecao: "",
    seguradora: "Fidelidade",
    apolice_numero: "",
    tipo_seguro: "Danos Próprios",
    data_validade_seguro: "",
    km_ultima_troca_oleo: 0,
    km_intervalo_troca_oleo: 10000,
    mes_iuc: 1,
    ano_iuc_pago: new Date().getFullYear(),
    iuc_valor: 130,
    notas: "",
  });

  const [fuelForm, setFuelForm] = useState({
    data: new Date().toISOString().split("T")[0],
    km: 0,
    litros: 40,
    preco_litro: 1.62,
    posto: "Galp",
    condutor: "",
    nota: "",
  });

  const [maintForm, setMaintForm] = useState({
    data: new Date().toISOString().split("T")[0],
    tipo: "oleo" as "oleo" | "pneus" | "travoes" | "revisao" | "avaria" | "outro",
    descricao: "Muda de óleo 5W30 e filtros",
    km: 0,
    custo: 120,
    oficina: "Oficina Mecânica",
    fatura_numero: "",
  });

  // Fetch initial data
  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setRefreshing(true);
    try {
      const [fleetRes, usersRes] = await Promise.all([
        api.get("/admin/fleet"),
        api.get("/admin/users").catch(() => ({ data: [] }))
      ]);

      setVehicles(fleetRes.data || []);

      const allUsers = usersRes.data || [];
      setUsersList(allUsers);

      // Extract unique store options from users where role === 'loja' or 'armazem'
      const lojaUsers = allUsers.filter((u: any) => u.role === "loja" || u.role === "armazem");
      setStores(lojaUsers);
    } catch (e) {
      console.error("Erro ao carregar dados de frotas:", e);
      Swal.fire({
        icon: "error",
        title: "Erro ao carregar frota",
        text: "Não foi possível carregar a lista de viaturas.",
        background: "#18181b",
        color: "#fff",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
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
      v.abastecimentos?.forEach((ab) => {
        gastoCombustivelTotal += Number(ab.valor_total || 0);
      });
      v.manutencoes?.forEach((mn) => {
        gastoManutencaoTotal += Number(mn.custo || 0);
      });
    });

    const alertasDetalhados = {
      inspecoesUrgentes: vehicles.filter((v) => v.inspecaoStatus === "alerta" || v.inspecaoStatus === "expirado"),
      segurosUrgentes: vehicles.filter((v) => v.seguroStatus === "alerta" || v.seguroStatus === "expirado"),
      oleosUrgentes: vehicles.filter((v) => v.oleoStatus === "alerta" || v.oleoStatus === "expirado"),
    };

    return {
      total,
      ativos,
      manutencao,
      comAlertas,
      totalKm,
      mediaKm,
      gastoCombustivelTotal,
      gastoManutencaoTotal,
      gastoTotal: gastoCombustivelTotal + gastoManutencaoTotal,
      alertasDetalhados,
    };
  }, [vehicles]);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch =
        !search ||
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

  // Handle open vehicle modal (Create / Edit)
  const handleOpenVehicleModal = (v?: Veiculo) => {
    if (v) {
      setEditingVehicle(v);
      setFormData({
        matricula: v.matricula,
        marca: v.marca,
        modelo: v.modelo,
        ano: v.ano,
        cor: v.cor,
        combustivel: v.combustivel,
        capacidade_deposito: v.capacidade_deposito,
        km_atual: v.km_atual,
        loja_id: v.loja_id,
        loja_nome: v.loja_nome,
        responsavel_nome: v.responsavel_nome,
        responsavel_telefone: v.responsavel_telefone,
        status: v.status,
        data_proxima_inspecao: v.data_proxima_inspecao || "",
        seguradora: v.seguradora || "Fidelidade",
        apolice_numero: v.apolice_numero || "",
        tipo_seguro: v.tipo_seguro || "Danos Próprios",
        data_validade_seguro: v.data_validade_seguro || "",
        km_ultima_troca_oleo: v.km_ultima_troca_oleo || v.km_atual,
        km_intervalo_troca_oleo: v.km_intervalo_troca_oleo || 10000,
        mes_iuc: v.mes_iuc || 1,
        ano_iuc_pago: v.ano_iuc_pago || new Date().getFullYear(),
        iuc_valor: v.iuc_valor || 130,
        notas: v.notas || "",
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        matricula: "",
        marca: "Renault",
        modelo: "",
        ano: 2022,
        cor: "Branco",
        combustivel: "Gasóleo",
        capacidade_deposito: 50,
        km_atual: 0,
        loja_id: stores[0]?.id || "",
        loja_nome: stores[0]?.name || "Armazém Central",
        responsavel_nome: "",
        responsavel_telefone: "",
        status: "ativo",
        data_proxima_inspecao: "",
        seguradora: "Fidelidade",
        apolice_numero: "",
        tipo_seguro: "Danos Próprios",
        data_validade_seguro: "",
        km_ultima_troca_oleo: 0,
        km_intervalo_troca_oleo: 10000,
        mes_iuc: new Date().getMonth() + 1,
        ano_iuc_pago: new Date().getFullYear(),
        iuc_valor: 135,
        notas: "",
      });
    }
    setIsVehicleModalOpen(true);
  };

  // Save Vehicle
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.matricula || !formData.modelo) {
      Swal.fire({
        icon: "warning",
        title: "Campos obrigatórios",
        text: "Por favor preencha a Matrícula e o Modelo.",
        background: "#18181b",
        color: "#fff",
      });
      return;
    }

    try {
      if (editingVehicle) {
        const res = await api.put(`/admin/fleet/${editingVehicle.id}`, formData);
        const updated = res.data as Veiculo;
        setVehicles((prev) => prev.map((v) => (v.id === editingVehicle.id ? updated : v)));
        if (selectedVehicle?.id === editingVehicle.id) {
          setSelectedVehicle(updated);
        }
        Swal.fire({
          icon: "success",
          title: "Viatura atualizada",
          text: `Viatura ${formData.matricula} atualizada com sucesso.`,
          timer: 1800,
          showConfirmButton: false,
          background: "#18181b",
          color: "#fff",
        });
      } else {
        const res = await api.post("/admin/fleet", formData);
        const created = res.data as Veiculo;
        setVehicles((prev) => [created, ...prev]);
        Swal.fire({
          icon: "success",
          title: "Viatura adicionada",
          text: `Nova viatura ${formData.matricula} cadastrada na frota!`,
          timer: 1800,
          showConfirmButton: false,
          background: "#18181b",
          color: "#fff",
        });
      }
      setIsVehicleModalOpen(false);
    } catch (e: any) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "Erro ao salvar",
        text: e.response?.data?.error || "Ocorreu um erro ao salvar o veículo.",
        background: "#18181b",
        color: "#fff",
      });
    }
  };

  // Delete vehicle
  const handleDeleteVehicle = async (v: Veiculo) => {
    const result = await Swal.fire({
      title: `Eliminar viatura ${v.matricula}?`,
      text: "Todos os registos de abastecimentos e manutenções associados serão removidos.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#3f3f46",
      background: "#18181b",
      color: "#fff",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/admin/fleet/${v.id}`);
        setVehicles((prev) => prev.filter((item) => item.id !== v.id));
        if (selectedVehicle?.id === v.id) {
          setIsDetailModalOpen(false);
          setSelectedVehicle(null);
        }
        Swal.fire({
          icon: "success",
          title: "Viatura removida",
          timer: 1500,
          showConfirmButton: false,
          background: "#18181b",
          color: "#fff",
        });
      } catch (e: any) {
        Swal.fire({
          icon: "error",
          title: "Erro ao eliminar",
          text: e.response?.data?.error || "Não foi possível remover a viatura.",
          background: "#18181b",
          color: "#fff",
        });
      }
    }
  };

  // Open Quick Fuel Modal
  const handleOpenFuelModal = (v: Veiculo) => {
    setFuelTargetVehicle(v);
    setFuelForm({
      data: new Date().toISOString().split("T")[0],
      km: v.km_atual,
      litros: 40,
      preco_litro: v.combustivel.includes("Gasolina") ? 1.74 : 1.62,
      posto: "Galp",
      condutor: v.responsavel_nome || "",
      nota: "",
    });
    setIsFuelModalOpen(true);
  };

  // Submit Fuel Log
  const handleSaveFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuelTargetVehicle) return;

    try {
      const valor_total = Number((fuelForm.litros * fuelForm.preco_litro).toFixed(2));
      const payload = {
        ...fuelForm,
        valor_total,
      };

      const res = await api.post(`/admin/fleet/${fuelTargetVehicle.id}/abastecimento`, payload);
      const updated = res.data as Veiculo;
      setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      if (selectedVehicle?.id === updated.id) {
        setSelectedVehicle(updated);
      }

      Swal.fire({
        icon: "success",
        title: "Abastecimento registado",
        text: `Registado: € ${valor_total.toFixed(2)} (${fuelForm.litros} L)`,
        timer: 1800,
        showConfirmButton: false,
        background: "#18181b",
        color: "#fff",
      });
      setIsFuelModalOpen(false);
    } catch (e: any) {
      Swal.fire({
        icon: "error",
        title: "Erro ao registar abastecimento",
        text: e.response?.data?.error || "Falha na comunicação com o servidor.",
        background: "#18181b",
        color: "#fff",
      });
    }
  };

  // Open Quick Maintenance Modal
  const handleOpenMaintModal = (v: Veiculo) => {
    setMaintTargetVehicle(v);
    setMaintForm({
      data: new Date().toISOString().split("T")[0],
      tipo: "oleo",
      descricao: "Muda de óleo e filtros recomendados",
      km: v.km_atual,
      custo: 140,
      oficina: "Oficina Especializada",
      fatura_numero: "",
    });
    setIsMaintModalOpen(true);
  };

  // Submit Maintenance Log
  const handleSaveMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintTargetVehicle) return;

    try {
      const res = await api.post(`/admin/fleet/${maintTargetVehicle.id}/manutencao`, maintForm);
      const updated = res.data as Veiculo;
      setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      if (selectedVehicle?.id === updated.id) {
        setSelectedVehicle(updated);
      }

      Swal.fire({
        icon: "success",
        title: "Manutenção registada",
        text: maintForm.tipo === "oleo" ? "Troca de óleo efetuada! Próxima revisão recalculada." : "Registo de manutenção gravado.",
        timer: 2000,
        showConfirmButton: false,
        background: "#18181b",
        color: "#fff",
      });
      setIsMaintModalOpen(false);
    } catch (e: any) {
      Swal.fire({
        icon: "error",
        title: "Erro ao registar manutenção",
        text: e.response?.data?.error || "Falha na comunicação com o servidor.",
        background: "#18181b",
        color: "#fff",
      });
    }
  };

  // Quick Km Modal
  const handleOpenKmModal = (v: Veiculo) => {
    setKmTargetVehicle(v);
    setQuickKmInput(v.km_atual);
    setIsKmModalOpen(true);
  };

  const handleSaveKm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kmTargetVehicle) return;

    try {
      const res = await api.post(`/admin/fleet/${kmTargetVehicle.id}/km`, { km: quickKmInput });
      const updated = res.data as Veiculo;
      setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      if (selectedVehicle?.id === updated.id) {
        setSelectedVehicle(updated);
      }

      Swal.fire({
        icon: "success",
        title: "Quilometragem atualizada",
        text: `${kmTargetVehicle.matricula}: ${Number(quickKmInput).toLocaleString("pt-PT")} km`,
        timer: 1500,
        showConfirmButton: false,
        background: "#18181b",
        color: "#fff",
      });
      setIsKmModalOpen(false);
    } catch (e: any) {
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Não foi possível atualizar a quilometragem.",
        background: "#18181b",
        color: "#fff",
      });
    }
  };

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
            <button
              onClick={() => fetchData(false)}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors shadow-sm disabled:opacity-50"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
            </button>

            <button
              onClick={() => handleOpenVehicleModal()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs tracking-wide shadow-lg shadow-amber-500/10 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Viatura</span>
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Viaturas */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-sm relative overflow-hidden group hover:border-zinc-700 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total da Frota</span>
                <h3 className="text-2xl font-black text-zinc-100 mt-1">{stats.total}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Car className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1 font-semibold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {stats.ativos} Em operação
              </span>
              {stats.manutencao > 0 && (
                <span className="flex items-center gap-1 font-semibold text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  {stats.manutencao} Na oficina
                </span>
              )}
            </div>
          </div>

          {/* Alertas Urgentes */}
          <div
            onClick={() => {
              setActiveTab("alertas");
              setFilterOnlyAlerts(true);
            }}
            className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-sm relative overflow-hidden group hover:border-amber-500/50 cursor-pointer transition-all"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Alertas & Vencimentos</span>
                <h3 className="text-2xl font-black text-amber-400 mt-1">{stats.comAlertas}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs">
              <span className="text-zinc-400">
                {stats.alertasDetalhados.oleosUrgentes.length} óleos • {stats.alertasDetalhados.inspecoesUrgentes.length} IPOs • {stats.alertasDetalhados.segurosUrgentes.length} seguros
              </span>
            </div>
          </div>

          {/* Gastos de Combustível */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-sm relative overflow-hidden group hover:border-zinc-700 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Combustível Registado</span>
                <h3 className="text-2xl font-black text-emerald-400 mt-1">
                  € {stats.gastoCombustivelTotal.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Fuel className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-zinc-400">
              <span>Manutenções:</span>
              <strong className="text-zinc-200">
                € {stats.gastoManutencaoTotal.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          {/* Quilometragem da Frota */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-sm relative overflow-hidden group hover:border-zinc-700 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Km Rodados</span>
                <h3 className="text-2xl font-black text-zinc-100 mt-1">
                  {stats.totalKm.toLocaleString("pt-PT")} <span className="text-xs font-medium text-zinc-500">km</span>
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Gauge className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-zinc-400">
              <span>Média por viatura:</span>
              <strong className="text-zinc-200">{stats.mediaKm.toLocaleString("pt-PT")} km</strong>
            </div>
          </div>
        </div>

        {/* Tab Navigation & Toolbar */}
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center bg-zinc-950 p-2 sm:p-3 rounded-2xl border border-zinc-800/80">
          {/* Main Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab("veiculos")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "veiculos"
                  ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Viaturas da Frota</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === "veiculos" ? "bg-black/20 text-zinc-950 font-black" : "bg-zinc-800 text-zinc-400"}`}>
                {vehicles.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("alertas")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "alertas"
                  ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Alertas & Vencimentos</span>
              {stats.comAlertas > 0 && (
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === "alertas" ? "bg-black/20 text-zinc-950 font-black" : "bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30"}`}>
                  {stats.comAlertas}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("abastecimentos")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "abastecimentos"
                  ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Fuel className="w-4 h-4" />
              <span>Abastecimentos</span>
            </button>

            <button
              onClick={() => setActiveTab("manutencoes")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "manutencoes"
                  ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Manutenções & Óleo</span>
            </button>
          </div>

          {/* Search & Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-60 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Pesquisar matrícula, modelo, loja..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-600 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors h-[36px]"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter by Store */}
            <select
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 outline-none h-[36px] max-w-[160px] truncate"
            >
              <option value="todos">Todas as Lojas</option>
              {stores.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 outline-none h-[36px]"
            >
              <option value="todos">Todos Estados</option>
              <option value="ativo">Em Operação</option>
              <option value="manutencao">Em Manutenção</option>
              <option value="garagem">Na Garagem</option>
            </select>

            {/* Toggle Only Alerts */}
            <button
              onClick={() => setFilterOnlyAlerts(!filterOnlyAlerts)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold h-[36px] border transition-all ${
                filterOnlyAlerts
                  ? "bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-sm"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Com Alertas</span>
            </button>
          </div>
        </div>

        {/* TAB 1: VIATURAS DA FROTA */}
        {activeTab === "veiculos" && (
          <div className="space-y-4">
            {filteredVehicles.length === 0 ? (
              <div className="p-16 text-center rounded-2xl bg-zinc-950 border border-zinc-800/80">
                <Car className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <h4 className="text-base font-bold text-zinc-200">Nenhuma viatura encontrada</h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Ajuste os filtros de pesquisa ou clique em "Adicionar Viatura" para cadastrar um novo carro na frota.
                </p>
                <button
                  onClick={() => handleOpenVehicleModal()}
                  className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Viatura</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredVehicles.map((v) => {
                  const kmParaOleo = (v.km_proxima_troca_oleo || (v.km_ultima_troca_oleo + 10000)) - v.km_atual;
                  const oleoPercent = Math.min(
                    100,
                    Math.max(0, Math.round(((v.km_atual - v.km_ultima_troca_oleo) / (v.km_intervalo_troca_oleo || 10000)) * 100))
                  );

                  return (
                    <div
                      key={v.id}
                      className="bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-4.5 flex flex-col justify-between shadow-sm transition-all group relative overflow-hidden"
                    >
                      {/* Top Bar with License Plate and Status Badge */}
                      <div className="flex items-start justify-between gap-3">
                        {/* European Styled Plate */}
                        <div className="inline-flex items-center rounded-lg border border-zinc-700/80 bg-zinc-900 overflow-hidden shadow-inner">
                          <div className="bg-blue-700 text-white px-1.5 py-1 flex flex-col items-center justify-center text-[8px] font-black leading-none">
                            <span>★</span>
                            <span className="text-[9px] font-bold mt-0.5">P</span>
                          </div>
                          <div className="px-2.5 py-1 text-sm font-black tracking-widest text-zinc-100 font-mono">
                            {v.matricula}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            v.status === "ativo"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : v.status === "manutencao"
                              ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                              : "bg-zinc-800 border-zinc-700 text-zinc-400"
                          }`}
                        >
                          {v.status === "ativo" ? "Em Operação" : v.status === "manutencao" ? "Oficina" : "Garagem"}
                        </span>
                      </div>

                      {/* Vehicle Identity */}
                      <div className="mt-3">
                        <h4 className="text-base font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">
                          {v.marca} {v.modelo}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                          <span>{v.ano}</span>
                          <span>•</span>
                          <span>{v.cor}</span>
                          <span>•</span>
                          <span className="text-amber-400/90 font-medium">{v.combustivel}</span>
                        </div>
                      </div>

                      {/* Location (Store) & Responsible Driver */}
                      <div className="mt-3.5 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/60 space-y-2">
                        {/* Loja Alocada */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500 flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-zinc-400" />
                            Loja Alocada:
                          </span>
                          <span className="font-bold text-zinc-200 bg-zinc-800/60 px-2 py-0.5 rounded-md border border-zinc-700/40">
                            {v.loja_nome || "Armazém Central"}
                          </span>
                        </div>

                        {/* Responsável */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-zinc-400" />
                            Responsável:
                          </span>
                          <span className="font-medium text-zinc-300">
                            {v.responsavel_nome || "Não atribuído"}
                          </span>
                        </div>

                        {/* Quilometragem Atual */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/60">
                          <span className="text-zinc-500 flex items-center gap-1.5">
                            <Gauge className="w-3.5 h-3.5 text-zinc-400" />
                            Quilometragem:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-zinc-100 font-bold">
                              {Number(v.km_atual || 0).toLocaleString("pt-PT")} km
                            </strong>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenKmModal(v);
                              }}
                              className="text-[10px] text-amber-400 hover:text-amber-300 underline font-medium"
                              title="Atualizar Km"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Critical Alerts Strip (Óleo, IPO, Seguro) */}
                      <div className="mt-3.5 space-y-2">
                        {/* Troca de Óleo / Revisão */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-zinc-400 flex items-center gap-1">
                              <Droplet className="w-3 h-3 text-amber-400" />
                              Revisão / Óleo:
                            </span>
                            <span
                              className={`font-bold ${
                                v.oleoStatus === "expirado"
                                  ? "text-rose-400"
                                  : v.oleoStatus === "alerta"
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {kmParaOleo <= 0
                                ? `Vencida há ${Math.abs(kmParaOleo).toLocaleString("pt-PT")} km!`
                                : `Faltam ${kmParaOleo.toLocaleString("pt-PT")} km`}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className={`h-full transition-all rounded-full ${
                                v.oleoStatus === "expirado"
                                  ? "bg-rose-500"
                                  : v.oleoStatus === "alerta"
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(100, oleoPercent)}%` }}
                            />
                          </div>
                        </div>

                        {/* IPO & Seguro Badges */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {/* IPO */}
                          <div
                            className={`p-2 rounded-lg border text-[11px] flex flex-col ${
                              v.inspecaoStatus === "expirado"
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                                : v.inspecaoStatus === "alerta"
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                : "bg-zinc-900/60 border-zinc-800 text-zinc-300"
                            }`}
                          >
                            <span className="text-[10px] text-zinc-500 uppercase font-bold flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-zinc-400" />
                              Inspeção (IPO)
                            </span>
                            <strong className="mt-0.5 truncate">
                              {v.data_proxima_inspecao
                                ? new Date(v.data_proxima_inspecao).toLocaleDateString("pt-PT")
                                : "Sem data"}
                            </strong>
                            <span className="text-[10px] opacity-80 mt-0.5">
                              {v.diasParaInspecao !== undefined
                                ? v.diasParaInspecao < 0
                                  ? `Expirou há ${Math.abs(v.diasParaInspecao)}d`
                                  : v.diasParaInspecao <= 30
                                  ? `Expira em ${v.diasParaInspecao} dias`
                                  : "Em dia"
                                : ""}
                            </span>
                          </div>

                          {/* Seguro */}
                          <div
                            className={`p-2 rounded-lg border text-[11px] flex flex-col ${
                              v.seguroStatus === "expirado"
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                                : v.seguroStatus === "alerta"
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                : "bg-zinc-900/60 border-zinc-800 text-zinc-300"
                            }`}
                          >
                            <span className="text-[10px] text-zinc-500 uppercase font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-zinc-400" />
                              Seguro ({v.seguradora || "Ativo"})
                            </span>
                            <strong className="mt-0.5 truncate">
                              {v.data_validade_seguro
                                ? new Date(v.data_validade_seguro).toLocaleDateString("pt-PT")
                                : "Sem data"}
                            </strong>
                            <span className="text-[10px] opacity-80 mt-0.5">
                              {v.diasParaSeguro !== undefined
                                ? v.diasParaSeguro < 0
                                  ? `Expirou há ${Math.abs(v.diasParaSeguro)}d`
                                  : v.diasParaSeguro <= 30
                                  ? `Renovar em ${v.diasParaSeguro}d`
                                  : "Válido"
                                : ""}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenFuelModal(v)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-colors flex items-center gap-1"
                            title="Registar Abastecimento de Combustível"
                          >
                            <Fuel className="w-3.5 h-3.5" />
                            <span>Abastecer</span>
                          </button>

                          <button
                            onClick={() => handleOpenMaintModal(v)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold transition-colors flex items-center gap-1"
                            title="Registar Manutenção / Troca de Óleo"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Mecânica</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedVehicle(v);
                              setIsDetailModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            <span>Ficha</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenVehicleModal(v)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                            title="Editar viatura"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteVehicle(v)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Eliminar viatura"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ALERTAS & VENCIMENTOS */}
        {activeTab === "alertas" && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Painel de Alertas Prioritários
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Viaturas que requerem ação imediata: trocas de óleo iminentes ou vencidas, inspeções (IPO) e apólices de seguro.
                </p>
              </div>
              <button
                onClick={() => setFilterOnlyAlerts(false)}
                className="text-xs text-amber-400 hover:underline font-semibold"
              >
                Limpar filtros
              </button>
            </div>

            {/* Óleos & Revisões Pendentes */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
                <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-amber-400" />
                  Revisões e Trocas de Óleo ({stats.alertasDetalhados.oleosUrgentes.length})
                </h4>
                <span className="text-xs text-zinc-500">Recomendado a cada 10.000 / 15.000 km</span>
              </div>

              {stats.alertasDetalhados.oleosUrgentes.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Todas as viaturas estão com o nível e quilometragem de óleo em dia!</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {stats.alertasDetalhados.oleosUrgentes.map((v) => {
                    const kmParaOleo = (v.km_proxima_troca_oleo || 0) - v.km_atual;
                    return (
                      <div
                        key={v.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between ${
                          kmParaOleo <= 0
                            ? "bg-rose-500/10 border-rose-500/30"
                            : "bg-amber-500/10 border-amber-500/30"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono font-black text-sm text-zinc-100">{v.matricula}</span>
                            <h5 className="text-xs font-bold text-zinc-300 mt-0.5">{v.marca} {v.modelo}</h5>
                            <span className="text-[11px] text-zinc-400 block mt-1">Loja: <strong>{v.loja_nome}</strong></span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              kmParaOleo <= 0 ? "bg-rose-500 text-white" : "bg-amber-500 text-zinc-950"
                            }`}
                          >
                            {kmParaOleo <= 0 ? "Vencida" : "Atenção"}
                          </span>
                        </div>

                        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
                          <div className="text-xs">
                            <span className="text-zinc-400 block text-[10px]">Km Atual / Próxima:</span>
                            <span className="font-bold text-zinc-200">
                              {v.km_atual.toLocaleString("pt-PT")} / {v.km_proxima_troca_oleo.toLocaleString("pt-PT")} km
                            </span>
                          </div>
                          <button
                            onClick={() => handleOpenMaintModal(v)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-amber-400 text-amber-400 text-xs font-bold transition-all"
                          >
                            Registar Troca
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Inspeções (IPO) e Seguros */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Inspeções IPO */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
                  <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    Inspeções Periódicas (IPO) ({stats.alertasDetalhados.inspecoesUrgentes.length})
                  </h4>
                </div>

                {stats.alertasDetalhados.inspecoesUrgentes.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Nenhuma inspeção IPO a vencer nos próximos 30 dias.</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {stats.alertasDetalhados.inspecoesUrgentes.map((v) => (
                      <div
                        key={v.id}
                        className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="font-mono font-black text-xs px-2 py-1 bg-black/40 rounded border border-zinc-700 text-zinc-200">
                            {v.matricula}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-200">{v.modelo}</p>
                            <span className="text-[10px] text-zinc-400">{v.loja_nome} • Resp: {v.responsavel_nome}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-amber-400 block">
                            {v.data_proxima_inspecao ? new Date(v.data_proxima_inspecao).toLocaleDateString("pt-PT") : "-"}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {v.diasParaInspecao !== undefined && v.diasParaInspecao <= 0 ? "Vencida!" : `em ${v.diasParaInspecao} dias`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Seguros Automóvel */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
                  <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Seguros a Renovar ({stats.alertasDetalhados.segurosUrgentes.length})
                  </h4>
                </div>

                {stats.alertasDetalhados.segurosUrgentes.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Todas as apólices de seguro estão válidas e em conformidade!</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {stats.alertasDetalhados.segurosUrgentes.map((v) => (
                      <div
                        key={v.id}
                        className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="font-mono font-black text-xs px-2 py-1 bg-black/40 rounded border border-zinc-700 text-zinc-200">
                            {v.matricula}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-200">{v.seguradora} - {v.apolice_numero}</p>
                            <span className="text-[10px] text-zinc-400">{v.modelo} • {v.loja_nome}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-amber-400 block">
                            {v.data_validade_seguro ? new Date(v.data_validade_seguro).toLocaleDateString("pt-PT") : "-"}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {v.diasParaSeguro !== undefined && v.diasParaSeguro <= 0 ? "Expirou!" : `em ${v.diasParaSeguro} dias`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ABASTECIMENTOS & COMBUSTÍVEL */}
        {activeTab === "abastecimentos" && (
          <div className="space-y-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-emerald-400" />
                    Histórico Geral de Abastecimentos
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Registo de consumo de combustível, postos, valores pagos e condutores.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                      <th className="p-3.5">Data</th>
                      <th className="p-3.5">Viatura</th>
                      <th className="p-3.5">Loja Alocada</th>
                      <th className="p-3.5">Posto</th>
                      <th className="p-3.5">Condutor</th>
                      <th className="p-3.5 text-right">Km</th>
                      <th className="p-3.5 text-right">Litros</th>
                      <th className="p-3.5 text-right">Preço/L</th>
                      <th className="p-3.5 text-right">Total Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {vehicles.flatMap((v) =>
                      (v.abastecimentos || []).map((ab) => ({
                        ...ab,
                        matricula: v.matricula,
                        modelo: v.modelo,
                        loja_nome: v.loja_nome,
                      }))
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-zinc-500">
                          Nenhum abastecimento registado ainda.
                        </td>
                      </tr>
                    ) : (
                      vehicles
                        .flatMap((v) =>
                          (v.abastecimentos || []).map((ab) => ({
                            ...ab,
                            matricula: v.matricula,
                            modelo: v.modelo,
                            loja_nome: v.loja_nome,
                          }))
                        )
                        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                        .map((ab) => (
                          <tr key={ab.id} className="hover:bg-zinc-900/40 transition-colors">
                            <td className="p-3.5 font-medium text-zinc-200">
                              {new Date(ab.data).toLocaleDateString("pt-PT")}
                            </td>
                            <td className="p-3.5">
                              <span className="font-mono font-bold text-zinc-100 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                                {ab.matricula}
                              </span>
                              <span className="text-zinc-400 block text-[10px] mt-0.5">{ab.modelo}</span>
                            </td>
                            <td className="p-3.5 text-zinc-400">{ab.loja_nome}</td>
                            <td className="p-3.5 font-medium">{ab.posto}</td>
                            <td className="p-3.5 text-zinc-400">{ab.condutor}</td>
                            <td className="p-3.5 text-right font-mono">{Number(ab.km).toLocaleString("pt-PT")} km</td>
                            <td className="p-3.5 text-right font-bold text-zinc-100">{Number(ab.litros).toFixed(1)} L</td>
                            <td className="p-3.5 text-right text-zinc-400">€ {Number(ab.preco_litro).toFixed(2)}</td>
                            <td className="p-3.5 text-right font-bold text-emerald-400 text-sm">
                              € {Number(ab.valor_total).toFixed(2)}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MANUTENÇÕES & OFICINAS */}
        {activeTab === "manutencoes" && (
          <div className="space-y-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-amber-400" />
                    Histórico de Manutenções & Reparações
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Histórico completo de revisões, trocas de óleo, pneus, travões e reparações mecânicas.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                      <th className="p-3.5">Data</th>
                      <th className="p-3.5">Viatura</th>
                      <th className="p-3.5">Tipo</th>
                      <th className="p-3.5">Descrição</th>
                      <th className="p-3.5">Oficina</th>
                      <th className="p-3.5 text-right">Quilometragem</th>
                      <th className="p-3.5 text-right">Custo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {vehicles.flatMap((v) =>
                      (v.manutencoes || []).map((mn) => ({
                        ...mn,
                        matricula: v.matricula,
                        modelo: v.modelo,
                      }))
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-zinc-500">
                          Nenhuma manutenção registada até o momento.
                        </td>
                      </tr>
                    ) : (
                      vehicles
                        .flatMap((v) =>
                          (v.manutencoes || []).map((mn) => ({
                            ...mn,
                            matricula: v.matricula,
                            modelo: v.modelo,
                          }))
                        )
                        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                        .map((mn) => (
                          <tr key={mn.id} className="hover:bg-zinc-900/40 transition-colors">
                            <td className="p-3.5 font-medium text-zinc-200">
                              {new Date(mn.data).toLocaleDateString("pt-PT")}
                            </td>
                            <td className="p-3.5">
                              <span className="font-mono font-bold text-zinc-100 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                                {mn.matricula}
                              </span>
                              <span className="text-zinc-400 block text-[10px] mt-0.5">{mn.modelo}</span>
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  mn.tipo === "oleo"
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : mn.tipo === "travoes" || mn.tipo === "pneus"
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                }`}
                              >
                                {mn.tipo === "oleo" ? "Óleo / Filtros" : mn.tipo}
                              </span>
                            </td>
                            <td className="p-3.5 font-medium text-zinc-200">{mn.descricao}</td>
                            <td className="p-3.5 text-zinc-400">{mn.oficina}</td>
                            <td className="p-3.5 text-right font-mono">{Number(mn.km).toLocaleString("pt-PT")} km</td>
                            <td className="p-3.5 text-right font-bold text-rose-400 text-sm">
                              € {Number(mn.custo).toFixed(2)}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CRIAR / EDITAR VIATURA */}
        <Modal
          isOpen={isVehicleModalOpen}
          onClose={() => setIsVehicleModalOpen(false)}
          title={editingVehicle ? `Editar Viatura: ${editingVehicle.matricula}` : "Adicionar Nova Viatura à Frota"}
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveVehicle} className="space-y-4 pt-2">
            {/* Secção 1: Dados do Carro */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                Identificação do Veículo
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Matrícula *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 34-TX-89"
                    value={formData.matricula}
                    onChange={(e) => setFormData({ ...formData, matricula: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 font-mono font-bold tracking-wider outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Marca</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Renault, Peugeot"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Modelo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Kangoo Maxi 1.5 dCi"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Ano</label>
                  <input
                    type="number"
                    value={formData.ano}
                    onChange={(e) => setFormData({ ...formData, ano: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Cor</label>
                  <input
                    type="text"
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Combustível</label>
                  <select
                    value={formData.combustivel}
                    onChange={(e) => setFormData({ ...formData, combustivel: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                  >
                    <option value="Gasóleo">Gasóleo</option>
                    <option value="Gasolina 95">Gasolina 95</option>
                    <option value="Gasolina 98">Gasolina 98</option>
                    <option value="Elétrico">Elétrico</option>
                    <option value="Híbrido">Híbrido</option>
                    <option value="GPL">GPL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                  >
                    <option value="ativo">Em Operação</option>
                    <option value="manutencao">Em Manutenção</option>
                    <option value="garagem">Na Garagem</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Secção 2: Alocação (Loja & Responsável) */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">
                Alocação: Loja & Responsável
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Loja Alocada *</label>
                  <select
                    value={formData.loja_id}
                    onChange={(e) => {
                      const selectedStore = stores.find((s) => s.id === e.target.value);
                      setFormData({
                        ...formData,
                        loja_id: e.target.value,
                        loja_nome: selectedStore ? selectedStore.name : "Armazém Central",
                      });
                    }}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-blue-500"
                  >
                    <option value="">Armazém Central</option>
                    {stores.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Responsável / Condutor</label>
                  <input
                    type="text"
                    placeholder="Nome do motorista ou encarregado"
                    value={formData.responsavel_nome}
                    onChange={(e) => setFormData({ ...formData, responsavel_nome: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Telefone do Responsável</label>
                  <input
                    type="text"
                    placeholder="Ex: 912 345 678"
                    value={formData.responsavel_telefone}
                    onChange={(e) => setFormData({ ...formData, responsavel_telefone: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Quilometragem Atual (km) *</label>
                  <input
                    type="number"
                    value={formData.km_atual}
                    onChange={(e) => setFormData({ ...formData, km_atual: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 font-bold outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Secção 3: Validades & Documentos (Inspeção, Seguro, Óleo) */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                Validades & Manutenção Preventiva
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Próxima Inspeção (IPO)</label>
                  <input
                    type="date"
                    value={formData.data_proxima_inspecao}
                    onChange={(e) => setFormData({ ...formData, data_proxima_inspecao: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Validade do Seguro</label>
                  <input
                    type="date"
                    value={formData.data_validade_seguro}
                    onChange={(e) => setFormData({ ...formData, data_validade_seguro: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Companhia de Seguros</label>
                  <input
                    type="text"
                    placeholder="Ex: Fidelidade, Allianz, Tranquilidade"
                    value={formData.seguradora}
                    onChange={(e) => setFormData({ ...formData, seguradora: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Nº Apólice de Seguro</label>
                  <input
                    type="text"
                    placeholder="Ex: FID-882910-PT"
                    value={formData.apolice_numero}
                    onChange={(e) => setFormData({ ...formData, apolice_numero: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Km da Última Troca de Óleo</label>
                  <input
                    type="number"
                    value={formData.km_ultima_troca_oleo}
                    onChange={(e) => setFormData({ ...formData, km_ultima_troca_oleo: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Intervalo de Troca (Km)</label>
                  <input
                    type="number"
                    value={formData.km_intervalo_troca_oleo}
                    onChange={(e) => setFormData({ ...formData, km_intervalo_troca_oleo: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md shadow-amber-500/10"
              >
                {editingVehicle ? "Guardar Alterações" : "Cadastrar Viatura"}
              </button>
            </div>
          </form>
        </Modal>

        {/* MODAL: REGISTAR ABASTECIMENTO */}
        <Modal
          isOpen={isFuelModalOpen}
          onClose={() => setIsFuelModalOpen(false)}
          title={`Registar Abastecimento: ${fuelTargetVehicle?.matricula}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveFuel} className="space-y-4 pt-2">
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
              <span>{fuelTargetVehicle?.marca} {fuelTargetVehicle?.modelo}</span>
              <strong className="text-zinc-200">{fuelTargetVehicle?.loja_nome}</strong>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={fuelForm.data}
                  onChange={(e) => setFuelForm({ ...fuelForm, data: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Quilometragem (km)</label>
                <input
                  type="number"
                  required
                  value={fuelForm.km}
                  onChange={(e) => setFuelForm({ ...fuelForm, km: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Litros</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={fuelForm.litros}
                  onChange={(e) => setFuelForm({ ...fuelForm, litros: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Preço / Litro (€)</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={fuelForm.preco_litro}
                  onChange={(e) => setFuelForm({ ...fuelForm, preco_litro: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Posto de Combustível</label>
                <input
                  type="text"
                  placeholder="Ex: Galp, BP, Repsol, Prio"
                  value={fuelForm.posto}
                  onChange={(e) => setFuelForm({ ...fuelForm, posto: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Condutor</label>
                <input
                  type="text"
                  value={fuelForm.condutor}
                  onChange={(e) => setFuelForm({ ...fuelForm, condutor: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
              <span className="text-xs text-emerald-300 font-medium">Valor Total Calculado:</span>
              <strong className="text-base font-bold text-emerald-400">
                € {(Number(fuelForm.litros || 0) * Number(fuelForm.preco_litro || 0)).toFixed(2)}
              </strong>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsFuelModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold"
              >
                Registar Abastecimento
              </button>
            </div>
          </form>
        </Modal>

        {/* MODAL: REGISTAR MANUTENÇÃO / TROCA DE ÓLEO */}
        <Modal
          isOpen={isMaintModalOpen}
          onClose={() => setIsMaintModalOpen(false)}
          title={`Registar Manutenção: ${maintTargetVehicle?.matricula}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveMaint} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Tipo de Manutenção</label>
                <select
                  value={maintForm.tipo}
                  onChange={(e) => setMaintForm({ ...maintForm, tipo: e.target.value as any })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                >
                  <option value="oleo">Troca de Óleo / Filtros</option>
                  <option value="revisao">Revisão Periódica</option>
                  <option value="pneus">Pneus / Calibração</option>
                  <option value="travoes">Travões (Pastilhas/Discos)</option>
                  <option value="avaria">Reparação Mecânica / Avaria</option>
                  <option value="outro">Outro Serviço</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Data do Serviço</label>
                <input
                  type="date"
                  required
                  value={maintForm.data}
                  onChange={(e) => setMaintForm({ ...maintForm, data: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Quilometragem (km)</label>
                <input
                  type="number"
                  required
                  value={maintForm.km}
                  onChange={(e) => setMaintForm({ ...maintForm, km: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Custo Total (€)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={maintForm.custo}
                  onChange={(e) => setMaintForm({ ...maintForm, custo: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none font-bold text-rose-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Descrição do Serviço</label>
              <input
                type="text"
                required
                placeholder="Ex: Mudança de óleo 5W30 + filtro de ar + filtro de habitáculo"
                value={maintForm.descricao}
                onChange={(e) => setMaintForm({ ...maintForm, descricao: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Oficina / Mecânico</label>
                <input
                  type="text"
                  placeholder="Nome da oficina"
                  value={maintForm.oficina}
                  onChange={(e) => setMaintForm({ ...maintForm, oficina: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Nº Fatura (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: FT-2026/881"
                  value={maintForm.fatura_numero}
                  onChange={(e) => setMaintForm({ ...maintForm, fatura_numero: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                />
              </div>
            </div>

            {maintForm.tipo === "oleo" && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                💡 <strong>Dica:</strong> Ao registar a troca de óleo, o sistema recalcula automaticamente a próxima revisão para +{maintTargetVehicle?.km_intervalo_troca_oleo || 10000} km.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsMaintModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold"
              >
                Guardar Manutenção
              </button>
            </div>
          </form>
        </Modal>

        {/* MODAL: ATUALIZAR KM */}
        <Modal
          isOpen={isKmModalOpen}
          onClose={() => setIsKmModalOpen(false)}
          title={`Atualizar Quilometragem: ${kmTargetVehicle?.matricula}`}
          maxWidth="sm"
        >
          <form onSubmit={handleSaveKm} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Nova Leitura do Odómetro (km)
              </label>
              <input
                type="number"
                required
                value={quickKmInput}
                onChange={(e) => setQuickKmInput(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-lg text-zinc-100 font-bold outline-none focus:border-amber-500 text-center"
              />
              <span className="text-[11px] text-zinc-500 block text-center mt-1">
                Leitura anterior: {kmTargetVehicle?.km_atual?.toLocaleString("pt-PT")} km
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsKmModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold"
              >
                Atualizar Km
              </button>
            </div>
          </form>
        </Modal>

        {/* MODAL: FICHA DETALHADA DO VEÍCULO */}
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedVehicle(null);
          }}
          title={`Ficha da Viatura: ${selectedVehicle?.matricula || ""}`}
          maxWidth="3xl"
        >
          {selectedVehicle && (
            <div className="space-y-5 pt-1 text-xs">
              {/* Header card */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm px-2.5 py-1 bg-black/50 border border-zinc-700 rounded text-zinc-100">
                      {selectedVehicle.matricula}
                    </span>
                    <h3 className="text-base font-bold text-zinc-100">
                      {selectedVehicle.marca} {selectedVehicle.modelo}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-400 mt-1.5">
                    <span>Ano: <strong>{selectedVehicle.ano}</strong></span>
                    <span>•</span>
                    <span>Cor: <strong>{selectedVehicle.cor}</strong></span>
                    <span>•</span>
                    <span>Combustível: <strong>{selectedVehicle.combustivel}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleOpenFuelModal(selectedVehicle);
                    }}
                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold rounded-lg flex items-center gap-1.5"
                  >
                    <Fuel className="w-3.5 h-3.5" />
                    <span>+ Abastecer</span>
                  </button>
                  <button
                    onClick={() => {
                      handleOpenMaintModal(selectedVehicle);
                    }}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold rounded-lg flex items-center gap-1.5"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>+ Manutenção</span>
                  </button>
                </div>
              </div>

              {/* Grid with Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Alocação */}
                <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
                    Alocação Atual
                  </span>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Loja Alocada:</span>
                    <strong className="text-zinc-200">{selectedVehicle.loja_nome}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Condutor Responsável:</span>
                    <strong className="text-zinc-200">{selectedVehicle.responsavel_nome || "Não atribuído"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Contacto:</span>
                    <span className="text-zinc-300">{selectedVehicle.responsavel_telefone || "Sem contacto"}</span>
                  </div>
                </div>

                {/* Validades Legais */}
                <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                    Validades & Seguros
                  </span>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Próxima Inspeção (IPO):</span>
                    <strong className="text-zinc-200">
                      {selectedVehicle.data_proxima_inspecao
                        ? new Date(selectedVehicle.data_proxima_inspecao).toLocaleDateString("pt-PT")
                        : "Não agendada"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Seguradora / Apólice:</span>
                    <span className="text-zinc-300">{selectedVehicle.seguradora} ({selectedVehicle.apolice_numero || "-"})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Validade do Seguro:</span>
                    <strong className="text-zinc-200">
                      {selectedVehicle.data_validade_seguro
                        ? new Date(selectedVehicle.data_validade_seguro).toLocaleDateString("pt-PT")
                        : "Não registada"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Histórico Recente de Abastecimentos */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3.5">
                <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-2">
                  Últimos Abastecimentos deste Veículo
                </span>
                {!selectedVehicle.abastecimentos || selectedVehicle.abastecimentos.length === 0 ? (
                  <p className="text-zinc-500 py-2">Nenhum abastecimento registado ainda.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedVehicle.abastecimentos.map((ab) => (
                      <div key={ab.id} className="p-2 bg-zinc-950/60 rounded border border-zinc-800/80 flex items-center justify-between">
                        <span className="text-zinc-400">{new Date(ab.data).toLocaleDateString("pt-PT")}</span>
                        <span>{ab.posto}</span>
                        <span className="font-mono">{ab.km.toLocaleString("pt-PT")} km</span>
                        <strong className="text-zinc-200">{ab.litros} L</strong>
                        <strong className="text-emerald-400">€ {Number(ab.valor_total).toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Histórico Recente de Manutenções */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3.5">
                <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-2">
                  Últimas Manutenções e Intervenções Mecânicas
                </span>
                {!selectedVehicle.manutencoes || selectedVehicle.manutencoes.length === 0 ? (
                  <p className="text-zinc-500 py-2">Nenhuma manutenção registada ainda.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedVehicle.manutencoes.map((mn) => (
                      <div key={mn.id} className="p-2 bg-zinc-950/60 rounded border border-zinc-800/80 flex items-center justify-between">
                        <span className="text-zinc-400">{new Date(mn.data).toLocaleDateString("pt-PT")}</span>
                        <span className="font-bold uppercase text-[10px] text-amber-400">{mn.tipo}</span>
                        <span className="text-zinc-300 truncate max-w-[200px]">{mn.descricao}</span>
                        <span className="text-zinc-400">{mn.oficina}</span>
                        <strong className="text-rose-400">€ {Number(mn.custo).toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  onClick={() => {
                    handleOpenVehicleModal(selectedVehicle);
                    setIsDetailModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold"
                >
                  Editar Dados Completos
                </button>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ContentViewport>
  );
}
