import React from "react";
import { motion, HTMLMotionProps } from "motion/react";
import { cn } from "../../lib/utils";

interface CardProps extends HTMLMotionProps<"div"> {
  glass?: boolean;
  hoverEffect?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, glass = true, hoverEffect = false, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
          "rounded-[2rem] p-6 lg:p-8 overflow-hidden relative",
          glass
            ? "bg-white/[0.03]  border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            : "bg-[#0A0A0A] border border-white/5",
          hoverEffect && "hover:border-white/20 transition-all hover:shadow-[0_8px_32px_rgba(255,255,255,0.05)]",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
Card.displayName = "Card";
