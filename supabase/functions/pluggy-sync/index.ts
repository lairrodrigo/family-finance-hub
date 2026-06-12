import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, pluggyAuth, getItem, syncItemTransactions } from "../_shared/pluggy.ts";

// Chamado pelo frontend após o widget conectar um banco (ou no botão "sincronizar agora").
// Registra/atualiza a conexão e importa as transações.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Client com a auth do usuário, só pra identificar quem é.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { itemId } = await req.json();
    if (!itemId) {
      return new Response(JSON.stringify({ error: "itemId é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Client admin (service role) pra gravar transações sem esbarrar na RLS.
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { data: profile } = await admin.from("profiles").select("family_id").eq("user_id", user.id).single();
    if (!profile?.family_id) throw new Error("Usuário não possui família vinculada.");

    const apiKey = await pluggyAuth();
    const item = await getItem(apiKey, itemId);

    // Registra/atualiza a conexão deste banco.
    await admin.from("bank_connections").upsert(
      {
        family_id: profile.family_id,
        user_id: user.id,
        provider: "pluggy",
        item_id: itemId,
        connector_name: item?.connector?.name ?? null,
        connector_image_url: item?.connector?.imageUrl ?? null,
        status: (item?.status ?? "updating").toLowerCase(),
      },
      { onConflict: "family_id,item_id" },
    );

    // Importa os últimos 90 dias (sandbox e primeira carga).
    const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const imported = await syncItemTransactions(admin, apiKey, { item_id: itemId, family_id: profile.family_id, user_id: user.id }, from);

    return new Response(JSON.stringify({ ok: true, imported }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("pluggy-sync", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
