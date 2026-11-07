import React from "react";
import { Bell } from "lucide-react";
import { Dropdown } from "./Dropdown";

export function NotificationBell({ unreadCount = 0 }: { unreadCount?: number }) {
  const trigger = (
    <div className="relative p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/10 group cursor-pointer">
      <Bell size={20} className={unreadCount > 0 ? "group-hover:animate-swing" : ""} />
      {unreadCount > 0 && (
        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.8)] border-2 border-black" />
      )}
    </div>
  );

  return (
    <Dropdown trigger={trigger} align="right" className="w-80">
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <h3 className="font-bold text-white">Notificações</h3>
        {unreadCount > 0 && (
          <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full font-bold">
            {unreadCount} Novas
          </span>
        )}
      </div>
      <div className="p-2 custom-scrollbar max-h-[300px] overflow-y-auto">
        {unreadCount === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500">
            Nenhuma nova notificação
          </div>
        ) : (
          <>
            <div className="px-3 py-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors border-l-2 border-yellow-500 bg-white/[0.02]">
              <p className="text-sm text-slate-200">Novo pedido recebido da loja Oriente</p>
              <p className="text-xs text-slate-500 mt-1">Há 2 minutos</p>
            </div>
          </>
        )}
      </div>
      <div className="p-2 border-t border-white/5">
        <button className="w-full py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors text-center hover:bg-white/5 rounded-lg">
          Ver todas
        </button>
      </div>
    </Dropdown>
  );
}
