import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Verify Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { base64Image, fileName } = await req.json()
    if (!base64Image) {
      return new Response(JSON.stringify({ error: 'Dados da imagem faltando' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Call external vision API (e.g. Google Vision or OpenAI)
    // Replace with your actual implementation
    // For now, returning a mock description based on requirements
    
    // NOTE: In a real implementation, you would use GOOGLE_VISION_API_KEY
    // const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    
    return new Response(
      JSON.stringify({ 
        text: `Texto extraído de ${fileName}`, 
        description: "Análise de imagem concluída. (Configure sua chave de API para análise completa)" 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Server Error:", error)
    return new Response(JSON.stringify({ error: "Erro ao analisar imagem." }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
