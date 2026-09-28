import fs from "fs";
import path from "path";

const fleetFilePath = path.join(process.cwd(), "fleet_data.json");

// Initial seed with 12 vehicles distributed across stores and central warehouse
const initialVehicles = [
  {
    id: "frot-001",
    matricula: "34-TX-89",
    marca: "Renault",
    modelo: "Kangoo Maxi 1.5 dCi",
    ano: 2022,
    cor: "Branco",
    combustivel: "Gasóleo",
    capacidade_deposito: 50,
    km_atual: 68420,
    loja_id: "f94d4248-feac-4aed-9e8f-4dbcb513948b",
    loja_nome: "BENAVENTE",
    responsavel_nome: "Miguel Antunes",
    responsavel_telefone: "912 345 678",
    status: "ativo",
    data_ultima_inspecao: "2025-05-15",
    data_proxima_inspecao: "2026-05-15",
    seguradora: "Fidelidade",
    apolice_numero: "FID-882910-PT",
    tipo_seguro: "Danos Próprios",
    data_validade_seguro: "2026-11-20",
    km_ultima_troca_oleo: 60000,
    km_intervalo_troca_oleo: 10000,
    km_proxima_troca_oleo: 70000,
    data_ultima_troca_oleo: "2026-06-10",
    mes_iuc: 5,
    ano_iuc_pago: 2026,
    iuc_valor: 135.40,
    notas: "Viatura de entregas regulares da loja Benavente.",
    abastecimentos: [
      { id: "ab-1", data: "2026-09-22", km: 68420, litros: 42.5, preco_litro: 1.62, valor_total: 68.85, posto: "Galp Benavente", condutor: "Miguel Antunes" },
      { id: "ab-2", data: "2026-09-14", km: 67890, litros: 40.0, preco_litro: 1.63, valor_total: 65.20, posto: "Repsol Alverca", condutor: "Miguel Antunes" }
    ],
    manutencoes: [
      { id: "mn-1", data: "2026-06-10", tipo: "oleo", descricao: "Muda de óleo 5W30 + filtro de óleo e ar", km: 60000, custo: 145.00, oficina: "Oficina Central Ribatejo" }
    ]
  },
  {
    id: "frot-002",
    matricula: "72-ZD-14",
    marca: "Peugeot",
    modelo: "Partner Van 1.6 BlueHDi",
    ano: 2021,
    cor: "Branco",
    combustivel: "Gasóleo",
    capacidade_deposito: 53,
    km_atual: 89350,
    loja_id: "b5ff7db2-715b-4572-8504-34587a15795b",
    loja_nome: "ARRUDA DOS VINHOS",
    responsavel_nome: "Rui Fernandes",
    responsavel_telefone: "919 882 104",
    status: "ativo",
    data_ultima_inspecao: "2025-10-10",
    data_proxima_inspecao: "2026-10-10", // Vencendo em breve!
    seguradora: "Tranquilidade",
    apolice_numero: "TRQ-449120-PT",
    tipo_seguro: "Contra Todos os Riscos",
    data_validade_seguro: "2026-12-05",
    km_ultima_troca_oleo: 80000,
    km_intervalo_troca_oleo: 10000,
    km_proxima_troca_oleo: 90000, // Apenas 650 km restantes!
    data_ultima_troca_oleo: "2026-05-18",
    mes_iuc: 10,
    ano_iuc_pago: 2025,
    iuc_valor: 142.10,
    notas: "Requer atenção na revisão dos 90.000 km.",
    abastecimentos: [
      { id: "ab-3", data: "2026-09-20", km: 89350, litros: 46.0, preco_litro: 1.59, valor_total: 73.14, posto: "BP Arruda", condutor: "Rui Fernandes" }
    ],
    manutencoes: [
      { id: "mn-2", data: "2026-05-18", tipo: "oleo", descricao: "Revisão periódica + filtros", km: 80000, custo: 180.00, oficina: "Mecânica AutoArruda" },
      { id: "mn-3", data: "2026-07-02", tipo: "travoes", descricao: "Substituição pastilhas dianteiras", km: 84200, custo: 120.00, oficina: "Mecânica AutoArruda" }
    ]
  },
  {
    id: "frot-003",
    matricula: "58-AL-33",
    marca: "Citroën",
    modelo: "Berlingo Cargo BlueHDi 100",
    ano: 2023,
    cor: "Cinza Prata",
    combustivel: "Gasóleo",
    capacidade_deposito: 50,
    km_atual: 41200,
    loja_id: "df9e24e7-620d-4631-aeec-f6a0e0336a2f",
    loja_nome: "ALENQUER",
    responsavel_nome: "Pedro Carmo",
    responsavel_telefone: "925 110 339",
    status: "ativo",
    data_ultima_inspecao: "2025-03-20",
    data_proxima_inspecao: "2027-03-20", // Veículo recente
    seguradora: "Allianz",
    apolice_numero: "ALZ-99318-PT",
    tipo_seguro: "Danos Próprios",
    data_validade_seguro: "2026-10-15", // Vencendo em breve!
    km_ultima_troca_oleo: 35000,
    km_intervalo_troca_oleo: 15000,
    km_proxima_troca_oleo: 50000,
    data_ultima_troca_oleo: "2026-04-12",
    mes_iuc: 3,
    ano_iuc_pago: 2026,
    iuc_valor: 148.00,
    notas: "Viatura em excelente estado.",
    abastecimentos: [
      { id: "ab-4", data: "2026-09-23", km: 41200, litros: 39.0, preco_litro: 1.61, valor_total: 62.79, posto: "Prio Alenquer", condutor: "Pedro Carmo" }
    ],
    manutencoes: []
  },
  {
    id: "frot-004",
    matricula: "19-VM-55",
    marca: "Mercedes-Benz",
    modelo: "Sprinter 314 CDI Furgão Longo",
    ano: 2020,
    cor: "Branco",
    combustivel: "Gasóleo",
    capacidade_deposito: 75,
    km_atual: 152800,
    loja_id: "30a824bf-5fc0-4fa9-aad7-a60ac2f71c96",
    loja_nome: "Lost Wind Armazém",
    responsavel_nome: "António Gonçalves",
    responsavel_telefone: "963 441 228",
    status: "ativo",
    data_ultima_inspecao: "2025-11-12",
    data_proxima_inspecao: "2026-11-12",
    seguradora: "Fidelidade",
    apolice_numero: "FID-773419-PT",
    tipo_seguro: "Contra Todos os Riscos",
    data_validade_seguro: "2027-02-10",
    km_ultima_troca_oleo: 140000,
    km_intervalo_troca_oleo: 15000,
    km_proxima_troca_oleo: 155000, // Menos de 2.200 km
    data_ultima_troca_oleo: "2026-03-25",
    mes_iuc: 11,
    ano_iuc_pago: 2025,
    iuc_valor: 210.50,
    notas: "Furgão principal de abastecimento e transferências entre armazém e lojas.",
    abastecimentos: [
      { id: "ab-5", data: "2026-09-24", km: 152800, litros: 65.0, preco_litro: 1.60, valor_total: 104.00, posto: "Galp Autoestrada A1", condutor: "António Gonçalves" },
      { id: "ab-6", data: "2026-09-17", km: 151900, litros: 62.0, preco_litro: 1.58, valor_total: 97.96, posto: "Repsol Carregado", condutor: "António Gonçalves" }
    ],
    manutencoes: [
      { id: "mn-4", data: "2026-03-25", tipo: "oleo", descricao: "Revisão geral Mercedes + troca de correia", km: 140000, custo: 480.00, oficina: "C. Santos VP" },
      { id: "mn-5", data: "2026-08-11", tipo: "pneus", descricao: "2 Pneus traseiros Continental VanContact", km: 149000, custo: 260.00, oficina: "Pneus Carregado" }
    ]
  },
  {
    id: "frot-005",
    matricula: "83-QK-27",
    marca: "Fiat",
    modelo: "Fiorino 1.3 MultiJet",
    ano: 2021,
    cor: "Branco",
    combustivel: "Gasóleo",
    capacidade_deposito: 45,
    km_atual: 74900,
    loja_id: "781e2ccb-a6ef-4e09-8244-108c942012ae",
    loja_nome: "CASTANHEIRA DO RIBATEJO",
    responsavel_nome: "Tiago Moreira",
    responsavel_telefone: "931 556 712",
    status: "ativo",
    data_ultima_inspecao: "2025-07-28",
    data_proxima_inspecao: "2026-07-28",
    seguradora: "Zurich",
    apolice_numero: "ZUR-55102-PT",
    tipo_seguro: "Danos Próprios",
    data_validade_seguro: "2026-11-30",
    km_ultima_troca_oleo: 65000,
    km_intervalo_troca_oleo: 10000,
    km_proxima_troca_oleo: 75000, // Apenas 100 km restantes! Alerta de troca de óleo!
    data_ultima_troca_oleo: "2026-02-14",
    mes_iuc: 7,
    ano_iuc_pago: 2026,
    iuc_valor: 128.00,
    notas: "Troca de óleo imediata agendada.",
    abastecimentos: [
      { id: "ab-7", data: "2026-09-21", km: 74900, litros: 38.0, preco_litro: 1.62, valor_total: 61.56, posto: "BP Castanheira", condutor: "Tiago Moreira" }
    ],
    manutencoes: []
  },
  {
    id: "frot-006",
    matricula: "04-PL-91",
    marca: "Ford",
    modelo: "Transit Courier 1.5 TDCi",
    ano: 2022,
    cor: "Azul Marinho",
    combustivel: "Gasóleo",
    capacidade_deposito: 48,
    km_atual: 53100,
    loja_id: "755c5de6-53de-42bd-a79c-bfa6fb7da459",
    loja_nome: "POVOS",
    responsavel_nome: "Nuno Barreto",
    responsavel_telefone: "914 220 901",
    status: "ativo",
    data_ultima_inspecao: "2025-09-05",
    data_proxima_inspecao: "2026-09-05", // Alerta: Inspeção vencida ou no limite!
    seguradora: "Fidelidade",
    apolice_numero: "FID-332901-PT",
    tipo_seguro: "Contra Todos os Riscos",
    data_validade_seguro: "2027-01-15",
    km_ultima_troca_oleo: 45000,
    km_intervalo_troca_oleo: 12000,
    km_proxima_troca_oleo: 57000,
    data_ultima_troca_oleo: "2026-04-05",
    mes_iuc: 9,
    ano_iuc_pago: 2026,
    iuc_valor: 135.00,
    notas: "Marcação de IPO urgente para esta semana.",
    abastecimentos: [
      { id: "ab-8", data: "2026-09-19", km: 53100, litros: 41.0, preco_litro: 1.60, valor_total: 65.60, posto: "Cepsa Povos", condutor: "Nuno Barreto" }
    ],
    manutencoes: []
  },
  {
    id: "frot-007",
    matricula: "67-BC-12",
    marca: "Toyota",
    modelo: "Proace City Van 1.5 D-4D",
    ano: 2023,
    cor: "Branco",
    combustivel: "Gasóleo",
    capacidade_deposito: 50,
    km_atual: 36800,
    loja_id: "5005cddc-bbdc-4afc-8ffa-e5ff9a60cf16",
    loja_nome: "CARREGADO CENTRO",
    responsavel_nome: "Diogo Faria",
    responsavel_telefone: "927 889 001",
    status: "ativo",
    data_ultima_inspecao: "2025-04-10",
    data_proxima_inspecao: "2027-04-10",
    seguradora: "Tranquilidade",
    apolice_numero: "TRQ-77124-PT",
    tipo_seguro: "Danos Próprios",
    data_validade_seguro: "2027-04-10",
    km_ultima_troca_oleo: 30000,
    km_intervalo_troca_oleo: 15000,
    km_proxima_troca_oleo: 45000,
    data_ultima_troca_oleo: "2026-05-30",
    mes_iuc: 4,
    ano_iuc_pago: 2026,
    iuc_valor: 145.00,
    notas: "Viatura em garantia de fábrica da Toyota.",
    abastecimentos: [
      { id: "ab-9", data: "2026-09-22", km: 36800, litros: 44.0, preco_litro: 1.61, valor_total: 70.84, posto: "Galp Carregado", condutor: "Diogo Faria" }
    ],
    manutencoes: []
  },
  {
    id: "frot-008",
    matricula: "91-SX-40",
    marca: "Renault",
    modelo: "Clio Societe 1.5 dCi",
    ano: 2019,
    cor: "Preto",
    combustivel: "Gasóleo",
    capacidade_deposito: 45,
    km_atual: 118400,
    loja_id: "8bffdb75-9218-4ef9-89f0-236736237aa4",
    loja_nome: "CARTAXO",
    responsavel_nome: "Vítor Mendes",
    responsavel_telefone: "916 443 118",
    status: "manutencao",
    data_ultima_inspecao: "2025-08-14",
    data_proxima_inspecao: "2026-08-14",
    seguradora: "Allianz",
    apolice_numero: "ALZ-33819-PT",
    tipo_seguro: "Responsabilidade Civil",
    data_validade_seguro: "2026-10-30", // Vencendo em breve
    km_ultima_troca_oleo: 105000,
    km_intervalo_troca_oleo: 10000,
    km_proxima_troca_oleo: 115000, // Ultrapassada em 3400 km!
    data_ultima_troca_oleo: "2025-11-20",
    mes_iuc: 8,
    ano_iuc_pago: 2026,
    iuc_valor: 110.00,
    notas: "Na oficina para substituição do alternador e revisão completa.",
    abastecimentos: [
      { id: "ab-10", data: "2026-09-10", km: 118400, litros: 36.0, preco_litro: 1.63, valor_total: 58.68, posto: "Prio Cartaxo", condutor: "Vítor Mendes" }
    ],
    manutencoes: [
      { id: "mn-6", data: "2026-09-24", tipo: "avaria", descricao: "Substituição de alternador + correia de acessórios", km: 118400, custo: 320.00, oficina: "Auto Elétrica Cartaxense" }
    ]
  },
  {
    id: "frot-009",
    matricula: "48-ZN-82",
    marca: "Dacia",
    modelo: "Dokker Van 1.5 dCi",
    ano: 2020,
    cor: "Branco",
    combustivel: "Gasóleo",
    capacidade_deposito: 50,
    km_atual: 102300,
    loja_id: "0599bb97-17df-4e7e-8dc8-d0789a395c9c",
    loja_nome: "WIN BURGUER",
    responsavel_nome: "Lucas Oliveira",
    responsavel_telefone: "934 112 405",
    status: "ativo",
    data_ultima_inspecao: "2025-06-19",
    data_proxima_inspecao: "2026-06-19",
    seguradora: "Fidelidade",
    apolice_numero: "FID-661902-PT",
    tipo_seguro: "Danos Próprios",
    data_validade_seguro: "2026-11-15",
    km_ultima_troca_oleo: 95000,
    km_intervalo_troca_oleo: 10000,
    km_proxima_troca_oleo: 105000,
    data_ultima_troca_oleo: "2026-03-10",
    mes_iuc: 6,
    ano_iuc_pago: 2026,
    iuc_valor: 130.00,
    notas: "Apoio de entregas e recolha de produtos frescos.",
    abastecimentos: [
      { id: "ab-11", data: "2026-09-21", km: 102300, litros: 45.0, preco_litro: 1.61, valor_total: 72.45, posto: "BP Alverca", condutor: "Lucas Oliveira" }
    ],
    manutencoes: []
  },
  {
    id: "frot-010",
    matricula: "11-AB-77",
    marca: "Peugeot",
    modelo: "Expert Furgão Standard 2.0 HDi",
    ano: 2022,
    cor: "Cinzento",
    combustivel: "Gasóleo",
    capacidade_deposito: 69,
    km_atual: 79200,
    loja_id: "30a824bf-5fc0-4fa9-aad7-a60ac2f71c96",
    loja_nome: "Lost Wind Armazém",
    responsavel_nome: "Manuel Rodrigues",
    responsavel_telefone: "968 770 123",
    status: "ativo",
    data_ultima_inspecao: "2025-10-30",
    data_proxima_inspecao: "2026-10-30", // Alerta: Próximo mês
    seguradora: "Zurich",
    apolice_numero: "ZUR-88190-PT",
    tipo_seguro: "Contra Todos os Riscos",
    data_validade_seguro: "2027-01-20",
    km_ultima_troca_oleo: 70000,
    km_intervalo_troca_oleo: 15000,
    km_proxima_troca_oleo: 85000,
    data_ultima_troca_oleo: "2026-04-18",
    mes_iuc: 10,
    ano_iuc_pago: 2025,
    iuc_valor: 185.00,
    notas: "Furgão de média tonelagem para rotas interlojas.",
    abastecimentos: [
      { id: "ab-12", data: "2026-09-23", km: 79200, litros: 58.0, preco_litro: 1.59, valor_total: 92.22, posto: "Repsol Vila Franca", condutor: "Manuel Rodrigues" }
    ],
    manutencoes: [
      { id: "mn-7", data: "2026-04-18", tipo: "oleo", descricao: "Revisão Peugeot Oficial", km: 70000, custo: 240.00, oficina: "Gamobar Peugeot" }
    ]
  },
  {
    id: "frot-011",
    matricula: "88-FG-39",
    marca: "Citroën",
    modelo: "C3 Van 1.2 PureTech",
    ano: 2021,
    cor: "Branco",
    combustivel: "Gasolina 95",
    capacidade_deposito: 45,
    km_atual: 62400,
    loja_id: "9e55fae3-91aa-4b2f-9984-1380e5d94e0e",
    loja_nome: "LAREIRA",
    responsavel_nome: "Gabriel Matos",
    responsavel_telefone: "921 665 890",
    status: "ativo",
    data_ultima_inspecao: "2025-05-02",
    data_proxima_inspecao: "2026-05-02",
    seguradora: "Fidelidade",
    apolice_numero: "FID-449012-PT",
    tipo_seguro: "Danos Próprios",
    data_validade_seguro: "2026-12-18",
    km_ultima_troca_oleo: 55000,
    km_intervalo_troca_oleo: 10000,
    km_proxima_troca_oleo: 65000,
    data_ultima_troca_oleo: "2026-03-01",
    mes_iuc: 5,
    ano_iuc_pago: 2026,
    iuc_valor: 115.00,
    notas: "Viatura ágil para entregas urbanas da loja Lareira.",
    abastecimentos: [
      { id: "ab-13", data: "2026-09-20", km: 62400, litros: 37.5, preco_litro: 1.74, valor_total: 65.25, posto: "Galp Lareira", condutor: "Gabriel Matos" }
    ],
    manutencoes: []
  },
  {
    id: "frot-012",
    matricula: "23-PQ-90",
    marca: "Renault",
    modelo: "Trafic Furgão 2.0 dCi 130",
    ano: 2022,
    cor: "Branco",
    combustivel: "Gasóleo",
    capacidade_deposito: 80,
    km_atual: 84100,
    loja_id: "f8474bb0-8af0-417b-8b12-2e19dc261f37",
    loja_nome: "SOBREMESAS",
    responsavel_nome: "André Castilho",
    responsavel_telefone: "913 998 440",
    status: "ativo",
    data_ultima_inspecao: "2025-11-25",
    data_proxima_inspecao: "2026-11-25",
    seguradora: "Tranquilidade",
    apolice_numero: "TRQ-55291-PT",
    tipo_seguro: "Contra Todos os Riscos",
    data_validade_seguro: "2027-03-01",
    km_ultima_troca_oleo: 75000,
    km_intervalo_troca_oleo: 15000,
    km_proxima_troca_oleo: 90000,
    data_ultima_troca_oleo: "2026-05-10",
    mes_iuc: 11,
    ano_iuc_pago: 2025,
    iuc_valor: 195.00,
    notas: "Isotérmico preparado para transporte refrigerado de sobremesas.",
    abastecimentos: [
      { id: "ab-14", data: "2026-09-24", km: 84100, litros: 64.0, preco_litro: 1.60, valor_total: 102.40, posto: "BP Carregado", condutor: "André Castilho" }
    ],
    manutencoes: [
      { id: "mn-8", data: "2026-05-10", tipo: "revisao", descricao: "Revisão geral + calibração de grupo frio", km: 75000, custo: 310.00, oficina: "ThermoKing Portugal" }
    ]
  }
];

