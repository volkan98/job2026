import { useState, useEffect } from 'react';
import { useCVContext } from '@/contexts/CVContext';
import { aiAgent, Company } from '@/lib/api/ai-agent';
import { Azienda } from '@/types/cv';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CityAutocomplete, LocationSelection } from '@/components/ui/city-autocomplete';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  MapPin, 
  Building2, 
  Globe, 
  Mail, 
  Phone,
  ExternalLink,
  Download,
  ArrowLeft,
  ArrowRight,
  Filter,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  AlertTriangle,
  Star,
  StarOff,
  ShieldCheck,
  ShieldQuestion,
  ShieldAlert,
  Link2
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SavedSearchPreferences {
  searchLocation: string;
  locationSelection: LocationSelection | null;
  searchRadius: string;
  minResults: string;
  selectedKeywords: string[];
  showOnlyWithEmail: boolean;
  onlySelectedCity: boolean;
}

const STORAGE_KEY = 'search_preferences';

const SETTORI = [
  'Tutti i settori',
  'Metalmeccanico',
  'Produzione',
  'Packaging',
  'Farmaceutico',
  'Logistica',
  'Verniciatura',
  'Alimentare',
  'Chimico',
  'Tessile',
  'Agenzie per il lavoro',
];

const KEYWORDS = [
  { id: 'produzione', label: 'Produzione' },
  { id: 'metalmeccanica', label: 'Metalmeccanica' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'farmaceutico', label: 'Farmaceutico' },
  { id: 'logistica', label: 'Logistica' },
  { id: 'verniciatura', label: 'Verniciatura' },
  { id: 'alimentare', label: 'Alimentare' },
  { id: 'agenzie', label: 'Agenzie' },
];

