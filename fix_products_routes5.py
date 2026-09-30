with open("src/routes/products.ts", "r") as f:
    content = f.read()

target = """           const loteData = { 
             produto_id: req.params.id, 
             lote: req.body.lote || null,
             rua: req.body.rua || null,
             prateleira: req.body.prateleira || null,
             quantidade: 0
           };

           let loteRes;
           if (existingLotes && existingLotes.length > 0) {
               loteRes = await supabase.from("lotes").update(loteData).eq("id", existingLotes[0].id);
           } else {
               loteRes = await supabase.from("lotes").insert([loteData]);
           }"""

replacement = """           const loteData: any = { 
             produto_id: req.params.id, 
             lote: req.body.lote || null,
             rua: req.body.rua || null,
             prateleira: req.body.prateleira || null
           };

           let loteRes;
           if (existingLotes && existingLotes.length > 0) {
               loteRes = await supabase.from("lotes").update(loteData).eq("id", existingLotes[0].id);
           } else {
               loteData.quantidade = 0;
               loteRes = await supabase.from("lotes").insert([loteData]);
           }"""

content = content.replace(target, replacement)

with open("src/routes/products.ts", "w") as f:
    f.write(content)

