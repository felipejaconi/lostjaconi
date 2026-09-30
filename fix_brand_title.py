import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

# Add import if missing
if 'BrandTitle' not in code:
    code = code.replace('import { Modal } from "../../components/ui/Modal";', 'import { Modal } from "../../components/ui/Modal";\nimport { BrandTitle } from "../../components/BrandTitle";')

old_header = """        <div>
           <h1 className="text-3xl lg:text-4xl font-semibold text-zinc-100 tracking-tight flex items-center gap-3">
             <Wallet className="w-8 h-8 text-blue-500" />
             Financeiro
           </h1>
        </div>"""

new_header = """        <div className="flex items-center gap-4">
           <BrandTitle title="Financeiro" titleClassName="max-md:mt-0 md:-mt-4 max-md:pl-0 max-md:pt-0 max-md:ml-0" hideUnderline />
        </div>"""

code = code.replace(old_header, new_header)

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.write(code)

print("Success")
