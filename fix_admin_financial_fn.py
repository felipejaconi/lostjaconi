with open("src/pages/admin/AdminFinancial.tsx", "r") as f:
    content = f.read()

target = """  const handleMarcarRecebido = async (pedido: any) => {
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

with open("src/pages/admin/AdminFinancial.tsx", "w") as f:
    f.write(content)

