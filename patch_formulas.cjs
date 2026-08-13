const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminFechos.tsx', 'utf8');

const scriptBlock = `
     const dateStr = \`\${selectedDate.getFullYear()}-\${String(selectedDate.getMonth() + 1).padStart(2, '0')}-\${String(day).padStart(2, '0')}\`;
     const existing = getFecho(day, loja.id);
     
     const formulasKey = \`fechos_formulas_\${loja.id}_\${dateStr}\`;
     let savedFormulas: any = {};
     try {
         savedFormulas = JSON.parse(localStorage.getItem(formulasKey) || '{}');
     } catch(e) {}

     const getVal = (val: number, field: string) => {
         const formula = savedFormulas[field];
         if (formula) {
             try {
                 const sanitized = formula.replace(/,/g, '.').replace(/[^0-9.+\\-*/()]/g, '');
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
`;

code = code.replace(
/     const dateStr = [^;]+;\n     const existing = getFecho\(day, loja\.id\);\n     \n     \/\/ default values\n     let sysMb = existing\?\.sys_mb \|\| 0;\n     let sysDinheiro = existing\?\.sys_dinheiro \|\| 0;\n     let sysMesa = existing\?\.sys_mesa \|\| 0;\n     let sysUber = existing\?\.sys_uber \|\| 0;\n     let realMb = existing\?\.real_mb \|\| 0;\n     let realDinheiro = existing\?\.real_dinheiro \|\| 0;\n     let realMesa = existing\?\.real_mesa \|\| 0;\n     let realUber = existing\?\.real_uber \|\| 0;/,
scriptBlock
);

const preConfirmOld = `        preConfirm: () => {
           const val = (id: string) => {
              const str = (document.getElementById(id) as HTMLInputElement).value;
              if (!str) return 0;
              try {
                 const sanitized = str.replace(/,/g, '.').replace(/[^0-9.+\\-*/()]/g, '');
                 if (!sanitized) return 0;
                 return parseFloat(new Function('return ' + sanitized)()) || 0;
              } catch (e) {
                 return 0;
              }
           };
           return {
              data: dateStr,
              loja_id: loja.id,
              sys_mb: val('swal-sys-mb'),
              sys_dinheiro: val('swal-sys-dinheiro'),
              sys_mesa: val('swal-sys-mesa'),
              sys_uber: val('swal-sys-uber'),
              real_mb: val('swal-real-mb'),
              real_dinheiro: val('swal-real-dinheiro'),
              real_mesa: val('swal-real-mesa'),
              real_uber: val('swal-real-uber'),
              despesas: 0
           };
        }`;

const preConfirmNew = `        preConfirm: () => {
           const formulasToSave: any = {};
           const val = (id: string, field: string) => {
              const str = (document.getElementById(id) as HTMLInputElement).value;
              if (!str) return 0;
              formulasToSave[field] = str;
              try {
                 const sanitized = str.replace(/,/g, '.').replace(/[^0-9.+\\-*/()]/g, '');
                 if (!sanitized) return 0;
                 return parseFloat(new Function('return ' + sanitized)()) || 0;
              } catch (e) {
                 return 0;
              }
           };
           const payload = {
              data: dateStr,
              loja_id: loja.id,
              sys_mb: val('swal-sys-mb', 'sys_mb'),
              sys_dinheiro: val('swal-sys-dinheiro', 'sys_dinheiro'),
              sys_mesa: val('swal-sys-mesa', 'sys_mesa'),
              sys_uber: val('swal-sys-uber', 'sys_uber'),
              real_mb: val('swal-real-mb', 'real_mb'),
              real_dinheiro: val('swal-real-dinheiro', 'real_dinheiro'),
              real_mesa: val('swal-real-mesa', 'real_mesa'),
              real_uber: val('swal-real-uber', 'real_uber'),
              despesas: 0
           };
           try {
              localStorage.setItem(formulasKey, JSON.stringify(formulasToSave));
           } catch(e) {}
           return payload;
        }`;

code = code.replace(/        preConfirm: \(\) => \{\n           const val = \(id: string\) => \{\n              const str = \(document\.getElementById\(id\) as HTMLInputElement\)\.value;\n              if \(\!str\) return 0;\n              try \{\n                 const sanitized = str\.replace\(\/,\/g, '\.'\)\.replace\(\/\[\^0-9\.\+\\\-\*\/()\]\/g, ''\);\n                 if \(\!sanitized\) return 0;\n                 return parseFloat\(new Function\('return ' \+ sanitized\)\(\)\) \|\| 0;\n              \} catch \(e\) \{\n                 return 0;\n              \}\n           \};\n           return \{\n              data: dateStr,\n              loja_id: loja\.id,\n              sys_mb: val\('swal-sys-mb'\),\n              sys_dinheiro: val\('swal-sys-dinheiro'\),\n              sys_mesa: val\('swal-sys-mesa'\),\n              sys_uber: val\('swal-sys-uber'\),\n              real_mb: val\('swal-real-mb'\),\n              real_dinheiro: val\('swal-real-dinheiro'\),\n              real_mesa: val\('swal-real-mesa'\),\n              real_uber: val\('swal-real-uber'\),\n              despesas: 0\n           \};\n        \}/, preConfirmNew);

fs.writeFileSync('src/pages/admin/AdminFechos.tsx', code);
