import re

with open('src/pages/admin/AdminFechos.tsx', 'r') as f:
    content = f.read()

old_html = """            <div className="flex items-center gap-2 px-3 py-1 font-medium text-emerald-400 min-w-[140px] justify-center">
              <Calendar size={16} />
              {displayMonth}
            </div>"""

new_html = """            <div className="flex items-center gap-2 px-3 py-1 font-medium text-emerald-400 min-w-[140px] justify-center relative cursor-pointer group">
              <Calendar size={16} />
              <span>{displayMonth}</span>
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
            </div>"""

content = content.replace(old_html, new_html)

with open('src/pages/admin/AdminFechos.tsx', 'w') as f:
    f.write(content)

