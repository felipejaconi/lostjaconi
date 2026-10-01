import re

with open('src/pages/admin/AdminOrders.tsx', 'r') as f:
    content = f.read()

old_delete = """                 { order.status === 'pendente' && (
                   <button onClick={() => deleteOrder(order.id)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold rounded-xl text-sm transition-all shadow-md">
                      <Trash2 className="w-4 h-4" /> Excluir
                   </button>
                 )}"""

new_delete = """                 {(user?.role === 'admin' || (user?.role === 'armazem' && order.status === 'processando')) && (
                   <button onClick={() => deleteOrder(order.id)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold rounded-xl text-sm transition-all shadow-md">
                      <Trash2 className="w-4 h-4" /> Excluir
                   </button>
                 )}"""

content = content.replace(old_delete, new_delete)

with open('src/pages/admin/AdminOrders.tsx', 'w') as f:
    f.write(content)

print("Patched successfully")
