import sys
import re

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    content = f.read()

target = '''      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">'''

replacement = '''      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0a0a0a] pt-2 md:pt-4 pb-4 -mt-2 md:-mt-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">'''

if target in content:
    content = content.replace(target, replacement)
    with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
        f.write(content)
    print("Added sticky to AdminFinancial")
else:
    print("Target not found in AdminFinancial")

with open('src/pages/admin/AdminStockEntries.tsx', 'r') as f:
    content = f.read()

target2 = '''      <div className="mb-10 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-full">'''

replacement2 = '''      <div className="sticky top-0 z-40 bg-[#0a0a0a] pt-2 md:pt-4 pb-4 -mt-2 md:-mt-4 mb-10 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-full">'''

if target2 in content:
    content = content.replace(target2, replacement2)
    with open('src/pages/admin/AdminStockEntries.tsx', 'w') as f:
        f.write(content)
    print("Added sticky to AdminStockEntries")
else:
    print("Target not found in AdminStockEntries")
