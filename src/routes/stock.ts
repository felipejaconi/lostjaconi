import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function setupStockRoutes({ app, supabase, authenticateToken, upload, uploadToSupabase, JWT_SECRET, cache }: any) {
  // Manual stock entry (Invoice / Purchase)
  app.post("/api/stock/entrada-manual", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    const { fornecedor, numero_fatura, data, data_vencimento, valor_final, items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: "Formato de itens inválido" });
    
    try {
      let fornecedor_id = null;
      let totalDaFatura = valor_final || 0; // Use frontend value if passed

      // Ensure fornecedor exists or create ad-hoc
      if (fornecedor) {
         // Check if numeric ID or name
         if (fornecedor.length === 36 && fornecedor.includes('-')) {
            fornecedor_id = fornecedor; // UUID directly
         } else {
            const { data: fornData } = await supabase.from('fornecedores').select('id').ilike('nome', fornecedor).maybeSingle();
            if (fornData) {
               fornecedor_id = fornData.id;
            } else {
               const { data: newForn } = await supabase.from('fornecedores').insert([{ nome: fornecedor, tipo: 'mercadoria' }]).select('id').single();
               if (newForn) fornecedor_id = newForn.id;
            }
         }
      }

      // 1. UNIQUE INVOICE VALIDATION
      if (fornecedor_id && numero_fatura) {
         const { data: existingFatura } = await supabase
            .from('faturas')
            .select('id')
            .eq('fornecedor_id', fornecedor_id)
            .eq('numero_fatura', numero_fatura)
            .maybeSingle();

         if (existingFatura) {
            return res.status(400).json({ error: "Esta fatura já foi registada para este fornecedor." });
         }
      }

      // If no valor_final passed, recalculate totals fallback
      if (!totalDaFatura) {
        for (const item of items) {
           const q = Number(item.quantidade) || 0;
           const c = Number(item.custo_unitario) || 0;
           const iva = Number(item.iva) || 0;
           totalDaFatura += (q * c) * (1 + (iva / 100));
        }
      }

      // Create Fatura
      let fatura_id = null;
      try {
         const { data: newFatura, error: fatError } = await supabase.from('faturas').insert([{
           numero_fatura,
           fornecedor_id,
           tipo: 'compra',
           valor_liquido: req.body.valor_liquido || 0,
           valor_iva: req.body.credito_iva || 0,
           valor_total: totalDaFatura,
           valor_pendente: totalDaFatura,
           status_pagamento: 'pendente',
           data_emissao: data,
           data_vencimento: data_vencimento || null,
           created_by: req.user.id
         }]).select('id').single();
         if (fatError) {
             console.error("Erro ao criar fatura, ignorando colunas ausentes e tentando fallback...", fatError);
             // Fallback caso o script v7_financeiro.sql não tenha sido verificado/corrido:
             const dbb = await supabase.from('faturas').insert([{
               numero_fatura,
               fornecedor_id,
               tipo: 'compra',
               valor_total: totalDaFatura,
               valor_pendente: totalDaFatura,
               status_pagamento: 'pendente',
               data_emissao: data,
               data_vencimento: data_vencimento || null,
               created_by: req.user.id
             }]).select('id').single();
             if (dbb.data) fatura_id = dbb.data.id;
         } else if (newFatura) {
            fatura_id = newFatura.id;
         }
      } catch (e) {
         console.error("Fatura table missing, silently ignoring invoice logging:", e);
      }

      // Process each item
      for (const item of items) {
        console.log("Processando item: ", item)
        if (!item.produto_id || !item.quantidade) continue;
        
        // --- NOVO FLUXO V4 (BASEADO EM UNIDADE DE COMPRA) ---
        const { data: prodData } = await supabase.from('produtos').select('unidade_base').eq('id', item.produto_id).single();
        const fatorConversao = item.fator_conversao || 1;
        const unidadeBase = prodData?.unidade_base || 'un';

        const qtdeRecebidaBase = Number(item.quantidade) * fatorConversao;
        
        // Register Fatura Item if fatura was created
        if (fatura_id) {
           const c_unitario = Number(item.custo_unitario) || 0;
           const q_item = Number(item.quantidade) || 0;
           const iva_percent = Number(item.iva) || 0;
           const vLiquido_item = item.valor_liquido !== undefined ? Number(item.valor_liquido) : q_item * c_unitario;
           const vIva_item = item.valor_iva !== undefined ? Number(item.valor_iva) : vLiquido_item * (iva_percent / 100);
           const vTotal_item = item.valor_total !== undefined ? Number(item.valor_total) : vLiquido_item + vIva_item;

           const baseItem = {
             fatura_id,
             produto_id: item.produto_id,
             quantidade: q_item,
             iva: iva_percent,
             valor_liquido: vLiquido_item,
             valor_iva: vIva_item,
             valor_total: vTotal_item
           };

           // Try with all new columns and preco_custo
           let { error: fError } = await supabase.from('fatura_itens').insert([{
               ...baseItem,
               preco_custo: c_unitario
           }]);

           if (fError) {
               // Try with preco_unitario instead of preco_custo
               const { error: err2 } = await supabase.from('fatura_itens').insert([{
                   ...baseItem,
                   preco_unitario: c_unitario
               }]);
               fError = err2;
           }

           if (fError) {
              console.error("Error creating fatura item with new columns, trying legacy fallbacks:", fError.message || fError);
              
              // Fallback 1: Só preco_custo legados (no new columns)
              const { error: fError3 } = await supabase.from('fatura_itens').insert([{
                 fatura_id,
                 produto_id: item.produto_id,
                 quantidade: q_item, 
                 preco_custo: c_unitario
              }]);
              
              if (fError3) {
                 console.error("Error with preco_custo legacy, trying preco_unitario legacy:", fError3.message || fError3);
                 // Fallback 2: Só preco_unitario legados (no new columns)
                 const { error: fError4 } = await supabase.from('fatura_itens').insert([{
                    fatura_id,
                    produto_id: item.produto_id,
                    quantidade: q_item, 
                    preco_unitario: c_unitario
                 }]);
                 
                 if (fError4) {
                    console.error("All fallbacks failed for fatura_itens!", fError4.message || fError4);
                 }
              }
           }
        }

        // 1. Get current stock
        const { data: prod, error: errProd } = await supabase
          .from("produtos")
          .select("stock_armazem, preco_custo, preco, iva")
          .eq("id", item.produto_id)
          .single();
          
        if (errProd) {
             console.error(`Erro ao buscar produto ${item.produto_id}:`, errProd);
        }

        if (prod) {
          const newStock = (Number(prod.stock_armazem) || 0) + qtdeRecebidaBase;
          console.log(`Atualizando produto ${item.produto_id} para novo stock (unidade base): ${newStock}`);
          
          // 2. Prepare update data
          const updateData: any = { stock_armazem: Math.max(0, newStock) };
          
          // Use item.custo_unitario as the price per unit, convert to base unit
          if (item.custo_unitario !== undefined && item.custo_unitario !== null) {
             const newCusto = Number(item.custo_unitario) / fatorConversao;
             updateData.preco_custo = newCusto;

             // Logic to preserve margin: update final consumer price (preco)
             const oldCusto = Number(prod.preco_custo) || 0;
             if (oldCusto > 0 && newCusto > 0) {
                 const currentPreco = Number(prod.preco) || 0;
                 const ivaRatio = 1 + (Number(prod.iva || 0) / 100);
                 const pvpSemIva = currentPreco / ivaRatio;
                 
                 const oldMargemPct = (pvpSemIva - oldCusto) / oldCusto;
                 const newPvpSemIva = newCusto * (1 + oldMargemPct);
                 const newPvp = newPvpSemIva * ivaRatio;
                 updateData.preco = Number(newPvp.toFixed(2));
             }
          }
          if (item.iva !== undefined && item.iva !== null) {
             updateData.iva = Number(item.iva);
          }

          const { error: updateError } = await supabase
            .from("produtos")
            .update(updateData)
            .eq("id", item.produto_id);
            
          if(updateError) {
             console.error(`Erro ao atualizar produto ${item.produto_id}:`, updateError);
             if(updateError.message.includes("preco_custo")) {
                const { error: retryError } = await supabase.from("produtos").update({ stock_armazem: newStock }).eq("id", item.produto_id);
                if (retryError) throw retryError;
             } else {
                throw updateError;
             }
          }

          // Register warehouse movement for the invoice entry with UoM details
          const { error: movError } = await supabase.from("movimentacoes_stock").insert({
            produto_id: item.produto_id,
            tipo: "entrada",
            quantidade: qtdeRecebidaBase,
            display_qty: Number(item.quantidade),
            display_unit: item.unidade_entrada,
            unidade: unidadeBase,
            motivo: `Fatura #${numero_fatura} orig: ${item.quantidade} ${item.unidade_entrada}`,
            user_id: req.user.id
          });
          if(movError) console.error("Erro ao registrar movimentacao: ", movError);
        } else {
            console.warn(`Produto nao encontrado para atualizar stock (id=${item.produto_id})`);
        }
      }
      
      res.json({ message: "Stock e Fatura registados com sucesso" });
    } catch (error: any) {
      console.error("Erro na entrada de stock manual:", error);
      res.status(500).json({ error: "Erro ao atualizar stock", message: error.message });
    }
  });

}
