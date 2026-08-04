import re

with open('src/pages/admin/AdminAnalytics.tsx', 'r') as f:
    content = f.read()

# 1. Remove tetoConsumoLojas state
state_block = """  const [tetoConsumoLojas, setTetoConsumoLojas] = useState<Record<string, number>>(() => {
    const val = localStorage.getItem("admin_teto_consumo_lojas");
    if (val) {
        try {
            return JSON.parse(val);
        } catch (e) {
            return {};
        }
    }
    return {};
  });"""

content = content.replace(state_block, "")

# 2. Fix the chart text and onClick
old_chart = """              <p className="text-sm text-slate-500 mt-1">Análise de custos operacionais por filial no período atual. (Clique no gráfico para definir o teto de risco)</p>
            </div>
          </div>
          <div className="h-[300px] w-full cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart onClick={async (state: any) => {
                 if (state && state.activeLabel) {
                     const storeName = state.activeLabel;
                     const storeData = sortedData.find(d => d.name === storeName);
                     const currentTeto = tetoConsumoLojas[storeName] || (storeData ? storeData.mesAnterior : 0) || 0;
                     const { value: novoTeto } = await Swal.fire({
                        title: `Teto: ${storeName}`,
                        input: "number",
                        inputLabel: "Valor de Risco / Orçamento Base (€)",
                        inputValue: currentTeto,
                        showCancelButton: true,
                        confirmButtonColor: "#eab308"
                     });
                     if (novoTeto) {
                        const newTetoObj = { ...tetoConsumoLojas, [storeName]: Number(novoTeto) };
                        setTetoConsumoLojas(newTetoObj);
                        localStorage.setItem("admin_teto_consumo_lojas", JSON.stringify(newTetoObj));
                     }
                 }
              }} data={sortedData.map(d => ({ ...d, mensal: parseFloat(d.mensal || 0), previsto: tetoConsumoLojas[d.name] || d.mesAnterior || 0 }))} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>"""

new_chart = """              <p className="text-sm text-slate-500 mt-1">Análise de custos operacionais por filial no período atual. O teto de risco reflete o consumo total do mês anterior.</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedData.map(d => ({ ...d, mensal: parseFloat(d.mensal || 0), previsto: d.mesAnterior || 0 }))} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>"""

content = content.replace(old_chart, new_chart)

with open('src/pages/admin/AdminAnalytics.tsx', 'w') as f:
    f.write(content)

print("Done")
