import re

with open('src/pages/admin/AdminGiro.tsx', 'r') as f:
    content = f.read()

# Replace default state
old_state = '  const [selectedPeriod, setSelectedPeriod] = useState<string>("ano");'
new_state = """  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });"""

content = content.replace(old_state, new_state)

with open('src/pages/admin/AdminGiro.tsx', 'w') as f:
    f.write(content)

print("Done")
