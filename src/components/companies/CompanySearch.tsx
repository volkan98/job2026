import { useState } from 'react';
import { useCVContext } from '@/contexts/CVContext';
import { Azienda } from '@/types/cv';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  XCircle
} from 'lucide-react';

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

// Mock data - will be replaced with real API
const mockAziende: Azienda[] = [
  {
    id: '1',
    nome: 'Industrie Meccaniche Bergamasche SpA',
    indirizzo: 'Via dell\'Industria 45',
    citta: 'Bergamo',
    sito: 'www.imbergamo.it',
    email: 'info@imbergamo.it',
    telefono: '+39 035 123456',
    settore: 'Metalmeccanico',
    fonte: 'Sito aziendale',
    distanza: 5,
  },
  {
    id: '2',
    nome: 'PackItalia Srl',
    indirizzo: 'Via Roma 120',
    citta: 'Brescia',
    sito: 'www.packitalia.com',
    email: 'hr@packitalia.com',
    telefono: '+39 030 987654',
    settore: 'Packaging',
    fonte: 'LinkedIn',
    distanza: 12,
  },
  {
    id: '3',
    nome: 'FarmaTech Industries',
    indirizzo: 'Via della Scienza 8',
    citta: 'Milano',
    sito: 'www.farmatech.it',
    email: null,
    telefono: '+39 02 555666',
    settore: 'Farmaceutico',
    fonte: 'Camera di Commercio',
    distanza: 25,
  },
  {
    id: '4',
    nome: 'LogiNord Trasporti',
    indirizzo: 'Via Logistica 200',
    citta: 'Monza',
    sito: 'www.loginord.it',
    email: 'lavoro@loginord.it',
    telefono: '+39 039 444555',
    settore: 'Logistica',
    fonte: 'Sito aziendale',
    distanza: 18,
  },
  {
    id: '5',
    nome: 'Verniciature Industriali Lombarde',
    indirizzo: 'Via Artigiani 67',
    citta: 'Bergamo',
    sito: 'www.villombarde.it',
    email: 'info@villombarde.it',
    telefono: '+39 035 777888',
    settore: 'Verniciatura',
    fonte: 'Pagine Gialle',
    distanza: 8,
  },
];

export function CompanySearch() {
  const { cvData, aziendeSelezionate, setAziendeSelezionate, setCurrentStep } = useCVContext();
  const [searchLocation, setSearchLocation] = useState(cvData?.citta || '');
  const [searchRadius, setSearchRadius] = useState('30');
  const [selectedSector, setSelectedSector] = useState('Tutti i settori');
  const [showOnlyWithEmail, setShowOnlyWithEmail] = useState(false);
  const [aziende, setAziende] = useState<Azienda[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    setIsSearching(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setAziende(mockAziende);
    setHasSearched(true);
    setIsSearching(false);
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
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aziende.csv';
    a.click();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          Trova Aziende
        </h2>
        <p className="text-muted">
          Cerca aziende nella tua zona e seleziona quelle a cui candidarti
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4" /> Zona / Città
              </label>
              <Input
                placeholder="es. Milano, Bergamo..."
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

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Settore
              </label>
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SETTORI.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-4">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="emailOnly"
                checked={showOnlyWithEmail}
                onCheckedChange={(checked) => setShowOnlyWithEmail(checked as boolean)}
              />
              <label htmlFor="emailOnly" className="text-sm text-muted cursor-pointer">
                Mostra solo aziende con email
              </label>
            </div>
            
            <Button onClick={handleSearch} disabled={isSearching || !searchLocation}>
              {isSearching ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Ricerca...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Cerca Aziende
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {hasSearched && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted" />
              <span className="text-sm text-muted">
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
                          <div className="flex items-center gap-2 text-muted">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span className="truncate">{azienda.indirizzo}, {azienda.citta}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {azienda.email ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                <span className="text-foreground truncate">{azienda.email}</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-muted shrink-0" />
                                <span className="text-muted italic">Email non trovata</span>
                              </>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-muted">
                            <Phone className="h-4 w-4 shrink-0" />
                            <span>{azienda.telefono}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted shrink-0" />
                            <a 
                              href={`https://${azienda.sito}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                              onClick={e => e.stopPropagation()}
                            >
                              {azienda.sito}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                        
                        <p className="text-xs text-muted mt-2">
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
          <Building2 className="h-16 w-16 text-muted mx-auto mb-4" />
          <p className="text-muted">
            Inserisci una località e clicca "Cerca Aziende" per trovare opportunità nella tua zona
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
