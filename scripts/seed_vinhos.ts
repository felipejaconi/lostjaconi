import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

const produtos = [
  "Vinho Branco (box 10L)",
  "Vinho Lote 44 Branco (caixa)",
  "Vinho Lote 44 Tinto (caixa)",
  "Vinho Náutico rose",
  "Vinho Tinto (box 10L)",
  "Vinho Tinto (box 20L)"
];

async function run() {
  console.log("Procurando categoria 'Vinhos'...");

  let { data: categorias, error: catError } = await supabase
    .from('categorias')
    .select('*')
    .ilike('nome', 'Vinho%');

  let categoriaId;

  if (catError) {
    console.error("Erro ao buscar categorias:", catError);
    return;
  }

  if (!categorias || categorias.length === 0) {
    console.log("Categoria 'Vinhos' não encontrada. Criando...");
    const { data: newCat, error: newCatError } = await supabase
      .from('categorias')
      .insert([{ nome: 'Vinhos' }])
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
