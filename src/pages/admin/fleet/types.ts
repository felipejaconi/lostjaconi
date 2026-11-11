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
