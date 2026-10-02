export interface PrintGenericOptions {
  title: string;
  docNumber?: string;
  CompanyName?: string;
  CompanyAddress?: string;
  origemArmazem?: string;
  recipientName?: string;
  recipientEmail?: string;
  headers: string[];
  data: (string | number)[][];
  totalValue?: number;
  footerNotes?: string;
  date?: string;
}

export function printGenericDocument({
  title,
  docNumber,
  CompanyName = "Lost Wind Unipessoal, Lda.",
  CompanyAddress = "Rua Azinhaga Porto de Areia, 19.",
  origemArmazem = "Armazém Central",
  recipientName,
  recipientEmail,
  headers,
  data,
  totalValue,
  footerNotes = "Processado internamente. Documento de controlo interno.",
  date
}: PrintGenericOptions) {
  const newWin = window.open("", "_blank");
  if (!newWin) {
    console.error("Não foi possível abrir a janela de impressão.");
    return;
  }

  const documentDate = date ? new Date(date) : new Date();
  const dataStr = documentDate.toLocaleDateString("pt-PT");
  const horaStr = documentDate.toLocaleTimeString("pt-PT", { hour: '2-digit', minute: '2-digit' });

  // Generate table rows HTML
  const itemsHtml = data.map(row => {
    if (row.length === 1 && typeof row[0] === 'string' && row[0].startsWith('__SECTION__')) {
      const sectionName = row[0].replace('__SECTION__', '');
      return `
        <tr class="category-header">
          <td colspan="${headers.length}">${sectionName}</td>
        </tr>
      `;
    }
    
    return `
      <tr>
        ${row.map((cell, i) => {
          const isRight = i > 0 && typeof cell === 'string' && (cell.includes('€') || cell.includes('.') || !isNaN(Number(cell)));
          return `<td class="${isRight ? 'right' : ''}">${cell}</td>`;
        }).join("")}
      </tr>
    `;
  }).join("");

  const headerHtml = `
      <tr>
        ${headers.map((h, i) => {
          const isRight = i > 0 && (h.includes('€') || h.includes('QTD') || h.includes('TOTAL') || h.includes('PREÇO'));
          return `<th class="${isRight ? 'right' : 'left'}">${h}</th>`;
        }).join("")}
      </tr>
  `;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-PT">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
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
        .header-compact { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; }
        
        .company-details { display: flex; gap: 10px; align-items: flex-start; }
        .logo-img { width: 35px; height: 35px; object-fit: contain; }
        
        .brand-text-container { display: flex; flex-direction: column; gap: 6px; }
        .brand-text { display: flex; flex-direction: column; line-height: 1; font-family: 'Arial Black', Impact, sans-serif; }
        .brand-grupo { color: #475569; font-size: 9px; letter-spacing: -0.02em; }
        .brand-name-logo { font-size: 14px; letter-spacing: -0.05em; color: #f59e0b; }

        .company-info { font-size: 9px; color: #64748b; line-height: 1.3; }
        .company-name-text { font-size: 11px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }

        .recipient-box { flex: 1; margin: 0 20px; font-size: 9px; color: #475569; border-left: 1px solid #e2e8f0; padding-left: 20px; }
        .recipient-title { font-size: 9px; font-weight: 600; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px; }
        .recipient-name { font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }

        .doc-meta { text-align: right; min-width: 140px; }
        .doc-type { font-size: 11px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: -0.02em; margin-bottom: 2px; }
        .doc-number { font-size: 10px; font-weight: 600; color: #3b82f6; margin-bottom: 8px; }
        
        .doc-info-grid { display: grid; grid-template-columns: auto auto; text-align: right; gap: 2px 8px; font-size: 9px; color: #64748b; justify-content: end; }
        .doc-info-val { font-weight: 600; color: #1e293b; }

        /* Items Table */
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #e2e8f0; }
        .items-table thead { background-color: #f1f5f9; }
        .items-table th { padding: 3px 6px; font-size: 8px; font-weight: 700; color: #334155; text-align: left; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
        .items-table th.center { text-align: center; }
        .items-table th.right { text-align: right; }
        .items-table td { padding: 2px 6px; border-bottom: 1px dashed #e2e8f0; font-size: 9px; color: #1e293b; vertical-align: middle; }
        .items-table td.center { text-align: center; }
        .items-table td.right { text-align: right; }
        
        .category-header td { background-color: #e2e8f0; font-weight: 700; font-size: 8px; color: #0f172a; padding: 3px 6px; border-bottom: 1px solid #cbd5e1; text-transform: uppercase; }
        
        .total-row { border-top: 2px solid #e2e8f0; margin-top: 10px; text-align: right; padding-top: 10px; font-size: 14px; font-weight: 700; color: #0f172a; }

        /* Footer Grid */
        .footer { margin-top: auto; page-break-inside: avoid; }
        
        .system-meta { text-align: center; font-size: 8px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 10px; }
        
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

          <!-- Destinatário (if any) -->
          ${recipientName ? `
          <div class="recipient-box">
            <div class="recipient-title">Destinatário / Descarga</div>
            <div class="recipient-name">${recipientName}</div>
            ${recipientEmail ? `<div>${recipientEmail.replace(/\n/g, '<br/>')}</div>` : ''}
          </div>
          ` : '<div class="recipient-box" style="border: none;"></div>'}

          <!-- Info Doc -->
          <div class="doc-meta">
            <div class="doc-type">${title}</div>
            ${docNumber ? `<div class="doc-number">${docNumber}</div>` : ''}
            <div class="doc-info-grid">
              <span>Data:</span><span class="doc-info-val">${dataStr} ${horaStr}</span>
            </div>
          </div>
        </div>

        <!-- TABELA -->
        <table class="items-table">
          <thead>
            ${headerHtml}
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        ${totalValue !== undefined ? `<div class="total-row">TOTAL: €${totalValue.toFixed(2)}</div>` : ''}

        <!-- RODAPÉ -->
        <div class="footer">
          <div class="system-meta">
             ${footerNotes}
          </div>
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