function getFleetData(): any[] {
  try {
    if (fs.existsSync(fleetFilePath)) {
      const raw = fs.readFileSync(fleetFilePath, "utf8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Erro ao ler fleet_data.json:", e);
  }
  // Initialize file with default 12 vehicles
  saveFleetData(initialVehicles);
  return initialVehicles;
}

function saveFleetData(data: any[]) {
  try {
    fs.writeFileSync(fleetFilePath, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Erro ao salvar fleet_data.json:", e);
  }
}

// Helper to compute vehicle alerts and health stats
export function computeVehicleStats(v: any) {
  const today = new Date();
  
  // Inspection alert
  let diasParaInspecao = 999;
  let inspecaoStatus: 'valido' | 'alerta' | 'expirado' = 'valido';
  if (v.data_proxima_inspecao) {
    const dInsp = new Date(v.data_proxima_inspecao);
    const diffTime = dInsp.getTime() - today.getTime();
    diasParaInspecao = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diasParaInspecao < 0) inspecaoStatus = 'expirado';
    else if (diasParaInspecao <= 30) inspecaoStatus = 'alerta';
  }

  // Insurance alert
  let diasParaSeguro = 999;
  let seguroStatus: 'valido' | 'alerta' | 'expirado' = 'valido';
  if (v.data_validade_seguro) {
    const dSeg = new Date(v.data_validade_seguro);
    const diffTime = dSeg.getTime() - today.getTime();
    diasParaSeguro = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diasParaSeguro < 0) seguroStatus = 'expirado';
    else if (diasParaSeguro <= 30) seguroStatus = 'alerta';
  }

  // Oil change alert
  const kmRestantesOleo = (v.km_proxima_troca_oleo || (v.km_ultima_troca_oleo + (v.km_intervalo_troca_oleo || 10000))) - v.km_atual;
  let oleoStatus: 'valido' | 'alerta' | 'expirado' = 'valido';
  if (kmRestantesOleo <= 0) oleoStatus = 'expirado';
  else if (kmRestantesOleo <= 1000) oleoStatus = 'alerta';

  // IUC alert
  const mesAtual = today.getMonth() + 1;
  const anoAtual = today.getFullYear();
  let iucStatus: 'pago' | 'alerta' | 'pendente' = 'pago';
  if (v.mes_iuc) {
    if (v.ano_iuc_pago < anoAtual) {
      if (v.mes_iuc < mesAtual) iucStatus = 'pendente';
      else if (v.mes_iuc === mesAtual) iucStatus = 'alerta';
    }
  }

  const temAlerta = inspecaoStatus !== 'valido' || seguroStatus !== 'valido' || oleoStatus !== 'valido' || iucStatus !== 'pago';

  return {
    ...v,
    diasParaInspecao,
    inspecaoStatus,
    diasParaSeguro,
    seguroStatus,
    kmRestantesOleo,
    oleoStatus,
    iucStatus,
    temAlerta
  };
}

