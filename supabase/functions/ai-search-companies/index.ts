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
  minResults?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location, radius, keywords, cvSkills, targetRole, minResults = 30 }: SearchRequest = await req.json();

    if (!location || !keywords || keywords.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Location and keywords are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI deep searching companies in:', location, 'keywords:', keywords, 'minResults:', minResults);

    const aiGatewayUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
    const aiGatewayToken = Deno.env.get('LOVABLE_API_KEY');

    if (!aiGatewayToken) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Determine if it's a region/canton search
    const isRegionSearch = location.toLowerCase().includes('tutta la regione') || 
                           location.toLowerCase().includes('tutto il cantone') ||
                           location.toLowerCase().includes('intera provincia');

    const regionContext = isRegionSearch 
      ? `IMPORTANTE: L'utente sta cercando in TUTTA LA REGIONE/CANTONE. Includi aziende da TUTTE le città e comuni della regione, non solo la città principale.`
      : '';

    const prompt = `Sei un agente di ricerca lavoro professionale svizzero/italiano con accesso a vaste banche dati aziendali. Il tuo compito è generare la lista PIÙ COMPLETA POSSIBILE di aziende reali.

ZONA DI RICERCA:
- Località: ${location}
- Raggio: ${radius} km
${regionContext}

SETTORI/KEYWORDS DI RICERCA:
${keywords.map(k => `- ${k}`).join('\n')}

${cvSkills?.length ? `COMPETENZE DEL CANDIDATO:\n${cvSkills.map(s => `- ${s}`).join('\n')}` : ''}
${targetRole ? `RUOLO TARGET: ${targetRole}` : ''}

FONTI DA CONSIDERARE (tutte le directory pubbliche):
- local.ch, search.ch, yellow.ch (Svizzera)
- Pagine Gialle, Pagine Bianche, Virgilio Aziende (Italia)
- Comparis.ch, tutti.ch
- Registri delle imprese cantonali/regionali
- Camere di commercio (CCIA)
- Siti web ufficiali aziendali
- LinkedIn Company Pages
- Parchi industriali e zone artigianali locali
- Associazioni di categoria del settore

ISTRUZIONI CRITICHE - RICERCA PROFONDA:
1. Genera ALMENO ${minResults} aziende realistiche - più sono meglio è!
2. NON limitarti alle grandi aziende - includi anche PMI, artigiani, studi professionali
3. Copri TUTTE le città/comuni nella zona di ricerca
4. Includi aziende di settori CORRELATI (es. se cerca logistica, includi anche trasporti, spedizioni, magazzini, e-commerce)
5. Per le email:
   - Se conosci con certezza l'email pubblica, includila
   - Se non sei sicuro, metti null
   - Preferisci: jobs@ / hr@ / recruiting@ / personale@ se disponibili
6. NON INVENTARE email - meglio null che un'email falsa
7. Includi il sito web quando possibile
8. Varia i tipi di azienda: grandi gruppi, medie imprese, piccole aziende, studi, cooperative

DIVERSIFICA LE TIPOLOGIE:
- Aziende multinazionali con sede locale
- Medie imprese regionali
- Piccole imprese locali
- Artigiani e studi professionali
- Cooperative e consorzi
- Agenzie e studi di consulenza
- Enti e organizzazioni del settore

Rispondi SOLO con un array JSON valido (senza markdown, senza backticks, almeno ${minResults} aziende):
[
  {
    "name": "Nome Azienda SA",
    "sector": "Settore principale",
    "address": "Indirizzo completo se disponibile",
    "city": "Città",
    "website": "https://www.esempio.ch",
    "email": "info@esempio.ch o null",
    "phone": "+41 XX XXX XX XX o null",
    "contact_type": "generic|hr|jobs|form_only|phone_only",
    "source": "Fonte suggerita per verifica",
    "match_score": 85,
    "match_reasons": ["motivo1", "motivo2"],
    "verification_note": "Nota per verifica contatti"
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
            role: 'system',
            content: 'Sei un database vivente di aziende svizzere e italiane. Conosci migliaia di aziende in ogni regione. Genera sempre liste complete e dettagliate, mai limitate. Preferisci la quantità mantenendo la qualità.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9,
        max_tokens: 16000
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

    // Validate and clean companies
    if (!Array.isArray(companies)) {
      companies = [companies];
    }

    // Remove duplicates by name
    const seen = new Set();
    companies = companies.filter((c: any) => {
      const key = c.name?.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by match_score
    companies.sort((a: any, b: any) => (b.match_score || 0) - (a.match_score || 0));

    console.log('Found', companies.length, 'companies (requested min:', minResults, ')');

    return new Response(
      JSON.stringify({ success: true, data: companies, total: companies.length }),
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
