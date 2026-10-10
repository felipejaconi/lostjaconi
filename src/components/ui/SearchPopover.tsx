import React, { useState } from "react";
import { Search } from "lucide-react";
import { Dropdown } from "./Dropdown";
import { Input } from "./Input";

export function SearchPopover() {
  const [query, setQuery] = useState("");

  const trigger = (
    <div className="relative group cursor-pointer w-full sm:w-64 lg:w-80">
      <Input 
        placeholder="Pesquisar..." 
        isSearch
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pointer-events-none" // We use the dropdown trigger to intercept clicks
      />
      <div className="absolute inset-0 z-10" />
    </div>
  );

  return (
    <Dropdown trigger={trigger} align="left" className="w-[300px] sm:w-[400px]">
      <div className="p-4 border-b border-white/5">
        <Input 
          autoFocus
          isSearch
          placeholder="Pesquisar em tudo..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-transparent border-none p-0 focus:ring-0 text-lg"
        />
      </div>
      <div className="p-2 custom-scrollbar max-h-[300px] overflow-y-auto">
        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
          Resultados Rápidos
        </div>
        {/* Mock results for demo */}
        <div className="px-3 py-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors flex items-center gap-3 text-slate-300 hover:text-white">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500 shrink-0">
            <Search size={14} />
          </div>
          <div>
            <p className="text-sm font-bold">Procurando por "{query || "..."}"</p>
            <p className="text-xs text-slate-500">Pressione Enter para ver todos os resultados</p>
          </div>
        </div>
      </div>
    </Dropdown>
  );
}
