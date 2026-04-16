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

    const { fileBase64, mimeType, contextType, fileName } = await req.json()
    if (!fileBase64 || !mimeType) {
      return new Response(JSON.stringify({ error: "Dados do arquivo faltando" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY não configurada no Supabase.")
    }

    let prompt = `Você é um contador especializado. Analise o arquivo anexo e extraia transações financeiras.
Retorne apenas JSON no formato:
{ "transactions": [{ "date": "YYYY-MM-DD", "amount": number, "description": "string", "type": "income" | "expense", "categorySuggestion": "string" }] }`

    if (contextType === "shopping") {
      prompt = `Você é um leitor inteligente de etiquetas de supermercado.
Extraia o nome real do produto e o preço unitário de varejo.
Se houver informação de atacado, extraia também.
Retorne apenas JSON no formato:
{ "shoppingItems": [{ "name": "string", "price": number, "wholesalePrice": number, "wholesaleMinQty": number }] }`
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: fileBase64
              }
            }
          ]
        }],
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
      throw new Error(`IA não conseguiu processar ${fileName || "o arquivo"}.`)
    }

    const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim()
    const aiResponse = JSON.parse(cleanedText)

    return new Response(JSON.stringify(aiResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao processar o documento."
    console.error("Server Error:", error)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