export function CompanySearch() {
  const { cvData, aziendeSelezionate, setAziendeSelezionate, setCurrentStep } = useCVContext();
  const { toast } = useToast();
  const [searchLocation, setSearchLocation] = useState(cvData?.citta || '');
  const [locationSelection, setLocationSelection] = useState<LocationSelection | null>(null);
  const [searchRadius, setSearchRadius] = useState('30');
  const [minResults, setMinResults] = useState('30');
  const [selectedSector, setSelectedSector] = useState('Tutti i settori');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [showOnlyWithEmail, setShowOnlyWithEmail] = useState(false);
  const [onlySelectedCity, setOnlySelectedCity] = useState(false);
  const [aziende, setAziende] = useState<Azienda[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [originCity, setOriginCity] = useState(cvData?.citta || '');
  const [hasSavedPreferences, setHasSavedPreferences] = useState(false);
  const [sentEmails, setSentEmails] = useState<Set<string>>(new Set());
  const [sentDomains, setSentDomains] = useState<Set<string>>(new Set());
  const [sentCompanyNames, setSentCompanyNames] = useState<Set<string>>(new Set());

  // Carica le email già inviate all'avvio
  useEffect(() => {
    const loadSentEmails = async () => {
      try {
        const emails = await aiAgent.getSentEmails();
        const emailSet = new Set<string>();
        const domainSet = new Set<string>();
        const nameSet = new Set<string>();
        
        emails.forEach((e: any) => {
          if (e.email) {
            emailSet.add(e.email.toLowerCase());
            const domain = e.email.split('@')[1]?.toLowerCase();
            if (domain) domainSet.add(domain);
          }
          if (e.company_name) {
            // Normalizza il nome: rimuovi suffissi legali e spazi
            const normalized = e.company_name.toLowerCase().trim()
              .replace(/\s*(sa|sagl|srl|spa|snc|sas|ag|gmbh|ltd|s\.a\.|s\.r\.l\.)\s*$/i, '')
              .trim();
            nameSet.add(normalized);
          }
        });
        
        setSentEmails(emailSet);
        setSentDomains(domainSet);
        setSentCompanyNames(nameSet);
      } catch (error) {
        console.error('Error loading sent emails:', error);
      }
    };
    loadSentEmails();
  }, []);

  // Controlla se ci sono preferenze salvate
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setHasSavedPreferences(!!saved);
  }, []);

  const savePreferences = () => {
    const prefs: SavedSearchPreferences = {
      searchLocation,
      locationSelection,
      searchRadius,
      minResults,
      selectedKeywords,
      showOnlyWithEmail,
      onlySelectedCity,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setHasSavedPreferences(true);
    toast({
      title: '⭐ Preferenze salvate',
      description: 'I tuoi parametri di ricerca sono stati salvati.',
    });
  };

  const loadPreferences = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const prefs: SavedSearchPreferences = JSON.parse(saved);
        setSearchLocation(prefs.searchLocation || '');
        setLocationSelection(prefs.locationSelection || null);
        setSearchRadius(prefs.searchRadius || '30');
        setMinResults(prefs.minResults || '30');
        setSelectedKeywords(prefs.selectedKeywords || []);
        setShowOnlyWithEmail(prefs.showOnlyWithEmail || false);
        setOnlySelectedCity(prefs.onlySelectedCity || false);
        toast({
          title: '✅ Preferenze caricate',
          description: 'I parametri della tua ultima ricerca sono stati ripristinati.',
        });
      } catch (e) {
        console.error('Error loading preferences:', e);
      }
    }
  };

  const clearPreferences = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedPreferences(false);
    toast({
      title: 'Preferenze rimosse',
      description: 'I parametri salvati sono stati cancellati.',
    });
  };

  const toggleKeyword = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      setSelectedKeywords(selectedKeywords.filter(k => k !== keyword));
    } else {
      setSelectedKeywords([...selectedKeywords, keyword]);
    }
  };

  const handleSearch = async () => {
    if (!searchLocation) {
      toast({
        title: 'Errore',
        description: 'Inserisci una località per la ricerca.',
        variant: 'destructive',
      });
      return;
    }

    const keywords = selectedKeywords.length > 0 
      ? selectedKeywords 
      : selectedSector !== 'Tutti i settori' 
        ? [selectedSector.toLowerCase()] 
        : ['produzione', 'industria'];

    // Usa la query della selezione se disponibile (include regione completa)
    const locationQuery = locationSelection?.searchQuery || searchLocation;

    setIsSearching(true);
    
    try {
      // Usa la città del CV come punto di origine per il calcolo distanza
      const userCity = cvData?.citta || '';
      
      const result = await aiAgent.searchCompanies(
        locationQuery,
        parseInt(searchRadius),
        keywords,
        cvData?.competenze,
        undefined,
        parseInt(minResults),
        userCity,
        onlySelectedCity // Passa il filtro "solo città selezionata" al backend
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Errore nella ricerca');
      }

      // Salva la città di origine per la visualizzazione
      if (result.originCity) {
        setOriginCity(result.originCity);
      }

      const mappedAziende: Azienda[] = result.data.map((company: Company, index: number) => {
        // Normalizza l'email: gestisce null, undefined, stringa vuota e stringa "null"
        const normalizedEmail = company.email && 
          company.email.trim() !== '' && 
          company.email.toLowerCase() !== 'null' &&
          company.email.toLowerCase() !== 'n/a' &&
          company.email.toLowerCase() !== 'undefined'
          ? company.email.trim() 
          : null;

        // Normalizza email_source
        const normalizedEmailSource = company.email_source && 
          company.email_source.trim() !== '' && 
          company.email_source.toLowerCase() !== 'null' &&
          company.email_source.toLowerCase() !== 'n/a'
          ? company.email_source.trim() 
          : null;
        
        return {
          id: String(index + 1),
          nome: company.name,
          indirizzo: company.address || '',
          citta: company.city || searchLocation,
          sito: company.website || '',
          email: normalizedEmail,
          emailVerified: normalizedEmail ? (company.email_verified || 'unverified') : null,
          emailSource: normalizedEmail ? normalizedEmailSource : null,
          telefono: company.phone || '',
          settore: company.sector || 'Altro',
          fonte: company.source || 'AI Search',
          distanza: company.distance_km || 0,
          tempoPercorrenza: company.travel_time || '',
        };
      });

      // Le aziende sono già ordinate per distanza dal backend
      setAziende(mappedAziende);
      setHasSearched(true);
      
      toast({
        title: 'Ricerca completata!',
        description: `Trovate ${mappedAziende.length} aziende nella zona, ordinate per distanza da ${userCity || 'te'}.`,
      });
    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: 'Errore nella ricerca',
        description: error.message || 'Impossibile completare la ricerca. Riprova.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Filtra per settore, email, città e escludi aziende già contattate
  const filteredAziende = aziende.filter(az => {
    if (selectedSector !== 'Tutti i settori' && az.settore !== selectedSector) return false;
    // Controlla sia null che stringa vuota
    if (showOnlyWithEmail && (!az.email || az.email.trim() === '')) return false;
    // Filtra per città selezionata
    if (onlySelectedCity && searchLocation) {
      const normalizedSearchCity = searchLocation.toLowerCase().trim();
      const normalizedAzCity = (az.citta || '').toLowerCase().trim();
      if (!normalizedAzCity.includes(normalizedSearchCity) && !normalizedSearchCity.includes(normalizedAzCity)) {
        return false;
      }
    }
    // Escludi aziende già contattate (per email, dominio O nome azienda)
    if (az.email) {
      const emailLower = az.email.toLowerCase();
      const domain = emailLower.split('@')[1];
      if (sentEmails.has(emailLower) || (domain && sentDomains.has(domain))) {
        return false;
      }
    }
    // Controlla anche per nome azienda (fuzzy match senza suffissi legali)
    const normalizedName = az.nome.toLowerCase().trim()
      .replace(/\s*(sa|sagl|srl|spa|snc|sas|ag|gmbh|ltd|s\.a\.|s\.r\.l\.)\s*$/i, '')
      .trim();
    if (sentCompanyNames.has(normalizedName)) {
      return false;
    }
    return true;
  });

  const toggleAzienda = (azienda: Azienda) => {
    const isSelected = aziendeSelezionate.some(a => a.id === azienda.id);
    if (isSelected) {
      setAziendeSelezionate(aziendeSelezionate.filter(a => a.id !== azienda.id));
    } else {
      setAziendeSelezionate([...aziendeSelezionate, azienda]);
    }
  };

  const selectAll = () => {
    const aziendeWithEmail = filteredAziende.filter(a => a.email);
    setAziendeSelezionate(aziendeWithEmail);
  };

  const exportCSV = () => {
    const headers = ['Nome', 'Indirizzo', 'Città', 'Email', 'Telefono', 'Settore', 'Sito', 'Fonte'];
    const rows = filteredAziende.map(a => [
      a.nome, a.indirizzo, a.citta, a.email || '', a.telefono, a.settore, a.sito, a.fonte
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aziende_${searchLocation}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Agent - Trova Aziende
        </h2>
        <p className="text-muted-foreground">
          L'AI cerca aziende nella tua zona e trova contatti email pubblici
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4" /> Zona / Città
              </label>
              <CityAutocomplete
                placeholder="es. Lugano, Ticino, Lombardia..."
                value={searchLocation}
                onChange={setSearchLocation}
                onLocationSelect={setLocationSelection}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Raggio di ricerca
              </label>
              <Select value={searchRadius} onValueChange={setSearchRadius}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 km</SelectItem>
                  <SelectItem value="10">10 km</SelectItem>
                  <SelectItem value="20">20 km</SelectItem>
                  <SelectItem value="30">30 km</SelectItem>
                  <SelectItem value="50">50 km</SelectItem>
                  <SelectItem value="100">100 km</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                🎯 Numero minimo di aziende da cercare
              </label>
              <Select value={minResults} onValueChange={setMinResults}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20 aziende (veloce)</SelectItem>
                  <SelectItem value="30">30 aziende (standard)</SelectItem>
                  <SelectItem value="50">50 aziende (approfondita)</SelectItem>
                  <SelectItem value="75">75 aziende (molto approfondita)</SelectItem>
                  <SelectItem value="100">100 aziende (massima)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Settori di interesse
            </label>
            <div className="flex flex-wrap gap-2">
              {KEYWORDS.map(kw => (
                <Badge 
                  key={kw.id}
                  variant={selectedKeywords.includes(kw.id) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/80"
                  onClick={() => toggleKeyword(kw.id)}
                >
                  {kw.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="emailOnly"
                  checked={showOnlyWithEmail}
                  onCheckedChange={(checked) => setShowOnlyWithEmail(checked as boolean)}
                />
                <label htmlFor="emailOnly" className="text-sm text-muted-foreground cursor-pointer">
                  Mostra solo aziende con email
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="cityOnly"
                  checked={onlySelectedCity}
                  onCheckedChange={(checked) => setOnlySelectedCity(checked as boolean)}
                />
                <label htmlFor="cityOnly" className="text-sm text-muted-foreground cursor-pointer">
                  Solo città selezionata
                </label>
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {hasSavedPreferences && (
                <Button variant="outline" size="sm" onClick={loadPreferences}>
                  <Star className="h-4 w-4 mr-2 text-amber-500 fill-amber-500" />
                  Carica preferiti
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={savePreferences}>
                <Star className="h-4 w-4 mr-2" />
                Salva preferiti
              </Button>
              {hasSavedPreferences && (
                <Button variant="ghost" size="sm" onClick={clearPreferences}>
                  <StarOff className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <Button onClick={handleSearch} disabled={isSearching || !searchLocation}>
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  AI sta cercando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Cerca con AI
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {hasSearched && (
        <>
      <Alert className="bg-amber-500/10 border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm">
              <strong>Fonti gratuite:</strong> I risultati sono basati su directory pubbliche (local.ch, Pagine Gialle, siti aziendali). 
              L'AI suggerisce aziende realistiche - verifica sempre le email sui siti ufficiali prima di inviare.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {filteredAziende.length} aziende trovate • {aziendeSelezionate.length} selezionate
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Seleziona tutte con email
              </Button>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Esporta CSV
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredAziende.map(azienda => {
              const isSelected = aziendeSelezionate.some(a => a.id === azienda.id);
              
              return (
                <Card 
                  key={azienda.id} 
                  className={`transition-all cursor-pointer ${
                    isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent/50'
                  }`}
                  onClick={() => azienda.email && toggleAzienda(azienda)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="pt-1">
                        <Checkbox 
                          checked={isSelected}
                          disabled={!azienda.email}
                          onCheckedChange={() => azienda.email && toggleAzienda(azienda)}
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary shrink-0" />
                            {azienda.nome}
                          </h3>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="secondary">{azienda.settore}</Badge>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              📍 {azienda.distanza} km – ⏱️ {azienda.tempoPercorrenza || 'n/d'} da {originCity}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span className="truncate">{azienda.indirizzo ? `${azienda.indirizzo}, ` : ''}{azienda.citta}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            {azienda.email ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Icona in base al livello di verifica */}
                                  {azienda.emailVerified === 'verified_official' ? (
                                    <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
                                  ) : azienda.emailVerified === 'verified_directory' ? (
                                    <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                                  ) : azienda.emailVerified === 'directory_only' ? (
                                    <ShieldQuestion className="h-4 w-4 text-amber-500 shrink-0" />
                                  ) : (
                                    <ShieldAlert className="h-4 w-4 text-orange-400 shrink-0" />
                                  )}
                                  <span className="text-foreground truncate">{azienda.email}</span>
                                  {/* Badge di verifica */}
                                  {azienda.emailVerified === 'verified_official' && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                      ✓ Verificata
                                    </Badge>
                                  )}
                                  {azienda.emailVerified === 'verified_directory' && (
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                                      ✓ Confermata
                                    </Badge>
                                  )}
                                  {azienda.emailVerified === 'directory_only' && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                      ⚠ Da verificare
                                    </Badge>
                                  )}
                                  {azienda.emailVerified === 'unverified' && (
                                    <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-xs">
                                      ? Non verificata
                                    </Badge>
                                  )}
                                </div>
                                {/* Fonte dell'email */}
                                {azienda.emailSource && (
                                  <a 
                                    href={azienda.emailSource.startsWith('http') ? azienda.emailSource : `https://${azienda.emailSource}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <Link2 className="h-3 w-3" />
                                    <span className="truncate max-w-[200px]">Fonte: {azienda.emailSource.replace(/^https?:\/\//, '').split('/')[0]}</span>
                                  </a>
                                )}
                              </div>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground italic">Email non trovata</span>
                              </>
                            )}
                          </div>
                          
                          {azienda.telefono && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4 shrink-0" />
                              <span>{azienda.telefono}</span>
                            </div>
                          )}
                          
                          {azienda.sito && (
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                              <a 
                                href={azienda.sito.startsWith('http') ? azienda.sito : `https://${azienda.sito}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1 truncate"
                                onClick={e => e.stopPropagation()}
                              >
                                {azienda.sito.replace(/^https?:\/\//, '')}
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground mt-2">
                          Fonte: {azienda.fonte}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {!hasSearched && (
        <Card className="p-12 text-center">
          <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Inserisci una località e seleziona i settori di interesse.<br />
            L'AI cercherà aziende nella zona e troverà i contatti pubblici.
          </p>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setCurrentStep(1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>
        <Button 
          onClick={() => setCurrentStep(3)}
          disabled={aziendeSelezionate.length === 0}
        >
          Prepara Email ({aziendeSelezionate.length})
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
