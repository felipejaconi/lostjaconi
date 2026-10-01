import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    lines = f.readlines()

out = []
for line in lines:
    out.append(line)
    if "Faturas Despesas" in line:
        # this is the content of the button, the next line is </button>
        pass
    if "</button>" in line and len(out) >= 2 and "Faturas Despesas" in out[-2]:
        out.append('              <button\n')
        out.append('                  onClick={() => setActiveTab("relatorios")}\n')
        out.append('                 className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${\n')
        out.append("                    activeTab === 'relatorios' ? 'bg-blue-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'\n")
        out.append('                 }`}\n')
        out.append('              >\n')
        out.append('                 Relatórios\n')
        out.append('              </button>\n')

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.writelines(out)

print("Success")
