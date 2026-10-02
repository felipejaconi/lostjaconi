import re

with open('src/routes/finance.ts', 'r') as f:
    content = f.read()

old_route = """  app.post("/api/admin/faturas/despesas", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    
    try {
      const { fornecedor_id, novo_fornecedor_nome, numero_fatura, data_fatura, data_vencimento, categoria_despesa, valor_total, loja_id } = req.body;
      
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
        created_by: req.user.id,
        descrição: loja_id ? JSON.stringify({ loja_id }) : null
      };
      
      const { data, error } = await supabase.from("faturas").insert([insertData]).select().single();
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });"""

new_route = """  app.post("/api/admin/faturas/despesas", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    
    try {
      const isArray = Array.isArray(req.body);
      const items = isArray ? req.body : [req.body];
      
      let createdFornecedorId: any = null;
      let createdFornecedorName: any = null;
      
      const dataToInsert = [];
      
      for (const item of items) {
          let finalFornecedorId = item.fornecedor_id;
          
          if (!finalFornecedorId && item.novo_fornecedor_nome) {
             if (createdFornecedorName === item.novo_fornecedor_nome) {
                finalFornecedorId = createdFornecedorId;
             } else {
                const { data: newForn, error: fornError } = await supabase
                  .from("fornecedores")
                  .insert([{ nome: item.novo_fornecedor_nome }])
                  .select()
                  .single();
                  
                if (fornError) throw fornError;
                finalFornecedorId = newForn.id;
                createdFornecedorId = newForn.id;
                createdFornecedorName = item.novo_fornecedor_nome;
             }
          }
          
          dataToInsert.push({
            fornecedor_id: finalFornecedorId,
            numero_fatura: item.numero_fatura,
            data_emissao: item.data_fatura,
            data_vencimento: item.data_vencimento,
            valor_total: item.valor_total,
            valor_pendente: item.valor_total,
            tipo: 'despesa_' + item.categoria_despesa,
            created_by: req.user.id,
            descrição: item.loja_id ? JSON.stringify({ loja_id: item.loja_id }) : null
          });
      }
      
      const { data, error } = await supabase.from("faturas").insert(dataToInsert).select();
      
      if (error) throw error;
      res.json(isArray ? data : data[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });"""

content = content.replace(old_route, new_route)

with open('src/routes/finance.ts', 'w') as f:
    f.write(content)

