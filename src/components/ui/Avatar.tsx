import React from "react";
import { cn } from "../../lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  initials?: string;
  size?: "sm" | "md" | "lg" | "xl";
  status?: "online" | "offline" | "busy" | "away";
  className?: string;
}

export function Avatar({ className, src, initials, size = "md", status, ...props }: AvatarProps) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  };

  return (
    <div className={cn("relative inline-block", className)} {...props}>
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-bold overflow-hidden bg-gradient-to-br from-yellow-600/40 to-black/80 border border-white/10 shrink-0 shadow-lg",
          sizes[size]
        )}
      >
        {src ? (
          <img src={src} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="text-yellow-500 uppercase">{initials?.substring(0, 2)}</span>
        )}
      </div>
      
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full ring-2 ring-[#050505]",
            size === "sm" ? "w-2 h-2" : size === "md" ? "w-2.5 h-2.5" : size === "lg" ? "w-3 h-3" : "w-4 h-4",
            status === "online" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
            status === "busy" ? "bg-red-500" :
            status === "away" ? "bg-yellow-500" : "bg-slate-500"
          )}
        />
      )}
    </div>
  );
}
