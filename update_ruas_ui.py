with open("src/pages/admin/AdminWarehouseMap.tsx", "r") as f:
    content = f.read()

target = """                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prateleiras.map(prat => {
                    const items = mapData.layout[rua][prat];
                    return (
                      <div key={prat} className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4">
                        <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 border-b border-zinc-800/80 pb-2">
                          Prateleira {prat}
                        </h4>
                        
                        <div className="flex flex-wrap gap-2">
                          {items.map((item, idx) => {
                            const colorClass = getProductColor(item.quantity, item.product.estoque_minimo);
                            return (
                              <div 
                                key={idx} 
                                className={`w-10 h-10 rounded-lg border flex items-center justify-center p-1 relative group cursor-pointer transition-transform hover:scale-110 z-10 hover:z-20 ${colorClass}`}
                                title={`${item.product.nome} (Estoque: ${item.quantity} | Lote: ${item.loteName})`}
                              >
                                <Package size={16} className="opacity-80" />
                                
                                {/* Tooltip on Hover */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-zinc-900 text-zinc-100 text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl border border-zinc-700 z-50">
                                   <p className="font-bold truncate">{item.product.nome}</p>
                                   <div className="mt-1 flex justify-between text-zinc-400">
                                      <span>Estoque: <strong className="text-white">{item.quantity}</strong></span>
                                      <span>Lote: <strong className="text-white truncate max-w-[60px] inline-block align-bottom">{item.loteName}</strong></span>
                                   </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>"""

replacement = """                <div className="flex flex-wrap gap-6">
                  {prateleiras.map(prat => {
                    const items = mapData.layout[rua][prat];
                    return (
                      <div key={prat} className="flex flex-col gap-2 border border-zinc-800/80 rounded-xl p-3 bg-zinc-900/40">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center mb-1">
                          Prateleira {prat}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {items.map((item, idx) => {
                            const colorClass = getProductColor(item.quantity, item.product.estoque_minimo);
                            return (
                              <div 
                                key={idx} 
                                className={`w-10 h-10 rounded-lg border flex items-center justify-center p-1 relative group cursor-pointer transition-transform hover:scale-110 z-10 hover:z-20 ${colorClass}`}
                                title={`${item.product.nome} (Estoque: ${item.quantity} | Lote: ${item.loteName})`}
                              >
                                <Package size={16} className="opacity-80" />
                                
                                {/* Tooltip on Hover */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-zinc-900 text-zinc-100 text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl border border-zinc-700 z-50">
                                   <p className="font-bold truncate">{item.product.nome}</p>
                                   <div className="mt-1 flex justify-between text-zinc-400">
                                      <span>Estoque: <strong className="text-white">{item.quantity}</strong></span>
                                      <span>Lote: <strong className="text-white truncate max-w-[60px] inline-block align-bottom">{item.loteName}</strong></span>
                                   </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>"""

content = content.replace(target, replacement)

with open("src/pages/admin/AdminWarehouseMap.tsx", "w") as f:
    f.write(content)
