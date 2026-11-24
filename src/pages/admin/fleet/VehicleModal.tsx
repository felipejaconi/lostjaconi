import React, { useState, useEffect } from "react";
import { Calendar, ShieldCheck, Droplet } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Veiculo } from "./types";

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  editingVehicle: Veiculo | null;
  stores: any[];
}

function toDateInput(value?: string | null): string {
  if (!value) return "";
  const str = String(value).trim();
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

export function VehicleModal({ isOpen, onClose, onSave, editingVehicle, stores }: VehicleModalProps) {
  const [formData, setFormData] = useState({
    matricula: "",
    marca: "Renault",
    modelo: "",
    ano: new Date().getFullYear(),
    cor: "Branco",
    combustivel: "Gasóleo",
    capacidade_deposito: 50,
    km_atual: 0,
    loja_id: "",
    loja_nome: "Armazém Central",
    responsavel_nome: "",
    responsavel_telefone: "",
    status: "ativo" as "ativo" | "manutencao" | "garagem" | "inativo",
    data_ultima_inspecao: "",
    data_proxima_inspecao: "",
    seguradora: "Fidelidade",
    apolice_numero: "",
    tipo_seguro: "Danos Próprios",
    data_validade_seguro: "",
    km_ultima_troca_oleo: 0,
    km_intervalo_troca_oleo: 10000,
    km_proxima_troca_oleo: 10000,
    data_ultima_troca_oleo: "",
    mes_iuc: 1,
    ano_iuc_pago: new Date().getFullYear(),
    iuc_valor: 130,
    notas: "",
  });

  useEffect(() => {
    if (editingVehicle) {
      const kmUltima = Number(editingVehicle.km_ultima_troca_oleo ?? editingVehicle.km_atual ?? 0);
      const kmIntervalo = Number(editingVehicle.km_intervalo_troca_oleo || 10000);
      const kmProxima = Number(editingVehicle.km_proxima_troca_oleo || kmUltima + kmIntervalo);

      setFormData({
        matricula: editingVehicle.matricula || "",
        marca: editingVehicle.marca || "",
        modelo: editingVehicle.modelo || "",
        ano: Number(editingVehicle.ano) || new Date().getFullYear(),
        cor: editingVehicle.cor || "Branco",
        combustivel: editingVehicle.combustivel || "Gasóleo",
        capacidade_deposito: Number(editingVehicle.capacidade_deposito) || 50,
        km_atual: Number(editingVehicle.km_atual) || 0,
        loja_id: editingVehicle.loja_id || "",
        loja_nome: editingVehicle.loja_nome || "Armazém Central",
        responsavel_nome: editingVehicle.responsavel_nome || "",
        responsavel_telefone: editingVehicle.responsavel_telefone || "",
        status: editingVehicle.status || "ativo",
        data_ultima_inspecao: toDateInput(editingVehicle.data_ultima_inspecao),
        data_proxima_inspecao: toDateInput(editingVehicle.data_proxima_inspecao),
        seguradora: editingVehicle.seguradora || "",
        apolice_numero: editingVehicle.apolice_numero || "",
        tipo_seguro: editingVehicle.tipo_seguro || "Danos Próprios",
        data_validade_seguro: toDateInput(editingVehicle.data_validade_seguro),
        km_ultima_troca_oleo: kmUltima,
        km_intervalo_troca_oleo: kmIntervalo,
        km_proxima_troca_oleo: kmProxima,
        data_ultima_troca_oleo: toDateInput(editingVehicle.data_ultima_troca_oleo),
        mes_iuc: Number(editingVehicle.mes_iuc) || 1,
        ano_iuc_pago: Number(editingVehicle.ano_iuc_pago) || new Date().getFullYear(),
        iuc_valor: Number(editingVehicle.iuc_valor ?? 0),
        notas: editingVehicle.notas || "",
      });
    } else {
      setFormData({
        matricula: "",
        marca: "Renault",
        modelo: "",
        ano: new Date().getFullYear(),
        cor: "Branco",
        combustivel: "Gasóleo",
        capacidade_deposito: 50,
        km_atual: 0,
        loja_id: stores[0]?.id || "",
        loja_nome: stores[0]?.name || "Armazém Central",
        responsavel_nome: "",
        responsavel_telefone: "",
        status: "ativo",
        data_ultima_inspecao: "",
        data_proxima_inspecao: "",
        seguradora: "Fidelidade",
        apolice_numero: "",
        tipo_seguro: "Danos Próprios",
        data_validade_seguro: "",
        km_ultima_troca_oleo: 0,
        km_intervalo_troca_oleo: 10000,
        km_proxima_troca_oleo: 10000,
        data_ultima_troca_oleo: toDateInput(new Date().toISOString()),
        mes_iuc: new Date().getMonth() + 1,
        ano_iuc_pago: new Date().getFullYear(),
        iuc_valor: 135,
        notas: "",
      });
    }
  }, [editingVehicle, isOpen, stores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...formData,
      loja_id: formData.loja_id || null,
      data_ultima_inspecao: formData.data_ultima_inspecao || null,
      data_proxima_inspecao: formData.data_proxima_inspecao || null,
      data_validade_seguro: formData.data_validade_seguro || null,
      data_ultima_troca_oleo: formData.data_ultima_troca_oleo || null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingVehicle ? `Editar Viatura: ${editingVehicle.matricula}` : "Adicionar Nova Viatura"}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Row 1: Identificação + Alocação */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
              Dados de Identificação
            </span>
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
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-amber-500"
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
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Modelo *</label>
                <input
                  type="text"
                  required
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Ano</label>
                <input
                  type="number"
                  value={formData.ano}
                  onChange={(e) => setFormData({ ...formData, ano: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Cor</label>
                <input
                  type="text"
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Combustível</label>
                <select
                  value={formData.combustivel}
                  onChange={(e) => setFormData({ ...formData, combustivel: e.target.value })}
                  className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-amber-500"
                >
                  <option value="Gasóleo">Gasóleo</option>
                  <option value="Gasolina 95">Gasolina 95</option>
                  <option value="Gasolina 98">Gasolina 98</option>
                  <option value="Elétrico">Elétrico</option>
                  <option value="Híbrido">Híbrido</option>
                  <option value="GPL">GPL</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">
              Alocação & Responsável
            </span>
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
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-amber-500"
              >
                <option value="">Armazém Central</option>
                {stores.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Responsável / Condutor</label>
                <input
                  type="text"
                  value={formData.responsavel_nome}
                  onChange={(e) => setFormData({ ...formData, responsavel_nome: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Contacto / Telefone</label>
                <input
                  type="text"
                  value={formData.responsavel_telefone}
                  onChange={(e) => setFormData({ ...formData, responsavel_telefone: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Quilometragem Atual (km)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.km_atual}
                  onChange={(e) => setFormData({ ...formData, km_atual: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 font-semibold outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Depósito (Litros)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.capacidade_deposito}
                  onChange={(e) => setFormData({ ...formData, capacidade_deposito: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Inspeção (IPO) & IUC + Seguro */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Inspeção (IPO) & IUC
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Última Inspeção</label>
                <input
                  type="date"
                  value={formData.data_ultima_inspecao}
                  onChange={(e) => setFormData({ ...formData, data_ultima_inspecao: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-emerald-500 [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Próxima Inspeção (IPO)</label>
                <input
                  type="date"
                  value={formData.data_proxima_inspecao}
                  onChange={(e) => setFormData({ ...formData, data_proxima_inspecao: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 font-semibold outline-none focus:border-emerald-500 [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Mês IUC</label>
                <select
                  value={formData.mes_iuc}
                  onChange={(e) => setFormData({ ...formData, mes_iuc: Number(e.target.value) })}
                  className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-emerald-500"
                >
                  {[
                    "1 - Jan",
                    "2 - Fev",
                    "3 - Mar",
                    "4 - Abr",
                    "5 - Mai",
                    "6 - Jun",
                    "7 - Jul",
                    "8 - Ago",
                    "9 - Set",
                    "10 - Out",
                    "11 - Nov",
                    "12 - Dez",
                  ].map((label, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Ano IUC Pago</label>
                <input
                  type="number"
                  value={formData.ano_iuc_pago}
                  onChange={(e) => setFormData({ ...formData, ano_iuc_pago: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Valor IUC (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.iuc_valor}
                  onChange={(e) => setFormData({ ...formData, iuc_valor: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Seguro da Viatura
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Seguradora</label>
                <input
                  type="text"
                  placeholder="Ex: Fidelidade"
                  value={formData.seguradora}
                  onChange={(e) => setFormData({ ...formData, seguradora: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Nº da Apólice</label>
                <input
                  type="text"
                  placeholder="Ex: FID-000000"
                  value={formData.apolice_numero}
                  onChange={(e) => setFormData({ ...formData, apolice_numero: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-cyan-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Tipo de Seguro</label>
                <select
                  value={formData.tipo_seguro}
                  onChange={(e) => setFormData({ ...formData, tipo_seguro: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-cyan-500"
                >
                  <option value="Danos Próprios">Danos Próprios</option>
                  <option value="Contra Todos os Riscos">Contra Todos os Riscos</option>
                  <option value="Responsabilidade Civil">Responsabilidade Civil</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Validade do Seguro</label>
                <input
                  type="date"
                  value={formData.data_validade_seguro}
                  onChange={(e) => setFormData({ ...formData, data_validade_seguro: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 font-semibold outline-none focus:border-cyan-500 [color-scheme:dark]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Revisão / Óleo & Observações */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Droplet className="w-3.5 h-3.5" />
            Revisão / Troca de Óleo & Notas
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Km Última Troca</label>
              <input
                type="number"
                min={0}
                value={formData.km_ultima_troca_oleo}
                onChange={(e) => {
                  const ultima = Number(e.target.value);
                  setFormData({
                    ...formData,
                    km_ultima_troca_oleo: ultima,
                    km_proxima_troca_oleo: ultima + (Number(formData.km_intervalo_troca_oleo) || 10000),
                  });
                }}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Intervalo (km)</label>
              <input
                type="number"
                min={1000}
                step={500}
                value={formData.km_intervalo_troca_oleo}
                onChange={(e) => {
                  const intervalo = Number(e.target.value);
                  setFormData({
                    ...formData,
                    km_intervalo_troca_oleo: intervalo,
                    km_proxima_troca_oleo: (Number(formData.km_ultima_troca_oleo) || 0) + intervalo,
                  });
                }}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Próxima Troca (km)</label>
              <input
                type="number"
                min={0}
                value={formData.km_proxima_troca_oleo}
                onChange={(e) => setFormData({ ...formData, km_proxima_troca_oleo: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 font-semibold outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Data Última Troca</label>
              <input
                type="date"
                value={formData.data_ultima_troca_oleo}
                onChange={(e) => setFormData({ ...formData, data_ultima_troca_oleo: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-amber-500 [color-scheme:dark]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Observações</label>
            <textarea
              rows={2}
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-amber-500 resize-none"
            />
          </div>
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
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md shadow-amber-500/10 cursor-pointer"
          >
            {editingVehicle ? "Guardar Alterações" : "Cadastrar Viatura"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
