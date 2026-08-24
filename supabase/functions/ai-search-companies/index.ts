const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SearchRequest {
  location: string;
  radius: number;
  keywords: string[];
  cvSkills?: string[];
  targetRole?: string;
  minResults?: number;
  userCity?: string;
  onlySelectedCity?: boolean;
}

interface CompanyResult {
  name: string;
  sector?: string;
  address?: string;
  city?: string;
  website?: string;
  email?: string | null;
  email_verified?: string | null;
  email_source?: string | null;
  phone?: string | null;
  contact_type?: string;
  source?: string;
  match_score?: number;
  match_reasons?: string[];
  distance_km?: number;
  travel_time?: string;
  domain_valid?: boolean | null;
  email_explicit?: boolean;
  email_source_type?:
    | "page_text"
    | "mailto"
    | "verified_directory"
    | "unknown"
    | null;
  smtp_status?:
    | "valid_email"
    | "invalid_email"
    | "unverifiable_email"
    | "catch_all_domain"
    | null;
  catch_all?: boolean | null;
  confidence_score?: number;
  final_status?: "ready_to_send" | "risky_send" | "discarded";
  contact_form_url?: string | null;
}

const GENERIC_PREFIXES = new Set([
  "info",
  "contact",
  "contatti",
  "contatto",
  "amministrazione",
  "admin",
  "support",
  "supporto",
  "noreply",
  "no-reply",
  "segreteria",
  "reception",
  "ufficio",
  "vendite",
  "sales",
  "marketing",
  "webmaster",
  "postmaster",
  "office",
  "hello",
  "help",
  "service",
  "general",
  "mail",
  "email",
  "direzione",
  "comunicazione",
  "press",
  "stampa",
  "billing",
  "invoice",
  "fatturazione",
  "acquisti",
  "procurement",
  "ordini",
  "orders",
  "feedback",
  "newsletter",
  "subscribe",
  "unsubscribe",
  "abuse",
  "privacy",
  "legal",
  "compliance",
  "accounting",
  "contabilita",
  "commerciale",
  "tecnico",
  "assistenza",
  "prenotazioni",
  "booking",
  "reservation",
  "shop",
  "store",
  "ecommerce",
]);

const SUSPICIOUS_DOMAINS = new Set([
  "example.com",
  "test.com",
  "localhost",
  "email.com",
  "mail.com",
  "temp-mail.org",
  "guerrillamail.com",
  "mailinator.com",
]);

async function resolveDnsRecord(domain: string, type: "MX" | "A") {
  const response = await fetch(
    `https://dns.google/resolve?name=${domain}&type=${type}`,
    {
      signal: AbortSignal.timeout(3000),
    },
  );
  if (!response.ok) return null;
  return response.json();
}

async function validateEmailDomain(email: string): Promise<boolean> {
  try {
    const domain = email.split("@")[1];
    if (!domain) return false;

    const mxData = await resolveDnsRecord(domain, "MX");
    if (mxData?.Status === 0 && mxData?.Answer?.length > 0) {
      return true;
    }

    const aData = await resolveDnsRecord(domain, "A");
    return !!(aData?.Status === 0 && aData?.Answer?.length > 0);
  } catch (error) {
    console.log(`DNS validation failed for ${email}:`, error);
    return false;
  }
}

async function classifyRecipientEmail(email: string): Promise<{
  smtp_status:
    | "valid_email"
    | "invalid_email"
    | "unverifiable_email"
    | "catch_all_domain";
  catch_all: boolean;
}> {
  const domain = email.split("@")[1];
  const localPart = email.split("@")[0];

  if (!domain || !localPart) {
    return { smtp_status: "invalid_email", catch_all: false };
  }

  try {
    const hasValidDomain = await validateEmailDomain(email);
    if (!hasValidDomain) {
      return { smtp_status: "invalid_email", catch_all: false };
    }

    if (GENERIC_PREFIXES.has(localPart)) {
      return { smtp_status: "invalid_email", catch_all: false };
    }

    // Best-effort classification only: true SMTP recipient validation is often blocked by providers.
    // We classify known risky patterns conservatively to minimize bounce risk.
    if (localPart.length < 2 || /^[0-9]+$/.test(localPart)) {
      return { smtp_status: "unverifiable_email", catch_all: false };
    }

    // Heuristic catch-all / role-based risky mailbox detection.
    const riskyRoleMailbox = [
      "team",
      "jobs",
      "career",
      "careers",
      "recruiting",
      "hr",
      "personnel",
    ].includes(localPart);

    if (riskyRoleMailbox) {
      return { smtp_status: "catch_all_domain", catch_all: true };
    }

    // For explicit, non-generic addresses on a real domain we treat the contact as valid.
    // True SMTP recipient verification is often blocked, so being stricter here would make
    // Auto Mode discard almost every result.
    return { smtp_status: "valid_email", catch_all: false };
  } catch (error) {
    console.log(`Recipient classification failed for ${email}:`, error);
    return { smtp_status: "unverifiable_email", catch_all: false };
  }
}

