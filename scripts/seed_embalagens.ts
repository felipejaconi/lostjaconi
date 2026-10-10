import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

const produtos = [
  "Agrafador",
  "Bloco de notas",
  "Caixa 1 (Pack 100uni)",
  "Caixa 2 (Pack 100uni)",
  "Caixa 3 (Pack 100uni)",
  "Caixa 4 (Pack 100uni)",
  "Caixa alumínio 0,5 Frango (Pack 100uni)",
  "Caixa alumínio 1 Frango (Pack 100uni)",
  "Caixa alumínio 2 Frangos (Pack 100uni)",
  "Caixa alumínio P (Pack 100uni)",
  "Caixa alumínio redonda rasa (Pack 100uni)",
  "Canetão",
  "Carvão (unidade)",
  "Conchas",
  "Copo descartável",
  "Dispenser Papel",
  "Espumadeira",
  "Etiqueta bolo no pote",
  "Filtros",
  "Fósforo",
  "Gás grelha",
  "Grampos 4mm Agrafador",
  "Grampos 6mm Agrafador",
  "Guardanapos (Pack 100uni)",
  "Luva Látex (Cx 100 uni)",
  "Luva transparente",
  "Malmequer Grande (Pack)",
  "Malmequer Média (Pack)",
  "Malmequer Pequena (Pack)",
  "Molho à parte (Pack)",
  "Pallet",
  "Papel higiênico (Fardo 18uni)",
  "Papel Refil Banheiro (unidade)",
  "Pratos Médios",
  "Rolo Alumínio (unidade)",
  "Rolo impressora (Pct 10uni)",
  "Rolo Plástico filme (unidade)",
  "Rolo Plástico para pão (unidade)",
  "Rolo térmico Multibanco (Pct 10uni)",
  "Rolo zeta (Fardo 6uni)",
  "Saco papel G (Caixa 200uni)",
  "Saco papel P (Caixa 250uni)",
  "Saco Plástico para Pão",
  "Sacola Plástica 5kg",
  "Sopa Grande (Pack)",
  "Sopa Pequena (Pack)",
  "Talher descartável",
  "Toalha de mesa salão 70x70",
  "Toalha de mesa salão 80x80",
  "Touca culinária"
];

async function run() {
  console.log("Procurando categoria 'Embalagens'...");

  let { data: categorias, error: catError } = await supabase
    .from('categorias')
    .select('*')
    .ilike('nome', 'Embalagen%');

  let categoriaId;

  if (catError) {
    console.error("Erro ao buscar categorias:", catError);
    return;
  }

  if (!categorias || categorias.length === 0) {
    console.log("Categoria 'Embalagens' não encontrada. Criando...");
    const { data: newCat, error: newCatError } = await supabase
      .from('categorias')
      .insert([{ nome: 'Embalagens' }])
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
