import re

with open('src/pages/admin/AdminUsers.tsx', 'r') as f:
    content = f.read()

# Add import
content = content.replace('import { Badge } from "../../components/ui/Badge";', 'import { Badge } from "../../components/ui/Badge";\nimport { useAuth } from "../../context/AuthContext";')

# Add currentUser
content = content.replace('export default function AdminUsers({ filterRole }: { filterRole?: string }) {', 'export default function AdminUsers({ filterRole }: { filterRole?: string }) {\n  const { user: currentUser } = useAuth();')

# Update fetchUsers
old_fetch = """  const fetchUsers = () => {
    api.get("/admin/users").then((res) => {
      let data = res.data as any[];
      if (filterRole) data = data.filter((u: any) => u.role === filterRole);
      setUsers(data);
    });
  };"""

new_fetch = """  const fetchUsers = () => {
    api.get("/admin/users").then((res) => {
      let data = res.data as any[];
      
      data = data.filter((u: any) => {
         const isTecnico = u.name?.toLowerCase().includes("tecnico") || u.email?.toLowerCase().includes("tecnico") || u.role?.toLowerCase() === "tecnico";
         if (isTecnico) {
             const currentUserIsTecnico = currentUser?.name?.toLowerCase().includes("tecnico") || currentUser?.email?.toLowerCase().includes("tecnico") || currentUser?.role?.toLowerCase() === "tecnico";
             return currentUserIsTecnico;
         }
         return true;
      });
      
      if (filterRole) data = data.filter((u: any) => u.role === filterRole);
      setUsers(data);
    });
  };"""

content = content.replace(old_fetch, new_fetch)

# Also need to make sure currentUser is added to useEffect dependencies if it's used inside, but since it's just from context and doesn't change frequently, maybe not strictly necessary for this to work, but we can add it or just ignore the warning or use it from ref. To be safe, let's just do it.

with open('src/pages/admin/AdminUsers.tsx', 'w') as f:
    f.write(content)

