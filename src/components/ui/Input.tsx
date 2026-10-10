import React from "react";
import { cn } from "../../lib/utils";
import { Search } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  isSearch?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, iconPosition = "left", isSearch, type, ...props }, ref) => {
    
    const IconComponent = isSearch ? <Search size={16} /> : icon;

    return (
      <div className="relative w-full">
        {IconComponent && iconPosition === "left" && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {IconComponent}
          </div>
        )}
        
        <input
          type={type}
          className={cn(
            "w-full bg-white/5 border border-white/10 rounded-xl py-2.5 text-white placeholder:text-slate-500",
            "focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 outline-none transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            IconComponent && iconPosition === "left" ? "pl-10 pr-4" : "px-4",
            IconComponent && iconPosition === "right" ? "pr-10 pl-4" : "px-4",
            className
          )}
          ref={ref}
          {...props}
        />
        
        {IconComponent && iconPosition === "right" && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {IconComponent}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
