import React from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { BrandTitle } from "../BrandTitle";
import { Avatar } from "../ui/Avatar";
import type { SidebarLink } from "./AppShell";

interface SidebarProps {
  links: SidebarLink[];
  userName?: string;
  userInitials?: string;
  userRole?: string;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
}

export function Sidebar({ links, userName, userInitials, userRole, isOpen, onClose, isCollapsed }: SidebarProps) {
  
  const SidebarContent = (
    <div className={cn(
      "flex flex-col h-full bg-[#0a0a0a]/90  border-r border-white/10 shrink-0 transition-all duration-300",
      isCollapsed ? "w-20" : "w-72"
    )}>
      <div className={cn(
        "p-6 border-b border-white/5 flex items-center shrink-0",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        {!isCollapsed && <BrandTitle />}
        <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white shrink-0">
          <X size={20} />
        </button>
      </div>

      {/* User Card */}
      <div className={cn("p-6 border-b border-white/5 shrink-0", isCollapsed && "flex justify-center flex-col items-center")}>
        <div className={cn(
          "flex items-center bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors",
          isCollapsed ? "p-3 justify-center" : "gap-4 p-4"
        )}>
          <Avatar initials={userInitials || "UR"} status="online" size={isCollapsed ? "sm" : "md"} />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{userName || "User"}</p>
              <p className="text-[10px] text-yellow-500 font-black uppercase tracking-widest">{userRole || "ADMIN"}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1 block">
        {links.map((link, idx) => (
          <Link
            key={idx}
            to={link.to}
            onClick={() => {
              if (window.innerWidth < 1024) onClose();
            }}
            title={isCollapsed ? link.label : undefined}
            className={cn(
              "flex items-center rounded-xl font-bold tracking-wide transition-all relative",
              isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3 text-sm",
              link.isActive
                ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]"
                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
            )}
          >
            <span className={cn("transition-transform flex-shrink-0", link.isActive && "scale-110")}>
              {link.icon}
            </span>
            {!isCollapsed && <span>{link.label}</span>}
            {link.isActive && !isCollapsed && (
              <motion.div layoutId="sidebar-active" className="absolute left-0 w-1 h-8 bg-yellow-500 rounded-r-full shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
            )}
          </Link>
        ))}
      </div>
      
      <div className="p-6 border-t border-white/5 flex justify-center shrink-0">
        {!isCollapsed ? (
          <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest font-bold">
            LOST WIND © 2026
          </p>
        ) : (
          <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest font-bold" title="LOST WIND © 2026">
            LW
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0 h-screen sticky top-0 relative">
        {SidebarContent}
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="lg:hidden fixed inset-0 z-40 bg-black/80 "
          />
        )}
        {isOpen && (
          <motion.div
            key="sidebar-drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-72"
          >
            {SidebarContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
