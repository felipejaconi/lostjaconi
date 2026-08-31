import re

with open('src/pages/admin/AdminHome.tsx', 'r') as f:
    content = f.read()

old = """  useEffect(() => {
    fetchStats();
    fetchChartData();"""

new = """  useEffect(() => {
    fetchStats();
    // fetchChartData is already called by the other useEffect"""

content = content.replace(old, new)

with open('src/pages/admin/AdminHome.tsx', 'w') as f:
    f.write(content)

print("Patched AdminHome")