export function setupFleetRoutes({ app, authenticateToken }: any) {
  // GET all vehicles with computed alerts
  app.get("/api/admin/fleet", authenticateToken, (req: any, res: any) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }
    try {
      const fleet = getFleetData();
      const enriched = fleet.map(computeVehicleStats);
      return res.json(enriched);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // GET summary statistics of the fleet
  app.get("/api/admin/fleet/stats", authenticateToken, (req: any, res: any) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }
    try {
      const fleet = getFleetData().map(computeVehicleStats);
      const totalVeiculos = fleet.length;
      const veiculosAtivos = fleet.filter(v => v.status === 'ativo').length;
      const veiculosManutencao = fleet.filter(v => v.status === 'manutencao').length;
      const comAlertas = fleet.filter(v => v.temAlerta).length;

      const totalKm = fleet.reduce((acc, v) => acc + (Number(v.km_atual) || 0), 0);
      const kmMedio = totalVeiculos > 0 ? Math.round(totalKm / totalVeiculos) : 0;

      // Gastos acumulados
      let totalCombustivel = 0;
      let totalManutencoes = 0;

      fleet.forEach(v => {
        v.abastecimentos?.forEach((ab: any) => {
          totalCombustivel += Number(ab.valor_total || 0);
        });
        v.manutencoes?.forEach((mn: any) => {
          totalManutencoes += Number(mn.custo || 0);
        });
      });

      return res.json({
        totalVeiculos,
        veiculosAtivos,
        veiculosManutencao,
        comAlertas,
        totalKm,
        kmMedio,
        totalCombustivel,
        totalManutencoes,
        custoTotal: totalCombustivel + totalManutencoes
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // POST create new vehicle
  app.post("/api/admin/fleet", authenticateToken, (req: any, res: any) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }
    try {
      const body = req.body;
      if (!body.matricula || !body.modelo) {
        return res.status(400).json({ error: "Matrícula e Modelo são obrigatórios." });
      }

      const fleet = getFleetData();
      const newVehicle = {
        id: "frot-" + Date.now(),
        matricula: body.matricula.toUpperCase().trim(),
        marca: body.marca || "Viatura",
        modelo: body.modelo.trim(),
        ano: Number(body.ano) || new Date().getFullYear(),
        cor: body.cor || "Branco",
        combustivel: body.combustivel || "Gasóleo",
        capacidade_deposito: Number(body.capacidade_deposito) || 50,
        km_atual: Number(body.km_atual) || 0,
        loja_id: body.loja_id || "",
        loja_nome: body.loja_nome || "Geral / Sede",
        responsavel_nome: body.responsavel_nome || "",
        responsavel_telefone: body.responsavel_telefone || "",
        status: body.status || "ativo",
        data_ultima_inspecao: body.data_ultima_inspecao || "",
        data_proxima_inspecao: body.data_proxima_inspecao || "",
        seguradora: body.seguradora || "",
        apolice_numero: body.apolice_numero || "",
        tipo_seguro: body.tipo_seguro || "Danos Próprios",
        data_validade_seguro: body.data_validade_seguro || "",
        km_ultima_troca_oleo: Number(body.km_ultima_troca_oleo) || Number(body.km_atual) || 0,
        km_intervalo_troca_oleo: Number(body.km_intervalo_troca_oleo) || 10000,
        km_proxima_troca_oleo: Number(body.km_proxima_troca_oleo) || ((Number(body.km_atual) || 0) + (Number(body.km_intervalo_troca_oleo) || 10000)),
        data_ultima_troca_oleo: body.data_ultima_troca_oleo || new Date().toISOString().split("T")[0],
        mes_iuc: Number(body.mes_iuc) || 1,
        ano_iuc_pago: Number(body.ano_iuc_pago) || new Date().getFullYear(),
        iuc_valor: Number(body.iuc_valor) || 0,
        notas: body.notas || "",
        abastecimentos: [],
        manutencoes: []
      };

      fleet.unshift(newVehicle);
      saveFleetData(fleet);

      return res.status(201).json(computeVehicleStats(newVehicle));
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // PUT update vehicle
  app.put("/api/admin/fleet/:id", authenticateToken, (req: any, res: any) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }
    try {
      const { id } = req.params;
      const body = req.body;
      const fleet = getFleetData();
      const index = fleet.findIndex(v => v.id === id);

      if (index === -1) {
        return res.status(404).json({ error: "Veículo não encontrado." });
      }

      const existing = fleet[index];
      const updated = {
        ...existing,
        ...body,
        matricula: body.matricula ? body.matricula.toUpperCase().trim() : existing.matricula,
        km_atual: body.km_atual !== undefined ? Number(body.km_atual) : existing.km_atual,
        km_proxima_troca_oleo: body.km_proxima_troca_oleo !== undefined 
          ? Number(body.km_proxima_troca_oleo) 
          : (existing.km_ultima_troca_oleo + (Number(body.km_intervalo_troca_oleo) || existing.km_intervalo_troca_oleo || 10000))
      };

      fleet[index] = updated;
      saveFleetData(fleet);

      return res.json(computeVehicleStats(updated));
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // DELETE vehicle
  app.delete("/api/admin/fleet/:id", authenticateToken, (req: any, res: any) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }
    try {
      const { id } = req.params;
      let fleet = getFleetData();
      fleet = fleet.filter(v => v.id !== id);
      saveFleetData(fleet);
      return res.json({ success: true, message: "Veículo removido com sucesso." });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // POST add fuel log (abastecimento)
  app.post("/api/admin/fleet/:id/abastecimento", authenticateToken, (req: any, res: any) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }
    try {
      const { id } = req.params;
      const { data, km, litros, preco_litro, valor_total, posto, condutor, nota } = req.body;
      const fleet = getFleetData();
      const v = fleet.find(item => item.id === id);

      if (!v) {
        return res.status(404).json({ error: "Veículo não encontrado." });
      }

      if (!v.abastecimentos) v.abastecimentos = [];

      const novoRegisto = {
        id: "ab-" + Date.now(),
        data: data || new Date().toISOString().split("T")[0],
        km: Number(km) || v.km_atual,
        litros: Number(litros) || 0,
        preco_litro: Number(preco_litro) || 0,
        valor_total: Number(valor_total) || (Number(litros) * Number(preco_litro)),
        posto: posto || "Posto Combustível",
        condutor: condutor || v.responsavel_nome || "Condutor",
        nota: nota || ""
      };

      v.abastecimentos.unshift(novoRegisto);

      // Atualiza km atual se for superior
      if (Number(km) > (v.km_atual || 0)) {
        v.km_atual = Number(km);
      }

      saveFleetData(fleet);
      return res.status(201).json(computeVehicleStats(v));
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // POST add maintenance log (manutenção / troca de óleo)
  app.post("/api/admin/fleet/:id/manutencao", authenticateToken, (req: any, res: any) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }
    try {
      const { id } = req.params;
      const { data, tipo, descricao, km, custo, oficina, fatura_numero } = req.body;
      const fleet = getFleetData();
      const v = fleet.find(item => item.id === id);

      if (!v) {
        return res.status(404).json({ error: "Veículo não encontrado." });
      }

      if (!v.manutencoes) v.manutencoes = [];

      const novoRegisto = {
        id: "mn-" + Date.now(),
        data: data || new Date().toISOString().split("T")[0],
        tipo: tipo || "revisao",
        descricao: descricao || "Manutenção periódica",
        km: Number(km) || v.km_atual,
        custo: Number(custo) || 0,
        oficina: oficina || "Oficina Mecânica",
        fatura_numero: fatura_numero || ""
      };

      v.manutencoes.unshift(novoRegisto);

      // Se for troca de óleo, atualiza as datas e km de óleo
      if (tipo === "oleo") {
        v.km_ultima_troca_oleo = Number(km) || v.km_atual;
        v.data_ultima_troca_oleo = data || new Date().toISOString().split("T")[0];
        v.km_proxima_troca_oleo = (Number(km) || v.km_atual) + (Number(v.km_intervalo_troca_oleo) || 10000);
      }

      // Atualiza km atual se o registo for de km mais recente
      if (Number(km) > (v.km_atual || 0)) {
        v.km_atual = Number(km);
      }

      saveFleetData(fleet);
      return res.status(201).json(computeVehicleStats(v));
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // POST quick update km
  app.post("/api/admin/fleet/:id/km", authenticateToken, (req: any, res: any) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }
    try {
      const { id } = req.params;
      const { km } = req.body;
      const fleet = getFleetData();
      const v = fleet.find(item => item.id === id);

      if (!v) {
        return res.status(404).json({ error: "Veículo não encontrado." });
      }

      v.km_atual = Number(km);
      saveFleetData(fleet);
      return res.json(computeVehicleStats(v));
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });
}
