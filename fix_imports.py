import re

with open("src/pages/AdminDashboard.tsx", "r") as f:
    content = f.read()

# I already removed Map from ErrorBoundary
# Let's add Map to lucide-react
target_lucide = """import {
  Menu,
  X,
  Search,
  Bell,
  Home,
  LogOut,
  Package,
  Truck,
  TrendingUp,
  Settings,
  Shield,
  Layers,
  Store,
  Wallet,
  Users,
  FileCode2,
  ListOrdered
} from "lucide-react";"""

if "Map" not in content and "from \"lucide-react\"" in content:
    content = re.sub(r'import \{(.*?)\} from "lucide-react";', r'import {\1, Map} from "lucide-react";', content, flags=re.DOTALL)

with open("src/pages/AdminDashboard.tsx", "w") as f:
    f.write(content)
