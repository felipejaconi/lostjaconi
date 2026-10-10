import React from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

interface ContentViewportProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function ContentViewport({ children, className, title, description, actions }: ContentViewportProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4 }}
      className={cn("w-full flex flex-col gap-6 lg:gap-8 pt-2 md:pt-4 px-4 sm:px-6 lg:px-8 pb-32", className)}
    >
      {(title || description || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            {title && <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase">{title}</h1>}
            {description && <p className="text-sm text-slate-400 font-medium leading-relaxed mt-1 max-w-xl">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      )}
      
      <div className="flex-1 w-full relative">
        {children}
      </div>
    </motion.div>
  );
}
