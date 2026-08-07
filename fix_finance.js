import fs from 'fs';
let code = fs.readFileSync('src/routes/finance.ts', 'utf-8');

// Replace Fornecedores -> Produtos
const fn1 = `  app.get("/api/admin/fornecedores/:id/produtos", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      const { data, error } = await supabase
        .from('fatura_itens')
        .select(\`
          produto_id,
          quantidade,
          preco_custo,
          produtos ( nome, imagem_url ),
          faturas!inner (
             fornecedor_id,
             data_emissao
          )
        \`)
        .eq('faturas.fornecedor_id', req.params.id);`;

const fn1_new = `  app.get("/api/admin/fornecedores/:id/produtos", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      const { period, month, year } = req.query;
      let query = supabase
        .from('fatura_itens')
        .select(\`
          produto_id,
          quantidade,
          preco_custo,
          produtos ( nome, imagem_url ),
          faturas!inner (
             fornecedor_id,
             data_emissao
          )
        \`)
        .eq('faturas.fornecedor_id', req.params.id);

      if (period !== 'todos') {
         const m = month ? Number(month) : new Date().getMonth();
         const y = year ? Number(year) : new Date().getFullYear();
         const startDate = new Date(y, m, 1).toISOString();
         const endDate = new Date(y, m + 1, 0, 23, 59, 59).toISOString();
         query = query.gte("faturas.data_emissao", startDate).lte("faturas.data_emissao", endDate);
      }

      const { data, error } = await query;`;

code = code.replace(fn1, fn1_new);

// Replace Produtos -> Fornecedores
const fn2 = `  app.get("/api/admin/produtos/:id/fornecedores", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      const { data, error } = await supabase
        .from('fatura_itens')
        .select(\`
          preco_custo,
          quantidade,
          faturas!inner (
             fornecedor_id,
             data_emissao,
             fornecedores ( nome )
          )
        \`)
        .eq('produto_id', req.params.id);`;

const fn2_new = `  app.get("/api/admin/produtos/:id/fornecedores", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      const { period, month, year } = req.query;
      let query = supabase
        .from('fatura_itens')
        .select(\`
          preco_custo,
          quantidade,
          faturas!inner (
             fornecedor_id,
             data_emissao,
             fornecedores ( nome )
          )
        \`)
        .eq('produto_id', req.params.id);

      if (period !== 'todos') {
         const m = month ? Number(month) : new Date().getMonth();
         const y = year ? Number(year) : new Date().getFullYear();
         const startDate = new Date(y, m, 1).toISOString();
         const endDate = new Date(y, m + 1, 0, 23, 59, 59).toISOString();
         query = query.gte("faturas.data_emissao", startDate).lte("faturas.data_emissao", endDate);
      }

      const { data, error } = await query;`;

code = code.replace(fn2, fn2_new);

fs.writeFileSync('src/routes/finance.ts', code);
console.log("finance.ts updated!");
