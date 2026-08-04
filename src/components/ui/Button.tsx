import React from "react";
import { motion, HTMLMotionProps } from "motion/react";
import { cn } from "../../lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "glass";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", isLoading, disabled, children, ...props }, ref) => {
    const variants = {
      primary: "bg-yellow-500 text-black font-black border border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] hover:bg-yellow-400",
      secondary: "bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20 shadow-lg",
      danger: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white shadow-lg",
      ghost: "bg-transparent text-slate-300 border border-transparent hover:bg-white/5 hover:text-white",
      glass: "bg-white/[0.03]  text-white border border-white/10 hover:bg-white/10 shadow-lg"
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs rounded-xl",
      md: "px-4 py-2 text-sm rounded-xl",
      lg: "px-6 py-3 text-base rounded-2xl",
      icon: "p-2 rounded-xl flex items-center justify-center shrink-0 w-10 h-10 aspect-square"
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        disabled={disabled || isLoading}
        className={cn(
          "relative flex items-center justify-center gap-2 font-bold tracking-wide transition-all outline-none",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 size={16} className="animate-spin shrink-0" />}
        {!isLoading && children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
