with open("src/pages/admin/AdminWarehouseMap.tsx", "r") as f:
    content = f.read()

target = """                            <Package size={16} className="opacity-80" />"""
replacement = """                            {item.product.imagem_url ? (
                              <img src={item.product.imagem_url} alt={item.product.nome} className="w-full h-full object-cover rounded-md" />
                            ) : (
                              <Package size={16} className="opacity-80" />
                            )}"""
content = content.replace(target, replacement)

with open("src/pages/admin/AdminWarehouseMap.tsx", "w") as f:
    f.write(content)
