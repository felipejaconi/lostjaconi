import fs from 'fs';

const filePath = 'src/pages/AdminDashboard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startIndex = content.indexOf('function AdminInventories() {');
const endIndex = content.indexOf('function AdminUsers', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `function AdminInventories() {
  const [inventories, setInventories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchParams] = useSearchParams();
  const lojaIdParam = searchParams.get("loja_id");
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>("todos");
  const [categories, setCategories] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catsRes, invsRes] = await Promise.all([
          api.get("/categorias"),
          api.get("/admin/inventarios")
        ]);
        setCategories(catsRes.data);
        
        let allInvs = invsRes.data as any[];
        if (lojaIdParam) {
           allInvs = allInvs.filter((inv: any) => String(inv.user_id) === String(lojaIdParam) || String(inv.loja_id) === String(lojaIdParam));
        }
        setInventories(allInvs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const subscription = supabase
      .channel("stock_loja_admin_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_loja" }, () => {
         api.get("/admin/inventarios").then((res) => {
           let allInvs = res.data as any[];
           if (lojaIdParam) {
              allInvs = allInvs.filter((inv: any) => String(inv.user_id) === String(lojaIdParam) || String(inv.loja_id) === String(lojaIdParam));
           }
           setInventories(allInvs);
         });
      })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, [lojaIdParam]);

  // Group by category to reflect the new structure
  const groupedInventories = inventories.reduce((acc: any, inv: any) => {
    const catName = inv.produto?.categoria?.nome || "Sem Categoria";
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(inv);
    return acc;
  }, {});

  const availableCategories = ["todos", ...Object.keys(groupedInventories).sort()];

  const filteredInvs = inventories.filter((inv) => {
    const matchesSearch = inv.produto?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const catName = inv.produto?.categoria?.nome || "Sem Categoria";
    const matchesCat = activeCategory === "todos" || catName === activeCategory;
    return matchesSearch && matchesCat;
  });

  const getStockColorClass = (quantity: number) => {
    if (quantity <= 2) return "text-red-500";
    if (quantity <= 4) return "text-yellow-500";
    return "text-emerald-500";
  };

  const currentGrouped = filteredInvs.reduce((acc: any, inv: any) => {
    const catName = inv.produto?.categoria?.nome || "Sem Categoria";
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(inv);
    return acc;
  }, {});

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-[calc(100vh-64px)] p-6 lg:p-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {lojaIdParam && (
              <button
                onClick={() => navigate(-1)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-yellow-500/30"
              >
                <ArrowLeft size={20} className="text-slate-300" />
              </button>
            )}
            <h1 className="text-2xl font-black text-yellow-500 tracking-tighter uppercase shrink-0">
              {lojaIdParam && inventories.length > 0 ? \`STOCK DA LOJA: \${inventories[0].loja_nome || "Loja"}\` : "VISUALIZAÇÃO DE STOCK"}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Monitoriza o stock global das lojas num formato compacto.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Procurar produto em stock..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-slate-500/50 rounded-2xl outline-none focus:border-yellow-500 focus:bg-white/10 text-sm text-white placeholder:text-slate-500 transition-all shadow-[0_0_15px_rgba(0,0,0,0.2)]"
          />
        </div>
      </div>

      <div className="flex gap-2 p-1 overflow-x-auto no-scrollbar mb-6 pb-2 border-b border-white/5">
        {availableCategories.map((catName) => (
          <button
            key={catName}
            onClick={() => setActiveCategory(catName)}
            className={\`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all \${
              activeCategory === catName
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "bg-black/40 text-slate-400 border border-white/5 hover:bg-white/5"
            }\`}
          >
            {catName.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredInvs.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center text-slate-500 border border-yellow-500/30">
          <Package size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg font-bold">Nenhum produto em stock encontrado nesta secção.</p>
        </div>
      ) : (
        <div className="space-y-8 pb-32">
          {Object.entries(currentGrouped).sort().map(([catName, items]: [string, any]) => (
            <div key={catName} className="mb-6 last:mb-0">
              <h2 className="text-lg font-black text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2 pl-1">
                <Package className="text-primary" size={18} />
                {catName}
                <span className="bg-white/10 text-slate-500 text-[10px] px-2 py-0.5 rounded-md font-bold">
                  {items.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {items.map((s: any) => (
                  <div
                    key={s.id}
                    className="flex flex-col justify-between p-4 rounded-2xl bg-[#050505]/90 border border-white/5 hover:bg-[#111]/90 hover:border-white/10 shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {s.produto?.imagem_url || s.produto_imagem ? (
                          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-black">
                            <OptimizedImage
                              src={s.produto?.imagem_url || s.produto_imagem}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-white/5 shrink-0 flex items-center justify-center">
                            <Package size={20} className="text-slate-500" />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <p className="font-black text-yellow-500 text-sm truncate drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]">
                            {s.produto?.nome || s.produto_nome}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {!lojaIdParam && (
                              <>
                                <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[80px]">
                                  {s.loja_nome || s.user?.name}
                                </p>
                                <span className="text-[10px] text-slate-500">|</span>
                              </>
                            )}
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                              QTY: <strong className={getStockColorClass(s.quantidade)}>{s.quantidade}</strong> {s.produto?.unidade_medida || "un"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

`;

  const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log("AdminInventories replaced successfully.");
} else {
  console.log("Could not find start or end index.");
}
