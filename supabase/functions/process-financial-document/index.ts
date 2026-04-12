import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    })

    // Verify Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { fileBase64, fileName, mimeType, contextType } = await req.json()
    if (!fileBase64) {
      return new Response(JSON.stringify({ error: 'Dados do arquivo faltando' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY não configurada no Supabase.")
    }

    // Determine context based on contextType
    let prompt = `Você é um contador especializado. Analise o arquivo anexo (pode ser imagem de recibo, PDF, documento ou áudio de voz sobre gastos) e extraia as transações financeiras.
    Retorne APENAS um objeto JSON no formato: { "transactions": [{ "date": "YYYY-MM-DD", "amount": number, "description": "string", "type": "income" | "expense", "categorySuggestion": "string" }] }.
    Se houver várias transações, liste todas. Se for um áudio, transcreva e converta em dados de transação.`

    if (contextType === 'shopping') {
      prompt = `Você é um leitor inteligente de etiquetas de supermercado. O usuário tirou uma foto da prateleira. 
      Sua missão é extrair exatamente qual é o Nome do Produto e qual é o Preço Varejo Unitário.
      Ignorar palavras promocionais como 'oferta', 'promoção', 'leve 3 pague 2'. Foque no nome real da marca e descrição (ex: Sopa Knorr 73g Letrinhas).
      O preço geralmente é o maior número de destaque (ex: 5,99).
      Retorne APENAS um objeto JSON no formato exato: { "shoppingItems": [{ "name": "string", "price": number }] }.`
    }

    // Mapping MIME to Gemini format
    const isAudio = mimeType.startsWith('audio/')
    const isImage = mimeType.startsWith('image/')
    const isPdf = mimeType === 'application/pdf'

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("Gemini Error:", result)
      throw new Error("IA não conseguiu processar o documento.")
    }

    let text = result.candidates[0].content.parts[0].text
    // Clean markdown if present
    text = text.replace(/```json/g, '').replace(/```/g, '').trim()
    
    const aiResponse = JSON.parse(text)
    
    return new Response(JSON.stringify(aiResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error("Server Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
