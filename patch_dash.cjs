const fs = require('fs');
const file = 'src/pages/AdminDashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '                    <Route path="/utilizadores" element={<AdminUsers />} />\n                    <Route path="/financeiro" element={<AdminFinancial />} />\n                    <Route path="/fornecedores" element={<AdminSuppliers />} />',
  '                    <Route path="/utilizadores" element={<AdminUsers />} />\n                    <Route path="/fornecedores" element={<AdminSuppliers />} />'
);

code = code.replace(
  '                <Route path="/produtos" element={<AdminProducts />} />',
  '                <Route path="/financeiro" element={<AdminFinancial />} />\n                <Route path="/produtos" element={<AdminProducts />} />'
);

fs.writeFileSync(file, code);
