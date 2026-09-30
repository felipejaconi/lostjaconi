with open("src/pages/admin/AdminWarehouseMap.tsx", "r") as f:
    content = f.read()

target1 = """                              <div 
                                key={idx} 
                                className={`w-10 h-10 rounded-lg border flex items-center justify-center p-px relative group cursor-pointer transition-transform hover:scale-[3.5] transform-origin-center z-10 hover:z-[60] ${colorClass}`}
                                title={`${item.product.nome} (Estoque: ${item.quantity} | Lote: ${item.loteName})`}
                              >
                                {item.product.imagem_url ? (
                                  <img src={item.product.imagem_url} alt={item.product.nome} className="w-full h-full object-cover rounded-md" />
                                ) : (
                                  <Package size={16} className="opacity-80" />
                                )}
                                
                                {/* Tooltip on Hover */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-zinc-900 text-zinc-100 text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl border border-zinc-700 z-50">
                                   <p className="font-bold truncate">{item.product.nome}</p>
                                   <div className="mt-1 flex justify-between text-zinc-400">
                                      <span>Estoque: <strong className="text-white">{item.quantity}</strong></span>
                                      <span>Lote: <strong className="text-white truncate max-w-[60px] inline-block align-bottom">{item.loteName}</strong></span>
                                   </div>
                                </div>
                              </div>"""

replacement1 = """                              <div 
                                key={idx} 
                                className={`w-10 h-10 rounded-lg border flex items-center justify-center p-px relative group cursor-pointer z-10 hover:z-[100] ${colorClass}`}
                              >
                                {item.product.imagem_url ? (
                                  <img src={item.product.imagem_url} alt={item.product.nome} className="w-full h-full object-cover rounded-md transition-all duration-300 group-hover:scale-[3.5] group-hover:shadow-[0_0_20px_rgba(0,0,0,0.8)] relative z-10" />
                                ) : (
                                  <Package size={16} className="opacity-80 transition-transform duration-300 group-hover:scale-[2.5] relative z-10" />
                                )}
                                
                                {/* Tooltip on Hover */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-10 w-56 bg-zinc-900 text-zinc-100 text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 scale-95 group-hover:scale-105 shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-zinc-700 z-[110] flex flex-col gap-1">
                                   <p className="font-bold text-[13px] line-clamp-2 leading-tight">{item.product.nome}</p>
                                   <div className="mt-1 flex justify-between text-zinc-300 items-end">
                                      <span>Estoque: <strong className="text-white text-sm">{item.quantity}</strong></span>
                                      <span className="text-[10px]">Lote: <strong className="text-white">{item.loteName}</strong></span>
                                   </div>
                                </div>
                              </div>"""

target2 = """                          <div 
                            key={idx} 
                            className={`w-10 h-10 rounded-lg border flex items-center justify-center p-px relative group cursor-pointer transition-transform hover:scale-[3.5] transform-origin-center z-10 hover:z-[60] ${colorClass}`}
                            title={`${item.product.nome} (Estoque: ${item.quantity})`}
                          >
                            {item.product.imagem_url ? (
                              <img src={item.product.imagem_url} alt={item.product.nome} className="w-full h-full object-cover rounded-md" />
                            ) : (
                              <Package size={16} className="opacity-80" />
                            )}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-zinc-900 text-zinc-100 text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl border border-zinc-700 z-50">
                               <p className="font-bold truncate">{item.product.nome}</p>
                               <div className="mt-1 text-zinc-400">
                                  <span>Estoque: <strong className="text-white">{item.quantity}</strong></span>
                               </div>
                            </div>
                          </div>"""

replacement2 = """                          <div 
                            key={idx} 
                            className={`w-10 h-10 rounded-lg border flex items-center justify-center p-px relative group cursor-pointer z-10 hover:z-[100] ${colorClass}`}
                          >
                            {item.product.imagem_url ? (
                              <img src={item.product.imagem_url} alt={item.product.nome} className="w-full h-full object-cover rounded-md transition-all duration-300 group-hover:scale-[3.5] group-hover:shadow-[0_0_20px_rgba(0,0,0,0.8)] relative z-10" />
                            ) : (
                              <Package size={16} className="opacity-80 transition-transform duration-300 group-hover:scale-[2.5] relative z-10" />
                            )}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-10 w-56 bg-zinc-900 text-zinc-100 text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 scale-95 group-hover:scale-105 shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-zinc-700 z-[110] flex flex-col gap-1">
                               <p className="font-bold text-[13px] line-clamp-2 leading-tight">{item.product.nome}</p>
                               <div className="mt-1 text-zinc-300">
                                  <span>Estoque: <strong className="text-white text-sm">{item.quantity}</strong></span>
                               </div>
                            </div>
                          </div>"""

content = content.replace(target1, replacement1)
content = content.replace(target2, replacement2)

with open("src/pages/admin/AdminWarehouseMap.tsx", "w") as f:
    f.write(content)
