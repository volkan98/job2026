import { Azienda } from '@/types/cv';

// ---------------------------------------------------------------------------
// Motore di similarità "Aziende simili in Svizzera"
// Aziende di riferimento: Faiko Verniciature Industriali Sagl, Poretti & Gaggini SA
// ---------------------------------------------------------------------------

export const REFERENCE_COMPANIES = ['Faiko Verniciature Industriali Sagl', 'Poretti & Gaggini SA'];

// Termini positivi con peso (multilingua: IT / DE / FR / EN)
const POSITIVE_TERMS: { term: string; weight: number; label: string }[] = [
  { term: 'verniciatura industriale', weight: 30, label: 'verniciatura industriale' },
  { term: 'industrial coating', weight: 30, label: 'industrial coating' },
  { term: 'industrielle lackierung', weight: 30, label: 'industrielle Lackierung' },
  { term: 'peinture industrielle', weight: 30, label: 'peinture industrielle' },
  { term: 'industrial painting', weight: 28, label: 'industrial painting' },
  { term: 'verniciatura a spruzzo', weight: 22, label: 'verniciatura a spruzzo' },
  { term: 'verniciatura a liquido', weight: 22, label: 'verniciatura a liquido' },
  { term: 'wet painting', weight: 20, label: 'wet painting' },
  { term: 'powder coating', weight: 20, label: 'verniciatura a polvere' },
  { term: 'polveri', weight: 12, label: 'verniciatura a polveri' },
  { term: 'pulverbeschichtung', weight: 20, label: 'Pulverbeschichtung' },
  { term: 'laccatura', weight: 18, label: 'laccatura' },
  { term: 'verniciatura', weight: 18, label: 'verniciatura' },
  { term: 'lackier', weight: 18, label: 'Lackierung' },
  { term: 'finitura', weight: 14, label: 'finitura industriale' },
  { term: 'trattamento superfic', weight: 16, label: 'trattamento superfici' },
  { term: 'oberflächen', weight: 16, label: 'Oberflächenbehandlung' },
  { term: 'traitement de surface', weight: 16, label: 'traitement de surface' },
  { term: 'sabbiatura', weight: 14, label: 'sabbiatura' },
  { term: 'microsabbiatura', weight: 14, label: 'microsabbiatura' },
  { term: 'sandblast', weight: 12, label: 'sandblasting' },
  { term: 'metallizzazione', weight: 12, label: 'metallizzazione' },
  { term: 'zincatura', weight: 12, label: 'zincatura' },
  { term: 'galvani', weight: 10, label: 'galvanica' },
  { term: 'carpenteria metallica', weight: 14, label: 'carpenteria metallica' },
  { term: 'metalbau', weight: 12, label: 'Metallbau' },
  { term: 'lamiera', weight: 12, label: 'lavorazione lamiera' },
  { term: 'sheet metal', weight: 12, label: 'sheet metal' },
  { term: 'metalmecc', weight: 12, label: 'metalmeccanica' },
  { term: 'meccanic', weight: 8, label: 'lavorazioni meccaniche' },
  { term: 'macchinari', weight: 8, label: 'costruzione macchinari' },
  { term: 'maschinenbau', weight: 8, label: 'Maschinenbau' },
  { term: 'componenti industriali', weight: 10, label: 'componenti industriali' },
  { term: 'assemblaggio', weight: 6, label: 'assemblaggio industriale' },
  { term: 'conto terzi', weight: 8, label: 'produzione conto terzi' },
  { term: 'acciaio', weight: 8, label: 'acciaio' },
  { term: 'inox', weight: 8, label: 'inox' },
  { term: 'alluminio', weight: 8, label: 'alluminio' },
  { term: 'ferro', weight: 6, label: 'ferro' },
  { term: 'ghisa', weight: 5, label: 'ghisa' },
  { term: 'metall', weight: 8, label: 'lavorazione metalli' },
  { term: 'poliuretan', weight: 8, label: 'vernici poliuretaniche' },
  { term: 'epossid', weight: 8, label: 'vernici epossidiche' },
  { term: 'solvente', weight: 6, label: 'prodotti a solvente' },
  { term: 'legno', weight: 6, label: 'verniciatura legno' },
  { term: 'produzione', weight: 5, label: 'produzione industriale' },
  { term: 'industri', weight: 5, label: 'settore industriale' },
];

