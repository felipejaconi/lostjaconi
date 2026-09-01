import re

with open('src/pages/admin/AdminAnalytics.tsx', 'r') as f:
    content = f.read()

# 1. Add ChevronLeft and ChevronRight imports
if 'ChevronLeft' not in content:
    content = content.replace('ArrowDownRight', 'ArrowDownRight,\n  ChevronLeft,\n  ChevronRight')

# 2. Add state
state_block = """  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const changeMonth = (offset: number) => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + offset);
      return d;
    });
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const displayMonth = `${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
"""
content = re.sub(r'const \[loading, setLoading\] = useState\(true\);', state_block, content)

# 3. Update fetchAnalytics
old_fetch = """  const fetchAnalytics = () => {
    api
      .get("/admin/analytics/consumo")"""
new_fetch = """  const fetchAnalytics = () => {
    const month = selectedDate.getMonth();
    const year = selectedDate.getFullYear();
    api
      .get(`/admin/analytics/consumo?month=${month}&year=${year}`)"""
content = content.replace(old_fetch, new_fetch)

# 4. Update useEffect dependency
old_effect_end = """      supabase.removeChannel(channel);
    };
  }, []);"""
new_effect_end = """      supabase.removeChannel(channel);
    };
  }, [selectedDate]);"""
content = content.replace(old_effect_end, new_effect_end)

# 5. Update HTML block
old_html = """        <div className="mb-4 flex items-center justify-between px-2">
          <h3 className="text-lg font-bold text-white uppercase tracking-wide">Relatório Analítico Consolidado</h3>
        </div>"""
new_html = """        <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between px-2 gap-4">
          <h3 className="text-lg font-bold text-white uppercase tracking-wide">Relatório Analítico Consolidado</h3>
          
          <div className="flex items-center bg-zinc-950/80 backdrop-blur-md border border-white/10 rounded-xl p-1 shadow-lg shadow-black/50">
            <button 
              onClick={() => changeMonth(-1)}
              className="p-1.5 hover:bg-white/10 active:bg-white/5 rounded-lg text-zinc-400 hover:text-emerald-400 transition-all active:scale-95 focus:outline-none"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2 px-3 py-1 font-bold text-zinc-100 min-w-[130px] justify-center relative cursor-pointer">
              <Calendar size={14} className="text-emerald-500" />
              <span className="text-sm">{displayMonth}</span>
              <input 
                type="month" 
                value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`}
                onChange={(e) => {
                   if (e.target.value) {
                       const [year, month] = e.target.value.split('-');
                       setSelectedDate(new Date(Number(year), Number(month) - 1, 1));
                   }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Selecionar Mês"
              />
            </div>
            <button 
              onClick={() => changeMonth(1)}
              className="p-1.5 hover:bg-white/10 active:bg-white/5 rounded-lg text-zinc-400 hover:text-emerald-400 transition-all active:scale-95 focus:outline-none"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>"""
content = content.replace(old_html, new_html)

with open('src/pages/admin/AdminAnalytics.tsx', 'w') as f:
    f.write(content)

print("Patched AdminAnalytics month selector")
