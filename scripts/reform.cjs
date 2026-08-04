const fs = require('fs');
let c = fs.readFileSync('src/pages/admin/AdminOrders.tsx', 'utf8');

const newHeader = `<div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
  <div>
     <div className="flex items-center gap-3 mb-2">
       <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 flex items-center justify-center rounded-2xl border border-emerald-500/20 shadow-inner">
         <Package className="w-6 h-6" />
       </div>
       <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">
         Gestão de Pedidos
         <span className="align-middle ml-3 px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[11px] font-bold rounded-full">{orders.length} Global</span>
       </h1>
     </div>
     <p className="text-zinc-400 text-sm lg:text-base max-w-xl">Acompanhe e gira as encomendas de todas as lojas centralmente, com atualizações em tempo real.</p>
  </div>
</div>`;

c = c.replace(/<div className=\"mb-10\">\s*<h1 className=\"text-3xl lg:text-4xl font-semibold text-zinc-100 tracking-tight flex items-center gap-3\">\s*Gestão de Pedidos.*\s*<\/h1>\s*<p className=\"text-zinc-400 mt-2 text-sm lg:text-base\">.*?<\/p>\s*<\/div>/, newHeader);

const newStats = `<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
   <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/20 transition-all">
     <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-amber-500/10"></div>
     <div className="relative z-10">
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Total Pendentes</p>
        <div className="flex items-end gap-3">
           <p className="text-4xl font-black text-white">{orders.filter(o => o.status === 'pendente' || o.status === 'processando').length}</p>
           <p className="text-sm font-bold text-amber-500 mb-1">Em fila</p>
        </div>
     </div>
   </div>
   <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/20 transition-all">
     <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/10"></div>
     <div className="relative z-10">
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Pronto / Entregue (Hoje)</p>
        <div className="flex items-end gap-3">
           <p className="text-4xl font-black text-white">{orders.filter(o => {
               const s = o.status.toLowerCase();
               const isComplete = ['pronto', 'concluido', 'entregue'].includes(s);
               const isToday = new Date(o.created_at).toDateString() === new Date().toDateString();
               return isComplete && isToday;
           }).length}</p>
           <p className="text-sm font-bold text-blue-400 mb-1">Processados</p>
        </div>
     </div>
   </div>
   <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-500/20 transition-all">
     <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-500/10"></div>
     <div className="relative z-10">
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Faturação Total (Encomendado)</p>
        <div className="flex items-end gap-3">
           <p className="text-4xl font-black text-white truncate" title={"€" + orders.reduce((acc, o) => acc + Number(o.total || 0), 0).toFixed(2)}>€{orders.reduce((acc, o) => acc + Number(o.total || 0), 0).toLocaleString('pt-PT', {minimumFractionDigits:2})}</p>
        </div>
     </div>
   </div>
</div>`;

c = c.replace(/<div className=\"grid grid-cols-2 md:grid-cols-4 gap-4 mb-8\">\s*<div className=\"bg-zinc-900\/50[\s\S]*?<\/div>\s*<\/div>/, newStats);

const newViewMode = `<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
  <div className="inline-flex bg-[#0a0a0a] p-1.5 rounded-xl border border-white/5 shadow-inner">
    <button
       onClick={() => { setViewMode('diario'); setStatusFilter('todos'); }}
       className={\`px-6 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all \${
         viewMode === 'diario' ? 'bg-emerald-500 text-zinc-950 shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
       }\`}
    >
      📋 Diários
    </button>
    <button
       onClick={() => { setViewMode('historico'); setStatusFilter('todos'); }}
       className={\`px-6 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all \${
         viewMode === 'historico' ? 'bg-emerald-500 text-zinc-950 shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
       }\`}
    >
      🗄️ Histórico
    </button>
  </div>
</div>`;
c = c.replace(/<div className=\"flex gap-4 mb-4\">\s*<div className=\"inline-flex bg-zinc-900\/80[\s\S]*?<\/div>\s*<\/div>/, newViewMode);

const newFilterBar = `<div className="bg-[#0a0a0a] border border-white/5 rounded-2xl shadow-xl overflow-hidden focus-within:border-emerald-500/30 transition-all mb-6 relative z-10 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/5">
   <div className="flex-1 relative">
     <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
       <Search size={18} className="text-zinc-500" />
     </div>
     <input 
       type="text" 
       value={searchTerm}
       onChange={e => setSearchTerm(e.target.value)}
       placeholder="Pesquisar loja ou número do pedido..."
       className="w-full bg-transparent py-5 pl-14 pr-5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 transition-colors font-medium"
     />
   </div>
   <div className="flex items-center overflow-x-auto no-scrollbar md:w-auto shrink-0 bg-zinc-900/10">
      {[
        { id: "pendente", label: "Pendente" },
        { id: "processando", label: "Preparação" },
        { id: "pronto", label: "Pronto" },
        { id: "entregue", label: "Entregue" },
        { id: "cancelado", label: "Cancelado" }
      ].map(f => (
         <button
           key={f.id}
           onClick={() => setStatusFilter(statusFilter === f.id ? 'todos' : f.id)}
           className={\`px-6 py-5 text-[11px] font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap \${
              statusFilter === f.id 
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/10" 
              : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
           }\`}
         >
           {f.label}
         </button>
      ))}
   </div>
</div>`;
c = c.replace(/<div className=\"bg-zinc-900\/50 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden focus-within:ring-1 focus-within:ring-zinc-700 transition-all mb-6 relative z-10 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-800\">[\s\S]*?<\/div>(\s*<div className=\"space-y-4\">)/, newFilterBar + "\n$1");

const orderRowStart = `<div key={order.id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden transition-all hover:border-white/10 group shadow-sm">
  <div 
    onClick={() => handleExpandOrder(order.id, order.status, order.pedido_itens || [])}
    className="flex flex-col md:flex-row md:items-center justify-between p-6 cursor-pointer gap-6 relative"
  >
     <div className="flex items-center gap-5">
        <div className="w-14 h-14 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:bg-emerald-500/10 transition-colors">
          <Store className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">{order.user?.name || order.loja_nome || "Loja Desconhecida"}</h4>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
               #ORD-{order.id.toString().padStart(4, '0')}
            </span>
            <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-1.5">
               <Clock className="w-3.5 h-3.5" /> {(new Date(order.created_at)).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          </div>
        </div>
     </div>

     <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8 w-full md:w-auto mt-4 md:mt-0 border-t md:border-0 border-white/5 pt-4 md:pt-0">
        <div className="text-left md:text-right shrink-0">
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
  </div>`;
  
c = c.replace(/<div key=\{order.id\} className=\"bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden transition-all hover:border-zinc-700 group shadow-sm\">\s*<div\s*onClick=\{.*?\}\s*className=\"flex flex-col sm:flex-row sm:items-center justify-between p-5 md:p-6 cursor-pointer gap-4 relative\"\s*>\s*<div className=\"flex items-center gap-4\">.*?<\/div>\s*<div className=\"flex items-center gap-6 sm:justify-end\">.*?<\/div>\s*<div className=\"absolute top-5 right-5 sm:hidden\">.*?<\/div>\s*<\/div>/s, orderRowStart);

fs.writeFileSync('src/pages/admin/AdminOrders.tsx', c);
console.log('done layout update');
