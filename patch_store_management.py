import re

with open('src/pages/store/StoreManagement.tsx', 'r') as f:
    content = f.read()

# Add new state for fechos
if 'const [fechos, setFechos]' not in content:
    content = content.replace('const [stockLoja, setStockLoja] = useState<any[]>([]);', 'const [stockLoja, setStockLoja] = useState<any[]>([]);\n  const [fechos, setFechos] = useState<any[]>([]);')

# Define isBenavente
if 'const isBenavente = ' not in content:
    content = content.replace('const { user } = useAuth();', 'const { user } = useAuth();\n  const isBenavente = user?.name?.toLowerCase().includes("benavente") || user?.email?.toLowerCase().includes("benavente");')

# Update useEffect to fetch fechos
old_fetch = """        const [ordersRes, stockRes] = await Promise.all([
          api.get("/pedidos"),
          supabase.from("stock_loja").select("quantidade, produto:produtos(id, nome, preco, preco_custo, imagem_url)").eq("user_id", user.id)
        ]);
        
        setOrders(ordersRes.data || []);
        setStockLoja(stockRes.data || []);"""

new_fetch = """        let fechosReq: any = Promise.resolve({ data: [] });
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
        
content = content.replace(old_fetch, new_fetch)

# Need to update useEffect dependencies to include isBenavente
content = content.replace('}, [user]);', '}, [user, isBenavente]);')

with open('src/pages/store/StoreManagement.tsx', 'w') as f:
    f.write(content)

