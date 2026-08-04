const fs = require('fs');
let code = fs.readFileSync('src/routes/finance.ts', 'utf8');

const newEndpoint = `
  app.post("/api/admin/faturas/despesas", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    
    try {
      const { fornecedor_id, novo_fornecedor_nome, numero_fatura, data_fatura, data_vencimento, categoria_despesa, valor_total } = req.body;
      
      let finalFornecedorId = fornecedor_id;
      
      // If creating a new entity
      if (!finalFornecedorId && novo_fornecedor_nome) {
        const { data: newForn, error: fornError } = await supabase
          .from("fornecedores")
          .insert([{ nome: novo_fornecedor_nome }])
          .select()
          .single();
          
        if (fornError) throw fornError;
        finalFornecedorId = newForn.id;
      }
      
      const insertData = {
        fornecedor_id: finalFornecedorId,
        numero_fatura: numero_fatura,
        data_emissao: data_fatura,
        data_vencimento: data_vencimento,
        valor_total: valor_total,
        valor_pendente: valor_total,
        tipo: 'despesa_' + categoria_despesa,
        created_by: req.user.id
      };
      
      const { data, error } = await supabase.from("faturas").insert([insertData]).select().single();
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
`;

code = code.replace(
  'app.post("/api/admin/faturas", authenticateToken, async (req: any, res) => {',
  newEndpoint + '\n  app.post("/api/admin/faturas", authenticateToken, async (req: any, res) => {'
);

fs.writeFileSync('src/routes/finance.ts', code);
