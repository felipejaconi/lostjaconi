const fs = require('fs');

const code = fs.readFileSync('src/pages/StoreDashboard.tsx', 'utf8');
const lines = code.split('\n');

const start = 707;
const end = 1226;

const newComponent = `
function StoreOrder({ cart, setCart }: { cart: any[]; setCart: any }) {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [observation, setObservation] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("todas");
  const [mostOrderedIds, setMostOrderedIds] = useState<number[]>([]);

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = async () => {
    try {
      const [pRes, cRes, peRes] = await Promise.all([
        api.get("/produtos"), 
        api.get("/categorias"),
        api.get("/pedidos")
      ]);
      const fetchedProducts = (pRes.data as any[]).sort((a: any, b: any) => a.nome.localeCompare(b.nome));
      setProducts(fetchedProducts);
      setCategories(cRes.data);
      
      const orders = peRes.data as any[];
      const freq: Record<number, number> = {};
      orders.forEach(o => {
        o.pedido_itens?.forEach((i: any) => {
          freq[i.produto_id] = (freq[i.produto_id] || 0) + i.quantidade;
        });
      });
      const sortedByFreq = Object.entries(freq).sort((a,b) => b[1] - a[1]).map(e => Number(e[0]));
      if (sortedByFreq.length === 0) {
        setMostOrderedIds(fetchedProducts.filter(p => p.stock_armazem > 0).slice(0, 8).map(p => p.id));
      } else {
        setMostOrderedIds(sortedByFreq.slice(0, 10));
      }
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("store-order-sync-new")
      .on("postgres_changes", { event: "*", schema: "public", table: "produtos" }, () => {
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = setTimeout(() => fetchData(), 500);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, []);

  const addToCart = async (product: any, unit: string = "un") => {
    try {
      const res = await api.get(\`/produtos/\${product.id}/stock\`);
      const realStock = (res.data as any).stock;
      const currentInCart = cart.filter((item) => item.id === product.id).reduce((acc, item) => acc + item.quantity, 0);
        
      if (currentInCart + 1 > realStock) {
        Swal.fire({ title: "Stock Insuficiente", text: \`O armazém tem apenas \${realStock} unidades deste produto.\`, icon: "error" });
        return false;
      }
    } catch (error) {
      return false;
    }

    const existing = cart.find(item => item.id === product.id && item.unit === unit);
    if (existing) {
      setCart(cart.map(item => item.id === product.id && item.unit === unit ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1, unit }]);
    }
    return true;
  };

  const removeFromCart = (id: number, unit: string) => {
    const existing = cart.find(item => item.id === id && item.unit === unit);
    if (!existing) return;
    if (existing.quantity > 1) {
      setCart(cart.map(item => item.id === id && item.unit === unit ? { ...item, quantity: item.quantity - 1 } : item));
    } else {
      setCart(cart.filter(item => !(item.id === id && item.unit === unit)));
    }
  };

  const clearCart = () => {
    Swal.fire({
      title: 'Limpar Carrinho?',
      text: "Vai remover todos os itens.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) setCart([]);
    });
  };

  const handleCheckout = async () => {
    const total = cart.reduce((acc, item) => acc + item.preco * item.quantity, 0);
    try {
      await api.post("/pedidos", {
        itens: cart.map(item => ({ produto_id: item.id, quantidade: item.quantity, preco: item.preco, unidade: item.unit })),
        total,
        observacoes: observation,
      });
      Swal.fire("Sucesso!", "Pedido enviado ao grupo.", "success");
      setCart([]);
      setObservation("");
    } catch (error: any) {
      Swal.fire("Erro", error.response?.data?.message || "Não foi possível enviar o pedido.", "error");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  let filteredProducts = products.filter((p) => {
    if (searchTerm && !p.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (activeCategory === "mais_pedidos") return mostOrderedIds.includes(p.id);
    if (activeCategory !== "todas" && p.categoria_id !== Number(activeCategory)) return false;
    return true;
  });
  
  if (activeCategory === "mais_pedidos") {
    filteredProducts = [...filteredProducts].sort((a, b) => mostOrderedIds.indexOf(a.id) - mostOrderedIds.indexOf(b.id));
  }

  const cartTotalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotalPrice = cart.reduce((acc, item) => acc + item.preco * item.quantity, 0);

  return (
    <div className="flex flex-col lg:flex-row gap-6 relative pb-24 max-w-7xl mx-auto store-order-print-container">
      <style>{\`
        @media print {
          body * { visibility: hidden; }
          .store-order-print-container, .store-order-print-container * { visibility: visible; }
          .store-order-print-container { position: absolute; left: 0; top: 0; width: 100%; }
          .print-hidden { display: none !important; }
          .print-only { display: block !important; }
          .cart-printable-area { width: 100%; margin: 0; padding: 0; background: white; color: black; border: none; box-shadow: none; }
          .cart-item-print { page-break-inside: avoid; border-bottom: 1px dotted #ccc; padding: 8px 0; color: black; }
          .text-white { color: black !important; }
        }
      \`}</style>

      {/* Product List Section */}
      <div className="flex-1 space-y-4 print-hidden">
        {/* Sticky Header with Search and Categories */}
        <div className="sticky top-20 z-20 bg-black/90 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-300">
              Catálogo de Produtos
            </h1>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                 type="text"
                 placeholder="Pesquisar produtos..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-white placeholder:text-slate-500 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 text-sm"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
               onClick={() => setActiveCategory("mais_pedidos")}
               className={\`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 border \${activeCategory === "mais_pedidos" ? "bg-red-500/20 text-red-500 border-red-500/40" : "bg-white/5 text-slate-400 border-transparent hover:bg-white/10"}\`}
            >
              🔥 Mais Pedidos
            </button>
            <button
               onClick={() => setActiveCategory("todas")}
               className={\`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border \${activeCategory === "todas" ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/40" : "bg-white/5 text-slate-400 border-transparent hover:bg-white/10"}\`}
            >
              Todas
            </button>
            {categories.map((c) => (
               <button
                 key={c.id}
                 onClick={() => setActiveCategory(String(c.id))}
                 className={\`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border \${activeCategory === String(c.id) ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/40" : "bg-white/5 text-slate-400 border-transparent hover:bg-white/10"}\`}
               >
                 {c.nome}
               </button>
            ))}
          </div>
        </div>

        {/* Product List */}
        <div className="bg-black/40 border border-white/5 rounded-2xl p-2 sm:p-4">
          <div className="flex flex-col gap-2">
            {filteredProducts.map((p) => {
              const inCartQty = cart.find(i => i.id === p.id && i.unit === (p.unidade_medida || 'un'))?.quantity || 0;
              const isOutOfStock = p.stock_armazem <= 0;
              return (
                <div key={p.id} className={\`flex items-center justify-between p-3 rounded-xl border transition-colors \${isOutOfStock ? "bg-white/5 border-red-500/20 opacity-60" : "bg-white/5 hover:bg-white/10 border-white/10"}\`}>
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-black/60 rounded-lg overflow-hidden border border-white/5 shrink-0 flex items-center justify-center">
                      {p.imagem_url ? (
                         <OptimizedImage src={p.imagem_url} className="w-full h-full object-cover" />
                      ) : (
                         <Package className="w-6 h-6 text-slate-500/50" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <p className="font-bold text-sm text-white truncate pr-2">{p.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                         <span className="text-xs font-bold text-emerald-400">€{p.preco.toFixed(2)}</span>
                         <span className="text-[10px] uppercase font-bold text-slate-500">/{p.unidade_medida || 'un'}</span>
                         {isOutOfStock && <span className="text-[9px] uppercase font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">Esgotado</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="shrink-0 ml-2">
                    {inCartQty === 0 ? (
                       <button 
                         onClick={() => addToCart(p, p.unidade_medida || 'un')}
                         disabled={isOutOfStock}
                         className="px-3 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-xl hover:bg-emerald-500 hover:text-white transition-all font-bold flex items-center gap-1 active:scale-95 disabled:opacity-50 disabled:grayscale"
                       >
                         <Plus size={16} strokeWidth={3} />
                         <span className="text-xs hidden sm:block">Add</span>
                       </button>
                    ) : (
                       <div className="flex items-center gap-1 sm:gap-2 bg-yellow-500/20 border border-yellow-500/30 px-1 py-1 rounded-xl">
                         <button onClick={() => removeFromCart(p.id, p.unidade_medida || 'un')} className="p-1 sm:p-2 text-yellow-500 hover:text-white active:scale-90">
                           <Minus size={16} strokeWidth={3} />
                         </button>
                         <span className="w-6 text-center font-black text-white text-sm focus:outline-none">{inCartQty}</span>
                         <button onClick={() => addToCart(p, p.unidade_medida || 'un')} disabled={isOutOfStock} className="p-1 sm:p-2 text-yellow-500 hover:text-white active:scale-90 disabled:opacity-50">
                           <Plus size={16} strokeWidth={3} />
                         </button>
                       </div>
                    )}
                  </div>
                </div>
              )
            })}
            {filteredProducts.length === 0 && (
               <div className="text-center py-12">
                 <p className="text-slate-500 font-medium">Nenhum produto encontrado nesta vista.</p>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-full lg:w-[380px] shrink-0 cart-printable-area">
        <div className="bg-[#0a0500] p-5 rounded-3xl border border-yellow-500/30 sticky top-20 flex flex-col max-h-[85vh] print:max-h-none print:bg-white print:border-none print:shadow-none print:text-black">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10 print:border-black/20">
            <div>
              <h3 className="text-xl font-bold text-white print:text-black flex items-center gap-2">
                <ShoppingCart className="text-yellow-500 print:text-black" size={20} />
                O Seu Pedido
              </h3>
              <p className="text-xs text-slate-400 print:hidden">{cartTotalItems} itens</p>
            </div>
            {cart.length > 0 && (
              <div className="flex gap-2 print-hidden">
                <button onClick={handlePrint} className="p-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                </button>
                <button onClick={clearCart} className="p-2 bg-red-500/20 text-red-500 rounded-lg border border-red-500/30 hover:bg-red-500 hover:text-white transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                </button>
              </div>
            )}
          </div>
          
          <div className="hidden print-only mb-6 text-black">
            <h1 className="text-2xl font-bold mb-2">Comprovativo de Pedido Diário</h1>
            <p className="text-sm">Data: {new Date().toLocaleString()}</p>
          </div>

          <div className="flex-1 overflow-y-auto mb-4 pr-2 space-y-2 no-scrollbar print:overflow-visible text-black">
            {cart.length === 0 ? (
              <div className="text-center py-10 print-hidden">
                <ShoppingCart className="mx-auto text-slate-600 mb-2" size={32} />
                <p className="text-sm text-slate-400">Sem itens ainda</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl cart-item-print print:bg-transparent print:p-2 border border-white/5">
                  <div className="flex-1 min-w-0 pr-2 text-black">
                    <p className="text-sm font-bold text-white print:text-black truncate">{item.quantity}x {item.nome}</p>
                    <p className="text-[10px] text-slate-400 print:text-black font-medium">{item.unit} • €{(item.preco).toFixed(2)} / un</p>
                  </div>
                  <p className="font-bold text-emerald-400 print:text-black shrink-0">€{(item.preco * item.quantity).toFixed(2)}</p>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-white/10 pt-4 print:border-black/50 text-black">
            <div className="mb-4 print-hidden">
              <input
                type="text"
                placeholder="Observações do pedido (opcional)"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div className="flex items-center justify-between font-bold text-lg mb-4 print:text-black">
              <span className="text-white print:text-black">Total</span>
              <span className="text-emerald-400 print:text-black">€{cartTotalPrice.toFixed(2)}</span>
            </div>
            <button
               onClick={handleCheckout}
               disabled={cart.length === 0}
               className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl active:scale-95 disabled:opacity-50 disabled:grayscale print-hidden shadow-lg shadow-emerald-500/20"
            >
               Confirmar Pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
`

lines.splice(start, end - start + 1, newComponent);
fs.writeFileSync('src/pages/StoreDashboard.tsx', lines.join('\n'), 'utf8');
