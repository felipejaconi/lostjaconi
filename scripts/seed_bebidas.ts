import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

const produtos = [
  "7up 1,5L (6uni)",
  "7up lata (28uni)",
  "Água 0,5 Litro (24 unidades)",
  "Água 1,5 L (12 unidades)",
  "Bandida do pomar 330ml (24uni)",
  "Barril Heineken",
  "Barril Sagres",
  "Barril Sangria",
  "Barril Vinho branco pressão",
  "Bi Frutos vermelhos (12 uni)",
  "Bi Laranja 1,5L (6uni)",
  "Bi Laranja pequeno (12 uni)",
  "Bi Limonada 1,5L (6uni)",
  "Bi Limonada pequeno (12 uni)",
  "Bi Maracujá 1,5L (6uni)",
  "Bi Maracujá pequeno (12 uni)",
  "Gás pressão",
  "Guaraná 1,5L (6uni)",
  "Guaraná lata (28uni)",
  "Heineken 250ml",
  "Heineken Long Neck",
  "Ice tea Limão 1,5L (6uni)",
  "Ice tea Limão lata (28 uni)",
  "Ice tea Manga 1,5L (6uni)",
  "Ice tea Manga lata (28uni)",
  "Ice tea Pêssego 1,5L (6uni)",
  "Ice tea Pêssego lata (28uni)",
  "Máquina imperial",
  "Pepsi 1,5L (6uni)",
  "Pepsi lata (28uni)",
  "Pepsi Max 1,5L (6uni)",
  "Pepsi Max lata (24uni)",
  "Sagres Litro (6uni)",
  "Sagres Média (24uni)",
  "Sagres Mini",
  "Sagres Preta Média (24uni)",
  "Sangria Mundus",
  "Sumol Ananás 1,5L (6uni)",
  "Sumol Ananás lata (28uni)",
  "Sumol Laranja 1,5L (6uni)",
  "Sumol Laranja lata (28uni)",
  "Super Bock Litro (6uni)",
  "Super Bock Média (24uni)"
];

async function run() {
  console.log("Procurando categoria 'Bebidas'...");

  let { data: categorias, error: catError } = await supabase
    .from('categorias')
    .select('*')
    .ilike('nome', 'Bebida%');

  let categoriaId;

  if (catError) {
    console.error("Erro ao buscar categorias:", catError);
    return;
  }

  if (!categorias || categorias.length === 0) {
    console.log("Categoria 'Bebidas' não encontrada. Criando...");
    const { data: newCat, error: newCatError } = await supabase
      .from('categorias')
      .insert([{ nome: 'Bebidas' }])
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
