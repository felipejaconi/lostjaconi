import React from "react";
import { motion, AnimatePresence } from "motion/react";
import AdminStockEntries from "./AdminStockEntries";
import AdminProducts from "./AdminProducts";
import AdminOrders from "./AdminOrders";
import { useParams, useNavigate } from "react-router-dom";

export default function AdminWarehousePicking() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = (tab as any) || "fatura";

  return (
    <div className="min-h-full bg-[#050505] text-slate-200 font-sans flex flex-col relative w-full">
      <main className="flex-1 w-full pt-2 px-4 lg:pt-4 lg:px-8 overflow-x-hidden">
        <AnimatePresence mode="wait">
          {/* PEDIDOS */}
          {activeTab === "pedidos" && (
            <motion.div key="pedidos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="-m-8">
               <AdminOrders />
            </motion.div>
          )}

          {/* ENTRADA FATURA */}
          {activeTab === "fatura" && (
            <motion.div key="fatura" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <AdminStockEntries onSuccess={() => {
                navigate("/admin/estoque-global");
              }} />
            </motion.div>
          )}

          {/* PRODUTOS */}
          {activeTab === "produtos" && (
            <motion.div key="produtos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <AdminProducts />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}