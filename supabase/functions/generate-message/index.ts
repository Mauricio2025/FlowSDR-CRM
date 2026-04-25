// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lead, campaign } = await req.json()
    
    // 1. Agora puxamos a chave do Gemini
    // @ts-ignore
    const geminiKey = Deno.env.get('GEMINI_API_KEY')

    if (!geminiKey) {
      throw new Error('A chave GEMINI_API_KEY não foi configurada nos Edge Secrets.')
    }

    // 2. Montamos o Prompt (O texto continua o mesmo, a IA entende da mesma forma)
    const finalPrompt = `Você é um SDR (Sales Development Representative) sênior e especialista em prospecção B2B. 
    Sua missão é escrever um e-mail de prospecção (cold e-mail) curto, persuasivo e altamente focado na conversão.
    
    DADOS DO LEAD (Alvo):
    - Nome: ${lead.name}
    - Cargo: ${lead.role}
    - Empresa: ${lead.company}
    
    DIRETRIZES DA CAMPANHA:
    - Contexto: ${campaign.context}
    - Instruções Extras da IA: ${campaign.ai_prompt || 'Seja direto e persuasivo.'}
    
    REGRAS ESTRITAS PARA A GERAÇÃO: 
    1. Retorne apenas o Assunto e o Corpo do e-mail. Não adicione textos extras como "Aqui está o email:".
    2. Coloque "Assunto: " antes da linha de assunto.
    3. Seja direto. Evite introduções longas como "Espero que este email o encontre bem".
    4. O email deve ter no máximo 3 parágrafos curtos.
    5. Termine com uma Call to Action (CTA) clara.
    6. Assine como "O time da [Nome da sua Empresa]".
    
    Escreva o e-mail agora:`

    // 3. Chamada para a API REST do Google Gemini (Usando o modelo gemini-1.5-flash que é super rápido)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: finalPrompt }]
        }],
        generationConfig: {
          temperature: 0.7,
        }
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      console.error("Erro do Gemini:", err)
      throw new Error(`Erro na API do Gemini: ${response.status}`)
    }

    const data = await response.json()
    
    // 4. O caminho para ler a resposta no Gemini é um pouco diferente
    const message = data.candidates[0].content.parts[0].text

    // Devolvemos no mesmo formato exato que o Frontend está esperando
    return new Response(
      JSON.stringify({ message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    console.error("Erro na Edge Function:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})