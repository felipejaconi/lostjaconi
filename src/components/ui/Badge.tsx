import React from "react";
import { cn } from "../../lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline";
  className?: string;
  children?: React.ReactNode;
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-white/10 text-white border-transparent",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    danger: "bg-red-500/10 text-red-500 border-red-500/20",
    info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    outline: "bg-transparent text-slate-300 border-white/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
