import re

with open('src/pages/admin/AdminFechos.tsx', 'r') as f:
    content = f.read()

old_getval = """     const getVal = (val: number, field: string) => {
         const formula = savedFormulas[field];
         if (formula) {
             try {
                 const expr = formula.split('=')[0];
                 const sanitized = expr.replace(/,/g, '.').replace(/[^0-9.+\-*/()]/g, '');
                 const evaluated = parseFloat(new Function('return ' + sanitized)()) || 0;
                 if (Math.abs(evaluated - val) < 0.01) {
                     return formula;
                 }
             } catch (e) {}
         }
         return val;
     };

     // default values
     let sysMb = getVal(existing?.sys_mb || 0, 'sys_mb');
     let sysDinheiro = getVal(existing?.sys_dinheiro || 0, 'sys_dinheiro');
     let sysMesa = getVal(existing?.sys_mesa || 0, 'sys_mesa');
     let sysUber = getVal(existing?.sys_uber || 0, 'sys_uber');
     let realMb = getVal(existing?.real_mb || 0, 'real_mb');
     let realDinheiro = getVal(existing?.real_dinheiro || 0, 'real_dinheiro');
     let realMesa = getVal(existing?.real_mesa || 0, 'real_mesa');
     let realUber = getVal(existing?.real_uber || 0, 'real_uber');

     let despesas = existing?.despesas || 0;"""

new_getval = """     const getVal = (val: number | string, field: string) => {
         const formula = savedFormulas[field];
         if (formula) {
             try {
                 const expr = formula.split('=')[0];
                 const sanitized = expr.replace(/,/g, '.').replace(/[^0-9.+\-*/()]/g, '');
                 const evaluated = parseFloat(new Function('return ' + sanitized)()) || 0;
                 const numericVal = typeof val === 'number' ? val : 0;
                 if (Math.abs(evaluated - numericVal) < 0.01) {
                     return formula;
                 }
             } catch (e) {}
         }
         return val;
     };

     // default values - use ?? "" to make it empty by default instead of 0
     let sysMb = getVal(existing?.sys_mb ?? "", 'sys_mb');
     let sysDinheiro = getVal(existing?.sys_dinheiro ?? "", 'sys_dinheiro');
     let sysMesa = getVal(existing?.sys_mesa ?? "", 'sys_mesa');
     let sysUber = getVal(existing?.sys_uber ?? "", 'sys_uber');
     let realMb = getVal(existing?.real_mb ?? "", 'real_mb');
     let realDinheiro = getVal(existing?.real_dinheiro ?? "", 'real_dinheiro');
     let realMesa = getVal(existing?.real_mesa ?? "", 'real_mesa');
     let realUber = getVal(existing?.real_uber ?? "", 'real_uber');

     let despesas = existing?.despesas ?? "";"""

content = content.replace(old_getval, new_getval)

with open('src/pages/admin/AdminFechos.tsx', 'w') as f:
    f.write(content)

