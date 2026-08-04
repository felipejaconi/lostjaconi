import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import Swal from "sweetalert2";
import { BrandName } from "../components/Logo";
import { Lock, Mail, Loader2, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post<{ token: string; user: any }>("/login", {
        email,
        password,
      });
      login(response.data.token, response.data.user);

      Swal.fire({
        width: "auto",
        padding: "1.5rem",
        timer: 1500,
        showConfirmButton: false,
        background: "#0a0a0a",
        backdrop: "rgba(0,0,0,0.8)",
        html: `
          <div class="flex flex-col items-center justify-center gap-2">
            <div class="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-2 ring-1 ring-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h2 class="text-lg font-medium text-white m-0">Bem-vindo!</h2>
            <p class="text-xs text-slate-400 m-0">A redirecionar...</p>
          </div>
        `,
        customClass: {
          popup: "border border-black rounded-[2rem] shadow-2xl",
        }
      }).then(() => {
        if (response.data.user.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/store");
        }
      });
    } catch (error: any) {
      Swal.fire({
        width: "auto",
        padding: "1.5rem",
        timer: 3000,
        showConfirmButton: false,
        background: "#0a0a0a",
        backdrop: "rgba(0,0,0,0.8)",
        html: `
          <div class="flex flex-col items-center justify-center gap-2">
            <div class="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2 ring-1 ring-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
            </div>
            <h2 class="text-lg font-medium text-white m-0">Erro no Login</h2>
            <p class="text-xs text-slate-400 m-0">${error.response?.data?.message || "Ocorreu um erro inesperado."}</p>
          </div>
        `,
        customClass: {
          popup: "border border-red-500/20 rounded-[2rem] shadow-2xl",
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-[100dvh] w-full flex items-center justify-center p-6 font-sans overflow-hidden bg-transparent">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-20 w-full max-w-md"
      >
        <div className="text-center mb-8 sm:mb-12">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-4"
          >
            <BrandName className="text-4xl sm:text-5xl block" />
          </motion.div>
        </div>

        <div 
          className="bg-black/60 md:bg-white/[0.03]  md: p-6 sm:p-10 rounded-[30px] sm:rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-black relative overflow-hidden group"
        >
          {/* Subtle inner glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

          <form
            onSubmit={handleSubmit}
            className="space-y-6 sm:space-y-8 relative z-10"
          >
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                  Acesso Restrito
                </label>
                <div className="relative group/input">
                  <Mail
                    className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-primary transition-colors"
                    size={16}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 sm:pl-14 pr-6 py-3 sm:py-4 bg-black/40 border border-black rounded-xl sm:rounded-2xl focus:border-primary/50 transition-all outline-none text-white placeholder:text-slate-700 text-sm font-medium"
                    placeholder="Utilizador ou Email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                  Segurança
                </label>
                <div className="relative group/input">
                  <Lock
                    className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-primary transition-colors"
                    size={16}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 sm:pl-14 pr-6 py-3 sm:py-4 bg-black/40 border border-black rounded-xl sm:rounded-2xl focus:border-primary/50 transition-all outline-none text-white placeholder:text-slate-700 text-sm font-medium"
                    placeholder="Palavra-passe"
                    required
                  />
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-4 sm:py-5 bg-primary text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest hover:bg-red-600 transition-all shadow-[0_10px_30px_rgba(227,30,36,0.3)] flex items-center justify-center gap-3 disabled:opacity-70 group/btn"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Autenticar
                  <ArrowRight
                    size={18}
                    className="group-hover/btn:translate-x-1 transition-transform"
                  />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-black text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                Servidor Seguro Ativo
              </p>
            </div>
            <p className="text-[8px] sm:text-[9px] text-yellow-500 font-medium leading-relaxed">
              <span translate="no" className="notranslate">LOST WIND</span> LDA © 2026 <br />
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