async function batchValidateEmails(
  companies: CompanyResult[],
): Promise<
  Map<string, {
    domain_valid: boolean;
    smtp_status:
      | "valid_email"
      | "invalid_email"
      | "unverifiable_email"
      | "catch_all_domain";
    catch_all: boolean;
  }>
> {
  const results = new Map<string, {
    domain_valid: boolean;
    smtp_status:
      | "valid_email"
      | "invalid_email"
      | "unverifiable_email"
      | "catch_all_domain";
    catch_all: boolean;
  }>();

  const emails = [
    ...new Set(companies.map((c) => c.email).filter(Boolean) as string[]),
  ];
  const batchSize = 8;

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const validations = await Promise.all(batch.map(async (email) => {
      const domain_valid = await validateEmailDomain(email);
      const recipient = domain_valid
        ? await classifyRecipientEmail(email)
        : { smtp_status: "invalid_email" as const, catch_all: false };

      return {
        email,
        domain_valid,
        smtp_status: recipient.smtp_status,
        catch_all: recipient.catch_all,
      };
    }));

    for (const result of validations) {
      results.set(result.email, result);
    }
  }

  return results;
}

function detectSourceType(
  source: string | null,
): "page_text" | "mailto" | "verified_directory" | "unknown" | null {
  if (!source) return null;
  const lower = source.toLowerCase();
  if (lower.includes("mailto:")) return "mailto";
  if (
    lower.includes("local.ch") || lower.includes("search.ch") ||
    lower.includes("yellow.ch") || lower.includes("paginegialle")
  ) {
    return "verified_directory";
  }
  if (lower.startsWith("http")) return "page_text";
  return "unknown";
}

function computeConfidence(company: CompanyResult): number {
  if (!company.email) return 0;
  if (company.smtp_status === "invalid_email") return 0;
  if (
    company.email_source_type === "page_text" &&
    company.smtp_status === "valid_email"
  ) return 100;
  if (
    company.email_source_type === "mailto" &&
    company.smtp_status === "valid_email"
  ) return 95;
  if (
    company.email_source_type === "page_text" &&
    company.smtp_status === "unverifiable_email"
  ) return 80;
  if (
    company.email_source_type === "mailto" &&
    company.smtp_status === "unverifiable_email"
  ) return 75;
  if (company.email_source_type === "verified_directory") return 60;
  if (company.smtp_status === "catch_all_domain") return 50;
  return 40;
}

function determineFinalStatus(
  company: CompanyResult,
): "ready_to_send" | "risky_send" | "discarded" {
  if (
    !company.email || company.smtp_status === "invalid_email" ||
    company.confidence_score === 0
  ) {
    return "discarded";
  }
  if (company.smtp_status === "valid_email" && company.confidence_score >= 95) {
    return "ready_to_send";
  }
  return "risky_send";
}

