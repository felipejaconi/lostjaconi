import React, { useState, useEffect, useRef } from "react";
import { Plus, Package, ArrowDownLeft, Edit2, Trash2, X, Tag, Ruler, Box, Info, TrendingUp, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { OptimizedImage } from "../../components/OptimizedImage";
import { optimizeImage } from "../../lib/imageOptimization";
import { CategoryIcon } from "../../components/CategoryIcon";
import { BrandTitle } from "../../components/BrandTitle";
import { cn } from "../../lib/utils";

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isExistingModalOpen, setExistingModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const categoriaId = searchParams.get("categoria_id");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    categoria_id: "",
    lote: "",
    rua: "",
    prateleira: "",
    unidade_base: "un",
    unidade_compra: "un",
    fator_conversao_compra: "1",
    is_peso_variavel: false,
    barcode_ean: "",
    pais_origem: "",
    iva: "23",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [activeTab, setActiveTab] = useState<"produtos" | "categorias">("produtos");

  // Category Modal States
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryFormData, setCategoryFormData] = useState({ nome: "" });
  const [selectedCategoryFile, setSelectedCategoryFile] = useState<File | null>(null);

  // Units Modal States
  const [isUnitsModalOpen, setUnitsModalOpen] = useState(false);
  const [selectedProductForUnits, setSelectedProductForUnits] = useState<any>(null);
  const [unitFormData, setUnitFormData] = useState({ unit: "", factor: "1" });
  
  const [displayCount, setDisplayCount] = useState<number>(30);

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append("nome", categoryFormData.nome);
    if (selectedCategoryFile) data.append("imagem", selectedCategoryFile);

    try {
      if (editingCategory) {
        await api.put(`/categorias/${editingCategory.id}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        Swal.fire("Sucesso", "Categoria atualizada com sucesso!", "success");
      } else {
        await api.post("/categorias", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        Swal.fire("Sucesso", "Categoria criada com sucesso!", "success");
      }
      setCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryFormData({ nome: "" });
      setSelectedCategoryFile(null);
      fetchData();
    } catch {
      Swal.fire("Erro", "Falha ao guardar categoria", "error");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    const result = await Swal.fire({
      title: "Remover Categoria?",
      text: "Produtos nesta categoria ficarão sem categoria.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, remover",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/categorias/${id}`);
        Swal.fire("Removida", "Categoria eliminada", "success");
        fetchData();
      } catch {
        Swal.fire("Erro", "Falha ao remover categoria", "error");
      }
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForUnits) return;
    try {
      await api.post("/product-units", {
        product_id: selectedProductForUnits.id,
        unit: unitFormData.unit,
        factor: Number(unitFormData.factor),
        is_default_buy: false,
        is_default_sell: false
      });
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Unidade adicionada', showConfirmButton: false, timer: 1500 });
      setUnitFormData({ unit: "", factor: "1" });
      fetchData(); // refresh product list to include new unit
      // Also update selectedProductForUnits to reflect new data
      const updatedProd = products.find(p => p.id === selectedProductForUnits.id);
      if(updatedProd) setSelectedProductForUnits(updatedProd);
      // Wait actually, fetchData is async so this won't be updated immediately. Best to just let it update on next render or re-fetch.
    } catch (error: any) {
      Swal.fire("Erro", error.response?.data?.error || "Erro ao adicionar", "error");
    }
  };

  const handleRemoveUnit = async (id: string) => {
    try {
      await api.delete(`/product-units/${id}`);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Unidade removida', showConfirmButton: false, timer: 1500 });
      fetchData();
    } catch (error: any) {
      Swal.fire("Erro", "Falha ao remover unidade", "error");
    }
  };

  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMoreRef = React.useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (node) {
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount(c => c + 30);
        }
      }, { threshold: 0.1 });
      observerRef.current.observe(node);
    }
  }, []);

  const fetchData = async () => {
    try {
      const [pRes, cRes, lRes] = await Promise.all([
        api.get("/produtos"),
        api.get("/categorias"),
        supabase.from('lotes').select('*')
      ]);
      setProducts(Array.isArray(pRes.data) ? pRes.data.sort((a: any, b: any) => (a.nome || "").localeCompare(b.nome || "")) : []);
      setCategories(Array.isArray(cRes.data) ? cRes.data : []);
      if (lRes.data && !lRes.error) setLotes(lRes.data);
    } catch(e) { console.error("AdminProducts fetchData error", e); }
  };

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("schema-db-changes-admin-products")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "produtos",
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setProducts((prev) =>
              prev.map((p) =>
                p.id === payload.new.id ? { ...p, ...payload.new } : p,
              ),
            );
          } else if (payload.eventType === "INSERT") {
            setProducts((prev) => [...prev, payload.new]);
          } else if (payload.eventType === "DELETE") {
            setProducts((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categorias",
        },
        () => {
          if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = setTimeout(() => fetchData(), 500);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) =>
      data.append(key, value as string),
    );
    if (selectedFile) data.append("imagem", selectedFile);

    try {
      if (editingProduct) {
        await api.post(`/produtos/${editingProduct.id}/update`, data);
      } else {
        await api.post("/produtos", data);
      }
      Swal.fire("Sucesso", "Produto guardado com sucesso", "success");
      setModalOpen(false);
      setEditingProduct(null);
      setFormData({
        nome: "",
        descricao: "",
        categoria_id: "",
        lote: "",
    rua: "",
    prateleira: "",
        unidade_base: "un",
        unidade_compra: "un",
        fator_conversao_compra: "1",
        is_peso_variavel: false,
        barcode_ean: "",
        pais_origem: "",
        iva: "23",
      });
      setSelectedFile(null);
      fetchData();
    } catch (error: any) {
      console.error(error);
      const reqUrl = error.config?.url;
      const reqMethod = error.config?.method;
      const errMsg = error.response?.data?.error || error.response?.data || error.message;
      Swal.fire("Erro", `Falha ao guardar produto.\nURL: ${reqMethod} ${reqUrl}\nErro: ${errMsg}`, "error");
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Tem a certeza?",
      text: "Esta ação não pode ser revertida!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, remover!",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/produtos/${id}`);
        Swal.fire("Removido!", "O produto foi eliminado.", "success");
        fetchData();
      } catch (error) {
        Swal.fire("Erro", "Falha ao remover produto", "error");
      }
    }
  };

  const handleAddExisting = async (productId: number) => {
    if (!categoriaId) return;
    try {
      // Just update the category_id
      const product = products.find(p => p.id === productId);
      if (!product) return;
      
      const data = new FormData();
      Object.entries(product).forEach(([key, value]) => {
        if (key !== 'imagem_url' && key !== 'categoria_nome' && value !== null) {
          data.append(key, value as string);
        }
      });
      data.set('categoria_id', categoriaId);
      
      await api.post(`/produtos/${productId}/update`, data);
      Swal.fire("Sucesso", "Produto adicionado à categoria", "success");
      setExistingModalOpen(false);
      fetchData();
    } catch (error) {
      Swal.fire("Erro", "Falha ao adicionar produto", "error");
    }
  };

  const searchTerm = searchParams.get("search") || "";

  let filteredProducts = products;
  if (categoriaId) {
    filteredProducts = categoriaId === "null"
      ? filteredProducts.filter((p) => !p.categoria_id)
      : filteredProducts.filter((p) => String(p.categoria_id) === categoriaId);
  }
  if (searchTerm) {
    filteredProducts = filteredProducts.filter((p) =>
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode_ean && p.barcode_ean.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  const otherProducts = categoriaId
    ? categoriaId === "null"
      ? products.filter((p) => p.categoria_id)
      : products.filter((p) => p.categoria_id !== categoriaId)
    : [];

  return (
    <div className="pt-2 px-4 md:pt-4 md:px-6 lg:px-8 ">
      <div className="flex flex-col gap-4 border-b border-white/5 pb-5 mb-2">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center flex-wrap gap-4 pt-2">
             <BrandTitle title="Produtos" titleClassName="p-0 m-0 -mt-[18px]" hideUnderline />
             <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 w-fit shrink-0">
                <button
                  onClick={() => setActiveTab("produtos")}
                  className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    activeTab === "produtos" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <Package size={14} /> PRODUTOS
                </button>
                <button
                  onClick={() => setActiveTab("categorias")}
                  className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    activeTab === "categorias" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                  }`}
                >
                  CATEGORIAS
                </button>
             </div>
          </div>
          
          <div className="flex gap-2 sm:gap-3 flex-wrap sm:flex-nowrap w-full lg:w-auto shrink-0 lg:justify-end mt-2 lg:mt-0">
            {activeTab === "produtos" ? (
              <>
                {categoriaId && (
                  <button
                    onClick={() => setExistingModalOpen(true)}
                    className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap text-slate-500 hover:text-slate-300 border border-white/10 hover:bg-white/5 shadow-lg shadow-black/20"
                  >
                    <Package size={16} /> 
                    <span>Associar Existente</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setFormData({
                      nome: "",
                      descricao: "",
                      categoria_id: categoriaId || "",
                      lote: "",
    rua: "",
    prateleira: "",
                      unidade_base: "un",
                      unidade_compra: "un",
                      fator_conversao_compra: "1",
                      is_peso_variavel: false,
                      barcode_ean: "",
                      pais_origem: "",
                      iva: "23",
                    });
                    setModalOpen(true);
                  }}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap bg-blue-600 text-white shadow-xl shadow-blue-500/20 hover:bg-blue-500 active:scale-95 opacity-90 hover:opacity-100"
                >
                  <Plus size={16} strokeWidth={3} /> 
                  <span>Novo Produto</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryFormData({ nome: "" });
                  setSelectedCategoryFile(null);
                  setCategoryModalOpen(true);
                }}
                className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap bg-blue-600 text-white shadow-xl shadow-blue-500/20 hover:bg-blue-500 active:scale-95 opacity-90 hover:opacity-100"
              >
                <Plus size={16} strokeWidth={3} /> 
                <span>Nova Categoria</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center w-full lg:max-w-md bg-black/40 border border-white/10 rounded-xl px-4 py-2 mt-2 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
          <Search className="w-4 h-4 text-slate-500 mr-2" />
          <input
             type="text"
             placeholder={`Pesquisar ${activeTab}...`}
             value={searchTerm}
             onChange={(e) => {
                const newParams = new URLSearchParams(searchParams);
                if (e.target.value) {
                   newParams.set("search", e.target.value);
                } else {
                   newParams.delete("search");
                }
                setSearchParams(newParams);
             }}
             className="bg-transparent border-none outline-none text-white text-sm w-full font-medium placeholder:text-slate-500"
          />
        </div>
      </div>

      {activeTab === "produtos" && (
        <div className="flex overflow-x-auto no-scrollbar gap-2 py-3 sticky -top-6 z-20 bg-[#050505]/95  -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 mb-4 border-b border-white/5">
          <button
            onClick={() => {
              const newParams = new URLSearchParams(searchParams);
              newParams.delete("categoria_id");
              setSearchParams(newParams);
            }}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border rounded-xl flex items-center justify-center ${
              !categoriaId
                ? "bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20"
                : "bg-black/40 border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Todos os Produtos
          </button>
          
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.set("categoria_id", c.id.toString());
                setSearchParams(newParams);
              }}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border rounded-xl flex items-center gap-2 ${
                categoriaId === c.id.toString()
                  ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20"
                  : "bg-black/40 border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <CategoryIcon categoryName={c.nome} size={14} className={categoriaId === c.id.toString() ? "text-white" : "text-slate-500"} />
              {c.nome}
            </button>
          ))}
          <button
            onClick={() => {
              const newParams = new URLSearchParams(searchParams);
              newParams.set("categoria_id", "null");
              setSearchParams(newParams);
            }}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border rounded-xl flex items-center justify-center ${
              categoriaId === "null"
                ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20"
                : "bg-black/40 border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Sem Categoria
          </button>
        </div>
      )}

      {/* Products and Categories Tables */}
      {activeTab === "produtos" ? (
        <div className="bg-[#0A0A0A] border border-white/5 shadow-2xl rounded-[2rem] overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                 <thead>
                   <tr className="border-b border-white/10 bg-white/[0.02]">
                      <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest">Produto</th>
                      <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest">Categoria</th>
                      <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest">Lote / Local</th>
                      <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Stock / IVA</th>
                      <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
                   </tr>
                 </thead>
                 <tbody>
                    {filteredProducts.slice(0, displayCount).map((p, idx) => (
                       <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                          <td className="p-4 flex items-center gap-4">
                             <div className="w-12 h-12 bg-black/60 rounded-xl overflow-hidden border border-white/10 shrink-0 shadow-lg">
                               {p.imagem_url ? (
                                 <OptimizedImage src={p.imagem_url} priority={idx < 10} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center text-slate-700">
                                   <Package size={18} />
                                 </div>
                               )}
                             </div>
                             <div>
                                <p className="text-sm font-black text-white uppercase tracking-tight">{p.nome}</p>
                                {p.barcode_ean && <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">EAN: <span className="text-slate-400">{p.barcode_ean}</span></p>}
                             </div>
                          </td>
                          <td className="p-4">
                             <span className="text-[10px] uppercase font-black tracking-widest text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-lg">
                                {p.categoria_nome || "Sem Categoria"}
                             </span>
                          </td>
                          <td className="p-4">
                             {((p.lotes as any)?.[0]?.lote || (p.lotes as any)?.[0]?.rua || (p.lotes as any)?.[0]?.prateleira) ? (
                               <div className="flex flex-col gap-1">
                                 {(p.lotes as any)?.[0]?.lote && <span className="text-xs text-white font-bold">Lote: <span className="text-slate-400">{(p.lotes as any)[0].lote}</span></span>}
                                 {((p.lotes as any)?.[0]?.rua || (p.lotes as any)?.[0]?.prateleira) && (
                                   <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                                     {(p.lotes as any)[0].rua && `Rua ${(p.lotes as any)[0].rua}`} {(p.lotes as any)[0].rua && (p.lotes as any)[0].prateleira && "•"} {(p.lotes as any)[0].prateleira && `Prat ${(p.lotes as any)[0].prateleira}`}
                                   </span>
                                 )}
                               </div>
                             ) : (
                               <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Sem Local</span>
                             )}
                          </td>
                          <td className="p-4 text-center">
                             <div className="flex items-center justify-center gap-2">
                                <div className={`inline-flex flex-col items-center justify-center px-4 py-2 rounded-xl text-sm font-black border ${p.stock_armazem < 10 ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"}`}>
                                   <span>{Number(p.stock_armazem).toFixed(1).replace('.0', '')} <span className="text-[10px] opacity-70 uppercase tracking-widest ml-1">{p.unidade_base}</span></span>
                                </div>
                                <div className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-black border bg-blue-500/10 text-blue-400 border-blue-500/20">
                                   IVA {p.iva || "23"}%
                                </div>
                             </div>
                          </td>
                          <td className="p-4 text-right">
                             <div className="flex items-center justify-end gap-2">
                               <button
                                 onClick={() => {
                                   setEditingProduct(p);
                                   setFormData({
                                     nome: p.nome,
                                     descricao: p.descricao || "",
                                     categoria_id: p.categoria_id?.toString() || "",
                                     lote: (p.lotes as any)?.[0]?.lote?.toString() || p.lote?.toString() || "",
        rua: (p.lotes as any)?.[0]?.rua?.toString() || "",
        prateleira: (p.lotes as any)?.[0]?.prateleira?.toString() || "",
                                     unidade_base: (p.unidade_base || "un").toLowerCase(),
                                     unidade_compra: p.unidade_compra || "un",
                                     fator_conversao_compra: p.fator_conversao_compra?.toString() || "1",
                                     is_peso_variavel: !!p.is_peso_variavel,
                                     barcode_ean: p.barcode_ean || "",
                                     pais_origem: p.pais_origem || "",
                                     iva: p.iva?.toString() || "23",
                                   });
                                   setModalOpen(true);
                                 }}
                                 className="p-2.5 bg-white/5 hover:bg-blue-500 hover:text-white text-slate-400 rounded-xl transition-all border border-white/10 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20"
                               >
                                 <Edit2 size={14} />
                               </button>
                               <button
                                 onClick={() => handleDelete(p.id)}
                                 className="p-2.5 bg-white/5 hover:bg-red-500 hover:text-white text-slate-400 rounded-xl transition-all border border-white/10 hover:border-red-500 hover:shadow-lg hover:shadow-red-500/20"
                               >
                                 <Trash2 size={14} />
                               </button>
                             </div>
                          </td>
                       </tr>
                    ))}
                  </tbody>
               </table>

            </div>
            {filteredProducts.length > displayCount && (
              <div ref={loadMoreRef} className="w-full flex justify-center py-6">
                <span className="px-6 py-3 text-zinc-500 font-medium tracking-tight text-sm">
                  Carregando mais itens...
                </span>
              </div>
            )}
            {filteredProducts.length === 0 && (
              <div className="p-12 text-center flex flex-col items-center">
                 <Package size={48} className="text-slate-700 mb-4" />
                 <p className="text-sm font-black text-slate-500 uppercase tracking-widest">
                    Nenhum produto encontrado
                 </p>
              </div>
           )}
        </div>
      ) : (
        <div className="bg-[#0A0A0A] border border-white/5 shadow-2xl rounded-[2rem] overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                 <thead>
                   <tr className="border-b border-white/10 bg-white/[0.02]">
                      <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest w-[80px]">Icon/Img</th>
                      <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest">Categoria</th>
                      <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
                   </tr>
                 </thead>
                 <tbody>
                    {categories.map(c => (
                       <tr 
                          key={c.id} 
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                       >
                          <td className="p-4">
                             <div className="w-12 h-12 bg-black/60 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center shadow-lg group-hover:border-blue-500/50 transition-all">
                               {c.imagem_url ? (
                                 <img src={c.imagem_url} alt={c.nome} className="w-full h-full object-cover" />
                               ) : (
                                 <CategoryIcon categoryName={c.nome} className="text-slate-500 group-hover:text-blue-400 transition-colors" size={20} />
                               )}
                             </div>
                          </td>
                          <td className="p-4">
                             <p className="text-sm font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">
                                {c.nome}
                             </p>
                          </td>
                          <td className="p-4 text-right">
                             <div className="flex items-center justify-end gap-2">
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setEditingCategory(c);
                                   setCategoryFormData({ nome: c.nome });
                                   setSelectedCategoryFile(null);
                                   setCategoryModalOpen(true);
                                 }}
                                 className="p-2.5 bg-white/5 hover:bg-blue-500 hover:text-white text-slate-400 rounded-xl transition-all border border-white/10 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20"
                               >
                                 <Edit2 size={14} />
                               </button>
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleDeleteCategory(c.id);
                                 }}
                                 className="p-2.5 bg-white/5 hover:bg-red-500 hover:text-white text-slate-400 rounded-xl transition-all border border-white/10 hover:border-red-500 hover:shadow-lg hover:shadow-red-500/20"
                               >
                                 <Trash2 size={14} />
                               </button>
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
           {categories.length === 0 && (
              <div className="p-12 text-center flex flex-col items-center">
                 <Package size={48} className="text-slate-700 mb-4" />
                 <p className="text-sm font-black text-slate-500 uppercase tracking-widest">
                    Nenhuma categoria encontrada
                 </p>
              </div>
           )}
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            key="product-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80  z-[60] flex items-center justify-center p-4 overflow-y-auto py-12">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[#050505]/95  rounded-[2rem] w-full max-w-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-24 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                    {editingProduct ? "Editar" : "Novo"} Produto
                  </h2>
                  <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mt-1">Configuração Geral do Item</p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-500 rounded-full transition-all border border-white/10 hover:border-red-500/30"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Coluna Principal */}
                  <div className="md:col-span-8 space-y-4">
                     <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                         Nome do Produto
                       </label>
                       <input
                         type="text" required value={formData.nome || ""}
                         onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                         className="w-full px-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl outline-none focus:border-blue-500/50 text-white font-bold text-sm"
                       />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                           Categoria
                         </label>
                         <select required value={formData.categoria_id} onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })} className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl outline-none focus:border-blue-500/50 text-white font-bold text-sm">
                           <option value="">Selecionar...</option>
                           {categories.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                         </select>
                       </div>
                       <div>
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                           EAN-13
                         </label>
                         <input type="text" value={formData.barcode_ean || ""} onChange={(e) => setFormData({ ...formData, barcode_ean: e.target.value })} className="w-full px-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl outline-none focus:border-blue-500/50 text-white font-bold text-sm" />
                       </div>
                     </div>
                     <div className="grid grid-cols-3 gap-4">
                       <div>
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                           País de Origem
                         </label>
                         <input type="text" value={formData.pais_origem || ""} onChange={(e) => setFormData({ ...formData, pais_origem: e.target.value })} className="w-full px-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl outline-none focus:border-blue-500/50 text-white font-bold text-sm uppercase" />
                       </div>
                       <div>
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                           Lote
                         </label>
                         <input type="text" value={formData.lote || ""} onChange={(e) => setFormData({ ...formData, lote: e.target.value })} className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl outline-none focus:border-blue-500/50 text-white font-bold text-sm" placeholder="Ex: L01" />
                       </div>
                       <div>
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                           Rua
                         </label>
                         <input type="text" value={formData.rua || ""} onChange={(e) => setFormData({ ...formData, rua: e.target.value })} className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl outline-none focus:border-blue-500/50 text-white font-bold text-sm" placeholder="Ex: A" />
                       </div>
                       <div>
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                           Prateleira
                         </label>
                         <input type="text" value={formData.prateleira || ""} onChange={(e) => setFormData({ ...formData, prateleira: e.target.value })} className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl outline-none focus:border-blue-500/50 text-white font-bold text-sm" placeholder="Ex: 1" />
                       </div>
                       <div>
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                           IVA (%)
                         </label>
                         <select required value={formData.iva} onChange={(e) => setFormData({ ...formData, iva: e.target.value })} className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl outline-none focus:border-blue-500/50 text-white font-bold text-sm">
                           <option value="23">23% (Normal)</option>
                           <option value="13">13% (Intermédia)</option>
                           <option value="6">6% (Reduzida)</option>
                           <option value="0">0% (Isento)</option>
                         </select>
                       </div>
                     </div>
                  </div>

                  {/* Coluna Logística */}
                  <div className="md:col-span-4 space-y-4">
                     <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                         Un. Base (Stock / Compra / Venda)
                       </label>
                       <select required value={formData.unidade_base} onChange={(e) => {
                         const val = e.target.value;
                         setFormData({ 
                           ...formData, 
                           unidade_base: val
                         });
                       }} className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl outline-none focus:border-blue-500/50 text-white font-bold text-sm uppercase">
                         <option value="un">UN</option>
                         <option value="pack">PACK</option>
                         <option value="kg">KG</option>
                       </select>
                     </div>
                     <div className="pt-1">
                       <label className="flex items-center gap-3 cursor-pointer bg-white/[0.02] px-3 py-2.5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                         <input 
                           type="checkbox" 
                           checked={formData.is_peso_variavel} 
                           onChange={(e) => setFormData({ ...formData, is_peso_variavel: e.target.checked })} 
                           className="w-4 h-4 rounded border-white/10 bg-black/50 text-blue-500 focus:ring-blue-500/50" 
                         />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                           Peso Variável
                         </span>
                       </label>
                     </div>
                  </div>

                  {/* Linha Inferior com Descrição e Imagem */}
                  <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-5 mt-1 border-t border-white/5 pt-5">
                    <div className="md:col-span-8">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                         Descrição Detalhada
                       </label>
                       <textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl outline-none focus:border-blue-500/50 text-white font-bold text-sm min-h-[90px] resize-none" />
                    </div>
                    <div className="md:col-span-4 flex flex-col">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                         Imagem (Opcional)
                       </label>
                       <div className="relative group flex-1 min-h-[90px] border border-dashed border-white/20 rounded-xl flex items-center justify-center hover:border-blue-500/50 hover:bg-white/[0.02] transition-colors cursor-pointer overflow-hidden">
                         <input type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { const optimized = await optimizeImage(file); setSelectedFile(optimized); } else { setSelectedFile(null); } }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                         <div className="flex flex-col items-center gap-1.5 text-center px-4">
                           <Plus size={20} className="text-slate-500 group-hover:text-blue-500 transition-colors" />
                           <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-full">
                             {selectedFile ? selectedFile.name : (editingProduct?.imagem_url ? "Substituir" : "Carregar Imagem")}
                           </p>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Campos ocultos caso o backend os procure (ex: preços obsoletos daqui que foram passados pra tab preços) */}
                <input type="hidden" value={formData.preco_custo} />
                <input type="hidden" value={formData.preco} />

                <div className="pt-4 flex justify-end gap-3 mt-4">
                   <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 font-black uppercase tracking-widest rounded-xl transition-all border border-white/10 active:scale-95 text-xs">
                     Cancelar
                   </button>
                   <button type="submit" className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-blue-500/20 active:scale-95 text-xs">
                     {editingProduct ? "Guardar Alterações" : "Criar Produto"}
                   </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExistingModalOpen && (
          <motion.div 
            key="existing-product-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80  z-[60] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[#050505]/95  rounded-[2.5rem] w-full max-w-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-24 bg-yellow-500/5 blur-[80px] rounded-full pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                    Adicionar <span className="text-yellow-500">Existente</span>
                  </h2>
                  <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mt-1">Reutilizar Catálogo Geral</p>
                </div>
                <button
                  onClick={() => setExistingModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-500 rounded-full transition-all border border-white/10 hover:border-red-500/30"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3 relative z-10 custom-scrollbar">
                {otherProducts.length === 0 ? (
                  <div className="text-center py-12 bg-white/5 rounded-3xl border border-dashed border-white/10">
                    <Package className="mx-auto mb-4 text-slate-600" size={40} />
                    <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">Nenhum produto disponível para realocação.</p>
                  </div>
                ) : (
                  otherProducts.map((p) => (
                    <div 
                      key={p.id} 
                      className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] hover:border-yellow-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-black/40 rounded-xl overflow-hidden border border-white/10 group-hover:border-yellow-500/30 transition-colors">
                          {p.imagem_url ? (
                            <OptimizedImage src={p.imagem_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-700">
                              <Package size={24} />
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-black text-white text-sm uppercase tracking-tight">{p.nome}</h4>
                          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{p.categoria_nome || "Sem categoria"}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddExisting(p.id)}
                        className="px-5 py-2.5 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 border border-yellow-500/20 hover:border-yellow-500"
                      >
                        Associar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCategoryModalOpen && (
          <motion.div 
            key="category-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80  z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[#050505]/95  rounded-[2.5rem] w-full max-w-md p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-12 bg-blue-500/5 blur-[60px] rounded-full pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                    {editingCategory ? "Editar" : "Nova"} Categoria
                  </h2>
                  <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mt-1">Configuração de Catálogo</p>
                </div>
                <button
                  onClick={() => setCategoryModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-500 rounded-full transition-all border border-white/10 hover:border-red-500/30"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCategorySubmit} className="space-y-6 relative z-10">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">
                    Nome da Categoria
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryFormData.nome}
                    onChange={(e) =>
                      setCategoryFormData({ ...categoryFormData, nome: e.target.value })
                    }
                    className="w-full px-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-all text-white font-bold"
                    placeholder="Ex: Bebidas, Mercearia..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">
                    Visual da Categoria
                  </label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const optimized = await optimizeImage(file);
                          setSelectedCategoryFile(optimized);
                        } else {
                          setSelectedCategoryFile(null);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                    <div className="w-full h-36 border-2 border-dashed border-white/10 rounded-[1.5rem] flex flex-col items-center justify-center gap-3 group-hover:border-blue-500/40 group-hover:bg-white/[0.02] transition-all duration-300">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-slate-600 group-hover:text-blue-500 transition-colors">
                        <Plus size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] text-slate-400 font-black uppercase tracking-wider">
                          {selectedCategoryFile ? selectedCategoryFile.name : (editingCategory?.imagem_url ? "Mudar Imagem" : "Carregar Foto")}
                        </p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">PNG, JPG até 2MB</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => setCategoryModalOpen(false)} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 font-black uppercase tracking-widest rounded-xl transition-all border border-white/10 active:scale-95 text-xs">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl shadow-blue-500/20 active:scale-95 text-xs"
                  >
                    {editingCategory ? "Guardar" : "Criar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}
