with open("src/pages/admin/AdminFinancial.tsx", "r") as f:
    lines = f.readlines()

del lines[49:60]

with open("src/pages/admin/AdminFinancial.tsx", "w") as f:
    f.writelines(lines)
