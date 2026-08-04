const fs = require('fs');
let c = fs.readFileSync('src/pages/admin/AdminOrders.tsx', 'utf8');

let startIndex = c.indexOf('<div key={order.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden transition-all hover:border-zinc-700 group shadow-sm">');
let endIndex = c.indexOf('{/* Expanded Content */}', startIndex);

if (startIndex > -1 && endIndex > -1) {
  let prefix = c.substring(0, startIndex);
  let suffix = c.substring(endIndex);
  
  const orderRowStart = `<div key={order.id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden transition-all hover:border-white/10 group shadow-sm">
  <div 
    onClick={() => handleExpandOrder(order.id, order.status, order.pedido_itens || [])}
    className="flex flex-col md:flex-row md:items-center justify-between p-6 cursor-pointer gap-6 relative"
  >
     <div className="flex items-center gap-5">
        <div className="w-14 h-14 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:bg-amber-500/10 transition-colors">
          <Store className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">{order.user?.name || order.loja_nome || "Loja Desconhecida"}</h4>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-800">
               #ORD-{order.id.toString().padStart(4, '0')}
            </span>
            <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-1.5">
               <Clock className="w-3.5 h-3.5" /> {(new Date(order.created_at)).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          </div>
        </div>
     </div>

     <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-6 md:gap-8 w-full md:w-auto mt-4 md:mt-0 border-t md:border-0 border-white/5 pt-4 md:pt-0">
        <div className="text-right shrink-0">
           <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Total Pedido</p>
           <p className="text-xl font-black text-white tabular-nums">€ {Number(order.total || 0).toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="shrink-0 w-32 text-right">
           {getStatusBadge(order.status)}
        </div>
        <div className={\`w-10 h-10 rounded-xl flex items-center justify-center transition-colors \${expandedOrderId === order.id ? 'bg-zinc-800 text-zinc-300' : 'bg-transparent text-zinc-600 group-hover:bg-zinc-900 group-hover:text-zinc-300'}\`}>
           <ChevronDown className={\`w-5 h-5 transition-transform duration-300 \${expandedOrderId === order.id ? 'rotate-180' : ''}\`} />
        </div>
     </div>
  </div>
  
  `;
  fs.writeFileSync('src/pages/admin/AdminOrders.tsx', prefix + orderRowStart + suffix);
  console.log("Success replacing row wrapper");
} else {
  console.log("Could not find delimiters");
}
