import sys

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    code = f.read()

code = code.replace(
    '].join("\n");',
    '].join("\\n");'
)

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(code)

print("Success")
