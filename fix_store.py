import sys

with open('src/pages/store/StoreManagement.tsx', 'r') as f:
    code = f.read()

old_block = """  const currentMonthTotal = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;"""
new_block = """  const currentMonthTotal = chartData.length > 0 ? (chartData[chartData.length - 1] as any).value : 0;"""

if old_block in code:
    code = code.replace(old_block, new_block)
    with open('src/pages/store/StoreManagement.tsx', 'w') as f:
        f.write(code)
    print("Success")
else:
    print("Not found")

