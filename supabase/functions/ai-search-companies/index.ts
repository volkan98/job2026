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
  userCity?: string; // Città di residenza dell'utente per calcolo distanza
  onlySelectedCity?: boolean; // Se true, cerca SOLO nella città selezionata
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location, radius, keywords, cvSkills, targetRole, minResults = 30, userCity, onlySelectedCity = false }: SearchRequest = await req.json();

    if (!location || !keywords || keywords.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Location and keywords are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const originCity = userCity || location;
    console.log('AI deep searching companies in:', location, 'from:', originCity, 'keywords:', keywords, 'minResults:', minResults, 'onlySelectedCity:', onlySelectedCity);

    const aiGatewayUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
    const aiGatewayToken = Deno.env.get('LOVABLE_API_KEY');

    if (!aiGatewayToken) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Determine if it's a region/canton search
    const isRegionSearch = location.toLowerCase().includes('tutta la regione') || 
                           location.toLowerCase().includes('tutto il cantone') ||
                           location.toLowerCase().includes('intera provincia');

    // If onlySelectedCity is true, override region search and force single city
    let locationContext = '';
    if (onlySelectedCity) {
      locationContext = `ATTENZIONE CRITICA: L'utente ha selezionato "SOLO CITTÀ SELEZIONATA".
⚠️ Devi cercare aziende ESCLUSIVAMENTE nella città di "${location}" - nessun'altra città!
⚠️ NON includere aziende di città vicine, frazioni, o comuni limitrofi.
⚠️ La città nell'output JSON deve essere ESATTAMENTE "${location}" o al massimo una via/zona di "${location}".
⚠️ Se non trovi abbastanza aziende in questa città specifica, restituisci meno risultati ma NON espandere ad altre città.`;
    } else if (isRegionSearch) {
      locationContext = `IMPORTANTE: L'utente sta cercando in TUTTA LA REGIONE/CANTONE. Includi aziende da TUTTE le città e comuni della regione, non solo la città principale.`;
    } else {
      locationContext = `Cerca aziende nella zona di ${location} e comuni limitrofi entro ${radius} km.`;
    }

    const prompt = `Sei un agente di ricerca lavoro professionale svizzero/italiano con accesso a vaste banche dati aziendali. Il tuo compito è generare la lista PIÙ COMPLETA POSSIBILE di aziende reali CON PRIORITÀ ASSOLUTA ALLA RICERCA EMAIL VERIFICATE.

PUNTO DI PARTENZA UTENTE: ${originCity}
ZONA DI RICERCA:
- Località: ${location}
- Raggio: ${onlySelectedCity ? 'SOLO QUESTA CITTÀ - NESSUN RAGGIO' : `${radius} km`}
- Modalità: ${onlySelectedCity ? '🎯 SOLO CITTÀ SELEZIONATA - RICERCA CONCENTRATA' : 'Zona estesa'}

${locationContext}

SETTORI/KEYWORDS DI RICERCA:
${keywords.map(k => `- ${k}`).join('\n')}

${cvSkills?.length ? `COMPETENZE DEL CANDIDATO:\n${cvSkills.map(s => `- ${s}`).join('\n')}` : ''}
${targetRole ? `RUOLO TARGET: ${targetRole}` : ''}

═══════════════════════════════════════════════════════════════════════════════
PRIORITÀ ASSOLUTA N.1: RICERCA EMAIL VERIFICATA E REALE
═══════════════════════════════════════════════════════════════════════════════

Per OGNI azienda devi effettuare una RICERCA APPROFONDITA MULTI-LIVELLO dell'email:

PASSAGGIO 1 - ANALISI SITO UFFICIALE (obbligatorio):
- Analizza il sito web ufficiale dell'azienda
- NON fermarti alla homepage - esplora in profondità:
  • Pagina "Contatti" / "Contact" / "Kontakt"
  • Pagina "Impressum" / "Privacy" / "Note Legali"
  • Pagina "Lavora con noi" / "Careers" / "Jobs" / "Carriere" / "Stellenangebote"
  • Footer del sito (spesso contiene email)
  • Pagina "Chi siamo" / "About" / "Über uns"

PASSAGGIO 2 - DIRECTORY PUBBLICHE (verifica incrociata):
- local.ch, search.ch, yellow.ch (Svizzera)
- Pagine Gialle, Pagine Bianche, Virgilio Aziende (Italia)
- Comparis.ch, tutti.ch
- Registri imprese cantonali/regionali

PASSAGGIO 3 - VERIFICA INCROCIATA (obbligatorio se email da directory):
- Se trovi email su directory, VERIFICA che sia presente anche sul sito ufficiale
- Preferisci email trovate DIRETTAMENTE sul sito ufficiale dell'azienda

REGOLE INDEROGABILI PER EMAIL:
❌ NON INVENTARE MAI email
❌ NON DEDURRE email non presenti esplicitamente
❌ NON generare email basandoti su pattern (es. "probabilmente info@dominio.ch")
❌ NON includere email generiche inutili per candidature: info@, contact@, contatti@, amministrazione@, support@, noreply@, segreteria@, reception@, ufficio@, vendite@, sales@, marketing@, webmaster@, postmaster@
✅ Inserisci SOLO email UTILI PER CANDIDATURE LAVORATIVE
✅ Se non trovi email adatta a candidatura, metti NULL - è meglio null che email inutile
✅ Salva SEMPRE la fonte esatta dell'email (URL della pagina dove l'hai trovata)

⚠️ REGOLA CRITICA - FILTRAGGIO EMAIL PER CANDIDATURA:
L'obiettivo è trovare email dove inviare un CV con alta probabilità di essere LETTO da chi si occupa di selezione.

PRIORITÀ EMAIL (in ordine di preferenza - SOLO queste categorie):
1. 🟢 Email HR/Recruiting: hr@, jobs@, careers@, recruiting@, personale@, karriere@, lavoro@, selezione@, bewerbung@, risorse.umane@, human.resources@
2. 🟢 Email nominative di responsabili HR/recruiting (nome.cognome@azienda.com) trovate su pagina "Lavora con noi" o "Team"
3. 🟡 Email nominative generiche (nome.cognome@azienda.com) di titolari/direttori - SOLO per PMI dove il titolare gestisce le assunzioni
4. 🔴 ESCLUDI TUTTO IL RESTO: info@, contact@, admin@, support@, noreply@, segreteria@, reception@, vendite@, sales@, marketing@, ufficio@

Se un'azienda ha SOLO email generiche (info@, contact@, ecc.) e NESSUNA email HR/nominativa → metti email = null

LIVELLI DI VERIFICA EMAIL:
- "verified_official" = Email HR/recruiting trovata direttamente sul sito ufficiale dell'azienda
- "verified_directory" = Email trovata su directory pubblica E confermata sul sito ufficiale
- "directory_only" = Email trovata solo su directory, non confermata sul sito
- "unverified" = Email incerta o non verificabile
- null = Nessuna email adatta a candidatura trovata

FONTI DA CONSIDERARE:
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
4. Includi aziende di settori CORRELATI ma SOLO se sono potenziali DATORI DI LAVORO

⚠️ REGOLA CRITICA - FILTRAGGIO TIPOLOGIA AZIENDA:
Le keywords/settori indicati rappresentano il LAVORO che il candidato vuole FARE, NON i prodotti che vuole comprare.
Devi trovare aziende che ASSUMONO persone per svolgere quel tipo di lavoro.

ESEMPI DI FILTRAGGIO CORRETTO:
- Keyword "Verniciatura" → ✅ Carrozzerie, imprese edili, aziende di verniciatura industriale, cantieri navali
                          → ❌ Negozi di vernici, colorifici, ferramenta che vendono pittura
- Keyword "Elettricista" → ✅ Imprese elettriche, ditte di installazione, aziende di manutenzione
                          → ❌ Negozi di materiale elettrico, rivenditori di componenti
- Keyword "Cucina"       → ✅ Ristoranti, hotel, catering, mense aziendali
                          → ❌ Negozi di cucine, showroom di arredamento
- Keyword "Meccanica"    → ✅ Officine meccaniche, aziende di produzione, manutenzione industriale
                          → ❌ Rivenditori di ricambi, negozi di auto

PRINCIPIO: L'azienda deve avere BISOGNO di un lavoratore con quelle competenze, non vendere prodotti correlati.

CALCOLO DISTANZA E TEMPO DI PERCORRENZA - STIMA REALISTICA OBBLIGATORIA:
- Calcola la distanza approssimativa in km da "${originCity}" per OGNI azienda
- Calcola il tempo di percorrenza IN AUTO con STIMA REALISTICA, NON teorica

FATTORI DA CONSIDERARE PER IL TEMPO:
1. Tipologia strade: strade di montagna, tornanti, statali strette = più lente
2. Passaggi di confine Italia-Svizzera: aggiungi 5-15 min per code e controlli
3. Zone urbane congestionate: ingresso città come Lugano, Como = rallentamenti
4. Orari di punta (mattino 7-9, sera 17-19): considera traffico medio
5. Strade reali, non linea d'aria: es. Laino-Lugano sono ~25km ma 30-45 min reali

REGOLE TEMPO:
- NON usare formule teoriche tipo "km/velocità"
- Preferisci stime PRUDENTI, non ottimistiche
- Se c'è incertezza, arrotonda PER ECCESSO
- Usa intervalli quando appropriato: "30-40 min", "circa 35 min"
- Formato: "X min" oppure "Xh Ymin" (es. "35-45 min", "circa 40 min", "1h 15min")

ORDINAMENTO RISULTATI - IMPORTANTE:
1. PRIMA le aziende con email verificata (verified_official, verified_directory)
2. POI le aziende con email da directory
3. INFINE le aziende senza email
4. All'interno di ogni gruppo, ordina per distanza crescente

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
    "email": "hr@esempio.ch o null se non trovata/verificata",
    "email_verified": "verified_official|verified_directory|directory_only|unverified|null",
    "email_source": "URL esatto dove è stata trovata l'email (es. https://www.esempio.ch/contatti) o null",
    "phone": "+41 XX XXX XX XX o null",
    "contact_type": "generic|hr|jobs|form_only|phone_only",
    "source": "Fonte suggerita per verifica",
    "match_score": 85,
    "match_reasons": ["motivo1", "motivo2"],
    "distance_km": 15,
    "travel_time": "25 min"
  }
]`;

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
            role: 'system',
            content: `Sei un database vivente di aziende svizzere e italiane specializzato nella ricerca di contatti HR e recruiting REALMENTE FUNZIONANTI.

LA TUA PRIORITÀ ASSOLUTA È TROVARE EMAIL DI RECRUITING/HR VERIFICATE, ATTIVE E CON ALTA DELIVERABILITY.
L'utente sta cercando lavoro - ha bisogno di email dove inviare il suo CV con CERTEZZA di consegna.

Per ogni azienda che includi:
1. DEVI aver "visto" l'email in una fonte pubblica verificabile e RECENTE (ultimi 12 mesi)
2. DEVI indicare esattamente DOVE hai trovato l'email (URL specifico)
3. DEVI indicare il livello di verifica dell'email
4. Se non trovi un'email HR/recruiting REALE, VERIFICATA e ATTIVA, metti null - MAI inventare
5. NON includere email generiche (info@, contact@, support@) - sono INUTILI per candidature
6. Se un'azienda ha SOLO email generiche → ESCLUDI l'azienda dal risultato

ESCLUDI SEMPRE: info@, contact@, contatti@, admin@, support@, noreply@, segreteria@, reception@, vendite@, sales@, marketing@
CERCA SEMPRE: hr@, jobs@, careers@, recruiting@, personale@, oppure email nominative di responsabili HR

DELIVERABILITY - REGOLE CRITICHE:
- ESCLUDI domini noti per bloccare allegati o rifiutare email da Gmail/Hotmail
- ESCLUDI email catch-all su domini sospetti
- PREFERISCI domini aziendali attivi con sito web funzionante
- ESCLUDI email su domini scaduti, parcheggiati o non raggiungibili
- Se hai dubbi sulla funzionalità dell'email → NON includerla

RISULTATO IDEALE: Meglio 5 aziende con email HR verificate e funzionanti che 50 con email dubbie o generiche.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7, // Abbassato per maggiore accuratezza
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

    // Parse JSON from response - handle truncated responses
    let companies;
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }
      
      // Try to parse as-is first
      try {
        companies = JSON.parse(jsonStr);
      } catch {
        // If parsing fails, try to recover partial JSON array
        console.log('Initial parse failed, attempting recovery...');
        
        // Find the last complete object in the array
        let lastValidIndex = jsonStr.lastIndexOf('}');
        while (lastValidIndex > 0) {
          const testStr = jsonStr.substring(0, lastValidIndex + 1) + ']';
          try {
            companies = JSON.parse(testStr);
            console.log('Recovered', companies.length, 'companies from truncated response');
            break;
          } catch {
            // Find the previous closing brace
            lastValidIndex = jsonStr.lastIndexOf('}', lastValidIndex - 1);
          }
        }
        
        if (!companies) {
          throw new Error('Could not recover valid JSON');
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content.substring(0, 500) + '...');
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

    // Generic email prefixes to reject (not useful for job applications)
    const genericPrefixes = [
      'info', 'contact', 'contatti', 'contatto', 'amministrazione', 'admin',
      'support', 'supporto', 'noreply', 'no-reply', 'segreteria', 'reception',
      'ufficio', 'vendite', 'sales', 'marketing', 'webmaster', 'postmaster',
      'office', 'hello', 'help', 'service', 'general', 'mail', 'email',
      'direzione', 'comunicazione', 'press', 'stampa', 'billing', 'invoice',
      'fatturazione', 'acquisti', 'procurement', 'ordini', 'orders'
    ];

    // Clean and validate email data
    companies = companies.map((c: any) => {
      let email = c.email;
      let emailVerified = c.email_verified || null;
      let emailSource = c.email_source || null;
      
      if (email) {
        email = email.trim().toLowerCase();
        // Check for null-like strings
        if (['null', 'n/a', 'undefined', 'none', '-', ''].includes(email)) {
          email = null;
          emailVerified = null;
          emailSource = null;
        }
      }
      
      // Filter out generic emails not useful for job applications
      if (email) {
        const prefix = email.split('@')[0];
        if (genericPrefixes.includes(prefix)) {
          console.log(`Filtered generic email: ${email} for ${c.name}`);
          email = null;
          emailVerified = null;
          emailSource = null;
        }
      }
      
      // If email exists but no verification level, mark as unverified
      if (email && !emailVerified) {
        emailVerified = 'unverified';
      }
      
      return {
        ...c,
        email,
        email_verified: email ? emailVerified : null,
        email_source: email ? emailSource : null,
      };
    });

    // Sort by email verification status first, then by distance
    const verificationPriority: Record<string, number> = {
      'verified_official': 1,
      'verified_directory': 2,
      'directory_only': 3,
      'unverified': 4,
    };

    companies.sort((a: any, b: any) => {
      // First sort by email existence
      const aHasEmail = a.email ? 1 : 0;
      const bHasEmail = b.email ? 1 : 0;
      if (aHasEmail !== bHasEmail) return bHasEmail - aHasEmail; // Email first
      
      // Then by verification level
      if (a.email && b.email) {
        const aPriority = verificationPriority[a.email_verified] || 5;
        const bPriority = verificationPriority[b.email_verified] || 5;
        if (aPriority !== bPriority) return aPriority - bPriority;
      }
      
      // Finally by distance
      return (a.distance_km || 999) - (b.distance_km || 999);
    });

    // Count email statistics
    const emailStats = {
      total: companies.length,
      withEmail: companies.filter((c: any) => c.email).length,
      verified: companies.filter((c: any) => ['verified_official', 'verified_directory'].includes(c.email_verified)).length,
    };

    console.log('Found', companies.length, 'companies. Email stats:', emailStats);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: companies, 
        total: companies.length, 
        originCity,
        emailStats 
      }),
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
