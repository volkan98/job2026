import { useMemo, useState } from 'react';
import { useCVContext } from '@/contexts/CVContext';
import { aiAgent, Company } from '@/lib/api/ai-agent';
import { supabase } from '@/integrations/supabase/client';
import { Azienda } from '@/types/cv';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  ExternalLink,
  Mail,
  Phone,
  Globe,
  Plus,
  Ban,
  Send,
  Trophy,
  ShieldCheck,
  ShieldQuestion,
  ShieldAlert,
} from 'lucide-react';
import {
  DEFAULT_WEIGHTS,
  ScoreWeights,
  ScoredAzienda,
  SIMILARITY_KEYWORD_SETS,
  SWISS_CITIES,
  TICINO_CITIES,
  dedupeKeys,
  mergeCompany,
  scoreCompany,
  similarityLabel,
} from '@/lib/swissSimilarity';

const ANALYZED_KEY = 'swiss_similar_analyzed';
const RESULTS_KEY = 'swiss_similar_results';
const EXCLUDED_KEY = 'swiss_similar_excluded';

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

function mapCompany(c: Company, fallbackCity: string, index: number): Azienda {
  const email =
    c.email && !['', 'null', 'n/a', 'undefined'].includes(c.email.trim().toLowerCase())
      ? c.email.trim()
      : null;
  return {
    id: `ch-${index}-${(c.name || '').slice(0, 20)}`,
    nome: c.name,
    indirizzo: c.address || '',
    citta: c.city || fallbackCity,
    sito: c.website || '',
    email,
    emailVerified: email ? c.email_verified || 'unverified' : null,
    emailSource: email ? c.email_source || null : null,
    telefono: c.phone || '',
    settore: c.sector || 'Altro',
    fonte: c.source || 'AI Search',
    distanza: c.distance_km || 0,
    tempoPercorrenza: c.travel_time || '',
    domainValid: c.domain_valid ?? null,
    emailExplicit: c.email_explicit ?? false,
    emailSourceType: c.email_source_type ?? null,
    smtpStatus: c.smtp_status ?? null,
    catchAll: c.catch_all ?? null,
    confidenceScore: c.confidence_score ?? 0,
    finalStatus: c.final_status || 'discarded',
    contactFormUrl: c.contact_form_url ?? null,
  };
}

