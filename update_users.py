import re

with open('src/routes/users.ts', 'r') as f:
    content = f.read()

# Add manager_pin to the destructured body of POST /api/admin/users
content = content.replace(
    '        manager_name,\n        address,',
    '        manager_name,\n        manager_pin,\n        address,'
)

# Add manager_pin to insertData
content = content.replace(
    '          manager_name,\n          address,',
    '          manager_name,\n          manager_pin: manager_pin || "0000",\n          address,'
)

# Add manager_pin to the destructured body of PUT /api/admin/users/:id
content = content.replace(
    '        manager_name,\n        password,',
    '        manager_name,\n        manager_pin,\n        password,'
)

# Add manager_pin to updateData
content = content.replace(
    '          manager_name,\n          address,',
    '          manager_name,\n          manager_pin,\n          address,'
)

with open('src/routes/users.ts', 'w') as f:
    f.write(content)
