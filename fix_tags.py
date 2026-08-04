import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

bad_block = '''               </div>
                     {faturasReceber.length > displayCountReceber && (
                       <div ref={loadMoreReceberRef} className="w-full flex justify-center py-6">
                         <span className="px-6 py-3 text-zinc-500 font-medium tracking-tight text-sm">
                           Carregando mais itens...
                         </span>
                       </div>
                     )}
                   </div>
                  )}
               </div>
            </div>
         )}
      </div>'''

good_block = '''               </div>
               {faturasReceber.length > displayCountReceber && (
                  <div ref={loadMoreReceberRef} className="w-full flex justify-center py-6">
                     <span className="px-6 py-3 text-zinc-500 font-medium tracking-tight text-sm">
                        Carregando mais itens...
                     </span>
                  </div>
               )}
            </div>
         )}
      </div>'''

code = code.replace(bad_block, good_block)

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.write(code)
print("Tags fixed")
