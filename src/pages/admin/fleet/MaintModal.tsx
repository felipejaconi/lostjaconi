import React, { useState, useEffect } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Veiculo } from "./types";

interface MaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  vehicle: Veiculo | null;
}

export function MaintModal({ isOpen, onClose, onSave, vehicle }: MaintModalProps) {
  const [maintForm, setMaintForm] = useState({
    data: new Date().toISOString().split("T")[0],
    tipo: "oleo" as "oleo" | "revisao" | "pneus" | "travoes" | "avaria" | "outro",
    descricao: "Muda de óleo 5W30 e filtros",
    km: 0,
    custo: 120,
    oficina: "Oficina Mecânica",
    fatura_numero: "",
  });

  useEffect(() => {
    if (vehicle) {
      setMaintForm({
        data: new Date().toISOString().split("T")[0],
        tipo: "oleo",
        descricao: "Muda de óleo e filtros recomendados",
        km: vehicle.km_atual,
        custo: 140,
        oficina: "Oficina Especializada",
        fatura_numero: "",
      });
    }
  }, [vehicle, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(maintForm);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Registar Manutenção: ${vehicle?.matricula}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
            placeholder="Ex: Mudança de óleo 5W30 + filtros"
            value={maintForm.descricao}
            onChange={(e) => setMaintForm({ ...maintForm, descricao: e.target.value })}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold">Cancelar</button>
          <button type="submit" className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold">Guardar Manutenção</button>
        </div>
      </form>
    </Modal>
  );
}
