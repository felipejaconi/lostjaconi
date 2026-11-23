export function roundStock(val: any): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 1000) / 1000;
}

export function stripMovementMetaTags(motivo: string | null | undefined): string {
  if (!motivo) return "";
  return String(motivo)
    .replace(/\s*\[ref:[^\]]+\]/gi, "")
    .replace(/\s*\[bal:[^\]]+\]/gi, "")
    .trim();
}

export function parseStockBalanceTag(
  motivo: string | null | undefined
): { stock_antes: number; stock_depois: number } | null {
  if (!motivo) return null;
  const match = String(motivo).match(/\[bal:(-?\d+(?:\.\d+)?)->(-?\d+(?:\.\d+)?)\]/i);
  if (!match) return null;
  const antes = Number(match[1]);
  const depois = Number(match[2]);
  if (!Number.isFinite(antes) || !Number.isFinite(depois)) return null;
  return {
    stock_antes: roundStock(antes),
    stock_depois: roundStock(depois),
  };
}

export function withStockBalanceTag(
  motivo: string | null | undefined,
  stockAntes: any,
  stockDepois: any
): string {
  const base = String(motivo || "")
    .replace(/\s*\[bal:[^\]]+\]/gi, "")
    .trim();
  const antes = roundStock(stockAntes);
  const depois = roundStock(stockDepois);
  return base ? `${base} [bal:${antes}->${depois}]` : `[bal:${antes}->${depois}]`;
}

/**
 * Enriquece cada registo de movimentacoes_stock com `stock_antes` (Tinha) e `stock_depois` (Ficou).
 * - Se o movimento já tiver a etiqueta exata `[bal:antes->depois]`, usa esse valor gravado no instante da operação.
 * - Para movimentos históricos anteriores, reconstrói o saldo cronológico exato a partir do `stock_armazem` atual
 *   (ou do snapshot `[bal:...]` mais próximo), percorrendo todos os movimentos do produto desde a data mais antiga da pesquisa.
 */
export async function enrichMovementsWithStockBalance(
  supabase: any,
  rows: any[]
): Promise<any[]> {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  let minCreatedAt: string | null = null;
  const neededProdIdsSet = new Set<string>();
  const currentStockMap = new Map<string, number>();

  for (const row of rows) {
    const pid = row?.produto_id != null ? String(row.produto_id) : "";
    if (pid && row?.produto && row.produto.stock_armazem !== undefined && row.produto.stock_armazem !== null) {
      currentStockMap.set(pid, roundStock(row.produto.stock_armazem));
    }
    const parsed = parseStockBalanceTag(row?.motivo);
    if (!parsed && pid) {
      neededProdIdsSet.add(pid);
      const createdAt = row?.created_at ? String(row.created_at) : "";
      if (createdAt && (!minCreatedAt || createdAt < minCreatedAt)) {
        minCreatedAt = createdAt;
      }
    }
  }

  // Se todos os movimentos já possuem [bal:antes->depois], não é necessária consulta extra
  if (neededProdIdsSet.size === 0) {
    return rows.map((row) => {
      const parsed = parseStockBalanceTag(row?.motivo);
      if (parsed) {
        return {
          ...row,
          stock_antes: parsed.stock_antes,
          stock_depois: parsed.stock_depois,
        };
      }
      return row;
    });
  }

  const neededProdIds = Array.from(neededProdIdsSet);

  // Garantir que temos stock_armazem atual para todos os produtos necessários
  const missingStockIds = neededProdIds.filter((pid) => !currentStockMap.has(pid));
  if (missingStockIds.length > 0) {
    const chunkSize = 150;
    for (let i = 0; i < missingStockIds.length; i += chunkSize) {
      const chunk = missingStockIds.slice(i, i + chunkSize);
      const { data: prodsData } = await supabase
        .from("produtos")
        .select("id, stock_armazem")
        .in("id", chunk);
      for (const p of prodsData || []) {
        currentStockMap.set(String(p.id), roundStock(p.stock_armazem));
      }
    }
  }

  // Buscar toda a linha temporal de movimentos destes produtos desde minCreatedAt até agora
  // (independentemente de filtro de loja ou data final) para reconstruir o saldo exato em cada instante
  const timelineByProd = new Map<string, any[]>();
  const idChunkSize = 150;

  for (let i = 0; i < neededProdIds.length; i += idChunkSize) {
    const prodChunk = neededProdIds.slice(i, i + idChunkSize);
    const pageSize = 1000;
    let offset = 0;
    const maxPages = 10;

    for (let page = 0; page < maxPages; page++) {
      let tq = supabase
        .from("movimentacoes_stock")
        .select("id, produto_id, tipo, quantidade, motivo, created_at")
        .in("produto_id", prodChunk)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (minCreatedAt) {
        tq = tq.gte("created_at", minCreatedAt);
      }

      const { data: timeRows, error: timeErr } = await tq;
      if (timeErr || !timeRows || timeRows.length === 0) break;

      for (const tm of timeRows) {
        if (tm.produto_id == null) continue;
        const pid = String(tm.produto_id);
        let arr = timelineByProd.get(pid);
        if (!arr) {
          arr = [];
          timelineByProd.set(pid, arr);
        }
        arr.push(tm);
      }

      if (timeRows.length < pageSize) break;
      offset += pageSize;
    }
  }

  const computedBalanceById = new Map<string, { stock_antes: number; stock_depois: number }>();

  for (const [pid, prodMovements] of timelineByProd.entries()) {
    let runningAfter = currentStockMap.get(pid) ?? 0;

    // prodMovements já está ordenado do mais recente para o mais antigo
    for (const tm of prodMovements) {
      const tag = parseStockBalanceTag(tm.motivo);
      const qty = roundStock(Math.abs(Number(tm.quantidade || 0)));

      let stockAntes: number;
      let stockDepois: number;

      if (tag) {
        stockAntes = tag.stock_antes;
        stockDepois = tag.stock_depois;
        runningAfter = stockAntes;
      } else {
        stockDepois = roundStock(runningAfter);
        stockAntes =
          tm.tipo === "entrada"
            ? roundStock(stockDepois - qty)
            : roundStock(stockDepois + qty);
        runningAfter = stockAntes;
      }

      computedBalanceById.set(String(tm.id), {
        stock_antes: stockAntes,
        stock_depois: stockDepois,
      });
    }
  }

  return rows.map((row) => {
    const directTag = parseStockBalanceTag(row?.motivo);
    if (directTag) {
      return {
        ...row,
        stock_antes: directTag.stock_antes,
        stock_depois: directTag.stock_depois,
      };
    }

    const computed = row?.id != null ? computedBalanceById.get(String(row.id)) : undefined;
    if (computed) {
      return {
        ...row,
        stock_antes: computed.stock_antes,
        stock_depois: computed.stock_depois,
      };
    }

    return row;
  });
}
