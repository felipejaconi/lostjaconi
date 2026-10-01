import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    content = f.read()

target = '''               <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-zinc-900/30">'''

replacement = '''               <div className="sticky top-[110px] md:top-[85px] z-30 p-4 border-b border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#050505] shadow-lg shadow-black/50">'''

if target in content:
    content = content.replace(target, replacement)
    with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
        f.write(content)
    print("Replaced successfully in AdminFinancial")
else:
    print("Target not found in AdminFinancial")


with open('src/pages/admin/AdminGlobalStock.tsx', 'r') as f:
    content = f.read()

target2 = '''                {/* Floating Toolbar: Search, Filters & Categories */}
                <div className="sticky top-0 pt-2 z-20 flex flex-col mb-4 max-w-full pointer-events-none">'''

replacement2 = '''                {/* Floating Toolbar: Search, Filters & Categories */}
                <div className="sticky top-[110px] md:top-[85px] pt-2 z-20 flex flex-col mb-4 max-w-full pointer-events-none">'''

if target2 in content:
    content = content.replace(target2, replacement2)
    with open('src/pages/admin/AdminGlobalStock.tsx', 'w') as f:
        f.write(content)
    print("Replaced successfully in AdminGlobalStock")
else:
    print("Target not found in AdminGlobalStock")

