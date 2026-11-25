export interface PrintFinancialReportOptions {
  title: string;
  docNumber?: string;
  CompanyName?: string;
  CompanyAddress?: string;
  origemArmazem?: string;
  recipientName?: string;
  recipientEmail?: string;
  headers: string[];
  data: (string | number)[][];
  numericColumns?: number[];
  handwriteColumns?: number[];
  columnWidths?: string[];
  orientation?: "portrait" | "landscape";
  totalValue?: number;
  footerNotes?: string;
  date?: string;
}

export function printFinancialReport({
  title,
  docNumber,
  CompanyName = "Lost Wind Unipessoal, Lda.",
  CompanyAddress = "Sistema de Gestão",
  origemArmazem = "Armazém Central",
  recipientName,
  recipientEmail,
  headers,
  data,
  numericColumns,
  handwriteColumns,
  columnWidths,
  orientation = "portrait",
  totalValue,
  footerNotes = "Processado internamente. Documento de controlo interno.",
  date
}: PrintFinancialReportOptions) {
  const newWin = window.open("", "_blank");
  if (!newWin) {
    console.error("Não foi possível abrir a janela de impressão.");
    return;
  }

  const isLandscape = orientation === "landscape";
  const documentDate = date ? new Date(date) : new Date();
  const dataStr = documentDate.toLocaleDateString("pt-PT");
  const horaStr = documentDate.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  const hasHandwrite = Array.isArray(handwriteColumns) && handwriteColumns.length > 0;
  const hasFixedCols = Array.isArray(columnWidths) && columnWidths.length === headers.length;

  const escapeHtml = (val: unknown) =>
    String(val ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const colgroupHtml = hasFixedCols
    ? `<colgroup>${columnWidths.map((w) => `<col style="width: ${w};" />`).join("")}</colgroup>`
    : "";

  const itemsHtml = data
    .map((row) => {
      if (row.length === 1 && typeof row[0] === "string" && row[0].startsWith("__SECTION__")) {
        const sectionName = escapeHtml(row[0].replace("__SECTION__", ""));
        return `
          <tr class="category-header">
            <td colspan="${headers.length}">${sectionName}</td>
          </tr>
        `;
      }

      const isSummaryRow = row.some(
        (c) => typeof c === "string" && (c.startsWith("TOTAL") || c === "TOTAIS")
      );

      return `
        <tr class="${isSummaryRow ? "summary-row" : ""}">
          ${row
            .map((cell, i) => {
              const isHandwriteCol = !isSummaryRow && Boolean(handwriteColumns?.includes(i));
              const isRight = Array.isArray(numericColumns)
                ? numericColumns.includes(i)
                : i > 0 &&
                  typeof cell === "string" &&
                  cell.trim() !== "" &&
                  (cell.includes("€") || (!isNaN(Number(cell)) && cell.includes(".")));

              if (isHandwriteCol) {
                return `<td class="handwrite-cell"><div class="handwrite-box"></div></td>`;
              }

              const headerUpper = headers[i]?.toUpperCase() || "";
              const isIbanCol = headerUpper === "IBAN";
              const isDateCol = headerUpper.includes("DATA") || headerUpper.includes("VENCIMENTO");
              const classes = [
                isRight ? "right" : "",
                isIbanCol ? "iban-cell" : "",
                isDateCol && !isSummaryRow ? "date-cell" : ""
              ]
                .filter(Boolean)
                .join(" ");

              return `<td class="${classes}">${escapeHtml(cell)}</td>`;
            })
            .join("")}
        </tr>
      `;
    })
    .join("");

  const headerHtml = `
      <tr>
        ${headers
          .map((h, i) => {
            const isHandwriteCol = Boolean(handwriteColumns?.includes(i));
            const isRight = Array.isArray(numericColumns)
              ? numericColumns.includes(i)
              : i > 0 && (h.includes("€") || h.includes("QTD") || h.includes("TOTAL") || h.includes("PREÇO"));
            const alignClass = isHandwriteCol ? "center" : isRight ? "right" : "left";
            return `<th class="${alignClass}">${escapeHtml(h)}</th>`;
          })
          .join("")}
      </tr>
  `;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-PT">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(title)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 0;
          font-size: ${isLandscape ? "9px" : "10px"};
          background-color: #f8fafc;
        }
        @media print {
            body { background-color: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { margin: ${isLandscape ? "5mm 6mm" : "6mm"}; size: A4 ${isLandscape ? "landscape" : "portrait"}; }
            .no-print { display: none !important; }
            .page { border: none !important; box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; padding: ${isLandscape ? "0" : "6px 8px"} !important; }
        }
        * { box-sizing: border-box; }
        
        .page { 
          width: 100%; max-width: ${isLandscape ? "297mm" : "210mm"}; margin: ${isLandscape ? "8px auto" : "10px auto"}; 
          padding: ${isLandscape ? "10px 12px" : "15px 16px"}; background: #fff; 
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .header-compact { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: ${isLandscape ? "8px" : "16px"}; border-bottom: 1px solid #e2e8f0; padding-bottom: ${isLandscape ? "6px" : "12px"}; }
        
        .company-details { display: flex; gap: ${isLandscape ? "8px" : "10px"}; align-items: flex-start; }
        .logo-img { width: ${isLandscape ? "28px" : "35px"}; height: ${isLandscape ? "28px" : "35px"}; object-fit: contain; }
        
        .brand-text-container { display: flex; flex-direction: column; gap: ${isLandscape ? "3px" : "6px"}; }
        .brand-text { display: flex; flex-direction: column; line-height: 1; font-family: 'Arial Black', Impact, sans-serif; }
        .brand-grupo { color: #475569; font-size: ${isLandscape ? "8px" : "9px"}; letter-spacing: -0.02em; }
        .brand-name-logo { font-size: ${isLandscape ? "12px" : "14px"}; letter-spacing: -0.05em; color: #f59e0b; }

        .company-info { font-size: ${isLandscape ? "8px" : "9px"}; color: #64748b; line-height: 1.25; }
        .company-name-text { font-size: ${isLandscape ? "10px" : "11px"}; font-weight: 700; color: #0f172a; margin-bottom: 1px; }

        .recipient-box { flex: 1; margin: 0 20px; font-size: 9px; color: #475569; border-left: 1px solid #e2e8f0; padding-left: 20px; }
        .recipient-title { font-size: 9px; font-weight: 600; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px; }
        .recipient-name { font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }

        .doc-meta { text-align: right; min-width: 140px; }
        .doc-type { font-size: ${isLandscape ? "10.5px" : "11px"}; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: -0.02em; margin-bottom: 2px; }
        .doc-number { font-size: ${isLandscape ? "9px" : "10px"}; font-weight: 600; color: #3b82f6; margin-bottom: ${isLandscape ? "3px" : "8px"}; }
        
        .doc-info-grid { display: grid; grid-template-columns: auto auto; text-align: right; gap: 2px 8px; font-size: ${isLandscape ? "8.5px" : "9px"}; color: #64748b; justify-content: end; }
        .doc-info-val { font-weight: 600; color: #1e293b; }

        .items-table { width: 100%; border-collapse: collapse; margin-bottom: ${isLandscape ? "6px" : "15px"}; border: 1px solid #94a3b8; ${hasFixedCols ? "table-layout: fixed;" : ""} }
        .items-table thead { background-color: #f1f5f9; display: table-header-group; }
        .items-table tr { page-break-inside: avoid; break-inside: avoid; }
        .items-table th { padding: ${isLandscape ? "3.5px 4px" : "4px 5px"}; font-size: 7.5px; font-weight: 700; color: #334155; text-align: left; text-transform: uppercase; border-bottom: 1px solid #94a3b8; border-right: 1px solid #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .items-table th:last-child { border-right: none; }
        .items-table th.center { text-align: center; }
        .items-table th.right { text-align: right; }
        .items-table td { padding: ${isLandscape ? "2.5px 4px" : hasHandwrite ? "4px 5px" : "2px 6px"}; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; font-size: ${isLandscape ? "8px" : "8.5px"}; line-height: 1.2; color: #1e293b; vertical-align: middle; ${hasFixedCols ? "word-break: break-word; overflow-wrap: anywhere;" : ""} }
        .items-table td:last-child { border-right: none; }
        .items-table td.center { text-align: center; }
        .items-table td.date-cell { white-space: nowrap; word-break: normal; overflow-wrap: normal; }
        .items-table td.right { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; word-break: normal; overflow-wrap: normal; }
        .items-table td.iban-cell { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: ${isLandscape ? "7.5px" : "8px"}; letter-spacing: -0.01em; white-space: nowrap; word-break: normal; overflow-wrap: normal; }
        .items-table td.handwrite-cell { ${hasFixedCols ? "width: auto; min-width: 0;" : "min-width: 68px; width: 74px;"} padding: ${isLandscape ? "2px 3px" : "3px 4px"}; }
        .handwrite-box { width: 100%; height: ${isLandscape ? "15px" : "19px"}; border: 1px solid #94a3b8; border-radius: 2px; background: #ffffff; }
        .summary-row { page-break-inside: avoid; break-inside: avoid; }
        .summary-row td { background-color: #f8fafc; font-weight: 700; border-top: 1.5px solid #94a3b8; padding-top: ${isLandscape ? "4px" : "5px"}; padding-bottom: ${isLandscape ? "4px" : "5px"}; }
        
        .category-header td { background-color: #e2e8f0; font-weight: 700; font-size: 8px; color: #0f172a; padding: 3px 6px; border-bottom: 1px solid #cbd5e1; text-transform: uppercase; }
        
        .total-row { border-top: 2px solid #e2e8f0; margin-top: ${isLandscape ? "6px" : "10px"}; text-align: right; padding-top: ${isLandscape ? "6px" : "10px"}; font-size: ${isLandscape ? "12px" : "14px"}; font-weight: 700; color: #0f172a; }

        .footer { margin-top: auto; page-break-inside: avoid; break-inside: avoid; }
        
        .system-meta { text-align: center; font-size: ${isLandscape ? "7.5px" : "8px"}; color: #94a3b8; margin-top: ${isLandscape ? "6px" : "30px"}; border-top: 1px solid #f1f5f9; padding-top: ${isLandscape ? "4px" : "10px"}; }
        
        .btn { padding: 8px 16px; font-weight: 600; background: #3b82f6; color: #fff; cursor: pointer; border: none; border-radius: 4px; margin-bottom: 10px; float: right; font-family: 'Inter', sans-serif; font-size: 12px; }
        .btn:hover { background: #2563eb; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="no-print" style="overflow: hidden;">
          <button class="btn" onclick="window.print()">Imprimir Documento</button>
        </div>
        
        <div class="header-compact">
          <div class="company-details">
            <img src="${import.meta.env?.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png" alt="Lost Wind Icon" class="logo-img" crossorigin="anonymous" />
            <div class="brand-text-container">
              <div class="brand-text">
                <span class="brand-grupo">GRUPO</span>
                <span class="brand-name-logo">LOST WIND</span>
              </div>
              <div class="company-info">
                <div class="company-name-text">${escapeHtml(CompanyName)}</div>
                <div>${escapeHtml(origemArmazem)}</div>
                <div>${escapeHtml(CompanyAddress)}</div>
              </div>
            </div>
          </div>

          ${
            recipientName
              ? `
          <div class="recipient-box">
            <div class="recipient-title">Destinatário / Descarga</div>
            <div class="recipient-name">${escapeHtml(recipientName)}</div>
            ${recipientEmail ? `<div>${escapeHtml(recipientEmail).replace(/\n/g, "<br/>")}</div>` : ""}
          </div>
          `
              : '<div class="recipient-box" style="border: none;"></div>'
          }

          <div class="doc-meta">
            <div class="doc-type">${escapeHtml(title)}</div>
            ${docNumber ? `<div class="doc-number">${escapeHtml(docNumber)}</div>` : ""}
            <div class="doc-info-grid">
              <span>Data:</span><span class="doc-info-val">${dataStr} ${horaStr}</span>
            </div>
          </div>
        </div>

        <table class="items-table">
          ${colgroupHtml}
          <thead>
            ${headerHtml}
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        ${totalValue !== undefined ? `<div class="total-row">TOTAL: €${totalValue.toFixed(2)}</div>` : ""}

        <div class="footer">
          <div class="system-meta">
             ${escapeHtml(footerNotes)}
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