function cleanCompany(c: any): CompanyResult | null {
  if (!c || !c.name) return null;

  let email = c.email;
  let emailVerified = c.email_verified || null;
  let emailSource = c.email_source || null;
  const emailSourceType = detectSourceType(emailSource);

  if (email) {
    email = email.trim().toLowerCase();
    if (
      ["null", "n/a", "undefined", "none", "-", "", "na", "n.a.", "nessuna"]
        .includes(email)
    ) {
      email = null;
      emailVerified = null;
      emailSource = null;
    }
  }

  if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    email = null;
    emailVerified = null;
    emailSource = null;
  }

  if (email) {
    const prefix = email.split("@")[0];
    const domain = email.split("@")[1];
    if (
      GENERIC_PREFIXES.has(prefix) || (domain && SUSPICIOUS_DOMAINS.has(domain))
    ) {
      email = null;
      emailVerified = null;
      emailSource = null;
    }
  }

  if (
    email &&
    (!emailSource || emailSource === "null" || emailSource === "n/a" ||
      emailSource.trim() === "")
  ) {
    console.log(`Rejected email without source: ${email} for ${c.name}`);
    email = null;
    emailVerified = null;
    emailSource = null;
  }

  // Accept only explicit sources.
  const emailExplicit = !!email && !!emailSource &&
    ["page_text", "mailto", "verified_directory"].includes(
      emailSourceType || "",
    );
  if (email && !emailExplicit) {
    console.log(`Rejected non-explicit email source: ${email} for ${c.name}`);
    email = null;
    emailVerified = null;
    emailSource = null;
  }

  if (email && !emailVerified) emailVerified = "unverified";

  return {
    name: c.name,
    sector: c.sector || "",
    address: c.address || "",
    city: c.city || "",
    website: c.website || "",
    email: email || null,
    email_verified: email ? emailVerified : null,
    email_source: email
      ? (emailSource && emailSource !== "null" && emailSource !== "n/a"
        ? emailSource
        : null)
      : null,
    phone: c.phone || null,
    contact_type: c.contact_type ||
      (c.contact_form_url ? "form_only" : "generic"),
    source: c.source || "AI Search",
    match_score: c.match_score || 0,
    match_reasons: c.match_reasons || [],
    distance_km: c.distance_km || 0,
    travel_time: c.travel_time || "",
    domain_valid: null,
    email_explicit: email ? emailExplicit : false,
    email_source_type: email ? emailSourceType : null,
    smtp_status: null,
    catch_all: null,
    confidence_score: email ? 40 : 0,
    final_status: email ? "risky_send" : "discarded",
    contact_form_url: c.contact_form_url || null,
  };
}

function parseCompaniesJSON(content: string): any[] {
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // Recovery: find last complete object
    let lastValidIndex = jsonStr.lastIndexOf("}");
    while (lastValidIndex > 0) {
      try {
        const result = JSON.parse(
          jsonStr.substring(0, lastValidIndex + 1) + "]",
        );
        return Array.isArray(result) ? result : [];
      } catch {
        lastValidIndex = jsonStr.lastIndexOf("}", lastValidIndex - 1);
      }
    }
    return [];
  }
}

