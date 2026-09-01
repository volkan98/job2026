import { useState, useEffect, useRef } from 'react';
import { ManualCompanySearch } from './ManualCompanySearch';
import { useCVContext } from '@/contexts/CVContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAutoCampaign, CampaignSetupData } from '@/hooks/useAutoCampaign';
import { useEmailOAuth } from '@/hooks/useEmailOAuth';
import { CityAutocomplete, LocationSelection } from '@/components/ui/city-autocomplete';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Rocket, Pause, Play, Square, Search, Send, AlertTriangle,
  CheckCircle2, Clock, XCircle, Loader2, Sparkles, Building2,
  Mail, Shield, Timer, RotateCcw, Zap, Activity, Target,
  TrendingUp, RefreshCw, Terminal
} from 'lucide-react';

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

function CampaignSetup({ onStart }: { onStart: (data: CampaignSetupData) => void }) {
  const { cvData } = useCVContext();
  const { profile } = useUserProfile();
  const { connectedProviders, connect } = useEmailOAuth();

  const [searchMode, setSearchMode] = useState<'standard' | 'swiss_painting'>('standard');
  const [location, setLocation] = useState(cvData?.citta || '');
  const [locationSelection, setLocationSelection] = useState<LocationSelection | null>(null);
  const [radius, setRadius] = useState('30');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [target, setTarget] = useState('50');
  const [emailStyle, setEmailStyle] = useState('standard');
  const [includeRisky, setIncludeRisky] = useState(false);
  const [onlyCity, setOnlyCity] = useState(false);

  const hasGmail = connectedProviders.some(p => p.provider === 'gmail');
  const isSwissMode = searchMode === 'swiss_painting';

  const handleStart = () => {
    if (isSwissMode) {
      onStart({
        search_mode: 'swiss_painting',
        search_location: 'Ticino, Svizzera',
        search_location_query: 'Lugano, Ticino, Svizzera',
        search_radius: 50,
        search_keywords: ['verniciatura'],
        only_selected_city: false,
        target_total: parseInt(target),
        email_style: emailStyle,
        include_risky: includeRisky,
        user_city: cvData?.citta || 'Lugano',
        cv_file_path: profile?.cv_file_path || undefined,
      });
      return;
    }
    if (!location || keywords.length === 0) return;
    onStart({
      search_mode: 'standard',
      search_location: location,
      search_location_query: locationSelection?.searchQuery || location,
      search_radius: parseInt(radius),
      search_keywords: keywords,
      only_selected_city: onlyCity,
      target_total: parseInt(target),
      email_style: emailStyle,
      include_risky: includeRisky,
      user_city: cvData?.citta || location,
      cv_file_path: profile?.cv_file_path || undefined,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Rocket className="h-7 w-7 text-primary" />
          Auto Mode
        </h2>
        <p className="text-muted-foreground">
          Il sistema cerca aziende, genera email e invia automaticamente
        </p>
      </div>

      {!hasGmail && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>Connetti Gmail per usare Auto Mode</span>
              <Button size="sm" onClick={() => connect('gmail')}>Connetti Gmail</Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Configura Campagna
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Modalità di ricerca</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSearchMode('standard')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  !isSwissMode
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-semibold text-sm flex items-center gap-1.5">
                  <Search className="h-4 w-4" /> Standard
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Scegli città e settori manualmente
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('swiss_painting')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  isSwissMode
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-semibold text-sm">🇨🇭 Verniciatura Svizzera</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Aziende di verniciatura industriale in Ticino e Svizzera, siti verificati
                </div>
              </button>
            </div>
          </div>

          {!isSwissMode && (
          <div>
            <label className="text-sm font-medium mb-2 block">📍 Zona / Città</label>
            <CityAutocomplete
              placeholder="es. Lugano, Ticino..."
              value={location}
              onChange={setLocation}
              onLocationSelect={setLocationSelection}
            />
          </div>
          )}


          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Raggio</label>
              <Select value={radius} onValueChange={setRadius}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <label className="text-sm font-medium mb-2 block">🎯 Target email</label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20 email</SelectItem>
                  <SelectItem value="50">50 email</SelectItem>
                  <SelectItem value="100">100 email</SelectItem>
                  <SelectItem value="150">150 email</SelectItem>
                  <SelectItem value="200">200 email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isSwissMode && (
          <div>
            <label className="text-sm font-medium mb-2 block">Settori</label>
            <div className="flex flex-wrap gap-2">
              {KEYWORDS.map(kw => (
                <Badge
                  key={kw.id}
                  variant={keywords.includes(kw.id) ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/80"
                  onClick={() => setKeywords(prev =>
                    prev.includes(kw.id) ? prev.filter(k => k !== kw.id) : [...prev, kw.id]
                  )}
                >
                  {kw.label}
                </Badge>
              ))}
            </div>
          </div>
          )}

          {isSwissMode && (
            <Alert className="border-primary/30 bg-primary/5">
              <Search className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                Il bot cercherà automaticamente aziende di <strong>verniciatura industriale</strong> in
                Ticino e nel resto della Svizzera (IT/DE/FR/EN), verificando che ogni sito sia
                online e che l'email sia reale. Rotazione automatica di parole chiave e città a ogni ciclo.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Stile email</label>
              <Select value={emailStyle} onValueChange={setEmailStyle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="breve">Breve</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="formale">Formale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox id="includeRisky" checked={includeRisky} onCheckedChange={(c) => setIncludeRisky(c as boolean)} />
              <label htmlFor="includeRisky" className="text-sm cursor-pointer">Includi contatti "risky" (meno verificati)</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="onlyCity" checked={onlyCity} onCheckedChange={(c) => setOnlyCity(c as boolean)} />
              <label htmlFor="onlyCity" className="text-sm cursor-pointer">Solo città selezionata</label>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleStart}
            disabled={!hasGmail || !location || keywords.length === 0}
          >
            <Rocket className="h-5 w-5 mr-2" />
            Avvia Auto Mode
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: any; label: string; className: string }> = {
    running: { icon: Activity, label: 'In esecuzione', className: 'bg-green-500/10 text-green-700 border-green-500/30' },
    paused: { icon: Pause, label: 'In pausa', className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30' },
    completed: { icon: CheckCircle2, label: 'Completata', className: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
    stopped: { icon: Square, label: 'Fermata', className: 'bg-muted text-muted-foreground' },
    idle: { icon: Clock, label: 'In attesa', className: 'bg-muted text-muted-foreground' },
    error: { icon: XCircle, label: 'Errore', className: 'bg-destructive/10 text-destructive' },
  };
  const c = config[status] || config.idle;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={c.className}>
      <Icon className="h-3 w-3 mr-1" />
      {c.label}
    </Badge>
  );
}

function CampaignDashboard({
  campaign,
  events,
  queueItems,
  pauseCampaign,
  resumeCampaign,
  stopCampaign,
  resetCampaign,
  triggerProcessor,
}: Pick<ReturnType<typeof useAutoCampaign>, 'campaign' | 'events' | 'queueItems' | 'pauseCampaign' | 'resumeCampaign' | 'stopCampaign' | 'resetCampaign' | 'triggerProcessor'>) {
  const [cooldownRemaining, setCooldownRemaining] = useState('');

  useEffect(() => {
    if (!campaign?.resume_at) { setCooldownRemaining(''); return; }
    const interval = setInterval(() => {
      const remaining = new Date(campaign.resume_at!).getTime() - Date.now();
      if (remaining <= 0) { setCooldownRemaining(''); return; }
      const min = Math.floor(remaining / 60000);
      const sec = Math.floor((remaining % 60000) / 1000);
      setCooldownRemaining(`${min}:${sec.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [campaign?.resume_at]);

  if (!campaign) return null;

  const progress = campaign.target_total > 0 ? (campaign.total_sent / campaign.target_total) * 100 : 0;
  const isActive = ['running', 'paused'].includes(campaign.status);
  const isFinished = ['completed', 'stopped'].includes(campaign.status);

  const queueStats = {
    pending: queueItems.filter(q => q.status === 'pending').length,
    generated: queueItems.filter(q => q.status === 'email_generated').length,
    sent: queueItems.filter(q => q.status === 'sent').length,
    failed: queueItems.filter(q => q.status === 'failed').length,
    discarded: queueItems.filter(q => q.status === 'discarded').length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Zap className="h-7 w-7 text-primary" />
          Auto Mode Dashboard
        </h2>
        <div className="flex items-center justify-center gap-2">
          <StatusBadge status={campaign.status} />
          {cooldownRemaining && (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700">
              <Timer className="h-3 w-3 mr-1" />
              Riprende in {cooldownRemaining}
            </Badge>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {campaign.status === 'running' && (
          <Button variant="outline" onClick={pauseCampaign}>
            <Pause className="h-4 w-4 mr-2" /> Pausa
          </Button>
        )}
        {campaign.status === 'paused' && (
          <Button onClick={resumeCampaign}>
            <Play className="h-4 w-4 mr-2" /> Riprendi
          </Button>
        )}
        {isActive && (
          <Button variant="destructive" onClick={stopCampaign}>
            <Square className="h-4 w-4 mr-2" /> Ferma
          </Button>
        )}
        {isActive && (
          <Button variant="outline" size="sm" onClick={triggerProcessor}>
            <RefreshCw className="h-4 w-4 mr-1" /> Forza elaborazione
          </Button>
        )}
        {isFinished && (
          <Button onClick={resetCampaign}>
            <RotateCcw className="h-4 w-4 mr-2" /> Nuova Campagna
          </Button>
        )}
      </div>

      {/* Pause reason */}
      {campaign.pause_reason && campaign.status === 'paused' && (
        <Alert className="bg-yellow-500/5 border-yellow-500/30">
          <Shield className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            {campaign.pause_reason}
            {cooldownRemaining && ` — Ripresa automatica in ${cooldownRemaining}`}
          </AlertDescription>
        </Alert>
      )}

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progresso</span>
              <span className="text-muted-foreground">
                {campaign.total_sent} / {campaign.target_total} email inviate
              </span>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="text-xs text-muted-foreground text-right">
              Ciclo ricerca: {campaign.current_search_cycle} / {campaign.max_search_cycles}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Search className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{campaign.total_found}</div>
            <div className="text-xs text-muted-foreground">Trovate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Mail className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <div className="text-2xl font-bold">{queueStats.generated}</div>
            <div className="text-xs text-muted-foreground">Pronte</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Send className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <div className="text-2xl font-bold text-green-600">{campaign.total_sent}</div>
            <div className="text-xs text-muted-foreground">Inviate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <XCircle className="h-5 w-5 mx-auto text-destructive mb-1" />
            <div className="text-2xl font-bold text-destructive">{campaign.total_failed}</div>
            <div className="text-xs text-muted-foreground">Fallite</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <div className="text-2xl font-bold">{campaign.total_skipped}</div>
            <div className="text-xs text-muted-foreground">Scartate</div>
          </CardContent>
        </Card>
      </div>

      {/* Three columns: Queue | Manual Search | Live Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Queue Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Coda ({queueItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[350px]">
              <div className="space-y-1 p-4">
                {queueItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Coda vuota — ricerca in corso</p>
                )}
                {queueItems.slice(0, 50).map(item => (
                  <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.company_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.company_email}</p>
                    </div>
                    <QueueStatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Manual Search */}
        {campaign && <ManualCompanySearch campaignId={campaign.id} />}

        {/* Live Console */}
        <LiveConsole events={events} />
      </div>

      {/* Campaign Info */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>📍 {campaign.search_location}</span>
            <span>📏 {campaign.search_radius} km</span>
            <span>🔑 {campaign.search_keywords?.join(', ')}</span>
            <span>✉️ Stile: {campaign.email_style}</span>
            {campaign.started_at && <span>⏱️ Avviata: {new Date(campaign.started_at).toLocaleString('it-IT')}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LiveConsole({ events }: { events: { id: string; event_type: string; message: string; created_at: string; metadata: any }[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length]);

  const getLogColor = (type: string) => {
    if (['email_sent', 'search_completed', 'auto_resume', 'target_completed'].includes(type)) return 'text-green-400';
    if (['send_failed', 'error'].includes(type)) return 'text-red-400';
    if (['paused_rate_limit', 'rate_limit', 'search_empty'].includes(type)) return 'text-yellow-400';
    if (['search_started'].includes(type)) return 'text-blue-400';
    return 'text-gray-300';
  };

  const getPrefix = (type: string) => {
    if (['email_sent', 'search_completed', 'auto_resume', 'target_completed'].includes(type)) return '✓';
    if (['send_failed', 'error'].includes(type)) return '✗';
    if (['paused_rate_limit', 'rate_limit'].includes(type)) return '⏸';
    if (['search_started'].includes(type)) return '→';
    if (['search_empty', 'search_exhausted'].includes(type)) return '⚠';
    return '•';
  };

  return (
    <Card className="bg-[#1e1e2e] border-[#313244]">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2 text-gray-300">
          <Terminal className="h-4 w-4 text-green-400" />
          <span className="font-mono">Console Live</span>
          <span className="ml-auto text-[10px] font-mono text-gray-500">{events.length} eventi</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={scrollRef} className="h-[300px] overflow-y-auto font-mono text-xs px-4 pb-3">
          {events.length === 0 && (
            <div className="flex items-center gap-2 py-4 text-gray-500">
              <span className="animate-pulse">▌</span>
              <span>In attesa di eventi...</span>
            </div>
          )}
          {events.map((event, i) => (
            <div key={event.id} className="py-0.5 flex gap-2 leading-5">
              <span className="text-gray-600 shrink-0 select-none">
                {new Date(event.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className={`shrink-0 ${getLogColor(event.event_type)}`}>{getPrefix(event.event_type)}</span>
              <span className={getLogColor(event.event_type)}>{event.message}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EventIcon({ type }: { type: string }) {
  const icons: Record<string, any> = {
    search_started: <Search className="h-3.5 w-3.5 text-blue-500 mt-0.5" />,
    search_completed: <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5" />,
    search_empty: <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5" />,
    search_exhausted: <XCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />,
    email_sent: <Send className="h-3.5 w-3.5 text-green-500 mt-0.5" />,
    send_failed: <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5" />,
    paused_rate_limit: <Shield className="h-3.5 w-3.5 text-yellow-500 mt-0.5" />,
    auto_resume: <Play className="h-3.5 w-3.5 text-green-500 mt-0.5" />,
    target_completed: <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5" />,
    error: <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5" />,
    rate_limit: <Timer className="h-3.5 w-3.5 text-yellow-500 mt-0.5" />,
  };
  return icons[type] || <Activity className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />;
}

function QueueStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'In attesa', className: 'bg-muted text-muted-foreground' },
    email_generated: { label: 'Pronta', className: 'bg-blue-500/10 text-blue-700' },
    sent: { label: 'Inviata', className: 'bg-green-500/10 text-green-700' },
    failed: { label: 'Fallita', className: 'bg-destructive/10 text-destructive' },
    discarded: { label: 'Scartata', className: 'bg-muted text-muted-foreground' },
  };
  const c = config[status] || config.pending;
  return <Badge variant="outline" className={`text-[10px] ${c.className}`}>{c.label}</Badge>;
}

export function AutoCampaignDashboard() {
  const { setCurrentStep } = useCVContext();
  const { profile } = useUserProfile();
  const autoCampaign = useAutoCampaign();
  const { campaign, isLoading, startCampaign } = autoCampaign;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile?.cv_file_path && !profile?.cv_short_summary) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Carica prima il tuo CV per usare Auto Mode.</p>
        <Button onClick={() => setCurrentStep(0)} className="mt-4">Carica CV</Button>
      </div>
    );
  }

  if (campaign && ['running', 'paused', 'completed', 'stopped'].includes(campaign.status)) {
    return <CampaignDashboard {...autoCampaign} />;
  }

  return <CampaignSetup onStart={startCampaign} />;
}
