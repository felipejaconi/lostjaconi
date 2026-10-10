import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

const produtos = [
  "Balde esfregona (unidade)",
  "Bucha de aço",
  "Bucha loiça (Unidade)",
  "Cabo esfregona/Vassoura (unidade)",
  "Desengordurante forte (unidade)",
  "Desentupidor (unidade)",
  "Detergente Camomila (unidade)",
  "Detergente Lemon (unidade)",
  "Lava loiça (unidade)",
  "Lava loiça Máquina (unidade)",
  "Limpa Alumínio (unidade)",
  "Limpa Vidro (unidade)",
  "Lixívia (unidade)",
  "Lxp (unidade)",
  "Pá de limpeza (unidade)",
  "Pano Limpeza (unidade)",
  "Pedra sanitária (unidade)",
  "Recarga de esfregona (unidade)",
  "Saco de lixo G (unidade)",
  "Saco de lixo GG (unidade)",
  "Saco de lixo P (unidade)",
  "Soda",
  "Vassoura (unidade)"
];

async function run() {
  console.log("Procurando categoria 'Limpeza'...");

  let { data: categorias, error: catError } = await supabase
    .from('categorias')
    .select('*')
    .ilike('nome', 'Limpez%');

  let categoriaId;

  if (catError) {
    console.error("Erro ao buscar categorias:", catError);
    return;
  }

  if (!categorias || categorias.length === 0) {
    console.log("Categoria 'Limpeza' não encontrada. Criando...");
    const { data: newCat, error: newCatError } = await supabase
      .from('categorias')
      .insert([{ nome: 'Limpeza' }])
      .select();
    
    if (newCatError) {
      console.error("Erro ao criar categoria:", newCatError);
      return;
    }
    categoriaId = newCat[0].id;
  } else {
    categoriaId = categorias[0].id;
    console.log("Categoria encontrada com ID:", categoriaId);
  }

  console.log("Inserindo produtos...");

  const produtosParaInserir = produtos.map(nome => ({
    nome,
    categoria_id: categoriaId,
    unidade_base: 'un', // Default
    fator_conversao_venda: 1,
    is_peso_variavel: false,
    stock_armazem: 0
  }));

  const { data, error } = await supabase
    .from('produtos')
    .insert(produtosParaInserir);

  if (error) {
    console.error("Erro ao inserir produtos:", error);
  } else {
    console.log("Produtos inseridos com sucesso!");
  }
}

run();
