import React, { useState, useEffect } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Veiculo } from "./types";

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  editingVehicle: Veiculo | null;
  stores: any[];
}

export function VehicleModal({ isOpen, onClose, onSave, editingVehicle, stores }: VehicleModalProps) {
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

  useEffect(() => {
    if (editingVehicle) {
      setFormData({
        matricula: editingVehicle.matricula,
        marca: editingVehicle.marca,
        modelo: editingVehicle.modelo,
        ano: editingVehicle.ano,
        cor: editingVehicle.cor,
        combustivel: editingVehicle.combustivel,
        capacidade_deposito: editingVehicle.capacidade_deposito,
        km_atual: editingVehicle.km_atual,
        loja_id: editingVehicle.loja_id,
        loja_nome: editingVehicle.loja_nome,
        responsavel_nome: editingVehicle.responsavel_nome,
        responsavel_telefone: editingVehicle.responsavel_telefone,
        status: editingVehicle.status,
        data_proxima_inspecao: editingVehicle.data_proxima_inspecao || "",
        seguradora: editingVehicle.seguradora || "Fidelidade",
        apolice_numero: editingVehicle.apolice_numero || "",
        tipo_seguro: editingVehicle.tipo_seguro || "Danos Próprios",
        data_validade_seguro: editingVehicle.data_validade_seguro || "",
        km_ultima_troca_oleo: editingVehicle.km_ultima_troca_oleo || editingVehicle.km_atual,
        km_intervalo_troca_oleo: editingVehicle.km_intervalo_troca_oleo || 10000,
        mes_iuc: editingVehicle.mes_iuc || 1,
        ano_iuc_pago: editingVehicle.ano_iuc_pago || new Date().getFullYear(),
        iuc_valor: editingVehicle.iuc_valor || 130,
        notas: editingVehicle.notas || "",
      });
    } else {
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
  }, [editingVehicle, isOpen, stores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingVehicle ? `Editar Viatura: ${editingVehicle.matricula}` : "Adicionar Nova Viatura"}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Dados de Identificação</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Matrícula *</label>
                <input
                  type="text"
                  required
                  placeholder="00-XX-00"
                  value={formData.matricula}
                  onChange={(e) => setFormData({ ...formData, matricula: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 font-bold uppercase outline-none focus:border-amber-500"
                />
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
                  <option value="inativo">Inativo / Vendido</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Marca</label>
                <input
                  type="text"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Modelo *</label>
                <input
                  type="text"
                  required
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">Alocação & Responsável</span>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Loja Alocada</label>
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
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
              >
                <option value="">Armazém Central</option>
                {stores.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Responsável / Condutor</label>
              <input
                type="text"
                value={formData.responsavel_nome}
                onChange={(e) => setFormData({ ...formData, responsavel_nome: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold">Cancelar</button>
          <button type="submit" className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md shadow-amber-500/10">
            {editingVehicle ? "Guardar Alterações" : "Cadastrar Viatura"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
