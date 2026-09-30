with open("src/pages/AdminDashboard.tsx", "r") as f:
    content = f.read()

target_menu = """        { to: "/admin/armazem/produtos", label: "Produtos", icon: <Package size={18} /> },"""
replacement_menu = """        { to: "/admin/armazem/produtos", label: "Produtos", icon: <Package size={18} /> },
        { to: "/admin/mapa", label: "Mapa", icon: <Map size={18} /> },"""

content = content.replace(target_menu, replacement_menu)

target_import = """import {  Menu,"""
replacement_import = """import {  Menu, Map,"""
content = content.replace(target_import, replacement_import)

# if Map is already imported, we'll see, let's just add it if not
if "Map," not in content and " Map " not in content:
    content = content.replace("import {", "import { Map,", 1)

target_route = """<Route path="/produtos" element={<AdminProducts />} />"""
replacement_route = """<Route path="/produtos" element={<AdminProducts />} />
                <Route path="/mapa" element={<AdminWarehouseMap />} />"""
content = content.replace(target_route, replacement_route)

target_lazy = """const AdminProducts = React.lazy(() => import("./admin/AdminProducts"));"""
replacement_lazy = """const AdminProducts = React.lazy(() => import("./admin/AdminProducts"));
const AdminWarehouseMap = React.lazy(() => import("./admin/AdminWarehouseMap"));"""
content = content.replace(target_lazy, replacement_lazy)

with open("src/pages/AdminDashboard.tsx", "w") as f:
    f.write(content)
