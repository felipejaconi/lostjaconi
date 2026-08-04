import sys

with open('src/pages/admin/AdminSuppliers.tsx', 'r') as f:
    code = f.read()

# I need to extract the chart code and move it below the `)}`
# The chart starts at `        {/* Gráfico de Principais Fornecedores */}`
# and ends at `        </div>\n        )}\n      </div>`

chart_start = "        {/* Gráfico de Principais Fornecedores */}"
chart_end = "        </div>"

# Find the chart block
start_idx = code.find(chart_start)
end_idx = code.find("        )}", start_idx) - 1 # up to the newline before )}

chart_code = code[start_idx:end_idx]

# remove it from current position
code = code[:start_idx] + code[end_idx:]

# now `code` has `        )}\n      </div>\n\n      {isModalOpen && (`
# we will insert `chart_code` AFTER `        )}`

target = "        )}\n"
new_code = target + chart_code + "\n"

code = code.replace(target, new_code, 1) # replace only the first occurrence or specific

with open('src/pages/admin/AdminSuppliers.tsx', 'w') as f:
    f.write(code)
print("Success")

