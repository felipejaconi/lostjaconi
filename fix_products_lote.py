import re

with open('src/routes/products.ts', 'r') as f:
    content = f.read()

# Replace .insert([productData]); with .insert([productData]).select().single();
content = content.replace('.insert([productData]);', '.insert([productData]).select().single();')

# Replace the error handling and retry with .select().single()
content = content.replace('.insert([productData]);', '.insert([productData]).select().single();')

with open('src/routes/products.ts', 'w') as f:
    f.write(content)
