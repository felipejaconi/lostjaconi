with open("src/routes/products.ts", "r") as f:
    content = f.read()

target = """        if (req.body.lote || req.body.rua || req.body.prateleira) {
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

replacement = """        if (req.body.lote || req.body.rua || req.body.prateleira) {
           const loteData = { 
             produto_id: result.data.id, 
             lote: req.body.lote || null,
             rua: req.body.rua || null,
             prateleira: req.body.prateleira || null
           };
           const loteRes = await supabase.from("lotes").insert([loteData]);
           
           if (loteRes.error) {
               console.error("Erro ao criar lote:", loteRes.error);
               throw new Error("A tabela 'lotes' não possui as colunas corretas. Execute o comando SQL na base de dados para alterar a tabela: ALTER TABLE lotes ADD COLUMN IF NOT EXISTS rua TEXT, ADD COLUMN IF NOT EXISTS prateleira TEXT, ADD COLUMN IF NOT EXISTS lote TEXT;");
           }
        }"""

content = content.replace(target, replacement)

with open("src/routes/products.ts", "w") as f:
    f.write(content)

