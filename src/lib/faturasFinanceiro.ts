export const FATURAS_FINANCEIRO_TABLE = "faturas_financeiro";

let hasSyncedLegacyFinancialRows = false;
let hasPurgedSpecificInvoices = false;

export function isMissingFaturasFinanceiroTable(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || "");
  const message = String(error.message || "").toLowerCase();
  const details = String(error.details || "").toLowerCase();
  if (code === "42P01" || code === "PGRST205") return true;
  if (
    (message.includes("faturas_financeiro") || details.includes("faturas_financeiro")) &&
    (message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("could not find the table"))
  ) {
    return true;
  }
  return false;
}

export function parseLegacyFaturaDescricao(raw: any): {
  empresa: string;
  centro_custo: string;
  conta_analise: string;
  loja_id: string | null;
  forma_pagamento: string;
} {
  let parsed: any = null;
  if (raw && raw !== "null") {
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
    } catch {
      parsed = null;
    }
  }

  const empresa = parsed?.empresa ? String(parsed.empresa).trim() : "";
  const centro_custo = String(
    parsed?.centro_custo ||
      (parsed?.classificacao_tipo !== "conta_analise" ? parsed?.classificacao_nome : "") ||
      ""
  ).trim();
  const conta_analise = String(
    parsed?.conta_analise ||
      (parsed?.classificacao_tipo === "conta_analise" ? parsed?.classificacao_nome : "") ||
      ""
  ).trim();
  const rawLojaId = parsed?.loja_id ? String(parsed.loja_id).trim() : "";
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawLojaId);
  const loja_id = isUuid ? rawLojaId : null;
  const forma_pagamento = parsed?.forma_pagamento
    ? String(parsed.forma_pagamento).trim()
    : "transferencia";

  return { empresa, centro_custo, conta_analise, loja_id, forma_pagamento };
}

export function normalizeFaturaFinanceiroRow(row: any): any {
  const legacyMeta = parseLegacyFaturaDescricao(row?.descrição);

  const empresa =
    row?.empresa !== undefined && row?.empresa !== null && String(row.empresa).trim() !== ""
      ? String(row.empresa).trim()
      : legacyMeta.empresa;

  const centro_custo =
    row?.centro_custo !== undefined &&
    row?.centro_custo !== null &&
    String(row.centro_custo).trim() !== ""
      ? String(row.centro_custo).trim()
      : legacyMeta.centro_custo;

  const conta_analise =
    row?.conta_analise !== undefined &&
    row?.conta_analise !== null &&
    String(row.conta_analise).trim() !== ""
      ? String(row.conta_analise).trim()
      : legacyMeta.conta_analise;

  const loja_id =
    row?.loja_id !== undefined && row?.loja_id !== null && String(row.loja_id).trim() !== ""
      ? String(row.loja_id).trim()
      : legacyMeta.loja_id;

  const forma_pagamento =
    row?.forma_pagamento !== undefined &&
    row?.forma_pagamento !== null &&
    String(row.forma_pagamento).trim() !== ""
      ? String(row.forma_pagamento).trim()
      : legacyMeta.forma_pagamento || "transferencia";

  const pagamentos = Array.isArray(row?.pagamentos)
    ? row.pagamentos
    : Array.isArray(row?.movimentos_financeiros)
    ? row.movimentos_financeiros
    : [];

  const fornecedor = row?.fornecedor
    ? {
        ...row.fornecedor,
        nif: row.fornecedor.contribuinte || row.fornecedor.nif || "",
      }
    : null;

  const synthesizedDesc = JSON.stringify({
    empresa: empresa || undefined,
    centro_custo: centro_custo || undefined,
    conta_analise: conta_analise || undefined,
    loja_id: loja_id || undefined,
    forma_pagamento: forma_pagamento || undefined,
  });

  return {
    ...row,
    empresa,
    centro_custo,
    conta_analise,
    loja_id,
    forma_pagamento,
    fornecedor,
    valor_liquido: Number(row?.valor_liquido ?? 0),
    valor_iva: Number(row?.valor_iva ?? 0),
    valor_total: Number(row?.valor_total ?? 0),
    valor_pendente: Number(row?.valor_pendente ?? 0),
    status_pagamento: row?.status_pagamento || "pendente",
    pagamentos,
    movimentos_financeiros: pagamentos,
    tipo: "compra_financeiro",
    descrição: row?.descrição || synthesizedDesc,
  };
}

/**
 * Remove permanentemente faturas financeiras marcadas para eliminação definitiva
 * tanto da tabela legada public.faturas (tipo = 'compra_financeiro') como de public.faturas_financeiro,
 * impedindo que voltem a ser sincronizadas no arranque do servidor.
 */
