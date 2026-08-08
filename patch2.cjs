const fs = require('fs');
const file = 'src/lib/printGuiaTransporte.ts';
let code = fs.readFileSync(file, 'utf8');

const newGroupLogic = `
  // Group items by category (secao)
  const groupedItems = {};
  const missingItems = [];

  order.items.forEach(item => {
    const qty = item.qty_real != null ? Number(item.qty_real) : Number(item.quantidade);
    if (qty <= 0) {
      missingItems.push(item);
    } else {
      const section = item.secao || "Sem Categoria";
      if (!groupedItems[section]) groupedItems[section] = [];
      groupedItems[section].push(item);
    }
  });

  // Generate table rows HTML
  let itemsHtml = Object.entries(groupedItems).map(([section, items]) => {
    let html = \`
      <tr class="category-header">
        <td colspan="3">\${section.toUpperCase()}</td>
      </tr>
    \`;
    const sectionRows = items.map(item => \`
        <tr>
          <td class="item-name-cell">\${item.nome_do_produto}</td>
          <td class="right delivered-cell">\${item.qty_real != null ? Number(item.qty_real) : Number(item.quantidade)}</td>
          <td class="center unit-col">\${item.unidade || 'un'}</td>
        </tr>
    \`).join("");
    return html + sectionRows;
  }).join("");

  if (missingItems.length > 0) {
    itemsHtml += \`
      <tr class="category-header">
        <td colspan="3" style="color: #ef4444;">FALTAS - REPITA NO PRÓXIMO PEDIDO</td>
      </tr>
    \`;
    itemsHtml += missingItems.map(item => \`
        <tr>
          <td class="item-name-cell" style="color: #64748b; text-decoration: line-through;">\${item.nome_do_produto}</td>
          <td class="right delivered-cell" style="color: #ef4444;">0</td>
          <td class="center unit-col" style="color: #94a3b8;">\${item.unidade || 'un'}</td>
        </tr>
    \`).join("");
  }
`;

code = code.replace(/  \/\/ Group items by category.*?}\)\.join\(""\);/s, newGroupLogic.trim());

fs.writeFileSync(file, code);
