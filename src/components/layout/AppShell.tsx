import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "../../lib/utils";

export interface SidebarLink {
  label: string;
  to: string;
  icon: React.ReactNode;
  isActive?: boolean;
}

interface AppShellProps {
  children: React.ReactNode;
  userRole?: string;
  userName?: string;
  userInitials?: string;
  onLogout?: () => void;
  sidebarLinks: SidebarLink[];
}

export function AppShell({ children, userRole, userName, userInitials, onLogout, sidebarLinks }: AppShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  return (
    <div className="h-[100dvh] w-[100vw] bg-[#050505] text-slate-100 font-sans flex overflow-hidden">
      <Sidebar 
        links={sidebarLinks}
        userName={userName}
        userInitials={userInitials}
        userRole={userRole}
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        isCollapsed={isDesktopCollapsed}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar 
          onMenuClick={() => setIsMobileOpen(true)}
          userName={userName}
          userInitials={userInitials}
          onLogout={onLogout}
          onToggleDesktopSidebar={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
        />
        
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 min-h-0 relative">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
