import fs from "fs";
import path from "path";

export interface WmsItemTareInfo {
  tara_id: string;
  tara_nome: string;
  tara_peso: number;
  peso_bruto?: number | null;
}

interface OrderTareRecord {
  updated_at: string;
  items: Record<string, WmsItemTareInfo>;
}

type TareDraftMap = Record<string, OrderTareRecord>;

const STORAGE_PATH = "config/wms_tara_rascunhos.json";
const LOCAL_FILE_PATH = path.join(process.cwd(), "wms_tara_rascunhos.json");
const CACHE_KEY = "wms_tara_rascunhos";
const MAX_ORDERS_TO_KEEP = 500;

function readLocalFile(): TareDraftMap {
  try {
    if (fs.existsSync(LOCAL_FILE_PATH)) {
      const raw = fs.readFileSync(LOCAL_FILE_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as TareDraftMap;
      }
    }
  } catch (err) {
    console.warn("Aviso ao ler wms_tara_rascunhos.json local:", err);
  }
  return {};
}

function writeLocalFile(data: TareDraftMap): void {
  try {
    fs.writeFileSync(LOCAL_FILE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.warn("Aviso ao gravar wms_tara_rascunhos.json local:", err);
  }
}

function pruneOldEntries(map: TareDraftMap): TareDraftMap {
  const entries = Object.entries(map);
  if (entries.length <= MAX_ORDERS_TO_KEEP) return map;
  entries.sort((a, b) => {
    const tA = new Date(a[1]?.updated_at || 0).getTime();
    const tB = new Date(b[1]?.updated_at || 0).getTime();
    return tB - tA;
  });
  const pruned: TareDraftMap = {};
  for (const [k, v] of entries.slice(0, MAX_ORDERS_TO_KEEP)) {
    pruned[k] = v;
  }
  return pruned;
}

export async function getTareDraftMap(supabase: any, cache: any): Promise<TareDraftMap> {
  if (cache) {
    const cached = cache.get(CACHE_KEY);
    if (cached && typeof cached === "object") {
      return cached as TareDraftMap;
    }
  }

  const localData = readLocalFile();
  let storageData: TareDraftMap = {};

  if (supabase && process.env.SUPABASE_URL) {
    try {
      const { data, error } = await supabase.storage.from("uploads").download(STORAGE_PATH);
      if (!error && data) {
        const text = await data.text();
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          storageData = parsed as TareDraftMap;
        }
      }
    } catch {
      // Fallback para ficheiro local se não existir ainda no bucket
    }
  }

  // Merge priorizando o registo mais recente por pedido
  const merged: TareDraftMap = { ...storageData };
  for (const [orderId, localRec] of Object.entries(localData)) {
    const remoteRec = merged[orderId];
    if (!remoteRec) {
      merged[orderId] = localRec;
    } else {
      const tLocal = new Date(localRec?.updated_at || 0).getTime();
      const tRemote = new Date(remoteRec?.updated_at || 0).getTime();
      if (tLocal >= tRemote) {
        merged[orderId] = localRec;
      }
    }
  }

  if (cache) {
    cache.set(CACHE_KEY, merged, 600);
  }
  return merged;
}

async function persistTareDraftMap(
  map: TareDraftMap,
  supabase: any,
  cache: any,
): Promise<void> {
  const cleanMap = pruneOldEntries(map);
  if (cache) {
    cache.set(CACHE_KEY, cleanMap, 600);
  }
  writeLocalFile(cleanMap);

  if (supabase && process.env.SUPABASE_URL) {
    try {
      await supabase.storage
        .from("uploads")
        .upload(STORAGE_PATH, Buffer.from(JSON.stringify(cleanMap, null, 2), "utf8"), {
          contentType: "application/json",
          upsert: true,
        });
    } catch (err) {
      console.warn("Aviso ao sincronizar wms_tara_rascunhos no Supabase Storage:", err);
    }
  }
}

export async function saveOrderTareDraft(
  orderId: string | number,
  itensConferidos: any[],
  supabase: any,
  cache: any,
): Promise<void> {
  const current = await getTareDraftMap(supabase, cache);
  const key = String(orderId);
  const existingItems = { ...(current[key]?.items || {}) };

  for (const item of itensConferidos || []) {
    const prodKey = String(item.produto_id);
    const taraPeso = Number(item.tara_peso || 0);
    if (taraPeso > 0) {
      existingItems[prodKey] = {
        tara_id: String(item.tara_id || ""),
        tara_nome: String(item.tara_nome || ""),
        tara_peso: taraPeso,
        peso_bruto:
          item.peso_bruto !== undefined && item.peso_bruto !== null && item.peso_bruto !== ""
            ? Number(item.peso_bruto)
            : null,
      };
    } else if (item.tara_peso !== undefined) {
      delete existingItems[prodKey];
    }
  }

  if (Object.keys(existingItems).length > 0) {
    current[key] = {
      updated_at: new Date().toISOString(),
      items: existingItems,
    };
  } else {
    delete current[key];
  }

  await persistTareDraftMap(current, supabase, cache);
}

export async function removeOrderTareDraft(
  orderId: string | number,
  supabase: any,
  cache: any,
): Promise<void> {
  const current = await getTareDraftMap(supabase, cache);
  const key = String(orderId);
  if (current[key]) {
    delete current[key];
    await persistTareDraftMap(current, supabase, cache);
  }
}

export async function enrichOrdersWithTare<T extends { id?: any; pedido_itens?: any[] }>(
  orders: T[],
  supabase: any,
  cache: any,
): Promise<T[]> {
  if (!Array.isArray(orders) || orders.length === 0) return orders;
  const tareMap = await getTareDraftMap(supabase, cache);
  if (!tareMap || Object.keys(tareMap).length === 0) return orders;

  return orders.map((order) => {
    const orderTare = tareMap[String(order.id)];
    if (!orderTare || !Array.isArray(order.pedido_itens)) return order;

    return {
      ...order,
      pedido_itens: order.pedido_itens.map((it: any) => {
        const t = orderTare.items?.[String(it.produto_id)];
        if (!t) return it;
        return {
          ...it,
          tara_id: t.tara_id,
          tara_nome: t.tara_nome,
          tara_peso: t.tara_peso,
          peso_bruto: t.peso_bruto ?? null,
        };
      }),
    };
  });
}
