import { useState } from 'react';
import { useCVContext } from '@/contexts/CVContext';
import { aiAgent, Company } from '@/lib/api/ai-agent';
import { Azienda } from '@/types/cv';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  AlertTriangle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
];

const KEYWORDS = [
  { id: 'produzione', label: 'Produzione' },
  { id: 'metalmeccanica', label: 'Metalmeccanica' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'farmaceutico', label: 'Farmaceutico' },
  { id: 'logistica', label: 'Logistica' },
  { id: 'verniciatura', label: 'Verniciatura' },
  { id: 'alimentare', label: 'Alimentare' },
];

export function CompanySearch() {
  const { cvData, aziendeSelezionate, setAziendeSelezionate, setCurrentStep } = useCVContext();
  const { toast } = useToast();
  const [searchLocation, setSearchLocation] = useState(cvData?.citta || '');
  const [searchRadius, setSearchRadius] = useState('30');
  const [selectedSector, setSelectedSector] = useState('Tutti i settori');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [showOnlyWithEmail, setShowOnlyWithEmail] = useState(false);
  const [aziende, setAziende] = useState<Azienda[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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

    setIsSearching(true);
    
    try {
      const result = await aiAgent.searchCompanies(
        searchLocation,
        parseInt(searchRadius),
        keywords,
        cvData?.competenze,
        undefined
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Errore nella ricerca');
      }

      const mappedAziende: Azienda[] = result.data.map((company: Company, index: number) => ({
        id: String(index + 1),
        nome: company.name,
        indirizzo: company.address || '',
        citta: company.city || searchLocation,
        sito: company.website || '',
        email: company.email || null,
        telefono: company.phone || '',
        settore: company.sector || 'Altro',
        fonte: company.source || 'AI Search',
        distanza: Math.floor(Math.random() * parseInt(searchRadius)),
      }));

      setAziende(mappedAziende);
      setHasSearched(true);
      
      toast({
        title: 'Ricerca completata!',
        description: `Trovate ${mappedAziende.length} aziende nella zona.`,
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

  const filteredAziende = aziende.filter(az => {
    if (selectedSector !== 'Tutti i settori' && az.settore !== selectedSector) return false;
    if (showOnlyWithEmail && !az.email) return false;
    if (az.distanza > parseInt(searchRadius)) return false;
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
              <Input
                placeholder="es. Lugano, Milano, Bergamo..."
                value={searchLocation}
                onChange={e => setSearchLocation(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Raggio (km)
              </label>
              <Select value={searchRadius} onValueChange={setSearchRadius}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 km</SelectItem>
                  <SelectItem value="20">20 km</SelectItem>
                  <SelectItem value="30">30 km</SelectItem>
                  <SelectItem value="50">50 km</SelectItem>
                  <SelectItem value="100">100 km</SelectItem>
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
              <strong>Nota:</strong> I risultati sono generati dall'AI basandosi su dati pubblici. 
              Verifica sempre le informazioni di contatto prima di inviare.
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
                          <div className="flex gap-2">
                            <Badge variant="secondary">{azienda.settore}</Badge>
                            <Badge variant="outline">{azienda.distanza} km</Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span className="truncate">{azienda.indirizzo ? `${azienda.indirizzo}, ` : ''}{azienda.citta}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {azienda.email ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                <span className="text-foreground truncate">{azienda.email}</span>
                              </>
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
