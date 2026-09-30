import sys
import re

with open('src/pages/admin/AdminSuppliers.tsx', 'r') as f:
    code = f.read()

# Fix 1: The mess inside f.contribuinte
# It looks like:
#                     )}
#        )}
#          ) : (
#            <div className="h-[350px] w-full">
# ...
#            </div>
#                                           {f.contato && (

idx1 = code.find("                     )}\n        )}\n          ) : (\n            <div className=\"h-[350px] w-full\">")
idx2 = code.find("{f.contato && (", idx1)

if idx1 != -1 and idx2 != -1:
    code = code[:idx1] + "                     )}\n                     {f.contato && (" + code[idx2 + len("{f.contato && ("):]
    print("Fixed mess 1")

# Fix 2: The unmatched `)}`
# At 335: `)}`
# 336|        </div>
# 337|  
# 338|        {isModalOpen && (

idx3 = code.find("         )}\n       </div>\n\n       {isModalOpen && (")
if idx3 == -1:
    idx3 = code.find("         )}\n       </div>\n      {isModalOpen && (")
if idx3 == -1:
    idx3 = code.find("         )}\n        </div>\n      {isModalOpen && (")
if idx3 == -1:
    idx3 = code.find("        )}\n      </div>\n      {isModalOpen && (")

print("idx3", idx3)

with open('src/pages/admin/AdminSuppliers.tsx', 'w') as f:
    f.write(code)

