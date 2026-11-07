import React from "react";
import { 
  Store, User, Gauge, Droplet, Calendar, ShieldCheck, 
  Fuel, Wrench, MoreVertical, Edit2, Trash2 
} from "lucide-react";
import { Veiculo } from "./types";

interface VehicleCardProps {
  key?: React.Key;
  vehicle: Veiculo;
  onOpenKmModal: (v: Veiculo) => void;
  onOpenFuelModal: (v: Veiculo) => void;
  onOpenMaintModal: (v: Veiculo) => void;
  onEdit: (v: Veiculo) => void;
  onDelete: (v: Veiculo) => void | Promise<void>;
  onClick: (v: Veiculo) => void;
}

export function VehicleCard({ 
  vehicle: v, 
  onOpenKmModal, 
  onOpenFuelModal, 
  onOpenMaintModal, 
  onEdit, 
  onDelete,
  onClick
}: VehicleCardProps) {
  const kmParaOleo = (v.km_proxima_troca_oleo || (v.km_ultima_troca_oleo + 10000)) - v.km_atual;
  const oleoPercent = Math.min(
    100,
    Math.max(0, Math.round(((v.km_atual - v.km_ultima_troca_oleo) / (v.km_intervalo_troca_oleo || 10000)) * 100))
  );

  return (
    <div
      onClick={() => onClick(v)}
      className="bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-4.5 flex flex-col justify-between shadow-sm transition-all group relative overflow-hidden cursor-pointer"
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
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-zinc-400" />
            Loja Alocada:
          </span>
          <span className="font-bold text-zinc-200 bg-zinc-800/60 px-2 py-0.5 rounded-md border border-zinc-700/40 truncate max-w-[120px]">
            {v.loja_nome || "Armazém Central"}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-zinc-400" />
            Responsável:
          </span>
          <span className="font-medium text-zinc-300 truncate max-w-[120px]">
            {v.responsavel_nome || "Não atribuído"}
          </span>
        </div>

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
                onOpenKmModal(v);
              }}
              className="text-[10px] text-amber-400 hover:text-amber-300 underline font-medium"
            >
              Editar
            </button>
          </div>
        </div>
      </div>

      {/* Critical Alerts Strip (Óleo, IPO, Seguro) */}
      <div className="mt-3.5 space-y-2">
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

        <div className="grid grid-cols-2 gap-2 pt-1">
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
          </div>

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
              Seguro
            </span>
            <strong className="mt-0.5 truncate">
              {v.data_validade_seguro
                ? new Date(v.data_validade_seguro).toLocaleDateString("pt-PT")
                : "Sem data"}
            </strong>
          </div>
        </div>
      </div>
      
      {/* Quick Actions Footer */}
      <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onOpenFuelModal(v); }}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all"
            title="Abastecer"
          >
            <Fuel size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenMaintModal(v); }}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all"
            title="Manutenção"
          >
            <Wrench size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(v); }}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all"
            title="Editar Viatura"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(v); }}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all"
            title="Eliminar Viatura"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
