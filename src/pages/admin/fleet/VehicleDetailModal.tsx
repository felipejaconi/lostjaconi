import React from "react";
import { 
  Fuel, Wrench, Store, User, ShieldCheck, Calendar 
} from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Veiculo } from "./types";

interface VehicleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Veiculo | null;
  onOpenFuelModal: (v: Veiculo) => void;
  onOpenMaintModal: (v: Veiculo) => void;
  onEdit: (v: Veiculo) => void;
}

export function VehicleDetailModal({ 
  isOpen, onClose, vehicle: selectedVehicle, 
  onOpenFuelModal, onOpenMaintModal, onEdit 
}: VehicleDetailModalProps) {
  if (!selectedVehicle) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ficha da Viatura: ${selectedVehicle.matricula}`}
      maxWidth="3xl"
    >
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
              onClick={() => onOpenFuelModal(selectedVehicle)}
              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold rounded-lg flex items-center gap-1.5"
            >
              <Fuel className="w-3.5 h-3.5" />
              <span>+ Abastecer</span>
            </button>
            <button
              onClick={() => onOpenMaintModal(selectedVehicle)}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold rounded-lg flex items-center gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>+ Manutenção</span>
            </button>
          </div>
        </div>

        {/* Grid with Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">Alocação Atual</span>
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

          <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Validades & Seguros</span>
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
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3.5 max-h-40 overflow-y-auto custom-scrollbar">
          <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-2">Últimos Abastecimentos</span>
          {!selectedVehicle.abastecimentos || selectedVehicle.abastecimentos.length === 0 ? (
            <p className="text-zinc-500 py-2 text-center">Nenhum abastecimento registado ainda.</p>
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
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3.5 max-h-40 overflow-y-auto custom-scrollbar">
          <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-2">Últimas Manutenções</span>
          {!selectedVehicle.manutencoes || selectedVehicle.manutencoes.length === 0 ? (
            <p className="text-zinc-500 py-2 text-center">Nenhuma manutenção registada ainda.</p>
          ) : (
            <div className="space-y-1.5">
              {selectedVehicle.manutencoes.map((mn) => (
                <div key={mn.id} className="p-2 bg-zinc-950/60 rounded border border-zinc-800/80 flex items-center justify-between">
                  <span className="text-zinc-400">{new Date(mn.data).toLocaleDateString("pt-PT")}</span>
                  <span className="font-bold uppercase text-[10px] text-amber-400">{mn.tipo}</span>
                  <span className="text-zinc-300 truncate max-w-[200px]">{mn.descricao}</span>
                  <strong className="text-rose-400">€ {Number(mn.custo).toFixed(2)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <button onClick={() => { onEdit(selectedVehicle); onClose(); }} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold">Editar Dados Completos</button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold">Fechar</button>
        </div>
      </div>
    </Modal>
  );
}
