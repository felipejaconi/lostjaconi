import re

with open('src/pages/admin/AdminGlobalStock.tsx', 'r') as f:
    content = f.read()

# Add useAuth import
if 'useAuth' not in content:
    content = content.replace('import { ProductDescriptionModal }', 'import { useAuth } from "../../context/AuthContext";\nimport { ProductDescriptionModal }')

# Add const { user } = useAuth();
if 'const { user } = useAuth();' not in content:
    content = content.replace('export default function AdminGlobalStock() {\n', 'export default function AdminGlobalStock() {\n  const { user } = useAuth();\n')

# Update handleQuickEditStock
old_edit_fn = """  const handleQuickEditStock = async (produto: any) => {
    const { value: newStock } = await Swal.fire({"""

new_edit_fn = """  const handleQuickEditStock = async (produto: any) => {
    if (user?.role !== "admin") return;
    const { value: newStock } = await Swal.fire({"""
content = content.replace(old_edit_fn, new_edit_fn)

# Update styling for non-admin users
old_edit_style = """                                   <div 
                                      className="flex items-center justify-end gap-1.5 cursor-pointer hover:bg-white/5 rounded pl-4 pr-1 py-1 transition-colors group/qty"
                                      onClick={() => handleQuickEditStock(p)}
                                      title="Clique para ajustar"
                                   >"""
new_edit_style = """                                   <div 
                                      className={cn("flex items-center justify-end gap-1.5 rounded pl-4 pr-1 py-1 transition-colors group/qty", user?.role === 'admin' ? "cursor-pointer hover:bg-white/5" : "")}
                                      onClick={() => handleQuickEditStock(p)}
                                      title={user?.role === 'admin' ? "Clique para ajustar" : ""}
                                   >"""
content = content.replace(old_edit_style, new_edit_style)

with open('src/pages/admin/AdminGlobalStock.tsx', 'w') as f:
    f.write(content)
