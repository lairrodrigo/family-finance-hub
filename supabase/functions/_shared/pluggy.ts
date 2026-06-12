// Helper compartilhado da Pluggy (Open Finance).
// Doc: https://docs.pluggy.ai/

const PLUGGY_BASE = "https://api.pluggy.ai";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Troca CLIENT_ID/SECRET por uma apiKey de curta duração. */
export async function pluggyAuth(): Promise<string> {
  const clientId = Deno.env.get("PLUGGY_CLIENT_ID");
  const clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("PLUGGY_CLIENT_ID/PLUGGY_CLIENT_SECRET não configurados no Supabase.");
  }
  const res = await fetch(`${PLUGGY_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!res.ok) throw new Error(`Pluggy auth falhou (${res.status})`);
  const data = await res.json();
  return data.apiKey as string;
}

async function pluggyGet(apiKey: string, path: string): Promise<any> {
  const res = await fetch(`${PLUGGY_BASE}${path}`, { headers: { "X-API-KEY": apiKey } });
  if (!res.ok) throw new Error(`Pluggy GET ${path} falhou (${res.status})`);
  return res.json();
}

/** Cria o connect token usado pelo widget no frontend. */
export async function createConnectToken(apiKey: string, itemId?: string): Promise<string> {
  const res = await fetch(`${PLUGGY_BASE}/connect_token`, {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(itemId ? { itemId } : {}),
  });
  if (!res.ok) throw new Error(`Pluggy connect_token falhou (${res.status})`);
  const data = await res.json();
  return data.accessToken as string;
}

export async function getItem(apiKey: string, itemId: string): Promise<any> {
  return pluggyGet(apiKey, `/items/${itemId}`);
}

export async function getAccounts(apiKey: string, itemId: string): Promise<any[]> {
  const data = await pluggyGet(apiKey, `/accounts?itemId=${itemId}`);
  return data.results ?? [];
}

/** Busca todas as transações de uma conta a partir de `from` (paginado). */
export async function getTransactions(apiKey: string, accountId: string, from: string): Promise<any[]> {
  const out: any[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const data = await pluggyGet(apiKey, `/transactions?accountId=${accountId}&from=${from}&pageSize=500&page=${page}`);
    out.push(...(data.results ?? []));
    totalPages = data.totalPages ?? 1;
    page++;
  } while (page <= totalPages);
  return out;
}

/**
 * Mapeia uma transação da Pluggy pro formato da tabela `transactions`.
 * DEBIT = saída (despesa), CREDIT = entrada (receita). Usa o `type` em vez do
 * sinal do amount, que varia por tipo de conta.
 */
export function mapTransaction(tx: any, opts: { family_id: string; user_id: string; fallbackCategoryId?: string | null }) {
  const isExpense = String(tx.type).toUpperCase() === "DEBIT";
  return {
    family_id: opts.family_id,
    user_id: opts.user_id,
    created_by: opts.user_id,
    amount: Math.abs(Number(tx.amount) || 0),
    type: isExpense ? "expense" : "income",
    description: (tx.description || tx.descriptionRaw || "Transação").toString().slice(0, 200),
    date: (tx.date || "").split("T")[0] || new Date().toISOString().split("T")[0],
    category_id: opts.fallbackCategoryId ?? null,
    payment_type: "cash",
    origin: "PF",
    source: "pluggy",
    external_id: tx.id, // id da Pluggy → dedup
  };
}

interface SyncConn { item_id: string; family_id: string; user_id: string }

/**
 * Busca as transações de todas as contas de um item e grava na tabela
 * `transactions`, ignorando as que já existem (dedup por family_id+external_id).
 * Reutilizado tanto pelo sync manual quanto pelo webhook. Espera um client
 * Supabase com service role (bypassa RLS). Retorna quantas foram importadas.
 */
export async function syncItemTransactions(admin: any, apiKey: string, conn: SyncConn, fromDate: string): Promise<number> {
  const { data: cats } = await admin.from("categories").select("id").limit(1);
  const fallbackCategoryId = cats?.[0]?.id ?? null;

  const accounts = await getAccounts(apiKey, conn.item_id);
  let imported = 0;

  for (const acc of accounts) {
    const txs = await getTransactions(apiKey, acc.id, fromDate);
    if (txs.length === 0) continue;

    const rows = txs.map((t) => mapTransaction(t, { family_id: conn.family_id, user_id: conn.user_id, fallbackCategoryId }));

    const { data, error } = await admin
      .from("transactions")
      .upsert(rows, { onConflict: "family_id,external_id", ignoreDuplicates: true })
      .select("id");
    if (error) throw error;
    imported += data?.length ?? 0;
  }

  await admin.from("bank_connections").update({ last_synced_at: new Date().toISOString() }).eq("item_id", conn.item_id).eq("family_id", conn.family_id);
  return imported;
}
