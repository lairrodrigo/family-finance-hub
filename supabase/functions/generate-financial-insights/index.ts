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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const authHeader = req.headers.get('Authorization')!
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('user_id', user.id)
      .single()

    if (!profile?.family_id) {
      throw new Error('Perfil sem família associada.')
    }

    const familyId = profile.family_id

    // Check for cached insights (less than 1 hour old)
    const { data: cached } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const oneHourAgo = new Date(Date.now() - 3600000)
    if (cached && new Date(cached.created_at) > oneHourAgo) {
      return new Response(JSON.stringify(cached.content), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch Financial Data
    const [accounts, transactions, goals] = await Promise.all([
      supabase.from('accounts').select('name, balance, type').eq('family_id', familyId),
      supabase.from('transactions').select('amount, type, description, date, category_id').eq('family_id', familyId).gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('goals').select('name, target_amount, current_amount').eq('family_id', familyId)
    ])

    const { data: categories } = await supabase.from('categories').select('id, name')
    const categoryMap = Object.fromEntries(categories?.map(c => [c.id, c.name]) || [])

    const dataSummary = {
      accounts: accounts.data,
      recent_transactions: transactions.data?.map(t => ({
        ...t,
        category: categoryMap[t.category_id] || 'Outros'
      })),
      goals: goals.data
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
       return new Response(JSON.stringify({ insights: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const prompt = `Você é um consultor financeiro familiar especialista. Analise os seguintes dados financeiros da família e forneça 3 a 4 insights curtos, práticos e motivadores em português.
    Retorne APENAS um objeto JSON com o formato: { "insights": [{ "title": "string", "text": "string", "type": "warning" | "info" | "success" }] }.
    
    Dados:
    Contas: ${JSON.stringify(dataSummary.accounts)}
    Transações (últimos 30 dias): ${JSON.stringify(dataSummary.recent_transactions)}
    Metas: ${JSON.stringify(dataSummary.goals)}`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    })

    const result = await response.json()
    const aiResponse = JSON.parse(result.candidates[0].content.parts[0].text)

    await supabase.from('ai_insights').insert({
      family_id: familyId,
      content: aiResponse
    })

    return new Response(JSON.stringify(aiResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error("Server Error:", error)
    return new Response(JSON.stringify({ error: "Erro ao gerar insights financeiros." }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
