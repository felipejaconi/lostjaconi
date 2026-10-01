import sys

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    code = f.read()

code = code.replace(
    '  const [period, setPeriod] = useState("todos");',
    '  const [period, setPeriod] = useState("todos");\n  const [startDate, setStartDate] = useState("");\n  const [endDate, setEndDate] = useState("");'
)

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(code)

print("Success")