// Termini che escludono/penalizzano (imbianchini, carrozzerie, commercio, ecc.)
const NEGATIVE_TERMS: { term: string; penalty: number; label: string }[] = [
  { term: 'imbianchin', penalty: 60, label: 'imbianchino' },
  { term: 'pittore edil', penalty: 60, label: 'pittore edile' },
  { term: 'tinteggia', penalty: 50, label: 'tinteggiatura abitativa' },
  { term: 'decorator', penalty: 45, label: 'decoratore' },
  { term: 'gipser', penalty: 45, label: 'gessatore/pittore edile' },
  { term: 'maler', penalty: 40, label: 'Malergeschäft (pittore edile)' },
  { term: 'carrozzeri', penalty: 55, label: 'carrozzeria auto' },
  { term: 'carrosseri', penalty: 55, label: 'carrosserie' },
  { term: 'autofficina', penalty: 50, label: 'officina auto' },
  { term: 'garage', penalty: 35, label: 'garage / auto' },
  { term: 'immobiliar', penalty: 40, label: 'immobiliare' },
  { term: 'consulenz', penalty: 35, label: 'consulenza' },
  { term: 'negozio', penalty: 35, label: 'attività commerciale' },
  { term: 'commercio al dettaglio', penalty: 40, label: 'commercio al dettaglio' },
  { term: 'ristorant', penalty: 60, label: 'ristorazione' },
];

// Competenze rilevanti dell'utente → confronto con profilo azienda
const CV_SKILL_TERMS = [
  'verniciatura',
  'verniciatore',
  'laccatura',
  'finitura',
  'metall',
  'legno',
  'solvente',
  'acqua',
  'preparazione superfici',
  'sabbiatura',
  'spruzzo',
  'industriale',
];

export const TICINO_CITIES = [
  'Lugano',
  'Mendrisio',
  'Bellinzona',
  'Locarno',
  'Agno',
  'Bioggio',
  'Bedano',
  'Manno',
  'Lamone',
  'Mezzovico-Vira',
  'Chiasso',
  'Taverne',
  'Stabio',
];

export const SWISS_CITIES = [
  'Lugano',
  'Bellinzona',
  'Mendrisio',
  'Locarno',
  'Zurigo',
  'Basilea',
  'Berna',
  'Losanna',
  'Ginevra',
  'San Gallo',
  'Lucerna',
  'Winterthur',
  'Coira',
];

// Query multi-lingua combinando settore / tecnologia / materiale
export const SIMILARITY_KEYWORD_SETS: string[][] = [
  ['verniciatura industriale', 'verniciatura a liquido', 'verniciatura a spruzzo'],
  ['verniciatura metalli', 'trattamento superfici', 'sabbiatura'],
  ['carpenteria metallica', 'lavorazione lamiera', 'metalmeccanica'],
  ['costruzione macchinari', 'componenti industriali', 'produzione conto terzi'],
  ['industrial coating', 'powder coating', 'wet painting'],
  ['industrielle Lackierung', 'Pulverbeschichtung', 'Oberflächenbehandlung'],
  ['peinture industrielle', 'traitement de surface', 'construction métallique'],
];

const norm = (s?: string | null) => (s || '').toLowerCase();

export interface ScoredAzienda extends Azienda {
  similarityScore: number;
  similarityReason: string;
  cvScore: number;
  contactScore: number;
  finalScore: number;
  excludedReason?: string | null;
  cantone: string;
  priority: number; // 1..5 stelle
}

