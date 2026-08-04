with open("src/routes/products.ts", "r") as f:
    content = f.read()

# For insert (around line 137)
target_1 = """        if (req.body.lote && result.data?.id) {
           // Tenta salvar o lote, se der erro, retorna o erro para o usuário ver
           const loteRes = await supabase.from("lotes").insert([{ 
             produto_id: result.data.id, 
             lote: req.body.lote,
             quantidade: 0
           }]);
           
           if (loteRes.error) {
              const loteRes2 = await supabase.from("lotes").insert([{ 
                produto_id: result.data.id, 
                lot_code: req.body.lote,
                quantidade: 0
              }]);
              
              if (loteRes2.error) {
                 console.error("Erro ao salvar lote:", loteRes2.error);
                 throw new Error("A tabela 'lotes' não possui a coluna 'lot_code' ou 'lote'. Por favor, adicione a coluna 'lot_code' (Texto) na sua tabela 'lotes' no Supabase.");
              }
           }
        }"""

replacement_1 = """        if (req.body.lote || req.body.rua || req.body.prateleira) {
           const loteData = { 
             produto_id: result.data.id, 
             lote: req.body.lote || null,
             rua: req.body.rua || null,
             prateleira: req.body.prateleira || null
           };
           const loteRes = await supabase.from("lotes").insert([loteData]);
           
           if (loteRes.error) {
              const loteRes2 = await supabase.from("lotes").insert([{ 
                produto_id: result.data.id, 
                lot_code: req.body.lote || null,
                rua: req.body.rua || null,
                prateleira: req.body.prateleira || null
              }]);
              
              if (loteRes2.error) {
                 console.error("Erro ao salvar lote:", loteRes2.error);
                 throw new Error("A tabela 'lotes' não possui as colunas corretas. Execute o comando SQL na base de dados para alterar a tabela: ALTER TABLE lotes ADD COLUMN IF NOT EXISTS rua TEXT, ADD COLUMN IF NOT EXISTS prateleira TEXT, ADD COLUMN IF NOT EXISTS lote TEXT;");
              }
           }
        }"""

# For update (around line 280)
target_2 = """        if (req.body.lote) {
           const loteRes = await supabase.from("lotes").insert([{ 
             produto_id: req.params.id, 
             lote: req.body.lote,
             quantidade: 0
           }]);
           
           if (loteRes.error) {
              const loteRes2 = await supabase.from("lotes").insert([{ 
                produto_id: req.params.id, 
                lot_code: req.body.lote,
                quantidade: 0
              }]);
              
              if (loteRes2.error) {
                 console.error("Erro ao salvar lote no update:", loteRes2.error);
                 throw new Error("A tabela 'lotes' não possui a coluna 'lot_code' ou 'lote'. Por favor, adicione a coluna 'lot_code' (Texto) na sua tabela 'lotes' no Supabase.");
              }
           }
        }"""

replacement_2 = """        if (req.body.lote || req.body.rua || req.body.prateleira) {
           const loteData = { 
             produto_id: req.params.id, 
             lote: req.body.lote || null,
             rua: req.body.rua || null,
             prateleira: req.body.prateleira || null
           };
           const loteRes = await supabase.from("lotes").insert([loteData]);
           
           if (loteRes.error) {
              const loteRes2 = await supabase.from("lotes").insert([{ 
                produto_id: req.params.id, 
                lot_code: req.body.lote || null,
                rua: req.body.rua || null,
                prateleira: req.body.prateleira || null
              }]);
              
              if (loteRes2.error) {
                 console.error("Erro ao salvar lote no update:", loteRes2.error);
                 throw new Error("A tabela 'lotes' não possui as colunas corretas. Execute o comando SQL na base de dados para alterar a tabela: ALTER TABLE lotes ADD COLUMN IF NOT EXISTS rua TEXT, ADD COLUMN IF NOT EXISTS prateleira TEXT, ADD COLUMN IF NOT EXISTS lote TEXT;");
              }
           }
        }"""

content = content.replace(target_1, replacement_1)
content = content.replace(target_2, replacement_2)

with open("src/routes/products.ts", "w") as f:
    f.write(content)

