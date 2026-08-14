import re

with open('src/pages/admin/AdminExpenseEntries.tsx', 'r') as f:
    content = f.read()

old_func = """  const handleSave = async () => {
    try {
      if (!numeroFatura) throw new Error("Número da fatura é obrigatório");
      if (!useNovaEntidade && !fornecedorExistente) throw new Error("Selecione um fornecedor ou crie um novo");
      if (useNovaEntidade && !fornecedorNovo) throw new Error("Nome do novo fornecedor é obrigatório");
      if (!categoriaDespesa) throw new Error("Categoria de despesa é obrigatória");
      if (categoriaDespesa === "novo_tipo" && !novaCategoria.trim()) throw new Error("Nome da nova categoria é obrigatório");
      if (!valorTotal || isNaN(Number(valorTotal)) || Number(valorTotal) <= 0) throw new Error("Valor total inválido");

      setIsProcessing(true);

      const finalCategoria = categoriaDespesa === "novo_tipo" ? novaCategoria.trim() : categoriaDespesa;
      const payload = {
        fornecedor_id: useNovaEntidade ? null : fornecedorExistente,
        novo_fornecedor_nome: useNovaEntidade ? fornecedorNovo : null,
        numero_fatura: numeroFatura,
        data_fatura: dataFatura,
        data_vencimento: dataVencimento || dataFatura,
        categoria_despesa: finalCategoria,
        valor_total: Number(valorTotal),
        loja_id: lojaId || (selectedLoja ? selectedLoja : null)
      };

      await api.post("/admin/faturas/despesas", payload);

      Swal.fire({
        icon: "success",
        title: "Despesa Registrada",
        text: "A despesa foi lançada com sucesso.",
        confirmButtonColor: "#10b981",
        background: "#18181b",
        color: "#fff"
      });

      // Reset
      setNumeroFatura("");
      setValorTotal("");
      setNovaCategoria("");
      setCategoriaDespesa("");
      if (onSuccess) onSuccess();
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Erro ao salvar",
        text: error.response?.data?.error || error.message,
        confirmButtonColor: "#ef4444",
        background: "#18181b",
        color: "#fff"
      });
    } finally {
      setIsProcessing(false);
    }
  };"""

new_func = """  const handleSave = async () => {
    try {
      if (!numeroFatura) throw new Error("Número da fatura é obrigatório");
      if (!useNovaEntidade && !fornecedorExistente) throw new Error("Selecione um fornecedor ou crie um novo");
      if (useNovaEntidade && !fornecedorNovo) throw new Error("Nome do novo fornecedor é obrigatório");
      if (!categoriaDespesa) throw new Error("Categoria de despesa é obrigatória");
      if (categoriaDespesa === "novo_tipo" && !novaCategoria.trim()) throw new Error("Nome da nova categoria é obrigatório");
      if (!valorTotal || isNaN(Number(valorTotal)) || Number(valorTotal) <= 0) throw new Error("Valor total inválido");

      setIsProcessing(true);

      const finalCategoria = categoriaDespesa === "novo_tipo" ? novaCategoria.trim() : categoriaDespesa;
      
      const numParcelas = Number(parcelas) || 1;
      let payloadToSubmit: any = [];
      
      if (numParcelas > 1) {
         const [year, month, day] = dataFatura.split('-');
         let currentEmissao = new Date(Number(year), Number(month) - 1, Number(day));
         
         let currentVencimento: Date | null = null;
         if (dataVencimento) {
             const [vYear, vMonth, vDay] = dataVencimento.split('-');
             currentVencimento = new Date(Number(vYear), Number(vMonth) - 1, Number(vDay));
         } else {
             currentVencimento = new Date(currentEmissao.getTime());
         }

         for (let i = 0; i < numParcelas; i++) {
             const suffix = `-P${i+1}/${numParcelas}`;
             const pad = (n: number) => String(n).padStart(2, '0');
             const formatD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

             payloadToSubmit.push({
                 fornecedor_id: useNovaEntidade ? null : fornecedorExistente,
                 novo_fornecedor_nome: useNovaEntidade ? fornecedorNovo : null,
                 numero_fatura: `${numeroFatura}${suffix}`,
                 data_fatura: formatD(currentEmissao),
                 data_vencimento: formatD(currentVencimento!),
                 categoria_despesa: finalCategoria,
                 valor_total: Number(valorTotal),
                 loja_id: lojaId || (selectedLoja ? selectedLoja : null)
             });
             
             currentEmissao.setMonth(currentEmissao.getMonth() + 1);
             if (currentVencimento) {
                 currentVencimento.setMonth(currentVencimento.getMonth() + 1);
             }
         }
      } else {
          payloadToSubmit = {
            fornecedor_id: useNovaEntidade ? null : fornecedorExistente,
            novo_fornecedor_nome: useNovaEntidade ? fornecedorNovo : null,
            numero_fatura: numeroFatura,
            data_fatura: dataFatura,
            data_vencimento: dataVencimento || dataFatura,
            categoria_despesa: finalCategoria,
            valor_total: Number(valorTotal),
            loja_id: lojaId || (selectedLoja ? selectedLoja : null)
          };
      }

      await api.post("/admin/faturas/despesas", payloadToSubmit);

      Swal.fire({
        icon: "success",
        title: "Despesa Registrada",
        text: numParcelas > 1 ? `A despesa foi lançada em ${numParcelas} parcelas com sucesso.` : "A despesa foi lançada com sucesso.",
        confirmButtonColor: "#10b981",
        background: "#18181b",
        color: "#fff"
      });

      // Reset
      setNumeroFatura("");
      setValorTotal("");
      setNovaCategoria("");
      setCategoriaDespesa("");
      setParcelas(1);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Erro ao salvar",
        text: error.response?.data?.error || error.message,
        confirmButtonColor: "#ef4444",
        background: "#18181b",
        color: "#fff"
      });
    } finally {
      setIsProcessing(false);
    }
  };"""

content = content.replace(old_func, new_func)

with open('src/pages/admin/AdminExpenseEntries.tsx', 'w') as f:
    f.write(content)