export async function purgeSpecificDeletedFinancialInvoices(supabase: any): Promise<boolean> {
  if (hasPurgedSpecificInvoices) return false;
  let purgedAny = false;

  try {
    // 1. Limpar da tabela legada public.faturas (tipo = 'compra_financeiro')
    const { data: legacyMatches, error: legFetchErr } = await supabase
      .from("faturas")
      .select("id, numero_fatura, data_emissao, valor_total")
      .eq("tipo", "compra_financeiro")
      .eq("numero_fatura", "1111111")
      .eq("data_emissao", "2026-11-18");

    if (!legFetchErr && Array.isArray(legacyMatches) && legacyMatches.length > 0) {
      const legIds = legacyMatches
        .filter((r: any) => Math.abs(Number(r?.valor_total ?? 0) - 22) < 0.01)
        .map((r: any) => r.id)
        .filter(Boolean);

      if (legIds.length > 0) {
        await supabase.from("movimentos_financeiros").delete().in("fatura_id", legIds);
        const { error: delLegErr } = await supabase
          .from("faturas")
          .delete()
          .in("id", legIds)
          .eq("tipo", "compra_financeiro");
        if (!delLegErr) {
          purgedAny = true;
          console.log(`[Financeiro] Fatura 1111111 (€22,00) removida permanentemente de 'faturas'.`);
        }
      }
    }

    // 2. Limpar da tabela dedicada public.faturas_financeiro (se existir)
    const { data: finMatches, error: finFetchErr } = await supabase
      .from(FATURAS_FINANCEIRO_TABLE)
      .select("id, numero_fatura, data_emissao, valor_total")
      .eq("numero_fatura", "1111111")
      .eq("data_emissao", "2026-11-18");

    if (!finFetchErr && Array.isArray(finMatches) && finMatches.length > 0) {
      const finIds = finMatches
        .filter((r: any) => Math.abs(Number(r?.valor_total ?? 0) - 22) < 0.01)
        .map((r: any) => r.id)
        .filter(Boolean);

      if (finIds.length > 0) {
        await supabase.from("movimentos_financeiros").delete().in("fatura_id", finIds);
        const { error: delFinErr } = await supabase
          .from(FATURAS_FINANCEIRO_TABLE)
          .delete()
          .in("id", finIds);
        if (!delFinErr) {
          purgedAny = true;
          console.log(`[Financeiro] Fatura 1111111 (€22,00) removida permanentemente de '${FATURAS_FINANCEIRO_TABLE}'.`);
        }
      }
    }

    hasPurgedSpecificInvoices = true;
  } catch (err) {
    console.warn("[Financeiro] Aviso ao limpar faturas eliminadas:", err);
  }

  return purgedAny;
}

/**
 * Elimina definitivamente uma fatura do financeiro em public.faturas_financeiro
 * e também o respetivo registo legado 'compra_financeiro' em public.faturas (e movimentos_financeiros),
 * garantindo que nunca volte a reaparecer após reiniciar o servidor.
 */
export async function deleteFaturaFinanceiroPermanently(supabase: any, faturaId: string): Promise<void> {
  await supabase.from("movimentos_financeiros").delete().eq("fatura_id", faturaId);

  const { error: finDelErr } = await supabase
    .from(FATURAS_FINANCEIRO_TABLE)
    .delete()
    .eq("id", faturaId);

  if (finDelErr && !isMissingFaturasFinanceiroTable(finDelErr)) {
    throw finDelErr;
  }

  const { error: legDelErr } = await supabase
    .from("faturas")
    .delete()
    .eq("id", faturaId)
    .eq("tipo", "compra_financeiro");

  if (legDelErr && String(legDelErr.code || "") !== "42P01") {
    throw legDelErr;
  }
}

/**
 * Assim que public.faturas_financeiro existir na base de dados, copia de forma
 * idempotente quaisquer registos 'compra_financeiro' anteriores de public.faturas,
 * sem alterar nem apagar nada na tabela public.faturas.
 */
