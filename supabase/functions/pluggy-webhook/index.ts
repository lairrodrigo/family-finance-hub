import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { pluggyAuth, syncItemTransactions } from "../_shared/pluggy.ts";

// Endpoint PÚBLICO chamado pela Pluggy quando um item atualiza ou há transações novas.
// É aqui que mora o "automático": chegou compra nova no banco → sincroniza sozinho.
// Configure a URL na dashboard da Pluggy como: <func-url>?key=<PLUGGY_WEBHOOK_SECRET>
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    // Verificação simples por segredo na query (a Pluggy não assina o payload por padrão).
    const expected = Deno.env.get("PLUGGY_WEBHOOK_SECRET");
    if (expected) {
      const key = new URL(req.url).searchParams.get("key");
      if (key !== expected) return new Response("forbidden", { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const event: string = body?.event ?? "";
    const itemId: string | undefined = body?.itemId ?? body?.id;

    // Só nos interessam eventos com transações novas / item atualizado.
    const relevant = ["item/updated", "transactions/created", "transactions/updated"];
    if (!itemId || !relevant.includes(event)) {
      return new Response(JSON.stringify({ ignored: true, event }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { data: conn } = await admin
      .from("bank_connections")
      .select("item_id, family_id, user_id")
      .eq("item_id", itemId)
      .maybeSingle();

    // Item que não conhecemos (ou de outra conta) → ignora silenciosamente.
    if (!conn) return new Response(JSON.stringify({ ignored: true }), { status: 200, headers: { "Content-Type": "application/json" } });

    const apiKey = await pluggyAuth();
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const imported = await syncItemTransactions(admin, apiKey, conn, from);

    return new Response(JSON.stringify({ ok: true, imported }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("pluggy-webhook", err);
    // Responde 200 mesmo em erro pra Pluggy não ficar reenfileirando infinitamente;
    // o erro fica logado pra investigação.
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
});
