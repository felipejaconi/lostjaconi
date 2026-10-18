import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({ trigger, children, align = "left", className }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute z-50 mt-2 w-56 rounded-2xl bg-[#0a0a0a]/95  border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden",
              align === "left" ? "left-0" : "right-0",
              className
            )}
          >
            <div className="py-2" onClick={() => setIsOpen(false)}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DropdownItem({ 
  children, 
  className,
  onClick,
  danger
}: { 
  children: React.ReactNode; 
  className?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "px-4 py-2.5 text-sm flex items-center gap-3 cursor-pointer transition-colors m-1 rounded-xl",
        danger 
          ? "text-red-400 hover:bg-red-500/10 hover:text-red-300" 
          : "text-slate-300 hover:bg-white/10 hover:text-white",
        className
      )}
    >
      {children}
    </div>
  );
}
