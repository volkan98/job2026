const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SearchRequest {
  location: string;
  radius: number;
  keywords: string[];
  cvSkills?: string[];
  targetRole?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location, radius, keywords, cvSkills, targetRole }: SearchRequest = await req.json();

    if (!location || !keywords || keywords.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Location and keywords are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI searching companies in:', location, 'keywords:', keywords);

    const aiGatewayUrl = Deno.env.get('AI_GATEWAY_URL');
    const aiGatewayToken = Deno.env.get('AI_GATEWAY_TOKEN');

    if (!aiGatewayUrl || !aiGatewayToken) {
      throw new Error('AI Gateway not configured');
    }

    const prompt = `Sei un agente di ricerca lavoro svizzero/italiano. Genera una lista di aziende REALI nella zona specificata che potrebbero essere rilevanti per una candidatura.

ZONA DI RICERCA:
- Località: ${location}
- Raggio: ${radius} km

SETTORI/KEYWORDS:
${keywords.map(k => `- ${k}`).join('\n')}

${cvSkills ? `COMPETENZE DEL CANDIDATO:\n${cvSkills.map(s => `- ${s}`).join('\n')}` : ''}
${targetRole ? `RUOLO TARGET: ${targetRole}` : ''}

FONTI DA CONSIDERARE (directory pubbliche gratuite):
- local.ch, search.ch (Svizzera)
- Pagine Gialle / Pagine Bianche (Italia)
- Siti ufficiali aziendali
- Camere di commercio locali
- Registri imprese pubblici

ISTRUZIONI:
1. Genera 8-12 aziende REALISTICHE per questa zona e settore
2. Per ogni azienda suggerisci dove l'utente può verificare i dati (sito ufficiale, local.ch, etc.)
3. Per le email:
   - Se conosci con certezza l'email pubblica, includila
   - Se non sei sicuro, metti null e indica "verificare su sito ufficiale"
   - Preferisci: jobs@ / hr@ / recruiting@ se disponibili, altrimenti info@
4. NON INVENTARE email - meglio null che un'email falsa
5. Indica sempre la fonte suggerita per verifica

Rispondi SOLO con un array JSON valido (senza markdown, senza backticks):
[
  {
    "name": "Nome Azienda SA",
    "sector": "Settore principale",
    "address": "Indirizzo approssimativo",
    "city": "Città",
    "website": "https://www.esempio.ch",
    "email": "info@esempio.ch o null",
    "phone": "+41 XX XXX XX XX o null",
    "contact_type": "generic|hr|jobs|form_only|phone_only",
    "source": "Fonte: local.ch / sito ufficiale / registro imprese",
    "match_score": 85,
    "match_reasons": ["motivo1", "motivo2"],
    "verification_note": "Verificare email su pagina Contatti del sito ufficiale"
  }
]`;

    const response = await fetch(aiGatewayUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiGatewayToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON from response
    let companies;
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }
      companies = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse companies data from AI response');
    }

    // Sort by match_score
    companies.sort((a: any, b: any) => (b.match_score || 0) - (a.match_score || 0));

    console.log('Found', companies.length, 'companies');

    return new Response(
      JSON.stringify({ success: true, data: companies }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error searching companies:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