export function SwissSimilarSearch() {
  const { cvData, aziendeSelezionate, setAziendeSelezionate, setCurrentStep } = useCVContext();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'ticino' | 'svizzera'>('ticino');
  const [startCity, setStartCity] = useState('Lugano');
  const [radius, setRadius] = useState('50');
  const [maxCompanies, setMaxCompanies] = useState('40');
  const [findContacts, setFindContacts] = useState(true);
  const [autoAdd, setAutoAdd] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);
  const [weights, setWeights] = useState<ScoreWeights>(DEFAULT_WEIGHTS);

  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<ScoredAzienda[]>(() => {
    try {
      const raw = localStorage.getItem(RESULTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [excluded, setExcluded] = useState<Set<string>>(() => loadSet(EXCLUDED_KEY));

  const persistResults = (list: ScoredAzienda[]) => {
    setResults(list);
    try {
      localStorage.setItem(RESULTS_KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  };

  const visible = useMemo(
    () => results.filter((r) => !excluded.has(r.nome.toLowerCase())),
    [results, excluded],
  );

  const stats = useMemo(() => {
    const withEmail = visible.filter((r) => !!r.email);
    return {
      trovate: visible.length,
      verificate: visible.filter((r) => r.sito || r.emailVerified?.startsWith('verified')).length,
      altaCompat: visible.filter((r) => r.similarityScore >= 75).length,
      email: withEmail.length,
      pronte: withEmail.filter((r) => r.finalStatus !== 'discarded').length,
      inCampagna: aziendeSelezionate.length,
    };
  }, [visible, aziendeSelezionate]);

  const top10 = useMemo(() => [...visible].sort((a, b) => b.finalScore - a.finalScore).slice(0, 10), [visible]);

  const runSearch = async () => {
    setIsSearching(true);
    const analyzed = onlyNew ? loadSet(ANALYZED_KEY) : new Set<string>();
    const seen = new Map<string, Azienda>();
    const keyIndex = new Map<string, string>(); // dedupe key -> company id

    const cities = mode === 'ticino' ? [startCity, ...TICINO_CITIES] : [startCity, ...SWISS_CITIES];
    const uniqueCities = [...new Set(cities)];
    const target = parseInt(maxCompanies, 10);

    try {
      let queryIdx = 0;
      outer: for (const keywordSet of SIMILARITY_KEYWORD_SETS) {
        for (const city of uniqueCities.slice(0, mode === 'ticino' ? 6 : 5)) {
          if (seen.size >= target) break outer;
          queryIdx += 1;
          setProgress(`Ricerca ${queryIdx}: ${keywordSet[0]} — ${city}`);

          const res = await aiAgent.searchCompanies(
            `${city}, Svizzera`,
            parseInt(radius, 10),
            keywordSet,
            cvData?.competenze,
            'verniciatore industriale',
            Math.min(25, target),
            cvData?.citta || startCity,
            false,
          );

          if (!res.success || !res.data) continue;

          res.data.forEach((c, i) => {
            const azienda = mapCompany(c, city, seen.size + i);
            // Verifica minima: nome + (sito o email o telefono)
            if (!azienda.nome || (!azienda.sito && !azienda.email && !azienda.telefono)) return;

            const keys = dedupeKeys(azienda);
            const existingId = keys.map((k) => keyIndex.get(k)).find(Boolean);
            if (existingId) {
              const prev = seen.get(existingId)!;
              seen.set(existingId, mergeCompany(prev, azienda));
              return;
            }
            if (onlyNew && keys.some((k) => analyzed.has(k))) return;
            keys.forEach((k) => keyIndex.set(k, azienda.id));
            seen.set(azienda.id, azienda);
          });
        }
      }

      // Escludi aziende già contattate (anti-spam / anti duplicati)
      const { data: sent } = await supabase.from('sent_emails').select('email, domain, company_name');
      const sentEmails = new Set((sent || []).map((s) => (s.email || '').toLowerCase()));
      const sentDomains = new Set((sent || []).map((s) => (s.domain || '').toLowerCase()).filter(Boolean));

      const scored = [...seen.values()]
        .filter((a) => {
          const email = (a.email || '').toLowerCase();
          const domain = email.split('@')[1] || '';
          return !(email && sentEmails.has(email)) && !(domain && sentDomains.has(domain));
        })
        .map((a) => scoreCompany(a, cvData?.competenze || [], weights))
        .filter((a) => a.similarityScore >= 40)
        .sort((a, b) => b.finalScore - a.finalScore);

      persistResults(scored);

      // Memorizza le aziende analizzate per la modalità "Scopri aziende nuove"
      const memo = loadSet(ANALYZED_KEY);
      [...seen.values()].forEach((a) => dedupeKeys(a).forEach((k) => memo.add(k)));
      saveSet(ANALYZED_KEY, memo);

      if (autoAdd) {
        const ready = scored.filter((a) => a.email && a.finalStatus !== 'discarded' && a.finalScore >= 60);
        const merged = [...aziendeSelezionate];
        ready.forEach((r) => {
          if (!merged.some((m) => m.nome.toLowerCase() === r.nome.toLowerCase())) merged.push(r);
        });
        setAziendeSelezionate(merged);
      }

      toast({
        title: '🇨🇭 Ricerca completata',
        description: `${scored.length} aziende compatibili trovate (${queryIdx} query multilingua).`,
      });
    } catch (e: any) {
      toast({
        title: 'Errore nella ricerca',
        description: e?.message || 'Riprova tra qualche istante.',
        variant: 'destructive',
      });
    } finally {
      setProgress('');
      setIsSearching(false);
    }
  };

  const addToCampaign = (a: ScoredAzienda) => {
    if (aziendeSelezionate.some((s) => s.nome.toLowerCase() === a.nome.toLowerCase())) return;
    setAziendeSelezionate([...aziendeSelezionate, a]);
    toast({ title: 'Aggiunta alla campagna', description: a.nome });
  };

  const excludeCompany = (a: ScoredAzienda) => {
    const next = new Set(excluded);
    next.add(a.nome.toLowerCase());
    setExcluded(next);
    saveSet(EXCLUDED_KEY, next);
  };

  const emailBadge = (a: ScoredAzienda) => {
    if (!a.email) return <Badge variant="outline" className="text-xs">🔴 Nessuna email — Contatto non trovato</Badge>;
    if (a.emailVerified === 'verified_official' || a.emailVerified === 'verified_directory')
      return <Badge className="text-xs bg-emerald-600 hover:bg-emerald-600">✅ Email verificata</Badge>;
    return <Badge variant="secondary" className="text-xs">🟡 Email non verificata</Badge>;
  };

  return (
    <Card className="border-primary/30">
      <CardContent className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">🇨🇭 Aziende simili in Svizzera</h3>
            <p className="text-sm text-muted-foreground">
              Trova aziende con profilo simile a Faiko Verniciature Industriali e Poretti &amp; Gaggini
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => { setMode('svizzera'); setOpen(true); }}>
              🇨🇭 Cerca aziende simili in Svizzera
            </Button>
            <Button variant="outline" onClick={() => { setMode('ticino'); setStartCity('Lugano'); setOpen(true); }}>
              📍 Ticino — Aziende simili
            </Button>
          </div>
        </div>

        {open && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Modalità</label>
                <Select value={mode} onValueChange={(v) => setMode(v as 'ticino' | 'svizzera')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ticino">Solo Ticino</SelectItem>
                    <SelectItem value="svizzera">Tutta la Svizzera</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Zona iniziale</label>
                <Select value={startCity} onValueChange={setStartCity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(mode === 'ticino' ? TICINO_CITIES : SWISS_CITIES).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Raggio</label>
                <Select value={radius} onValueChange={setRadius}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 km</SelectItem>
                    <SelectItem value="50">50 km</SelectItem>
                    <SelectItem value="100">100 km</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Max aziende</label>
                <Select value={maxCompanies} onValueChange={setMaxCompanies}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="40">40</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={findContacts} onCheckedChange={(v) => setFindContacts(!!v)} />
                Ricerca automatica contatti
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={autoAdd} onCheckedChange={(v) => setAutoAdd(!!v)} />
                Aggiungi automaticamente alla campagna
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={onlyNew} onCheckedChange={(v) => setOnlyNew(!!v)} />
                🔎 Scopri aziende nuove
              </label>
            </div>

            <p className="text-xs text-muted-foreground">
              La ricerca è automatica e mirata alle aziende di <strong>verniciatura industriale</strong> e
              trattamento superfici. Vengono mostrate solo aziende con <strong>sito web online verificato</strong> e
              email estratta realmente dal sito (mai inventata).
            </p>


            <div className="flex justify-end">
              <Button onClick={runSearch} disabled={isSearching}>
                {isSearching ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{progress || 'Ricerca in corso...'}</>
                ) : (
                  <>Avvia ricerca similarità</>
                )}
              </Button>
            </div>
          </div>
        )}

        {visible.length > 0 && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center">
              {[
                ['Trovate', stats.trovate],
                ['Verificate', stats.verificate],
                ['Alta compat.', stats.altaCompat],
                ['Email trovate', stats.email],
                ['Pronte', stats.pronte],
                ['In campagna', stats.inCampagna],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg bg-muted p-2">
                  <div className="text-lg font-semibold text-foreground">{value as number}</div>
                  <div className="text-xs text-muted-foreground">{label as string}</div>
                </div>
              ))}
            </div>

            <div>
              <p className="text-sm font-medium flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4 text-amber-500" /> Top 10 aziende più compatibili
              </p>
              <div className="flex flex-wrap gap-2">
                {top10.map((a) => (
                  <Badge key={a.id} variant="outline" className="text-xs">
                    {a.nome} — {a.finalScore}/100
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {visible.map((a) => (
                <div key={a.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{a.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.citta} • {a.cantone} • {a.settore}
                        {a.distanza ? ` • ${a.distanza} km` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="text-xs">Similarity {a.similarityScore}/100</Badge>
                      <Badge variant="secondary" className="text-xs">CV {a.cvScore}/100</Badge>
                      <Badge variant="outline" className="text-xs">Finale {a.finalScore}/100</Badge>
                      <span className="text-xs">{'⭐'.repeat(a.priority)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    <strong>{similarityLabel(a.similarityScore)}:</strong> {a.similarityReason}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {a.sito && (
                      <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{a.sito}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />{a.email || 'Contatto non trovato'}
                    </span>
                    {a.telefono && (
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{a.telefono}</span>
                    )}
                    <span>Fonte: {a.fonte}</span>
                    {emailBadge(a)}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {a.sito && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={a.sito.startsWith('http') ? a.sito : `https://${a.sito}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" /> Apri sito
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => addToCampaign(a)} disabled={!a.email}>
                      <Plus className="h-3 w-3 mr-1" /> Aggiungi alla campagna
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!a.email}
                      onClick={() => { addToCampaign(a); setCurrentStep(3); }}
                    >
                      <Send className="h-3 w-3 mr-1" /> Invia candidatura
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => excludeCompany(a)}>
                      <Ban className="h-3 w-3 mr-1" /> Escludi
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
