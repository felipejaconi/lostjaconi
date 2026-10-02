import re

with open('src/routes/orders.ts', 'r') as f:
    content = f.read()

# First replacement
old_code_1 = """        const startOfWeek = new Date(agora);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day == 0 ? -6 : 1);
        startOfWeek.setDate(diff);

        const startOfMonth = new Date(agora.getFullYear(), agora.getMonth(), 1);"""

new_code_1 = """        const startOfWeek = new Date(agora);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day == 0 ? -6 : 1);
        startOfWeek.setDate(diff);

        const startOfMonth = new Date(agora.getFullYear(), agora.getMonth(), 1);
        if (startOfWeek < startOfMonth) startOfWeek.setTime(startOfMonth.getTime());"""

if old_code_1 in content:
    content = content.replace(old_code_1, new_code_1)

# Second replacement
old_code_2 = """      const startOfWeek = new Date(agora);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
      startOfWeek.setDate(diff);

      const startOfMonth = new Date(agora.getFullYear(), agora.getMonth(), 1);"""

new_code_2 = """      const startOfWeek = new Date(agora);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
      startOfWeek.setDate(diff);

      const startOfMonth = new Date(agora.getFullYear(), agora.getMonth(), 1);
      if (startOfWeek < startOfMonth) startOfWeek.setTime(startOfMonth.getTime());"""

if old_code_2 in content:
    content = content.replace(old_code_2, new_code_2)

with open('src/routes/orders.ts', 'w') as f:
    f.write(content)

print("Done")
