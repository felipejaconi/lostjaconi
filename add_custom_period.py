import sys

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    code = f.read()

# Add states for start and end dates
state_old = '''    const [period, setPeriod] = useState("todos");'''
state_new = '''    const [period, setPeriod] = useState("todos");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");'''
code = code.replace(state_old, state_new)

# Update filterByPeriod
filter_old = '''      const filterByPeriod = (dateString: string, periodF: string) => {
          if (periodF === "todos" || !dateString) return true;
          const dt = new Date(dateString);
          const now = new Date();
          if (periodF === "semana") {
              const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
              startOfWeek.setHours(0,0,0,0);
              return dt >= startOfWeek;
          }
          if (periodF === "mes") {
              return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
          }
          if (periodF === "ano") {
              return dt.getFullYear() === now.getFullYear();
          }
          return true;
      };'''

filter_new = '''      const filterByPeriod = (dateString: string, periodF: string) => {
          if (periodF === "todos" || !dateString) return true;
          const dt = new Date(dateString);
          const now = new Date();
          
          if (periodF === "personalizado") {
              if (startDate) {
                  const sdt = new Date(startDate);
                  sdt.setHours(0,0,0,0);
                  if (dt < sdt) return false;
              }
              if (endDate) {
                  const edt = new Date(endDate);
                  edt.setHours(23,59,59,999);
                  if (dt > edt) return false;
              }
              return true;
          }
          
          if (periodF === "semana") {
              const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
              startOfWeek.setHours(0,0,0,0);
              return dt >= startOfWeek;
          }
          if (periodF === "mes") {
              return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
          }
          if (periodF === "ano") {
              return dt.getFullYear() === now.getFullYear();
          }
          return true;
      };'''
code = code.replace(filter_old, filter_new)

# Add personalized option
select_old = '''                            <option value="ano">Este Ano</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-3.5 text-zinc-500 pointer-events-none"/>
                    </div>
                </div>'''

select_new = '''                            <option value="ano">Este Ano</option>
                            <option value="personalizado">Personalizado</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-3.5 text-zinc-500 pointer-events-none"/>
                    </div>
                    {period === "personalizado" && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-medium outline-none focus:border-blue-500"
                            />
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-medium outline-none focus:border-blue-500"
                            />
                        </div>
                    )}
                </div>'''
code = code.replace(select_old, select_new)

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(code)

print("Success")
