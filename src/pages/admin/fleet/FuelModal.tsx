import React, { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Abastecimento, Veiculo } from "./types";

interface FuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  vehicle: Veiculo | null;
  editingFuel?: Abastecimento | null;
}

function toDateInput(value?: string | null): string {
  if (!value) return new Date().toISOString().split("T")[0];
  const match = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : new Date().toISOString().split("T")[0];
}

export function FuelModal({ isOpen, onClose, onSave, vehicle, editingFuel }: FuelModalProps) {
  const [fuelForm, setFuelForm] = useState({
    data: new Date().toISOString().split("T")[0],
    km: 0,
    litros: 40,
    preco_litro: 1.62,
    posto: "",
    condutor: "",
    nota: "",
  });

  useEffect(() => {
    if (editingFuel) {
      setFuelForm({
        data: toDateInput(editingFuel.data),
        km: Number(editingFuel.km) || 0,
        litros: Number(editingFuel.litros) || 0,
        preco_litro:
          Number(editingFuel.preco_litro) ||
          (Number(editingFuel.litros) > 0
            ? Number((Number(editingFuel.valor_total) / Number(editingFuel.litros)).toFixed(3))
            : 1.62),
        posto: editingFuel.posto || "",
        condutor: editingFuel.condutor || vehicle?.responsavel_nome || "",
        nota: editingFuel.nota || "",
      });
    } else if (vehicle) {
      setFuelForm({
        data: new Date().toISOString().split("T")[0],
        km: vehicle.km_atual,
        litros: 40,
        preco_litro: vehicle.combustivel?.includes("Gasolina") ? 1.74 : 1.62,
        posto: "",
        condutor: vehicle.responsavel_nome || "",
        nota: "",
      });
    }
  }, [vehicle, editingFuel, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(fuelForm);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingFuel
          ? `Editar Abastecimento: ${vehicle?.matricula}`
          : `Registar Abastecimento: ${vehicle?.matricula}`
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
          <span>
            {vehicle?.marca} {vehicle?.modelo}
          </span>
          <strong className="text-zinc-200">{vehicle?.loja_nome}</strong>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Data</label>
            <input
              type="date"
              required
              value={fuelForm.data}
              onChange={(e) => setFuelForm({ ...fuelForm, data: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-emerald-500 [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Quilometragem (km)</label>
            <input
              type="number"
              required
              value={fuelForm.km}
              onChange={(e) => setFuelForm({ ...fuelForm, km: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 font-bold outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 mb-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              Onde foi o abastecimento (Posto / Local)
            </label>
            <input
              type="text"
              list="fleet-postos-sugestoes"
              value={fuelForm.posto}
              onChange={(e) => setFuelForm({ ...fuelForm, posto: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-emerald-500"
            />
            <datalist id="fleet-postos-sugestoes">
              <option value="Galp" />
              <option value="Repsol" />
              <option value="BP" />
              <option value="Prio" />
              <option value="Cepsa" />
              <option value="Intermarché" />
              <option value="Auchan" />
            </datalist>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Condutor</label>
            <input
              type="text"
              value={fuelForm.condutor}
              onChange={(e) => setFuelForm({ ...fuelForm, condutor: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Litros</label>
            <input
              type="number"
              step="0.01"
              required
              value={fuelForm.litros}
              onChange={(e) => setFuelForm({ ...fuelForm, litros: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-emerald-500"
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
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-emerald-500"
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
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold cursor-pointer"
          >
            {editingFuel ? "Guardar Alterações" : "Registar Abastecimento"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
