with open("src/pages/admin/AdminWarehouseMap.tsx", "r") as f:
    content = f.read()

target = """                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                          {items.map((item, idx) => {
                            const colorClass = getProductColor(item.quantity, item.product.estoque_minimo);
                            return (
                              <div 
                                key={idx} 
                                className={`aspect-square rounded-lg border flex items-center justify-center p-1 relative group cursor-pointer transition-transform hover:scale-110 z-10 hover:z-20 ${colorClass}`}"""

replacement = """                        <div className="flex flex-wrap gap-2">
                          {items.map((item, idx) => {
                            const colorClass = getProductColor(item.quantity, item.product.estoque_minimo);
                            return (
                              <div 
                                key={idx} 
                                className={`w-10 h-10 rounded-lg border flex items-center justify-center p-1 relative group cursor-pointer transition-transform hover:scale-110 z-10 hover:z-20 ${colorClass}`}"""

content = content.replace(target, replacement)

# If there are 3 ruas, maybe it's better to show them side-by-side on desktop?
target_ruas_container = """      <div className="space-y-12">
        {ruas.length === 0"""

replacement_ruas_container = """      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {ruas.length === 0"""

content = content.replace(target_ruas_container, replacement_ruas_container)

target_ruas_grid = """                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {prateleiras.map(prat => {"""

replacement_ruas_grid = """                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prateleiras.map(prat => {"""
content = content.replace(target_ruas_grid, replacement_ruas_grid)

with open("src/pages/admin/AdminWarehouseMap.tsx", "w") as f:
    f.write(content)
