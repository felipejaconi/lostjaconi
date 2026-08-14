import re

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '''  const [formData, setFormData] = useState({
    numero_fatura: "",
    fornecedor_id: "",
    tipo: "despesa", 
    valor_total: "",
    data_emissao: new Date().toISOString().split("T")[0],
    data_vencimento: ""
  });''',
    '''  const [formData, setFormData] = useState({
    numero_fatura: "",
    fornecedor_id: "",
    tipo: "despesa", 
    valor_total: "",
    data_emissao: new Date().toISOString().split("T")[0],
    data_vencimento: "",
    parcelas: 1
  });'''
)

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.write(content)

