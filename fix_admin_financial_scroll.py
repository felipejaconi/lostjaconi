import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

old_block = 'gap-4 overflow-y-auto max-h-[80vh] custom-scrollbar">'
new_block = 'gap-4">'

if old_block in code:
    code = code.replace(old_block, new_block)
    with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
        f.write(code)
    print("Success")
else:
    print("Not found")

