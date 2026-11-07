
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ""
);

async function check() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("id, status, total")
    .in("status", ["pronto", "entregue", "concluido"]);

  if (error) {
    console.error(error);
    return;
  }

  console.log("Total pedidos in financial scope:", data.length);
  const counts = data.reduce((acc: any, p: any) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    acc[p.status + "_value"] = (acc[p.status + "_value"] || 0) + (Number(p.total) || 0);
    return acc;
  }, {});

  console.log("Counts and Net Values:", JSON.stringify(counts, null, 2));
}

check();
