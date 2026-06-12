import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, pluggyAuth, createConnectToken } from "../_shared/pluggy.ts";

// Gera o token de curta duração usado pelo widget Pluggy Connect no frontend.
// O CLIENT_ID/SECRET nunca saem do servidor.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // itemId opcional: enviado quando o usuário vai reconectar/atualizar um banco existente.
    let itemId: string | undefined;
    try {
      const body = await req.json();
      itemId = body?.itemId;
    } catch (_) { /* sem body é ok */ }

    const apiKey = await pluggyAuth();
    const accessToken = await createConnectToken(apiKey, itemId);

    return new Response(JSON.stringify({ accessToken }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("pluggy-connect-token", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
