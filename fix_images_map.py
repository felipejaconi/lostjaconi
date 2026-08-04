with open("src/pages/admin/AdminWarehouseMap.tsx", "r") as f:
    content = f.read()

# Update interface
content = content.replace(
    "  stock_armazem?: number;",
    "  stock_armazem?: number;\\n  imagem_url?: string;"
)

# Update layout boxes (in prateleiras)
target1 = """                                <Package size={16} className="opacity-80" />"""
replacement1 = """                                {item.product.imagem_url ? (
                                  <img src={item.product.imagem_url} alt={item.product.nome} className="w-full h-full object-cover rounded-md" />
                                ) : (
                                  <Package size={16} className="opacity-80" />
                                )}"""
content = content.replace(target1, replacement1)

# Update "Sem Localização" boxes (only second occurrence matched correctly? there's only one Package for ruas and one for sem loc)
# Wait, actually let's check if there are 2 <Package size={16} ... >

with open("src/pages/admin/AdminWarehouseMap.tsx", "w") as f:
    f.write(content)
