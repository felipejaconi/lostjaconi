import React from "react";
import { Car, AlertTriangle, Fuel, Gauge } from "lucide-react";

interface FleetSummaryCardsProps {
  stats: any;
  onAlertsClick: () => void;
}

export function FleetSummaryCards({ stats, onAlertsClick }: FleetSummaryCardsProps) {
  return (
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
        onClick={onAlertsClick}
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
  );
}
