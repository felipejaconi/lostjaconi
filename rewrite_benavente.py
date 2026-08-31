import re

with open('src/pages/store/StoreManagement.tsx', 'r') as f:
    content = f.read()

# 1. Decouple Benavente state
new_state = """
  // Benavente exclusive state
  const [benaventeMonth, setBenaventeMonth] = useState<number>(new Date().getMonth());
  const [benaventeYear, setBenaventeYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (!user || !isBenavente) return;
    api.get(`/admin/fechos?month=${benaventeMonth + 1}&year=${benaventeYear}`)
       .then(res => setFechos(res.data || []))
       .catch(() => setFechos([]));
  }, [user, isBenavente, benaventeMonth, benaventeYear]);
"""

if 'benaventeMonth' not in content:
    content = content.replace('const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());', new_state + '\n  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());')

# 2. Remove fechos fetch from main useEffect
old_use_effect = """        let fechosReq: any = Promise.resolve({ data: [] });
        if (isBenavente) {
           fechosReq = api.get(`/admin/fechos?month=${new Date().getMonth()+1}&year=${new Date().getFullYear()}`).catch(() => ({ data: [] }));
        }
        
        const [ordersRes, stockRes, fechosRes] = await Promise.all([
          api.get("/pedidos"),
          supabase.from("stock_loja").select("quantidade, produto:produtos(id, nome, preco, preco_custo, imagem_url)").eq("user_id", user.id),
          fechosReq
        ]);
        
        setOrders(ordersRes.data || []);
        setStockLoja(stockRes.data || []);
        setFechos(fechosRes.data || []);"""

new_use_effect = """        const [ordersRes, stockRes] = await Promise.all([
          api.get("/pedidos"),
          supabase.from("stock_loja").select("quantidade, produto:produtos(id, nome, preco, preco_custo, imagem_url)").eq("user_id", user.id)
        ]);
        
        setOrders(ordersRes.data || []);
        setStockLoja(stockRes.data || []);"""

content = content.replace(old_use_effect, new_use_effect)

with open('src/pages/store/StoreManagement.tsx', 'w') as f:
    f.write(content)
