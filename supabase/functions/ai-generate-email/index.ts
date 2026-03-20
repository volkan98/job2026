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

FORMATTAZIONE - REGOLE CRITICHE PER MAILTO:
- L'email sarà inviata tramite mailto: quindi DEVE essere SOLO TESTO SEMPLICE
- NON usare MAI: asterischi **, HTML (<b>, <strong>), caratteri speciali
- Il testo deve essere PULITO e compatibile con qualsiasi client email

EVIDENZIAZIONE INFORMAZIONI CHIAVE:
Per permettere a recruiter e responsabili di produzione di capire i punti chiave in pochi secondi,
evidenzia le informazioni più importanti usando UNO di questi metodi (scegli quello più naturale nel contesto):
- MAIUSCOLO MODERATO: per 3-5 parole/espressioni chiave nell'intera email
- [Parentesi quadre]: per informazioni tecniche specifiche

COSA EVIDENZIARE (scegli 4-6 elementi tra questi):
- Ruolo proposto: es. "come VERNICIATORE INDUSTRIALE" oppure "per la posizione di [verniciatore industriale]"
- Competenze tecniche: es. "competenze in VERNICIATURA INDUSTRIALE" o "[verniciatura a spruzzo]"
- Attività operative: es. "PREPARAZIONE SUPERFICI" o "[controllo qualità prodotto finito]"
- Esperienza: es. "con OLTRE 5 ANNI di esperienza"
- Disponibilità: es. "DISPONIBILITÀ IMMEDIATA" 
- Qualità professionali: es. "attenzione a PRECISIONE e SICUREZZA"

ESEMPIO CORPO EMAIL:
"Gentile Responsabile,

mi permetto di contattarVi per proporre la mia candidatura come VERNICIATORE INDUSTRIALE.

Ho maturato oltre 5 anni di esperienza nella verniciatura industriale di superfici metalliche, 
con competenze specifiche in [preparazione superfici], [verniciatura a spruzzo] e CONTROLLO QUALITÀ.

Sono abituato a lavorare nel rispetto delle norme di sicurezza e delle tempistiche produttive.

Sono disponibile con DISPONIBILITÀ IMMEDIATA e resto a disposizione per un colloquio conoscitivo.

Cordiali saluti"

Rispondi SOLO con un oggetto JSON valido (senza markdown, senza backticks):
{
  "oggetto": "Oggetto email (testo semplice)",
  "corpo": "Corpo email (testo semplice con evidenziazioni MAIUSCOLO o [parentesi])",
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
        model: 'google/gemini-3-flash-preview',
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
      
      // Pulizia: rimuovi formattazioni non compatibili con mailto
      const cleanForMailto = (text: string) => {
        if (!text) return text;
        return text
          .replace(/\*\*/g, '')           // Rimuovi Markdown
          .replace(/<\/?b>/gi, '')         // Rimuovi tag HTML <b>
          .replace(/<\/?strong>/gi, '')    // Rimuovi tag HTML <strong>
          .replace(/<\/?[^>]+(>|$)/g, ''); // Rimuovi qualsiasi altro tag HTML
      };
      
      // Pulisci oggetto (non deve avere formattazioni)
      if (emailData.oggetto) {
        emailData.oggetto = cleanForMailto(emailData.oggetto);
      }
      
      // Il corpo può mantenere MAIUSCOLO e [parentesi] ma non HTML/Markdown
      if (emailData.corpo) {
        emailData.corpo = emailData.corpo
          .replace(/\*\*/g, '')
          .replace(/<\/?b>/gi, '')
          .replace(/<\/?strong>/gi, '')
          .replace(/<\/?[^>]+(>|$)/g, '');
      }
      
      if (emailData.firma) {
        emailData.firma = emailData.firma
          .replace(/\*\*/g, '')
          .replace(/<\/?b>/gi, '')
          .replace(/<\/?strong>/gi, '')
          .replace(/<\/?[^>]+(>|$)/g, '');
      }
      
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
