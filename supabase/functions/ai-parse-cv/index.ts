const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cvText } = await req.json();

    if (!cvText) {
      return new Response(
        JSON.stringify({ success: false, error: 'CV text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing CV with AI...');

    const aiGatewayUrl = Deno.env.get('AI_GATEWAY_URL');
    const aiGatewayToken = Deno.env.get('AI_GATEWAY_TOKEN');

    if (!aiGatewayUrl || !aiGatewayToken) {
      throw new Error('AI Gateway not configured');
    }

    const prompt = `Analizza il seguente CV e estrai le informazioni in formato JSON strutturato.

CV:
${cvText}

Rispondi SOLO con un oggetto JSON valido (senza markdown, senza backticks) con questa struttura:
{
  "nome": "string",
  "cognome": "string", 
  "email": "string",
  "telefono": "string",
  "citta": "string",
  "cap": "string",
  "profilo": "breve descrizione professionale",
  "competenze": ["array", "di", "competenze"],
  "esperienze": [
    {
      "ruolo": "string",
      "azienda": "string",
      "dataInizio": "MM/YYYY",
      "dataFine": "MM/YYYY o Presente",
      "descrizione": "breve descrizione mansioni"
    }
  ],
  "istruzione": [
    {
      "titolo": "string",
      "istituto": "string",
      "anno": "YYYY"
    }
  ],
  "lingue": [
    {
      "lingua": "string",
      "livello": "A1/A2/B1/B2/C1/C2"
    }
  ],
  "sintesiBreve": "3-5 righe che riassumono il profilo professionale, anni di esperienza, competenze principali",
  "sintesiCompleta": "sintesi dettagliata con bullet points delle competenze e esperienze chiave"
}`;

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
        temperature: 0.3,
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

    // Parse JSON from response (handle potential markdown wrapping)
    let parsedCV;
    try {
      let jsonStr = content.trim();
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }
      parsedCV = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse CV data from AI response');
    }

    console.log('CV parsed successfully');

    return new Response(
      JSON.stringify({ success: true, data: parsedCV }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error parsing CV:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