export async function ensureLegacyFinancialRowsMigrated(supabase: any): Promise<boolean> {
  await purgeSpecificDeletedFinancialInvoices(supabase);

  if (hasSyncedLegacyFinancialRows) return true;

  const probe = await supabase.from(FATURAS_FINANCEIRO_TABLE).select("id").limit(1);
  if (probe.error) {
    if (isMissingFaturasFinanceiroTable(probe.error)) {
      return false;
    }
    throw probe.error;
  }

  try {
    const [{ data: legacyRows, error: legErr }, { data: existingIdsData, error: exErr }] =
      await Promise.all([
        supabase.from("faturas").select("*").eq("tipo", "compra_financeiro"),
        supabase.from(FATURAS_FINANCEIRO_TABLE).select("id"),
      ]);

    if (!legErr && !exErr && Array.isArray(legacyRows) && legacyRows.length > 0) {
      const existingSet = new Set((existingIdsData || []).map((r: any) => String(r.id)));
      const missingRows = legacyRows.filter((r: any) => r?.id && !existingSet.has(String(r.id)));

      if (missingRows.length > 0) {
        const toInsert = missingRows.map((f: any) => {
          const meta = parseLegacyFaturaDescricao(f.descrição);
          return {
            id: f.id,
            empresa: meta.empresa || null,
            centro_custo: meta.centro_custo || null,
            conta_analise: meta.conta_analise || null,
            loja_id: meta.loja_id || null,
            fornecedor_id: f.fornecedor_id || null,
            numero_fatura: f.numero_fatura || "S/N",
            forma_pagamento: meta.forma_pagamento || "transferencia",
            data_emissao: f.data_emissao || new Date().toISOString().split("T")[0],
            data_vencimento: f.data_vencimento || null,
            valor_liquido: Number(f.valor_liquido ?? 0),
            valor_iva: Number(f.valor_iva ?? 0),
            valor_total: Number(f.valor_total ?? 0),
            valor_pendente: Number(f.valor_pendente ?? 0),
            status_pagamento: f.status_pagamento || "pendente",
            observacoes: f.observacoes || null,
            anexo_url: f.anexo_url || null,
            created_by: f.created_by || null,
            created_at: f.created_at || new Date().toISOString(),
          };
        });

        const ins = await supabase.from(FATURAS_FINANCEIRO_TABLE).insert(toInsert);
        if (!ins.error) {
          console.log(
            `[Migration] ${toInsert.length} fatura(s) do financeiro sincronizadas para '${FATURAS_FINANCEIRO_TABLE}'.`
          );
        }
      }
    }

    hasSyncedLegacyFinancialRows = true;
    return true;
  } catch (err) {
    console.warn("[Migration] Aviso ao sincronizar faturas_financeiro:", err);
    return true;
  }
}

export async function fetchFaturasFinanceiro(
  supabase: any,
  options: {
    startDate?: string;
    endDate?: string;
    includeRelations?: boolean;
  } = {}
): Promise<{ rows: any[]; tableReady: boolean }> {
  const { startDate, endDate, includeRelations = true } = options;

  const tableExists = await ensureLegacyFinancialRowsMigrated(supabase);

  if (tableExists) {
    const selectCols = includeRelations
      ? "*, fornecedor:fornecedores(id, nome, iban, contribuinte, tipo), user:created_by(id, name, email)"
      : "*, fornecedor:fornecedores(id, nome)";

    let query = supabase.from(FATURAS_FINANCEIRO_TABLE).select(selectCols);
    if (startDate) query = query.gte("data_emissao", startDate);
    if (endDate) query = query.lte("data_emissao", endDate);

    let res = await query.order("data_emissao", { ascending: false });

    if (res.error && includeRelations) {
      let retryQuery = supabase
        .from(FATURAS_FINANCEIRO_TABLE)
        .select("*, fornecedor:fornecedores(id, nome, iban, contribuinte, tipo)");
      if (startDate) retryQuery = retryQuery.gte("data_emissao", startDate);
      if (endDate) retryQuery = retryQuery.lte("data_emissao", endDate);
      res = await retryQuery.order("data_emissao", { ascending: false });
    }

    if (res.error) throw res.error;

    return {
      rows: (res.data || []).map(normalizeFaturaFinanceiroRow),
      tableReady: true,
    };
  }

  // Fallback de leitura (enquanto o SQL ainda não foi corrido no Supabase)
  const fallbackSelect = includeRelations
    ? "*, fornecedor:fornecedores(id, nome, iban, contribuinte, tipo), user:created_by(id, name, email), movimentos_financeiros(*)"
    : "*, fornecedor:fornecedores(id, nome)";

  let fallbackQuery = supabase
    .from("faturas")
    .select(fallbackSelect)
    .eq("tipo", "compra_financeiro");

  if (startDate) fallbackQuery = fallbackQuery.gte("data_emissao", startDate);
  if (endDate) fallbackQuery = fallbackQuery.lte("data_emissao", endDate);

  const { data: legData, error: legErr } = await fallbackQuery.order("data_emissao", {
    ascending: false,
  });

  if (legErr) {
    if (legErr.code === "42P01") return { rows: [], tableReady: false };
    throw legErr;
  }

  return {
    rows: (legData || []).map(normalizeFaturaFinanceiroRow),
    tableReady: false,
  };
}
