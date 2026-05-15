import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const { text } = await req.json()
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Texto vazio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY não configurada no Supabase.")
    }

    const today = new Date().toISOString().split("T")[0]

    const prompt = `Você é um assistente financeiro que interpreta relatos informais em português brasileiro e extrai TODAS as movimentações mencionadas.

Regras:
- Cada gasto, recebimento, parcela ou compra mencionado vira UMA transação separada.
- Se o usuário disser "gastei X com Y", crie uma despesa.
- Se disser "recebi X", crie uma receita.
- Se o texto mencionar PJ, empresa, cliente, pró-labore ou nota fiscal, marque origin como "PJ". Caso contrário, "PF".
- Se a data não for clara, use ${today}.
- Categorias possíveis: Alimentação, Transporte, Moradia, Saúde, Lazer, Shopping, Assinaturas, Educação, Trabalho, Setup, Equipamentos, Moto, Outros.
- NÃO invente valores. Se faltar valor para algum item, ignore-o.

Retorne APENAS JSON válido no formato:
{ "transactions": [{ "date": "YYYY-MM-DD", "amount": number, "description": "string", "type": "income" | "expense", "categorySuggestion": "string", "origin": "PF" | "PJ" }] }

Texto do usuário:
"""
${text}
"""`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1
        }
      })
    })

    const result = await response.json()
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
      console.error("Gemini error:", result)
      throw new Error("IA não conseguiu interpretar o texto.")
    }

    const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim()
    const aiResponse = JSON.parse(cleanedText)

    return new Response(JSON.stringify(aiResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao processar o texto."
    console.error("Server Error:", error)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
