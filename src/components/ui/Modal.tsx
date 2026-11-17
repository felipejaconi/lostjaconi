import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full" | "page";
}

export function Modal({ isOpen, onClose, title, children, className, maxWidth = "md" }: ModalProps) {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const isFullPage = maxWidth === "page";

  const maxWs = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    full: "max-w-[95vw] h-[95vh]",
    page: "max-w-none w-full h-full",
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="modal-wrapper" 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            isFullPage
              ? "fixed inset-0 lg:left-64 z-[60] flex flex-col p-0"
              : "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6"
          )}>
          {!isFullPage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60 "
              onClick={onClose}
            />
          )}
          <motion.div
            initial={isFullPage ? { opacity: 0, y: 12 } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={isFullPage ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isFullPage ? { opacity: 0, y: 12 } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0 }}
            className={cn(
              isFullPage
                ? "relative w-full h-full flex-1 flex flex-col bg-[#050505] lg:border-l lg:border-white/10 rounded-none overflow-hidden"
                : "relative w-full flex flex-col bg-[#0a0a0a] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden",
              maxWs[maxWidth],
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={cn(
              "flex items-center justify-between border-b border-white/10 shrink-0",
              isFullPage ? "px-6 lg:px-8 py-5 bg-[#0a0a0a]" : "p-6 border-white/5"
            )}>
              {title && (
                <h3 className="text-lg font-black text-white uppercase tracking-widest">{title}</h3>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors ml-auto cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Body */}
            <div className={cn(
              "overflow-y-auto flex-1 custom-scrollbar",
              isFullPage
                ? "p-6 lg:p-8 h-full max-h-none"
                : maxWidth === "full"
                ? "p-6 h-full"
                : "p-6 max-h-[80vh]"
            )}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}