function normalizeCompanyName(name: string): string {
  return name.toLowerCase().trim()
    .replace(
      /\s*(sa|sagl|srl|spa|snc|sas|ag|gmbh|ltd|s\.a\.|s\.r\.l\.)\s*$/i,
      "",
    )
    .replace(/[^a-z0-9àèéìòù]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function aiSearch(
  aiGatewayUrl: string,
  aiGatewayToken: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 32000,
): Promise<any[]> {
  try {
    const response = await fetch(aiGatewayUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${aiGatewayToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return [];
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) return [];

    return parseCompaniesJSON(content);
  } catch (error) {
    console.error("AI search call failed:", error);
    return [];
  }
}

// Query expansion: generate related keywords
function expandKeywords(keywords: string[]): string[][] {
  const expansions: Record<string, string[][]> = {
    "produzione": [
      [
        "manifattura",
        "manufacturing",
        "fabbrica",
        "stabilimento",
        "impianto produttivo",
      ],
      ["assemblaggio", "lavorazione", "trasformazione", "confezionamento"],
    ],
    "metalmeccanica": [
      [
        "meccanica di precisione",
        "torneria",
        "fresatura",
        "carpenteria metallica",
      ],
      ["lavorazione metalli", "saldatura", "stampaggio", "fonderia"],
    ],
    "packaging": [
      [
        "imballaggio",
        "confezionamento",
        "etichettatura",
        "packaging industriale",
      ],
      ["cartotecnica", "plastica", "materiali da imballaggio"],
    ],
    "farmaceutico": [
      ["pharma", "biotech", "medicale", "dispositivi medici", "cosmetico"],
      ["laboratorio", "chimica fine", "life science", "healthcare"],
    ],
    "logistica": [
      ["trasporti", "spedizioni", "magazzino", "supply chain", "distribuzione"],
      ["corriere", "import export", "dogana", "freight forwarding"],
    ],
    "verniciatura": [
      ["carrozzeria", "verniciatura industriale", "trattamento superfici"],
      ["sabbiatura", "galvanica", "rivestimenti", "powder coating"],
    ],
    "alimentare": [
      ["food", "bevande", "panificio", "pasticceria", "gastronomia"],
      ["ristorazione", "catering", "mensa", "hotel", "bar"],
    ],
    "agenzie": [
      [
        "agenzia interinale",
        "agenzia di collocamento",
        "somministrazione lavoro",
        "temporary staffing",
      ],
      ["recruitment", "head hunting", "selezione personale", "risorse umane"],
    ],
  };

  const result: string[][] = [];
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    if (expansions[kwLower]) {
      result.push(...expansions[kwLower]);
    }
  }
  return result;
}

// Generate location variants
function expandLocations(
  location: string,
  radius: number,
  onlySelectedCity: boolean,
): string[] {
  if (onlySelectedCity) return [];

  const ticinoCities = [
    "Lugano",
    "Bellinzona",
    "Locarno",
    "Mendrisio",
    "Chiasso",
    "Paradiso",
    "Grancia",
    "Massagno",
    "Viganello",
    "Pregassona",
    "Bioggio",
    "Agno",
    "Manno",
    "Lamone",
    "Cadempino",
    "Muzzano",
    "Sorengo",
    "Canobbio",
    "Porza",
    "Savosa",
    "Noranco",
    "Breganzona",
    "Stabio",
    "Coldrerio",
    "Balerna",
    "Novazzano",
    "Vacallo",
    "Morbio Inferiore",
    "Caslano",
    "Magliaso",
    "Rivera",
    "Monte Carasso",
    "Giubiasco",
    "Cadenazzo",
    "Sant'Antonino",
    "Arbedo-Castione",
  ];
  const lombardiaCities = [
    "Como",
    "Varese",
    "Milano",
    "Monza",
    "Lecco",
    "Cantù",
    "Erba",
    "Mariano Comense",
    "Saronno",
    "Busto Arsizio",
    "Gallarate",
  ];

  const locationLower = location.toLowerCase();
  const variants: string[] = [];

  // If searching in Ticino area
  if (
    ticinoCities.some((c) => locationLower.includes(c.toLowerCase())) ||
    locationLower.includes("ticino") || locationLower.includes("lugano")
  ) {
    if (radius >= 20) {
      variants.push("Canton Ticino, Svizzera");
    }
    if (radius >= 50) {
      variants.push("Como e provincia, Italia");
      variants.push("Varese e provincia, Italia");
    }
  }

  // If searching in Lombardia
  if (
    lombardiaCities.some((c) => locationLower.includes(c.toLowerCase())) ||
    locationLower.includes("lombardia")
  ) {
    if (radius >= 30) {
      variants.push("Province di Como, Varese, Lecco, Italia");
    }
    if (radius >= 50) {
      variants.push("Canton Ticino, Svizzera");
    }
  }

  return variants;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      location,
      radius,
      keywords,
      cvSkills,
      targetRole,
      minResults = 30,
      userCity,
      onlySelectedCity = false,
    }: SearchRequest = await req.json();

    if (!location || !keywords || keywords.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Location and keywords are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const originCity = userCity || location;
    const aiGatewayUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
    const aiGatewayToken = Deno.env.get("LOVABLE_API_KEY");

    if (!aiGatewayToken) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log(
      `=== MULTI-PASS SEARCH START === Target: ${minResults}, Location: ${location}, Keywords: ${
        keywords.join(", ")
      }`,
    );

    // Track all unique companies across passes
    const allCompanies = new Map<string, CompanyResult>();
    const searchStats = {
      totalPasses: 0,
      totalAiCalls: 0,
      companiesPerPass: [] as { pass: string; found: number; new: number }[],
      stoppedReason: "",
    };

    const addCompanies = (rawCompanies: any[], passName: string): number => {
      let newCount = 0;
      for (const raw of rawCompanies) {
        const cleaned = cleanCompany(raw);
        if (!cleaned) continue;
        const key = normalizeCompanyName(cleaned.name);
        // Also check by website domain
        const websiteKey = cleaned.website
          ? cleaned.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]
            .toLowerCase()
          : "";

        if (
          !allCompanies.has(key) &&
          (!websiteKey || !Array.from(allCompanies.values()).some((c) => {
            const existingWebsite = c.website
              ? c.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]
                .toLowerCase()
              : "";
            return existingWebsite && existingWebsite === websiteKey;
          }))
        ) {
          allCompanies.set(key, cleaned);
          newCount++;
        }
      }
      return newCount;
    };

    // Location context for prompts
    let locationContext = "";
    if (onlySelectedCity) {
      locationContext =
        `CERCA ESCLUSIVAMENTE nella città di "${location}" - NESSUN'altra città!`;
    } else {
      locationContext =
        `Cerca nella zona di ${location} e comuni limitrofi entro ${radius} km.`;
    }

    const baseSystemPrompt =
      `Sei un esperto database vivente di aziende svizzere e italiane. Il tuo compito è generare una lista di aziende REALI.

⛔ REGOLA ASSOLUTA: NON INVENTARE, NON DEDURRE, NON IPOTIZZARE email.
Inserisci un'email SOLO se compare ESPLICITAMENTE nella fonte.

ACCETTA email SOLO se:
- compare nel testo della pagina
- oppure è presente in un link mailto:
- oppure proviene da una fonte pubblica verificabile con URL esatto

NON accettare email dedotte dal pattern del dominio.
NON accettare email ipotetiche come info@, hr@, jobs@ se non sono scritte esplicitamente nella fonte.
Se hai dubbi → email = null.

ESCLUDI sempre: info@, contact@, admin@, support@, noreply@, segreteria@, vendite@, marketing@
CERCA solo contatti utili a candidature lavorative.

Per ogni azienda restituisci anche:
- email_source_type: page_text | mailto | verified_directory | unknown
- contact_form_url: URL del form contatto/careers se disponibile

Le keyword rappresentano il lavoro che il candidato vuole fare.
Trova datori di lavoro reali, non rivenditori di prodotti correlati.

Rispondi SOLO con un array JSON valido.
Formato: [{"name":"...","sector":"...","address":"...","city":"...","website":"...","email":"...o null","email_verified":"verified_official|verified_directory|directory_only|unverified|null","email_source":"URL o null","email_source_type":"page_text|mailto|verified_directory|unknown|null","phone":"...o null","contact_type":"generic|hr|jobs|form_only|phone_only","source":"...","match_score":85,"match_reasons":["..."],"distance_km":15,"travel_time":"25 min","contact_form_url":"https://... o null"}]`;

    const targetCount = minResults;

    // ═══════════════════════════════════════════════
    // PASS 1: Main search with primary keywords
    // ═══════════════════════════════════════════════
    console.log("--- PASS 1: Primary search ---");
    searchStats.totalPasses++;
    searchStats.totalAiCalls++;

    const pass1Prompt = `Cerca ALMENO ${
      Math.min(targetCount, 40)
    } aziende reali nella zona specificata.

PUNTO DI PARTENZA: ${originCity}
ZONA: ${location} (${
      onlySelectedCity ? "SOLO questa città" : `raggio ${radius} km`
    })
${locationContext}

SETTORI/KEYWORDS: ${keywords.join(", ")}
${cvSkills?.length ? `COMPETENZE CANDIDATO: ${cvSkills.join(", ")}` : ""}
${targetRole ? `RUOLO TARGET: ${targetRole}` : ""}

FONTI: local.ch, search.ch, yellow.ch, Pagine Gialle, Comparis.ch, LinkedIn, siti aziendali, registri imprese, camere di commercio.

Includi: multinazionali locali, medie imprese, PMI, artigiani, studi professionali, cooperative, agenzie.
Calcola distanza e tempo di percorrenza da ${originCity} per ogni azienda.
Ordina per: 1) aziende con email HR verificata 2) con email 3) senza email. Poi per distanza.`;

    const pass1Results = await aiSearch(
      aiGatewayUrl,
      aiGatewayToken,
      baseSystemPrompt,
      pass1Prompt,
    );
    const pass1New = addCompanies(pass1Results, "Pass 1: Ricerca principale");
    searchStats.companiesPerPass.push({
      pass: "Ricerca principale",
      found: pass1Results.length,
      new: pass1New,
    });
    console.log(
      `Pass 1: Found ${pass1Results.length}, New unique: ${pass1New}, Total: ${allCompanies.size}`,
    );

    // ═══════════════════════════════════════════════
    // PASS 2: Expanded keywords with synonyms
    // ═══════════════════════════════════════════════
    if (allCompanies.size < targetCount) {
      console.log("--- PASS 2: Keyword expansion ---");
      searchStats.totalPasses++;

      const expandedGroups = expandKeywords(keywords);
      const existingNames = Array.from(allCompanies.keys()).slice(0, 30).map(
        (n) => allCompanies.get(n)!.name,
      );

      // Run up to 2 expansion queries in parallel
      const expansionPromises = expandedGroups.slice(0, 2).map(
        async (expandedKws, i) => {
          searchStats.totalAiCalls++;
          const needed = Math.ceil(
            (targetCount - allCompanies.size) /
              Math.min(expandedGroups.length, 2),
          );

          const prompt = `Cerca ALMENO ${
            Math.max(needed, 15)
          } aziende DIVERSE da quelle già trovate.

ZONA: ${location} (${
            onlySelectedCity ? "SOLO questa città" : `raggio ${radius} km`
          })
PUNTO DI PARTENZA: ${originCity}
${locationContext}

KEYWORDS ESPANSE: ${expandedKws.join(", ")}
KEYWORDS ORIGINALI: ${keywords.join(", ")}
${targetRole ? `RUOLO TARGET: ${targetRole}` : ""}

⚠️ NON includere queste aziende già trovate:
${existingNames.join(", ")}

Cerca aziende NUOVE non ancora nella lista. Esplora:
- Sotto-settori e nicchie correlate
- Aziende più piccole o meno note
- Zone industriali e artigianali locali
- Ditte individuali e studi professionali

Calcola distanza e tempo da ${originCity}.`;

          return aiSearch(
            aiGatewayUrl,
            aiGatewayToken,
            baseSystemPrompt,
            prompt,
          );
        },
      );

      const expansionResults = await Promise.all(expansionPromises);
      for (let i = 0; i < expansionResults.length; i++) {
        const newCount = addCompanies(expansionResults[i], `Pass 2.${i + 1}`);
        searchStats.companiesPerPass.push({
          pass: `Espansione keyword ${i + 1}`,
          found: expansionResults[i].length,
          new: newCount,
        });
        console.log(
          `Pass 2.${i + 1}: Found ${
            expansionResults[i].length
          }, New unique: ${newCount}, Total: ${allCompanies.size}`,
        );
      }
    }

    // ═══════════════════════════════════════════════
    // PASS 3: Related sectors and company types
    // ═══════════════════════════════════════════════
    if (allCompanies.size < targetCount) {
      console.log("--- PASS 3: Related sectors ---");
      searchStats.totalPasses++;
      searchStats.totalAiCalls++;

      const existingNames = Array.from(allCompanies.keys()).slice(0, 50).map(
        (n) => allCompanies.get(n)!.name,
      );
      const needed = targetCount - allCompanies.size;

      const pass3Prompt = `Il candidato cerca lavoro nei settori: ${
        keywords.join(", ")
      }${targetRole ? `, ruolo: ${targetRole}` : ""}.

Finora ho trovato ${allCompanies.size} aziende ma ne servono almeno ${targetCount}. Devo trovare altre ${needed} aziende NUOVE.

ZONA: ${location} (${
        onlySelectedCity ? "SOLO questa città" : `raggio ${radius} km`
      })
PUNTO DI PARTENZA: ${originCity}
${locationContext}

STRATEGIA: Cerca in settori CORRELATI e tipologie di aziende DIVERSE:
1. Aziende di settori affini che potrebbero assumere il stesso profilo
2. Fornitori e partner di aziende del settore principale
3. Cooperative, consorzi, enti di settore
4. Aziende che stanno attivamente assumendo (career page attiva)
5. Startup e nuove imprese della zona
6. Filiali locali di grandi gruppi
7. Aziende artigiane e studi professionali

⚠️ ESCLUDI queste aziende già trovate:
${existingNames.join(", ")}

Genera ALMENO ${Math.max(needed, 15)} aziende NUOVE.
Calcola distanza e tempo da ${originCity}.`;

      const pass3Results = await aiSearch(
        aiGatewayUrl,
        aiGatewayToken,
        baseSystemPrompt,
        pass3Prompt,
      );
      const pass3New = addCompanies(pass3Results, "Pass 3");
      searchStats.companiesPerPass.push({
        pass: "Settori correlati",
        found: pass3Results.length,
        new: pass3New,
      });
      console.log(
        `Pass 3: Found ${pass3Results.length}, New unique: ${pass3New}, Total: ${allCompanies.size}`,
      );
    }

    // ═══════════════════════════════════════════════
    // PASS 4: Geographic expansion (if not city-only)
    // ═══════════════════════════════════════════════
    if (allCompanies.size < targetCount && !onlySelectedCity) {
      const locationVariants = expandLocations(
        location,
        radius,
        onlySelectedCity,
      );

      if (locationVariants.length > 0) {
        console.log("--- PASS 4: Geographic expansion ---");
        searchStats.totalPasses++;

        const existingNames = Array.from(allCompanies.keys()).slice(0, 60).map(
          (n) => allCompanies.get(n)!.name,
        );

        // Run location variants in parallel (max 2)
        const geoPromises = locationVariants.slice(0, 2).map(
          async (variant) => {
            searchStats.totalAiCalls++;
            const needed = Math.ceil(
              (targetCount - allCompanies.size) / locationVariants.length,
            );

            const prompt = `Cerca ALMENO ${
              Math.max(needed, 10)
            } aziende nella zona di ${variant}.

SETTORI: ${keywords.join(", ")}
${targetRole ? `RUOLO TARGET: ${targetRole}` : ""}
PUNTO DI PARTENZA: ${originCity}

⚠️ ESCLUDI queste aziende già trovate:
${existingNames.join(", ")}

Cerca aziende NUOVE in ${variant} raggiungibili da ${originCity}.
Calcola distanza e tempo da ${originCity}.`;

            return {
              results: await aiSearch(
                aiGatewayUrl,
                aiGatewayToken,
                baseSystemPrompt,
                prompt,
              ),
              variant,
            };
          },
        );

        const geoResults = await Promise.all(geoPromises);
        for (const { results, variant } of geoResults) {
          const newCount = addCompanies(results, `Pass 4: ${variant}`);
          searchStats.companiesPerPass.push({
            pass: `Zona: ${variant}`,
            found: results.length,
            new: newCount,
          });
          console.log(
            `Pass 4 (${variant}): Found ${results.length}, New: ${newCount}, Total: ${allCompanies.size}`,
          );
        }
      }
    }

    // ═══════════════════════════════════════════════
    // PASS 5: Final aggressive push if still under target
    // ═══════════════════════════════════════════════
    if (allCompanies.size < targetCount * 0.6) {
      console.log("--- PASS 5: Aggressive final push ---");
      searchStats.totalPasses++;
      searchStats.totalAiCalls++;

      const existingNames = Array.from(allCompanies.keys()).slice(0, 70).map(
        (n) => allCompanies.get(n)!.name,
      );
      const needed = targetCount - allCompanies.size;

      const pass5Prompt =
        `RICERCA AGGRESSIVA FINALE. Servono ancora ${needed} aziende.

ZONA: ${location} e ${
          onlySelectedCity
            ? "SOLO questa città"
            : `tutto il circondario fino a ${radius} km`
        }
PUNTO DI PARTENZA: ${originCity}
SETTORI: ${keywords.join(", ")}

Ho già trovato ${allCompanies.size} aziende. Il target è ${targetCount}.

STRATEGIA MASSIMA COPERTURA:
1. Cerca in TUTTE le zone industriali e artigianali della zona
2. Cerca OGNI tipo di azienda che potrebbe assumere questo profilo
3. Includi aziende di QUALSIASI dimensione (da 1 a 10000 dipendenti)
4. Cerca aziende che hanno pubblicato offerte di lavoro recentemente
5. Cerca aziende partner/fornitrici/clienti di quelle già trovate
6. Cerca nei registri delle imprese cantonali/regionali
7. Cerca nelle associazioni di categoria
8. Includi anche aziende con solo telefono (senza email) se rilevanti

⚠️ ESCLUDI queste aziende già trovate:
${existingNames.join(", ")}

Genera ALMENO ${needed} aziende NUOVE.
Calcola distanza e tempo da ${originCity}.`;

      const pass5Results = await aiSearch(
        aiGatewayUrl,
        aiGatewayToken,
        baseSystemPrompt,
        pass5Prompt,
      );
      const pass5New = addCompanies(pass5Results, "Pass 5");
      searchStats.companiesPerPass.push({
        pass: "Ricerca aggressiva finale",
        found: pass5Results.length,
        new: pass5New,
      });
      console.log(
        `Pass 5: Found ${pass5Results.length}, New unique: ${pass5New}, Total: ${allCompanies.size}`,
      );
    }

    // Determine stop reason
    if (allCompanies.size >= targetCount) {
      searchStats.stoppedReason =
        `Obiettivo raggiunto: trovate ${allCompanies.size} aziende su ${targetCount} richieste.`;
    } else {
      searchStats.stoppedReason =
        `Trovate ${allCompanies.size} aziende su ${targetCount} richieste dopo ${searchStats.totalPasses} passaggi e ${searchStats.totalAiCalls} query AI. La zona "${location}" con i settori selezionati ha un numero limitato di aziende corrispondenti.`;
    }

    // Convert map to sorted array
    let companies = Array.from(allCompanies.values());

    // --- Verifica reale del sito + estrazione email dalle pagine ---
    console.log("--- Website liveness + real email extraction ---");
    const beforeLive = companies.length;
    companies = await verifyWebsitesAndExtractEmails(companies);
    const removedDead = beforeLive - companies.length;
    if (removedDead > 0) {
      searchStats.companiesPerPass.push({
        pass: "Verifica siti online + email reali",
        found: beforeLive,
        new: -removedDead,
      });
    }
    console.log(
      `Website check: ${beforeLive} -> ${companies.length} (rimosse ${removedDead} con sito offline/inesistente)`,
    );

    console.log("--- DNS + recipient-level validation ---");

    const companiesWithEmail = companies.filter((c) => c.email);
    let invalidatedCount = 0;

    if (companiesWithEmail.length > 0) {
      const validationResults = await batchValidateEmails(companiesWithEmail);

      companies = companies.map((c) => {
        if (!c.email) {
          return {
            ...c,
            confidence_score: 0,
            final_status: c.contact_form_url ? "risky_send" : "discarded",
          };
        }

        const validation = validationResults.get(c.email);
        const domainValid = validation?.domain_valid ?? false;
        const smtpStatus = validation?.smtp_status ?? "invalid_email";
        const catchAll = validation?.catch_all ?? false;

        let next: CompanyResult = {
          ...c,
          domain_valid: domainValid,
          smtp_status: smtpStatus,
          catch_all: catchAll,
        };

        if (!domainValid || smtpStatus === "invalid_email") {
          invalidatedCount++;
          next = {
            ...next,
            email: null,
            email_verified: null,
            email_source: null,
            confidence_score: 0,
            final_status: next.contact_form_url ? "risky_send" : "discarded",
            contact_type: next.contact_form_url ? "form_only" : "phone_only",
          };
          return next;
        }

        next.confidence_score = computeConfidence(next);
        next.final_status = determineFinalStatus(next);
        return next;
      });

      searchStats.companiesPerPass.push({
        pass: "Validazione recipient-level",
        found: companiesWithEmail.length,
        new: -invalidatedCount,
      });
    }

    const verificationPriority: Record<string, number> = {
      "ready_to_send": 1,
      "risky_send": 2,
      "discarded": 3,
    };

    companies.sort((a, b) => {
      const aPriority = verificationPriority[a.final_status || "discarded"] ||
        4;
      const bPriority = verificationPriority[b.final_status || "discarded"] ||
        4;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return (b.confidence_score || 0) - (a.confidence_score || 0) ||
        ((a.distance_km || 999) - (b.distance_km || 999));
    });

    const emailStats = {
      total: companies.length,
      withEmail: companies.filter((c) => c.email).length,
      readyToSend: companies.filter((c) =>
        c.final_status === "ready_to_send"
      ).length,
      riskySend: companies.filter((c) =>
        c.final_status === "risky_send"
      ).length,
      discarded: companies.filter((c) => c.final_status === "discarded").length,
      dnsInvalidated: invalidatedCount,
    };

    console.log(
      `=== SEARCH COMPLETE === Total: ${companies.length}, With email: ${emailStats.withEmail}, Passes: ${searchStats.totalPasses}, AI calls: ${searchStats.totalAiCalls}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: companies,
        total: companies.length,
        originCity,
        emailStats,
        searchStats,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("Error searching companies:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
