import sys
import re

with open('src/pages/admin/AdminSuppliers.tsx', 'r') as f:
    code = f.read()

# Replace from `                     )}\n        )}\n          ) : (` to `{f.contato && (`
pattern = re.compile(r'                     \)\}\n        \)\}\n          \) : \(\n.*?\{f\.contato && \(', re.DOTALL)
code = pattern.sub(r'                     )}\n                     {f.contato && (', code)

with open('src/pages/admin/AdminSuppliers.tsx', 'w') as f:
    f.write(code)

print("Success regex")
