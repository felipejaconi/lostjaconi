import re

# 1. Update AdminAnalytics.tsx
with open('src/pages/admin/AdminAnalytics.tsx', 'r') as f:
    analytics_content = f.read()

analytics_content = analytics_content.replace(
    '<Bar dataKey="mensal" name="Gasto Realizado" fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={40} />',
    '<Bar dataKey="mensal" name="Mês Atual" fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={40} />'
)

analytics_content = analytics_content.replace(
    '<Bar dataKey="previsto" name="Gasto Previsto" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} opacity={0.5} />',
    '<Bar dataKey="previsto" name="Mês Anterior" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} opacity={0.5} />'
)

# Also update the title of the chart in AdminAnalytics if needed, but I'll leave it as is or change it slightly if needed.
# "Evolução Mensal Gasto vs Orçamento Base" doesn't make sense if the legend is Mês Atual and Mês Anterior.
analytics_content = analytics_content.replace(
    'Evolução Mensal Gasto vs Orçamento Base',
    'Evolução Mensal: Mês Atual vs Mês Anterior'
)

with open('src/pages/admin/AdminAnalytics.tsx', 'w') as f:
    f.write(analytics_content)


# 2. Update AdminFechos.tsx
with open('src/pages/admin/AdminFechos.tsx', 'r') as f:
    fechos_content = f.read()

fechos_content = fechos_content.replace(
    '<Bar dataKey="atual" name="Mês Atual" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} onClick={(data: any) => data?.id && setSelectedLojaId(data.id)} cursor="pointer" />',
    '<Bar dataKey="atual" name="Mês Atual" fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={60} onClick={(data: any) => data?.id && setSelectedLojaId(data.id)} cursor="pointer" />'
)

fechos_content = fechos_content.replace(
    '<Bar dataKey="anterior" name="Mês Anterior" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={60} opacity={0.5} onClick={(data: any) => data?.id && setSelectedLojaId(data.id)} cursor="pointer" />',
    '<Bar dataKey="anterior" name="Mês Anterior" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} opacity={0.5} onClick={(data: any) => data?.id && setSelectedLojaId(data.id)} cursor="pointer" />'
)

with open('src/pages/admin/AdminFechos.tsx', 'w') as f:
    f.write(fechos_content)

print("Charts updated")
