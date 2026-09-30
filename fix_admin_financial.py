with open("src/pages/admin/AdminFinancial.tsx", "r") as f:
    content = f.read()

target = """   const handleMarcarRecebido = async (pedido: any) => {
    try {
      const { isConfirmed } = await Swal.fire({
        title: "Marcar como Recebido?",
        text: `Deseja registrar o recebimento de € ${getPedidoTotalComIva(pedido).toFixed(2)} da loja ${pedido.loja_nome || 'Desconhecida'}?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#10b981",
        cancelButtonColor: "#3f3f46",
        confirmButtonText: "Sim, Recebido"
      });

      if (!isConfirmed) return;

      await api.put(`/pedidos/${pedido.id}/status`, { status: "concluido" });
      Swal.fire("Sucesso", "Pagamento recebido e pedido concluído.", "success");
      fetchDados();
    } catch (err: any) {
      Swal.fire("Erro", err.message || "Falha ao registrar recebimento", "error");
    }
  };"""

replacement = """  const handleMarcarRecebido = async (pedido: any) => {
    try {
      const { isConfirmed } = await Swal.fire({
        title: "Marcar como Recebido?",
        text: `Deseja registrar o recebimento de € ${getPedidoTotalComIva(pedido).toFixed(2)} da loja ${pedido.loja_nome || 'Desconhecida'}?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#10b981",
        cancelButtonColor: "#3f3f46",
        confirmButtonText: "Sim, Recebido"
      });

      if (!isConfirmed) return;

      await api.put(`/pedidos/${pedido.id}/status`, { status: "concluido" });
      Swal.fire("Sucesso", "Pagamento recebido e pedido concluído.", "success");
      fetchDados();
    } catch (err: any) {
      Swal.fire("Erro", err.message || "Falha ao registrar recebimento", "error");
    }
  };

  const handleReverterRecebido = async (pedido: any) => {
    try {
      const { isConfirmed } = await Swal.fire({
        title: "Reverter Recebimento?",
        text: `Deseja reverter o recebimento de € ${getPedidoTotalComIva(pedido).toFixed(2)} da loja ${pedido.loja_nome || 'Desconhecida'}? O status voltará para 'A Receber'.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#f59e0b",
        cancelButtonColor: "#3f3f46",
        confirmButtonText: "Sim, Reverter"
      });

      if (!isConfirmed) return;

      await api.put(`/pedidos/${pedido.id}/status`, { status: "entregue" });
      Swal.fire("Sucesso", "Recebimento revertido.", "success");
      fetchDados();
    } catch (err: any) {
      Swal.fire("Erro", err.message || "Falha ao reverter recebimento", "error");
    }
  };"""

content = content.replace(target, replacement)

target2 = """                                 <td className="p-4 text-right">
                                    {p.status?.toLowerCase() !== 'concluido' ? (
                                       <button 
                                          onClick={() => handleMarcarRecebido(p)}
                                          className="inline-flex py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-[10px] uppercase tracking-wider rounded-md transition-colors items-center justify-center gap-1.5"
                                       >
                                          <CheckCircle2 className="w-3.5 h-3.5" /> Marcar Recebido
                                       </button>
                                    ) : (
                                       <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider flex items-center justify-end gap-1">
                                          <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                                       </span>
                                    )}
                                 </td>"""

replacement2 = """                                 <td className="p-4 text-right">
                                    {p.status?.toLowerCase() !== 'concluido' ? (
                                       <button 
                                          onClick={() => handleMarcarRecebido(p)}
                                          className="inline-flex py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-[10px] uppercase tracking-wider rounded-md transition-colors items-center justify-center gap-1.5"
                                       >
                                          <CheckCircle2 className="w-3.5 h-3.5" /> Marcar Recebido
                                       </button>
                                    ) : (
                                       <button 
                                          onClick={() => handleReverterRecebido(p)}
                                          className="inline-flex py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 font-bold text-[10px] uppercase tracking-wider rounded-md transition-colors items-center justify-center gap-1.5"
                                       >
                                          <CheckCircle2 className="w-3.5 h-3.5" /> Pago (Reverter)
                                       </button>
                                    )}
                                 </td>"""

content = content.replace(target2, replacement2)

with open("src/pages/admin/AdminFinancial.tsx", "w") as f:
    f.write(content)
