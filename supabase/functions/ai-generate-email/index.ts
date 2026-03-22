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
      breve: 'Email BREVE: massimo 120-150 parole nel corpo. Vai dritto al punto. 2-3 competenze chiave.',
      standard: 'Email STANDARD: massimo 150-200 parole nel corpo. 3-4 punti specifici. Struttura chiara.',
      formale: 'Email FORMALE: massimo 180-220 parole nel corpo. Tono istituzionale svizzero. Struttura classica.'
    };

    const prompt = `Sei un esperto di recruiting e comunicazione professionale in Svizzera (Ticino).
Genera un'email di candidatura spontanea in italiano che un recruiter può leggere e capire in 10 secondi.

AZIENDA:
- Nome: ${company.name}
- Settore: ${company.sector || 'Non specificato'}
- Città: ${company.city || 'Non specificata'}
- Sito web: ${company.website || 'Non disponibile'}

CANDIDATO:
- Nome: ${cvData.nome} ${cvData.cognome}
- Email: ${cvData.email}
- Telefono: ${cvData.telefono}
- Città: ${cvData.citta}
- Profilo: ${cvData.profilo}
- Competenze: ${cvData.competenze?.join(', ') || 'Non specificate'}
- Sintesi CV: ${cvData.sintesiBreve}
${targetRole ? `- Ruolo desiderato: ${targetRole}` : ''}
${availability ? `- Disponibilità: ${availability}` : '- Disponibilità: immediata'}

LUNGHEZZA: ${variantInstructions[variant]}

═══════════════════════════════════════
REGOLE DI STILE SVIZZERO (OBBLIGATORIE)
═══════════════════════════════════════

1. STRUTTURA A BLOCCHI SEPARATI
   - Ogni paragrafo = massimo 2-3 righe
   - Paragrafi separati da una riga vuota
   - VIETATO il muro di testo
   - Ogni paragrafo ha UNO scopo preciso

2. GRASSETTO STRATEGICO (tag <b>)
   Usa <b>...</b> SOLO per 4-6 elementi chiave nell'intera email:
   - Il ruolo proposto (es: <b>Operaio specializzato – Verniciatura industriale</b>)
   - 2-3 competenze tecniche principali (es: <b>verniciatura a spruzzo</b>, <b>controllo qualità</b>)
   - La disponibilità (es: <b>disponibilità immediata</b>)
   - Un punto di forza differenziante
   NON abusare: massimo 6 grassetti in tutta l'email.

3. TONO
   - Diretto, concreto, zero giri di parole
   - Professionale ma semplice
   - Sicuro, non disperato, non servile
   - NO frasi generiche tipo "sono motivato e desideroso di nuove sfide"
   - SÌ frasi concrete tipo "porto esperienza nella verniciatura industriale e nel controllo qualità"

4. PERSONALIZZAZIONE OBBLIGATORIA
   - Menziona SEMPRE il nome dell'azienda
   - Se il settore è noto, collega le competenze al settore
   - Se la città è nota, menziona la vicinanza geografica

5. STRUTTURA DELL'EMAIL (5 blocchi):

   A. APERTURA (1-2 righe):
      Saluto + chi sei + perché scrivi a LORO
      Es: "mi rivolgo a ${company.name} per proporre la mia candidatura come <b>[ruolo]</b>."

   B. VALORE (2-3 righe):
      Le tue 2-3 competenze principali con esperienza concreta
      Usa grassetto per le skill chiave

   C. DIFFERENZIAZIONE (1-2 righe):
      Cosa ti rende utile per loro specificamente
      Precisione, qualità, autonomia, affidabilità

   D. LOGISTICA (1 riga):
      Posizione geografica + disponibilità (in grassetto)

   E. CHIUSURA (1 riga):
      Semplice invito al contatto, cordiali saluti

6. FORMATTAZIONE
   - L'email viene inviata come HTML
   - Usa <b>...</b> per il grassetto (NON ** markdown, NON maiuscolo)
   - NON usare elenchi puntati, bullet, o liste numerate
   - Scrivi in paragrafi fluidi e naturali
   - La firma NON fa parte del corpo

═══════════════════════════════════════
ESEMPIO DI EMAIL PERFETTA
═══════════════════════════════════════

"Gentile Responsabile,

mi permetto di contattare ${company.name} per proporre la mia candidatura come <b>Operaio specializzato – Verniciatura industriale</b>.

Ho maturato esperienza concreta nella <b>verniciatura a spruzzo</b> di componenti metallici, nella <b>preparazione superfici</b> e nel <b>controllo qualità</b> del prodotto finito. Sono abituato a lavorare con precisione nel rispetto delle tempistiche produttive e delle norme di sicurezza.

La mia attenzione al dettaglio e l'abitudine a operare in autonomia mi permettono di integrarmi rapidamente in contesti produttivi strutturati.

Risiedo a ${cvData.citta} e sono disponibile con <b>disponibilità immediata</b>.

Resto a disposizione per un colloquio conoscitivo.

Cordiali saluti"

═══════════════════════════════════════

Rispondi SOLO con un oggetto JSON valido (senza markdown, senza backtick):
{
  "oggetto": "Oggetto email (testo semplice, senza grassetto)",
  "corpo": "Corpo email HTML con <b> per grassetto. Paragrafi separati da doppio a-capo.",
  "firma": "${cvData.nome} ${cvData.cognome}\\n${cvData.email}\\n${cvData.telefono}",
  "matchPoints": ["competenza1 matchata", "competenza2 matchata", "competenza3 matchata"]
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
        temperature: 0.6,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Troppo richieste AI, riprova tra qualche secondo.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Crediti AI esauriti. Aggiungi crediti nelle impostazioni.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
      
      // Clean subject line (no HTML in subject)
      if (emailData.oggetto) {
        emailData.oggetto = emailData.oggetto
          .replace(/<\/?[^>]+(>|$)/g, '')
          .replace(/\*\*/g, '');
      }

      // Keep <b> tags in corpo, remove everything else
      if (emailData.corpo) {
        // Remove markdown bold if AI used it instead of HTML
        emailData.corpo = emailData.corpo
          .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        
        // Only allow <b> and </b> tags, remove any other HTML
        emailData.corpo = emailData.corpo
          .replace(/<(?!\/?b(?:\s|>))[^>]+>/gi, '');
      }
      
      // Clean firma
      if (emailData.firma) {
        emailData.firma = emailData.firma
          .replace(/<\/?[^>]+(>|$)/g, '')
          .replace(/\*\*/g, '');
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
