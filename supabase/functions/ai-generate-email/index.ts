const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Company {
  name: string;
  sector?: string;
  city?: string;
  website?: string;
}

interface CVData {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  citta: string;
  profilo: string;
  competenze: string[];
  sintesiBreve: string;
}

interface EmailRequest {
  company: Company;
  cvData: CVData;
  variant: 'breve' | 'standard' | 'formale';
  targetRole?: string;
  availability?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company, cvData, variant, targetRole, availability }: EmailRequest = await req.json();

    if (!company || !cvData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Company and CV data are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating personalized email for:', company.name);

    const aiGatewayUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
    const aiGatewayToken = Deno.env.get('LOVABLE_API_KEY');

    if (!aiGatewayToken) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const variantInstructions = {
      breve: 'Email BREVE (max 150 parole): diretta, professionale, 2-3 punti chiave dal CV che matchano con l\'azienda.',
      standard: 'Email STANDARD (200-300 parole): professionale, 3-4 punti specifici dal CV, mostra interesse genuino per l\'azienda.',
      formale: 'Email MOLTO FORMALE (250-350 parole): tono istituzionale svizzero, struttura classica, enfasi su affidabilità e competenze.'
    };

    const prompt = `Genera un'email di candidatura spontanea in italiano per l'azienda specificata.

AZIENDA:
- Nome: ${company.name}
- Settore: ${company.sector || 'Non specificato'}
- Città: ${company.city || 'Non specificata'}
- Sito web: ${company.website || 'Non disponibile'}

CANDIDATO:
- Nome completo: ${cvData.nome} ${cvData.cognome}
- Email: ${cvData.email}
- Telefono: ${cvData.telefono}
- Città: ${cvData.citta}
- Profilo: ${cvData.profilo}
- Competenze: ${cvData.competenze?.join(', ') || 'Non specificate'}
- Sintesi CV: ${cvData.sintesiBreve}
${targetRole ? `- Ruolo desiderato: ${targetRole}` : ''}
${availability ? `- Disponibilità: ${availability}` : '- Disponibilità: immediata'}

STILE: ${variantInstructions[variant]}

REGOLE IMPORTANTI:
1. NON usare frasi generiche come "sono motivato" senza contenuto concreto
2. Inserisci ALMENO 2-3 elementi specifici dal CV che matchano con il settore aziendale
3. Se non hai info certe sull'azienda, NON inventare dettagli
4. Tono professionale svizzero: diretto, chiaro, educato
5. Includi sempre i contatti nella firma

Rispondi SOLO con un oggetto JSON valido (senza markdown, senza backticks):
{
  "oggetto": "Oggetto dell'email",
  "corpo": "Corpo completo dell'email",
  "firma": "Firma con contatti",
  "matchPoints": ["punto1", "punto2", "punto3"]
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
        temperature: 0.7,
        max_tokens: 2000
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
    let emailData;
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }
      emailData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse email data from AI response');
    }

    console.log('Email generated successfully for:', company.name);

    return new Response(
      JSON.stringify({ success: true, data: emailData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error generating email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
