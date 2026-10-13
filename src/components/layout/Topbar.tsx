import React from "react";
import { Menu, LogOut, Settings, User } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Dropdown, DropdownItem } from "../ui/Dropdown";
import { SearchPopover } from "../ui/SearchPopover";
import { NotificationBell } from "../ui/NotificationBell";

interface TopbarProps {
  onMenuClick: () => void;
  userName?: string;
  userInitials?: string;
  onLogout?: () => void;
  onToggleDesktopSidebar?: () => void;
}

export function Topbar({ onMenuClick, userName, userInitials, onLogout, onToggleDesktopSidebar }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 h-20 bg-black/40  border-b border-white/5 shrink-0">
      <div className="h-full px-4 lg:px-8 flex items-center justify-between gap-4">
        
        {/* Left: Mobile Menu & Search */}
        <div className="flex items-center gap-4 flex-1">
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <Menu size={20} />
          </button>
          
          <button 
            onClick={onToggleDesktopSidebar}
            className="hidden lg:flex p-2 -ml-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            title="Expandir/Recolher Menu"
          >
            <Menu size={20} />
          </button>
          
          <div className="hidden sm:block">
            <SearchPopover />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <NotificationBell unreadCount={2} />

          <div className="w-px h-8 bg-white/10 mx-2 hidden sm:block" />

          <Dropdown
            align="right"
            trigger={
              <div className="flex items-center gap-3 hover:bg-white/5 p-1.5 pr-3 rounded-full border border-white/5 hover:border-white/10 transition-colors">
                <Avatar initials={userInitials || "UR"} size="sm" />
                <span className="text-sm font-bold hidden sm:block">{userName || "User"}</span>
              </div>
            }
          >
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-sm font-bold text-white">{userName || "User"}</p>
              <p className="text-xs text-slate-400 mt-0.5">Sessão Iniciada</p>
            </div>
            <div className="py-2">
              <DropdownItem><User size={16} /> Meu Perfil</DropdownItem>
              <DropdownItem><Settings size={16} /> Ajustes</DropdownItem>
            </div>
            <div className="border-t border-white/5 py-2">
              <DropdownItem onClick={onLogout} danger><LogOut size={16} /> Terminar Sessão</DropdownItem>
            </div>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
