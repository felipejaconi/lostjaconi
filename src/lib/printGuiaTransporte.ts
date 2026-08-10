export interface GuiaItem {
  nome_do_produto: string;
  quantidade: number;
  qty_real?: number | null;
  unidade: string;
  secao: string;
}

export interface GuiaOrder {
  id: string | number;
  store_name: string;
  notas?: string | null;
  items: GuiaItem[];
}

export interface GuiaStore {
  nome: string;
  endereco?: string | null;
  telefone?: string | null;
  matricula?: string | null;
}

export interface PrintGuiaOptions {
  order: GuiaOrder;
  store?: Partial<GuiaStore>;
  createdByName?: string;
  CompanyName?: string;
  CompanyAddress?: string;
  origemArmazem?: string;
  logoBase64?: string;
  titulo?: string;
}

export function printGuiaTransporte({
  order,
  store = {},
  createdByName = "Armazém",
  CompanyName = "Lost Wind Unipessoal, Lda.",
  CompanyAddress = "Rua Azinhaga Porto de Areia, 19.",
  origemArmazem = "Armazém Central",
  logoBase64,
  titulo = "Guia de Transporte"
}: PrintGuiaOptions) {
  const newWin = window.open("", "_blank");
  if (!newWin) {
    console.error("Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está ativo.");
    return;
  }

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
    let html = `
      <tr class="category-header">
        <td colspan="3">${section.toUpperCase()}</td>
      </tr>
    `;
    const sectionRows = items.map(item => `
        <tr>
          <td class="item-name-cell">${item.nome_do_produto}</td>
          <td class="right delivered-cell">${item.qty_real != null ? Number(item.qty_real) : Number(item.quantidade)}</td>
          <td class="center unit-col">${item.unidade || 'un'}</td>
        </tr>
    `).join("");
    return html + sectionRows;
  }).join("");

  if (missingItems.length > 0) {
    itemsHtml += `
      <tr class="category-header">
        <td colspan="3" style="color: #ef4444;">FALTAS - REPITA NO PRÓXIMO PEDIDO</td>
      </tr>
    `;
    itemsHtml += missingItems.map(item => `
        <tr>
          <td class="item-name-cell" style="color: #64748b; text-decoration: line-through;">${item.nome_do_produto}</td>
          <td class="right delivered-cell" style="color: #ef4444;">0</td>
          <td class="center unit-col" style="color: #94a3b8;">${item.unidade || 'un'}</td>
        </tr>
    `).join("");
  }

  const today = new Date();
  const dataStr = today.toLocaleDateString("pt-PT");
  const horaStr = today.toLocaleTimeString("pt-PT", { hour: '2-digit', minute: '2-digit' });

  const html = `
    <!DOCTYPE html>
    <html lang="pt-PT">
    <head>
      <meta charset="UTF-8">
      <title>${titulo} - Pedido #${order.id}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 0;
          font-size: 10px;
          background-color: #f8fafc;
        }
        @media print {
            body { background-color: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { margin: 8mm; size: A4 portrait; }
            .no-print { display: none; }
            .page { border: none !important; box-shadow: none !important; margin: 0 !important; max-width: none !important; }
        }
        * { box-sizing: border-box; }
        
        .page { 
          width: 100%; max-width: 210mm; margin: 10px auto; 
          padding: 15px 20px; background: #fff; 
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        /* Header Compact Grid */
        .header-compact { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
        
        .company-details { display: flex; gap: 8px; align-items: flex-start; }
        .logo-img { width: 30px; height: 30px; object-fit: contain; }
        
        .brand-text-container { display: flex; flex-direction: column; gap: 4px; }
        .brand-text { display: flex; flex-direction: column; line-height: 1; font-family: 'Arial Black', Impact, sans-serif; }
        .brand-grupo { color: #475569; font-size: 8px; letter-spacing: -0.02em; }
        .brand-name-logo { font-size: 12px; letter-spacing: -0.05em; color: #f59e0b; }

        .company-info { font-size: 9px; color: #64748b; line-height: 1.2; }
        .company-name-text { font-size: 10px; font-weight: 700; color: #0f172a; margin-bottom: 1px; }

        .recipient-box { flex: 1; margin: 0 15px; font-size: 9px; color: #475569; border-left: 1px solid #e2e8f0; padding-left: 15px; }
        .recipient-title { font-size: 8px; font-weight: 600; text-transform: uppercase; color: #94a3b8; margin-bottom: 2px; }
        .recipient-name { font-size: 11px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }

        .doc-meta { text-align: right; min-width: 120px; }
        .doc-type { font-size: 9px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: -0.02em; margin-bottom: 2px; }
        .doc-number { font-size: 7px; font-weight: 600; color: #3b82f6; margin-bottom: 6px; }
        
        .doc-info-grid { display: grid; grid-template-columns: auto auto; text-align: right; gap: 1px 6px; font-size: 8px; color: #64748b; justify-content: end; }
        .doc-info-val { font-weight: 600; color: #1e293b; }

        /* Items Table */
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #e2e8f0; }
        .items-table thead { background-color: #f1f5f9; }
        .items-table th { padding: 2px 4px; font-size: 8px; font-weight: 700; color: #334155; text-align: left; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
        .items-table th.center { text-align: center; }
        .items-table th.right { text-align: right; }
        .items-table td { padding: 1px 4px; border-bottom: 1px dashed #e2e8f0; font-size: 9px; color: #1e293b; vertical-align: middle; }
        .items-table td.center { text-align: center; }
        .items-table td.right { text-align: right; }
        
        .unit-col { border-left: 1px solid #cbd5e1; }
        
        .category-header td { background-color: #e2e8f0; font-weight: 700; font-size: 8px; color: #0f172a; padding: 2px 4px; border-bottom: 1px solid #cbd5e1; text-transform: uppercase; }
        .item-name-cell { font-weight: 500; }
        .delivered-cell { font-weight: 700; font-size: 10px; }

        /* Footer Grid */
        .footer { margin-top: auto; page-break-inside: avoid; }
        .obs-box { margin-bottom: 15px; font-size: 9px; color: #475569; }
        
        .signatures-simple { display: flex; justify-content: space-between; margin-top: 20px; font-size: 10px; font-weight: 600; color: #334155; }
        .signatures-simple span { border-top: 1px solid #1e293b; padding-top: 4px; width: 40%; text-align: center; }

        .system-meta { text-align: center; font-size: 8px; color: #94a3b8; margin-top: 15px; border-top: 1px solid #f1f5f9; padding-top: 5px; }
        
        .btn { padding: 8px 16px; font-weight: 600; background: #3b82f6; color: #fff; cursor: pointer; border: none; border-radius: 4px; margin-bottom: 15px; float: right; font-family: 'Inter', sans-serif; font-size: 12px; }
        .btn:hover { background: #2563eb; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="no-print" style="overflow: hidden;">
          <button class="btn" onclick="window.print()">Imprimir Documento</button>
        </div>
        
        <!-- CABEÇALHO COMPACTO -->
        <div class="header-compact">
          <!-- Armazém / Empresa -->
          <div class="company-details">
            <img src="${import.meta.env?.VITE_SUPABASE_URL || 'https://ybaoaskddcmwoincsnwm.supabase.co'}/storage/v1/object/public/uploads/icon.png" alt="Lost Wind Icon" class="logo-img" crossorigin="anonymous" />
            <div class="brand-text-container">
              <div class="brand-text">
                <span class="brand-grupo">GRUPO</span>
                <span class="brand-name-logo">LOST WIND</span>
              </div>
              <div class="company-info">
                <div class="company-name-text">${CompanyName}</div>
                <div>${origemArmazem}</div>
                <div>${CompanyAddress}</div>
              </div>
            </div>
          </div>

          <!-- Destinatário -->
          <div class="recipient-box">
            <div class="recipient-title">Destinatário / Descarga</div>
            <div class="recipient-name">${order.store_name}</div>
            ${store.endereco ? '<div>' + store.endereco + '</div>' : ''}
            ${store.telefone ? '<div>Telf: ' + store.telefone + '</div>' : ''}
          </div>

          <!-- Info Doc & Viagem -->
          <div class="doc-meta">
            <div class="doc-type">${titulo}</div>
            <div class="doc-number">GT-${today.getFullYear()}-${String(order.id).substring(0, 8).toUpperCase()}</div>
            <div class="doc-info-grid">
              <span>Data:</span><span class="doc-info-val">${dataStr} ${horaStr}</span>
              <span>Matrícula:</span><span class="doc-info-val">${store.matricula ? store.matricula.toUpperCase() : "A Designar"}</span>
              ${createdByName ? '<span>Prep:</span><span class="doc-info-val">' + createdByName + '</span>' : ''}
            </div>
          </div>
        </div>

        <!-- TABELA DE ARTIGOS -->
        <table class="items-table">
          <thead>
            <tr>
              <th>Descrição do Artigo</th>
              <th class="right" style="width: 15%;">Entregue</th>
              <th class="center unit-col" style="width: 10%;">Un</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- RODAPÉ DE ASSINATURAS E OBSERVAÇÕES -->
        <div class="footer">
          <div class="obs-box">
            ${order.notas ? '<div><strong>Obs:</strong> ' + order.notas + '</div>' : ''}
          </div>
          <div class="signatures-simple">
            <span>O Armazém</span>
            <span>O Motorista</span>
          </div>
        </div>

        <!-- CÓDIGO DA AT -->
        <div class="system-meta">
           Processado internamente. Documento de controlo interno de transporte.
        </div>
        
      </div>

      <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        }
      </script>
    </body>
    </html>
  `;

  newWin.document.open();
  newWin.document.write(html);
  newWin.document.close();
}
