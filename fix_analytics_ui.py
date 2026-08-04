import re

with open('src/pages/admin/AdminAnalytics.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the input fetching and saving
# Right now, it's:
# previsto: tetoConsumoLojas[d.name] || 2500
# We can change it to:
# previsto: tetoConsumoLojas[d.name] || d.mesAnterior || 0

# And for currentTeto:
# const currentTeto = tetoConsumoLojas[storeName] || 2500;
# We need to change it to use state data but since it's inside onClick, it gets state.

content = content.replace("tetoConsumoLojas[d.name] || 2500", "tetoConsumoLojas[d.name] || d.mesAnterior || 0")

content = content.replace(
    "const currentTeto = tetoConsumoLojas[storeName] || 2500;",
    "const storeData = sortedData.find(d => d.name === storeName);\n                     const currentTeto = tetoConsumoLojas[storeName] || (storeData ? storeData.mesAnterior : 0) || 0;"
)

with open('src/pages/admin/AdminAnalytics.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
