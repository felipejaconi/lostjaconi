import re

with open('src/pages/admin/AdminSuppliers.tsx', 'r') as f:
    content = f.read()

def repl(m):
    return 'if (reportsTab === "fornecedores" && selectedReportSupplierId) fetchSupplierProductsList(selectedReportSupplierId, ' + m.group(1) + '); if (reportsTab === "produtos" && selectedReportProductId) fetchProductReport(selectedReportProductId, ' + m.group(1) + ');'

content = re.sub(r'if \(reportsTab === \'fornecedores\' && selectedReportSupplierId\) fetchSupplierProductsList\(selectedReportSupplierId, (.*?)\);', repl, content)

with open('src/pages/admin/AdminSuppliers.tsx', 'w') as f:
    f.write(content)
