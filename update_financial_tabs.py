import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

# Update useState
code = code.replace(
    'const [activeTab, setActiveTab] = useState<"dashboard" | "faturas" | "fornecedores" | "despesas">("dashboard");',
    'const [activeTab, setActiveTab] = useState<"dashboard" | "faturas" | "fornecedores" | "despesas" | "relatorios">("dashboard");'
)

# Add Import
if 'import AdminReports' not in code:
    code = code.replace(
        'import { BrandTitle } from "../../components/BrandTitle";',
        'import { BrandTitle } from "../../components/BrandTitle";\nimport AdminReports from "./AdminReports";'
    )

# Add Tab Button
btn_code = """              <button
                  onClick={() => setActiveTab("despesas")}
                 className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
                    activeTab === 'despesas' ? 'bg-blue-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                 }`}
              >
                 Faturas Despesas
              </button>
              <button
                  onClick={() => setActiveTab("relatorios")}
                 className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
                    activeTab === 'relatorios' ? 'bg-blue-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                 }`}
              >
                 Relatórios
              </button>"""
code = code.replace("""              <button
                  onClick={() => setActiveTab("despesas")}
                 className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
                    activeTab === 'despesas' ? 'bg-blue-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                 }`}
              >
                 Faturas Despesas
              </button>""", btn_code)

# Add Tab Content
content_code = """      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
         {activeTab === "relatorios" && (
            <AdminReports />
         )}"""
code = code.replace("""      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">""", content_code)

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.write(code)

print("Success")
