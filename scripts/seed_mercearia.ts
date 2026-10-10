import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

const produtos = [
  "Açafrão",
  "Açúcar para café (Caixa)",
  "Açúcar/kg",
  "Amido de milho (unidade)",
  "Ananás (Fardo)",
  "Anéis de Cebola (Pacote)",
  "Arroz (Fardo 12 uni)",
  "Azeite 5L",
  "Azeite Buffet",
  "Azeitona Mista (5L)",
  "Azeitona preta (5kg)",
  "Barbecue (2,5kg)",
  "Barra de fiambre",
  "Base de molho (10L)",
  "Batata Chips (Caixa)",
  "Batata Descascada (Pct 5kg)",
  "Batata doce descascada (Pct 5kg)",
  "Batata em cubos",
  "Batata murro (10kg)",
  "Batata Palha (Unidade)",
  "Batata Palito (Caixa)",
  "Batata Rodela (Pct 5kg)",
  "Batata Titi G (Unidade)",
  "Batata Titi M (unidade)",
  "Batata Titi P (unidade)",
  "Bechamel (1L)",
  "Beterraba em conserva (Lata)",
  "Bica",
  "Bicarbonato",
  "Café descafeinado Pastilha",
  "Café em Grãos (Pct 1kg)",
  "Café em Grãos descafeinado (Pct 250g)",
  "Café Pastilha",
  "Café torrado",
  "Caixa de Ovos (15 Dúzias)",
  "Caldo galinha Knor",
  "Canela em pau",
  "Cebola frita",
  "Cenoura em conserva (1.8kg)",
  "Cenoura em cubos",
  "Cogumelos laminados",
  "Cuzcuz (250g)",
  "Empadão de carne (2,5kg)",
  "Farinha de mandioca (Saco 5kg)",
  "Farinha de Milho Flocão (500g)",
  "Farinha de milho Fubá (1kg)",
  "Farinha de trigo (1kg)",
  "Feijão branco",
  "Feijão encarnado (Fardo 12 uni)",
  "Feijão Frade (820g)",
  "Feijão Manteiga",
  "Feijão Preto (Cx 15kg)",
  "Feijão Verde",
  "Fermento Pó Royal",
  "Fiambre fatiado",
  "Gelatina neutra",
  "Gelo (Pct)",
  "Grão de bico (3kg)",
  "Ketchup Balde",
  "Ketchup Buffet",
  "Lasanha á bolonhesa (2,5kg)",
  "Leite (1Lt)",
  "Leite condensado",
  "Leite de coco (400ml)",
  "Leite em Pó (700g)",
  "Maionese Balde (5L)",
  "Maionese Buffet",
  "Mandioca (2kg)",
  "Manteiga Barra",
  "Marmelada",
  "Massa colorida",
  "Massa Lasanha",
  "Massa Parafuso (500g)",
  "Massa Pene (500g)",
  "Massa Pene (5kg)",
  "Massa pimentão (1,2kg)",
  "Massa spaghetti (500g)",
  "Milho (Fardo 12 uni)",
  "Milho Verde",
  "Mini Tostas",
  "Molho de Alho",
  "Molho de soja (884ml)",
  "Molho iogurte (1kg)",
  "Molho picante (1,5L)",
  "Molho Piri-Piri (2L)",
  "Molho vinagrete (1kg)",
  "Mostarda (1kg)",
  "Natas (1L)",
  "Noz moscada",
  "Nóz Moscada",
  "Óleo alimentar (5L)",
  "Óleo fritadeira (10L)",
  "Orégano (pack)",
  "Ox. imperial",
  "Pão Brioche (Caixa)",
  "Pão de queijo (2kg)",
  "Pão grande (Caixa)",
  "Pão pequeno buffet (Caixa)",
  "Pão ralado",
  "Pimenta branca moída",
  "Pimenta rosa em grãos",
  "Pimento doce",
  "Pimento mix congelado (2,5kg)",
  "Pimentos cortados",
  "Polpa de tomate (Unidade)",
  "Queijo Buffet",
  "Queijo Cheddar Fatiado",
  "Queijo cheddar líquido (Balde)",
  "Queijo fatiado (1kg)",
  "Sal fino Buffet (750g)",
  "Sal grosso branco (10kg)",
  "Sal temperado (10kg)",
  "Salgado coxinha (2kg)",
  "Salgado Kibe (2kg)",
  "Salgado Mandioca/carne (2kg)",
  "Salgado Queijo e fiambre (2kg)",
  "Salgado Salsicha",
  "Seleta",
  "Sobremesas diversas",
  "Sumo Limão (4,5kg)",
  "Tang Limão",
  "Temperos diversas",
  "Tomate pelado (Lata 780g)",
  "Uva passa",
  "Vinagre 5L",
  "Vinagre Buffet"
];

async function run() {
  console.log("Procurando categoria 'Mercearia'...");

  let { data: categorias, error: catError } = await supabase
    .from('categorias')
    .select('*')
    .ilike('nome', 'Mercearia%');

  let categoriaId;

  if (catError) {
    console.error("Erro ao buscar categorias:", catError);
    return;
  }

  if (!categorias || categorias.length === 0) {
    console.log("Categoria 'Mercearia' não encontrada. Criando...");
    const { data: newCat, error: newCatError } = await supabase
      .from('categorias')
      .insert([{ nome: 'Mercearia' }])
      .select();
    
    if (newCatError) {
      console.error("Erro ao criar categoria:", newCatError);
      return;
    }
    categoriaId = newCat[0].id;
  } else {
    categoriaId = categorias[0].id;
    console.log("Categoria 'Mercearia' encontrada com ID:", categoriaId);
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