export interface ScoreWeights {
  company: number;
  cv: number;
  distance: number;
  contact: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = { company: 50, cv: 30, distance: 10, contact: 10 };

function detectCantone(citta: string, indirizzo: string): string {
  const t = `${citta} ${indirizzo}`.toLowerCase();
  if (TICINO_CITIES.some((c) => t.includes(c.toLowerCase())) || /\bti\b|ticino/.test(t)) return 'Ticino';
  if (/zurigo|zürich|zurich/.test(t)) return 'Zurigo';
  if (/basilea|basel/.test(t)) return 'Basilea';
  if (/berna|bern/.test(t)) return 'Berna';
  if (/ginevra|genève|geneve/.test(t)) return 'Ginevra';
  if (/losanna|lausanne|vaud/.test(t)) return 'Vaud';
  if (/lucerna|luzern/.test(t)) return 'Lucerna';
  if (/san gallo|st. gallen|sankt gallen/.test(t)) return 'San Gallo';
  if (/grigioni|graubünden|coira|chur/.test(t)) return 'Grigioni';
  return 'Svizzera';
}

export function scoreCompany(
  azienda: Azienda,
  cvSkills: string[] = [],
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): ScoredAzienda {
  const haystack = [azienda.nome, azienda.settore, azienda.indirizzo, azienda.sito, azienda.citta]
    .map(norm)
    .join(' ');

  let raw = 0;
  const matched: string[] = [];
  for (const p of POSITIVE_TERMS) {
    if (haystack.includes(p.term)) {
      raw += p.weight;
      if (matched.length < 4) matched.push(p.label);
    }
  }

  let penalty = 0;
  const negatives: string[] = [];
  for (const n of NEGATIVE_TERMS) {
    if (haystack.includes(n.term)) {
      penalty += n.penalty;
      negatives.push(n.label);
    }
  }

  // Bonus geografico: priorità Lugano → Ticino → resto CH
  const cantone = detectCantone(azienda.citta, azienda.indirizzo);
  let geoBonus = 0;
  if (norm(azienda.citta).includes('lugano')) geoBonus = 10;
  else if (cantone === 'Ticino') geoBonus = 7;
  else geoBonus = 2;

  const similarityScore = Math.max(0, Math.min(100, Math.round(raw + geoBonus - penalty)));

  // Compatibilità con il profilo/CV dell'utente
  const skillsText = norm(cvSkills.join(' '));
  const relevant = CV_SKILL_TERMS.filter((t) => skillsText.includes(t));
  const overlap = relevant.filter((t) => haystack.includes(t));
  const cvBase = relevant.length > 0 ? (overlap.length / relevant.length) * 100 : similarityScore;
  const cvScore = Math.max(0, Math.min(100, Math.round(cvBase * 0.7 + similarityScore * 0.3)));

  // Qualità del contatto
  let contactScore = 0;
  if (azienda.email) {
    contactScore = 55;
    if (azienda.emailVerified === 'verified_official') contactScore = 100;
    else if (azienda.emailVerified === 'verified_directory') contactScore = 85;
    else if (azienda.emailVerified === 'directory_only') contactScore = 70;
  } else if (azienda.contactFormUrl || azienda.sito) {
    contactScore = 30;
  }

  // Distanza: 0 km = 100, 150+ km = 0
  const distanceScore = Math.max(0, Math.min(100, Math.round(100 - (azienda.distanza || 0) * 0.66)));

  const wSum = weights.company + weights.cv + weights.distance + weights.contact || 100;
  const finalScore = Math.round(
    (similarityScore * weights.company +
      cvScore * weights.cv +
      distanceScore * weights.distance +
      contactScore * weights.contact) /
      wSum,
  );

  const reasonParts: string[] = [];
  if (matched.length) reasonParts.push(matched.join(', '));
  if (cantone) reasonParts.push(`sede in ${cantone}`);
  if (negatives.length) reasonParts.push(`penalizzata: ${negatives.join(', ')}`);
  const similarityReason = reasonParts.length
    ? reasonParts.join(' • ')
    : 'Nessun indicatore industriale rilevato nei dati disponibili';

  return {
    ...azienda,
    similarityScore,
    similarityReason,
    cvScore,
    contactScore,
    finalScore,
    excludedReason: negatives.length ? negatives.join(', ') : null,
    cantone,
    priority: Math.max(1, Math.min(5, Math.round(finalScore / 20))),
  };
}

export function similarityLabel(score: number): string {
  if (score >= 90) return 'Molto simile a Faiko/Poretti';
  if (score >= 75) return 'Fortemente compatibile';
  if (score >= 60) return 'Compatibile';
  if (score >= 40) return 'Parzialmente compatibile';
  return 'Bassa compatibilità';
}

// Chiave di deduplicazione: nome normalizzato + dominio + telefono + email
export function dedupeKeys(a: Azienda): string[] {
  const keys: string[] = [];
  const name = norm(a.nome)
    .replace(/\s*(sa|sagl|srl|spa|snc|sas|ag|gmbh|ltd|s\.a\.|s\.r\.l\.)\s*$/i, '')
    .replace(/[^a-z0-9]/g, '');
  if (name) keys.push(`n:${name}`);
  const domain = norm(a.sito).replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (domain) keys.push(`d:${domain}`);
  const emailDomain = norm(a.email).split('@')[1];
  if (emailDomain) keys.push(`d:${emailDomain}`);
  const phone = norm(a.telefono).replace(/[^0-9]/g, '').slice(-9);
  if (phone.length >= 8) keys.push(`p:${phone}`);
  const email = norm(a.email);
  if (email) keys.push(`e:${email}`);
  return keys;
}

export function mergeCompany(base: Azienda, extra: Azienda): Azienda {
  return {
    ...base,
    email: base.email || extra.email,
    emailVerified: base.emailVerified || extra.emailVerified,
    emailSource: base.emailSource || extra.emailSource,
    telefono: base.telefono || extra.telefono,
    sito: base.sito || extra.sito,
    indirizzo: base.indirizzo || extra.indirizzo,
    settore: base.settore && base.settore !== 'Altro' ? base.settore : extra.settore,
    fonte: base.fonte === extra.fonte ? base.fonte : `${base.fonte}, ${extra.fonte}`,
    contactFormUrl: base.contactFormUrl || extra.contactFormUrl,
  };
}
