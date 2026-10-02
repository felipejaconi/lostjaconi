import sys
import re

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    content = f.read()

replacement1 = '''} catch(e) {}
                                       if (f.tipo?.startsWith('despesa')) {
                                          return <p className="text-[10px] font-bold text-blue-500 mt-1 uppercase tracking-wider">Armazém Central</p>;
                                       }
                                       return null;'''

content = re.sub(r'\}\s*catch\(e\)\s*\{\}\s*return null;', replacement1, content, count=1)

replacement2 = '''} catch(e) {}
                    if (selectedFatura.tipo?.startsWith('despesa')) {
                       return <p className="text-[11px] font-bold text-blue-500 mt-1 uppercase tracking-wider">Destino: Armazém Central</p>;
                    }
                    return null;'''

content = re.sub(r'\}\s*catch\(e\)\s*\{\}\s*return null;', replacement2, content, count=1)

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.write(content)

print("Added back successfully 4")
