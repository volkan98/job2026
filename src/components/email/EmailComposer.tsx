import { useState, useEffect, useCallback } from 'react';
import { useCVContext } from '@/contexts/CVContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { aiAgent, EmailTemplate as AIEmailTemplate } from '@/lib/api/ai-agent';
import { useEmailOAuth, EmailProvider } from '@/hooks/useEmailOAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  Send, 
  RefreshCw, 
  ArrowLeft,
  ArrowRight,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Paperclip,
  User,
  Loader2,
  Sparkles,
  Ban,
  Copy,
  ExternalLink,
  History,
  Unlink,
  ShieldAlert,
  Timer,
  Shield
} from 'lucide-react';

type EmailStyle = 'breve' | 'standard' | 'formale';

interface LocalEmailTemplate {
  oggetto: string;
  corpo: string;
  firma: string;
  matchPoints?: string[];
}

export function EmailComposer() {
  const { cvData, cvFile, aziendeSelezionate, logInvii, addLogInvio, setCurrentStep } = useCVContext();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const { 
    connectedProviders, 
    isLoading: isOAuthLoading, 
    isConnecting,
    connect, 
    disconnect, 
    sendEmail: sendOAuthEmail, 
    isConnected, 
    getConnectedEmail,
    getActiveProvider 
  } = useEmailOAuth();
  
  const [emailStyle, setEmailStyle] = useState<EmailStyle>('standard');
  const [currentEmail, setCurrentEmail] = useState<LocalEmailTemplate | null>(null);
  const [selectedAziendaId, setSelectedAziendaId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [attachCV, setAttachCV] = useState(true);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    isDuplicate: boolean;
    type?: string;
    lastDate?: string;
    originalCompany?: string;
  } | null>(null);

  // Anti-spam tracking
  const GMAIL_HOURLY_LIMIT = 15;
  const GMAIL_DAILY_LIMIT = 80;
  const COOLDOWN_MINUTES = 10; // Pausa consigliata dopo X email
  const COOLDOWN_THRESHOLD = 8; // Dopo quante email suggerire pausa
  
  const [sendTimestamps, setSendTimestamps] = useState<number[]>(() => {
    const saved = localStorage.getItem('email_send_timestamps');
    return saved ? JSON.parse(saved) : [];
  });
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(() => {
    const saved = localStorage.getItem('email_cooldown_until');
    return saved ? Number(saved) : null;
  });
  const [cooldownDismissed, setCooldownDismissed] = useState(false);

  // Clean old timestamps and persist
  useEffect(() => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const cleaned = sendTimestamps.filter(t => t > oneDayAgo);
    if (cleaned.length !== sendTimestamps.length) {
      setSendTimestamps(cleaned);
    }
    localStorage.setItem('email_send_timestamps', JSON.stringify(cleaned));
  }, [sendTimestamps]);

  useEffect(() => {
    if (cooldownUntil) {
      localStorage.setItem('email_cooldown_until', String(cooldownUntil));
    } else {
      localStorage.removeItem('email_cooldown_until');
    }
  }, [cooldownUntil]);

  const getHourlySentCount = useCallback(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return sendTimestamps.filter(t => t > oneHourAgo).length;
  }, [sendTimestamps]);

  const getDailySentCount = useCallback(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return sendTimestamps.filter(t => t > oneDayAgo).length;
  }, [sendTimestamps]);

  const getSessionSentCount = useCallback(() => {
    // Count sent in the last burst (consecutive sends within 2 min gaps)
    const now = Date.now();
    let count = 0;
    const sorted = [...sendTimestamps].sort((a, b) => b - a);
    for (const t of sorted) {
      if (now - t < 60 * 60 * 1000) count++;
      else break;
    }
    return count;
  }, [sendTimestamps]);

  const isCooldownActive = cooldownUntil && Date.now() < cooldownUntil && !cooldownDismissed;
  const hourlySent = getHourlySentCount();
  const dailySent = getDailySentCount();
  const hourlyProgress = (hourlySent / GMAIL_HOURLY_LIMIT) * 100;
  const isNearLimit = hourlySent >= GMAIL_HOURLY_LIMIT - 3;
  const isAtLimit = hourlySent >= GMAIL_HOURLY_LIMIT;
  const shouldSuggestCooldown = hourlySent >= COOLDOWN_THRESHOLD && !isCooldownActive;
  
  const getSpamRiskLevel = (): 'safe' | 'caution' | 'warning' | 'danger' | 'blocked' => {
    if (isAtLimit) return 'blocked';
    if (hourlySent >= GMAIL_HOURLY_LIMIT - 2) return 'danger';
    if (hourlySent >= GMAIL_HOURLY_LIMIT - 5) return 'warning';
    if (hourlySent >= 5) return 'caution';
    return 'safe';
  };

  const spamRisk = getSpamRiskLevel();
  
  const recordSend = () => {
    const now = Date.now();
    setSendTimestamps(prev => [...prev, now]);
    
    // Auto-cooldown after threshold
    if (hourlySent + 1 >= COOLDOWN_THRESHOLD) {
      setCooldownUntil(now + COOLDOWN_MINUTES * 60 * 1000);
      setCooldownDismissed(false);
    }
  };

  // Cooldown timer
  const [cooldownRemaining, setCooldownRemaining] = useState('');
  useEffect(() => {
    if (!cooldownUntil || cooldownDismissed) return;
    const interval = setInterval(() => {
      const remaining = cooldownUntil - Date.now();
      if (remaining <= 0) {
        setCooldownUntil(null);
        setCooldownRemaining('');
      } else {
        const min = Math.floor(remaining / 60000);
        const sec = Math.floor((remaining % 60000) / 1000);
        setCooldownRemaining(`${min}:${sec.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil, cooldownDismissed]);

  const selectedAzienda = aziendeSelezionate.find(a => a.id === selectedAziendaId);

  // Check for duplicates when selecting a company
  useEffect(() => {
    const checkDuplicate = async () => {
      if (!selectedAzienda?.email) {
        setDuplicateWarning(null);
        return;
      }

      const result = await aiAgent.checkDuplicate(
        selectedAzienda.email,
        selectedAzienda.nome,
        true
      );

      if (result.isDuplicate) {
        setDuplicateWarning({
          isDuplicate: true,
          type: result.duplicateType,
          lastDate: result.lastSentDate,
          originalCompany: result.originalCompany,
        });
      } else {
        setDuplicateWarning(null);
      }
    };

    checkDuplicate();
  }, [selectedAzienda]);

  // Set first company as selected
  useEffect(() => {
    if (aziendeSelezionate.length > 0 && !selectedAziendaId) {
      setSelectedAziendaId(aziendeSelezionate[0].id);
    }
  }, [aziendeSelezionate, selectedAziendaId]);

  // Generate email when company or style changes
  const handleGenerateEmail = async () => {
    if (!cvData || !selectedAzienda) return;

    setIsGenerating(true);
    
    try {
      const company = {
        name: selectedAzienda.nome,
        sector: selectedAzienda.settore,
        city: selectedAzienda.citta,
        website: selectedAzienda.sito,
      };

      const result = await aiAgent.generateEmail(
        company,
        {
          nome: cvData.nome,
          cognome: cvData.cognome,
          email: cvData.email,
          telefono: cvData.telefono,
          citta: cvData.citta,
          profilo: cvData.profilo,
          competenze: cvData.competenze,
        },
        emailStyle,
        undefined,
        'immediata'
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Errore nella generazione');
      }

      setCurrentEmail({
        oggetto: result.data.oggetto,
        corpo: result.data.corpo,
        firma: result.data.firma,
        matchPoints: result.data.matchPoints,
      });

      toast({
        title: 'Email generata!',
        description: `Email ${emailStyle} personalizzata per ${selectedAzienda.nome}`,
      });
    } catch (error: any) {
      console.error('Error generating email:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile generare l\'email.',
        variant: 'destructive',
      });
      
      // Fallback to basic template
      setCurrentEmail({
        oggetto: `Candidatura spontanea - ${cvData.esperienze?.[0]?.ruolo || 'Professionista'}`,
        corpo: `Gentili Signori di ${selectedAzienda.nome},\n\nmi permetto di inviarVi la mia candidatura spontanea.\n\n${cvData.profilo}\n\nResto a disposizione per un colloquio.\n\nCordiali saluti`,
        firma: `${cvData.nome} ${cvData.cognome}\n${cvData.email}\n${cvData.telefono}`,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Reset email and auto-generate when company changes
  useEffect(() => {
    if (selectedAzienda && cvData) {
      setCurrentEmail(null);
      handleGenerateEmail();
    }
  }, [selectedAziendaId, emailStyle]);

  const handleConnectEmail = async (provider: EmailProvider) => {
    await connect(provider);
  };

  const handleSendEmail = async () => {
    if (!selectedAzienda || !currentEmail || !selectedAzienda.email) return;

    const activeProvider = getActiveProvider();
    if (!activeProvider) {
      toast({
        title: 'Account non connesso',
        description: 'Connetti Gmail o Outlook per inviare email.',
        variant: 'destructive',
      });
      return;
    }

    if (duplicateWarning?.isDuplicate) {
      toast({
        title: 'Attenzione',
        description: `Hai già contattato questa azienda il ${new Date(duplicateWarning.lastDate!).toLocaleDateString('it-IT')}`,
        variant: 'destructive',
      });
      return;
    }
    
    setIsSending(true);
    
    try {
      const fullBody = `${currentEmail.corpo}\n\n${currentEmail.firma}`;
      
      // Get CV file path for attachment
      const cvAttachmentPath = attachCV ? profile?.cv_file_path : undefined;
      
      const result = await sendOAuthEmail(
        activeProvider,
        selectedAzienda.email,
        currentEmail.oggetto,
        fullBody,
        cvAttachmentPath || undefined
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // Record the sent email in database
      await aiAgent.recordSentEmail(
        null,
        selectedAzienda.nome,
        selectedAzienda.email,
        currentEmail.oggetto,
        currentEmail.corpo,
        'v1'
      );

      // Track for anti-spam
      recordSend();
      addLogInvio({
        id: Date.now().toString(),
        data: new Date(),
        destinatario: selectedAzienda.nome,
        emailDestinatario: selectedAzienda.email,
        oggetto: currentEmail.oggetto,
        stato: 'inviato',
      });

      toast({
        title: 'Email inviata!',
        description: `Email inviata a ${selectedAzienda.nome} tramite ${activeProvider === 'gmail' ? 'Gmail' : 'Outlook'}`,
      });
      
      // Move to next company
      const currentIndex = aziendeSelezionate.findIndex(a => a.id === selectedAziendaId);
      if (currentIndex < aziendeSelezionate.length - 1) {
        setSelectedAziendaId(aziendeSelezionate[currentIndex + 1].id);
        setCurrentEmail(null); // Reset to trigger new generation
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: 'Errore invio',
        description: error.message || 'Impossibile inviare l\'email.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!cvData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nessun CV caricato.</p>
        <Button onClick={() => setCurrentStep(0)} className="mt-4">
          Carica CV
        </Button>
      </div>
    );
  }

  if (aziendeSelezionate.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nessuna azienda selezionata.</p>
        <Button onClick={() => setCurrentStep(2)} className="mt-4">
          Trova Aziende
        </Button>
      </div>
    );
  }

  const sentCount = logInvii.filter(l => l.stato === 'inviato').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Email Personalizzate
        </h2>
        <p className="text-muted-foreground">
          L'AI genera email uniche per ogni azienda basate sul tuo CV
        </p>
      </div>

      {/* Email Connection */}
      {isConnecting && (
        <Alert className="bg-primary/5 border-primary/20">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <AlertDescription>
            Connessione in corso...
          </AlertDescription>
        </Alert>
      )}

      {!isConnecting && connectedProviders.length === 0 && (
        <Alert className="bg-primary/5 border-primary/20">
          <Mail className="h-4 w-4 text-primary" />
          <AlertDescription>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <span>Collega il tuo account email per inviare direttamente dall'app</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleConnectEmail('gmail')} disabled={isOAuthLoading}>
                  {isOAuthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connetti Gmail'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleConnectEmail('outlook')} disabled={isOAuthLoading}>
                  {isOAuthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connetti Outlook'}
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!isConnecting && connectedProviders.length > 0 && (
        <Alert className="bg-green-500/10 border-green-500/30">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <span className="text-green-700">
                Connesso a {connectedProviders.map(p => 
                  `${p.provider === 'gmail' ? 'Gmail' : 'Outlook'} (${p.email})`
                ).join(', ')}. 
                Inviate: {sentCount} / Rimanenti: {aziendeSelezionate.length - sentCount}
              </span>
              <div className="flex gap-2">
                {connectedProviders.map(p => (
                  <Button 
                    key={p.provider}
                    size="sm" 
                    variant="outline" 
                    onClick={() => disconnect(p.provider as EmailProvider)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Unlink className="h-4 w-4 mr-1" />
                    Disconnetti {p.provider === 'gmail' ? 'Gmail' : 'Outlook'}
                  </Button>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Aziende ({aziendeSelezionate.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-1 p-4">
                {aziendeSelezionate.map(azienda => {
                  const sentLog = logInvii.find(l => l.emailDestinatario === azienda.email);
                  const isSelected = azienda.id === selectedAziendaId;
                  
                  return (
                    <button
                      key={azienda.id}
                      onClick={() => {
                        setSelectedAziendaId(azienda.id);
                        setCurrentEmail(null);
                      }}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        isSelected 
                          ? 'bg-primary/10 border border-primary' 
                          : 'hover:bg-accent border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {azienda.nome}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {azienda.email}
                          </p>
                        </div>
                        {sentLog && (
                          <Badge 
                            variant={sentLog.stato === 'inviato' ? 'default' : 'destructive'}
                            className="shrink-0 ml-2"
                          >
                            {sentLog.stato === 'inviato' ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Email Editor */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Email AI
              </CardTitle>
              <Tabs value={emailStyle} onValueChange={v => {
                setEmailStyle(v as EmailStyle);
                setCurrentEmail(null);
              }}>
                <TabsList>
                  <TabsTrigger value="breve">Breve</TabsTrigger>
                  <TabsTrigger value="standard">Standard</TabsTrigger>
                  <TabsTrigger value="formale">Formale</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {duplicateWarning?.isDuplicate && (
              <Alert variant="destructive">
                <Ban className="h-4 w-4" />
                <AlertDescription>
                  <strong>Già contattata!</strong> Hai inviato a {duplicateWarning.type === 'exact_email' ? 'questa email' : 'questo dominio'} 
                  {duplicateWarning.lastDate && ` il ${new Date(duplicateWarning.lastDate).toLocaleDateString('it-IT')}`}
                  {duplicateWarning.originalCompany && ` (${duplicateWarning.originalCompany})`}
                </AlertDescription>
              </Alert>
            )}

            {selectedAzienda && (
              <>
                <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">A:</span>
                  <span className="font-medium">{selectedAzienda.email}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {selectedAzienda.settore}
                  </Badge>
                </div>

                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">L'AI sta generando un'email personalizzata...</p>
                  </div>
                ) : currentEmail ? (
                  <>
                    {currentEmail.matchPoints && currentEmail.matchPoints.length > 0 && (
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-sm font-medium text-green-700 mb-2">Punti di match trovati:</p>
                        <div className="flex flex-wrap gap-2">
                          {currentEmail.matchPoints.map((point, i) => (
                            <Badge key={i} variant="outline" className="text-green-700 border-green-500/50">
                              ✓ {point}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        Oggetto
                      </label>
                      <Input
                        value={currentEmail.oggetto}
                        onChange={e => setCurrentEmail({ ...currentEmail, oggetto: e.target.value })}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-foreground">
                          Corpo Email
                        </label>
                        <Badge variant="outline" className="text-xs">HTML con grassetto</Badge>
                      </div>
                      <div 
                        className="min-h-[200px] p-4 border rounded-md bg-background text-sm leading-relaxed whitespace-pre-wrap font-sans"
                        dangerouslySetInnerHTML={{ 
                          __html: currentEmail.corpo
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/&lt;b&gt;/g, '<b>')
                            .replace(/&lt;\/b&gt;/g, '</b>')
                            .replace(/\n/g, '<br>')
                        }}
                      />
                      <Textarea
                        value={currentEmail.corpo}
                        onChange={e => setCurrentEmail({ ...currentEmail, corpo: e.target.value })}
                        rows={6}
                        className="font-sans mt-2 text-xs"
                        placeholder="Modifica il codice sorgente dell'email..."
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        Firma
                      </label>
                      <Textarea
                        value={currentEmail.firma}
                        onChange={e => setCurrentEmail({ ...currentEmail, firma: e.target.value })}
                        rows={4}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50 border">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Allega CV</span>
                        {profile?.cv_file_path ? (
                          <Badge variant="outline" className="text-xs">
                            {profile.cv_file_path.split('/').pop()}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            Nessun CV caricato
                          </Badge>
                        )}
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={attachCV && !!profile?.cv_file_path}
                          disabled={!profile?.cv_file_path}
                          onChange={(e) => setAttachCV(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-background after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>

                    {/* Send Email Button - OAuth */}
                    {connectedProviders.length > 0 && (
                      <Button 
                        className="w-full"
                        onClick={handleSendEmail}
                        disabled={isSending || duplicateWarning?.isDuplicate || isAtLimit}
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Invio in corso...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Invia Email tramite {getActiveProvider() === 'gmail' ? 'Gmail' : 'Outlook'}
                          </>
                        )}
                      </Button>
                    )}

                    {/* Copy / Mailto buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          const fullEmail = `${currentEmail.corpo}\n\n${currentEmail.firma}`;
                          navigator.clipboard.writeText(fullEmail);
                          toast({
                            title: 'Copiato!',
                            description: 'Email copiata negli appunti. Incollala nel tuo client.',
                          });
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copia Email
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => {
                          const subject = encodeURIComponent(currentEmail.oggetto);
                          const body = encodeURIComponent(`${currentEmail.corpo}\n\n${currentEmail.firma}`);
                          window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${selectedAzienda?.email}&su=${subject}&body=${body}`, '_blank');
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Apri Gmail
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => {
                          const subject = encodeURIComponent(currentEmail.oggetto);
                          const body = encodeURIComponent(`${currentEmail.corpo}\n\n${currentEmail.firma}`);
                          window.open(`mailto:${selectedAzienda?.email}?subject=${subject}&body=${body}`, '_blank');
                        }}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Apri Client Email
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button variant="outline" onClick={handleGenerateEmail} disabled={isGenerating}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                        Rigenera
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={async () => {
                          // Mark as sent manually
                          if (!selectedAzienda?.email || !currentEmail) return;
                          
                          setIsSending(true);
                          try {
                            await aiAgent.recordSentEmail(
                              null,
                              selectedAzienda.nome,
                              selectedAzienda.email,
                              currentEmail.oggetto,
                              currentEmail.corpo,
                              'manual'
                            );

                            // Track for anti-spam
                            recordSend();

                            addLogInvio({
                              id: Date.now().toString(),
                              data: new Date(),
                              destinatario: selectedAzienda.nome,
                              emailDestinatario: selectedAzienda.email,
                              oggetto: currentEmail.oggetto,
                              stato: 'inviato',
                            });

                            toast({
                              title: 'Marcato come inviato!',
                              description: `${selectedAzienda.nome} aggiunto alla lista "Già inviato".`,
                            });
                            
                            // Move to next company
                            const currentIndex = aziendeSelezionate.findIndex(a => a.id === selectedAziendaId);
                            if (currentIndex < aziendeSelezionate.length - 1) {
                              setSelectedAziendaId(aziendeSelezionate[currentIndex + 1].id);
                              setCurrentEmail(null);
                            }
                          } catch (error: any) {
                            toast({
                              title: 'Errore',
                              description: error.message,
                              variant: 'destructive',
                            });
                          } finally {
                            setIsSending(false);
                          }
                        }}
                        disabled={isSending || duplicateWarning?.isDuplicate}
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Salvataggio...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Marca come Inviato
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Button onClick={handleGenerateEmail}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Genera Email AI
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Send History */}
      {logInvii.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Storico Invii ({logInvii.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logInvii.slice(0, 5).map(log => (
                <div 
                  key={log.id} 
                  className="flex items-center justify-between p-3 bg-accent/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {log.stato === 'inviato' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">{log.destinatario}</p>
                      <p className="text-xs text-muted-foreground">{log.emailDestinatario}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {log.data.toLocaleDateString('it-IT', { 
                        day: '2-digit', 
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <Badge variant={log.stato === 'inviato' ? 'default' : 'destructive'}>
                      {log.stato}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 🛡️ Anti-Spam Gmail Alert */}
      <Card className={`border-2 ${
        spamRisk === 'blocked' ? 'border-destructive bg-destructive/5' :
        spamRisk === 'danger' ? 'border-orange-500 bg-orange-500/5' :
        spamRisk === 'warning' ? 'border-yellow-500 bg-yellow-500/5' :
        'border-green-500/30 bg-green-500/5'
      }`}>
        <CardContent className="pt-5 pb-4 space-y-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className={`h-5 w-5 ${
              spamRisk === 'blocked' ? 'text-destructive' :
              spamRisk === 'danger' ? 'text-orange-500' :
              spamRisk === 'warning' ? 'text-yellow-600' :
              'text-green-600'
            }`} />
            <div className="flex-1">
              <p className="font-semibold text-foreground text-sm">
                Protezione Anti-Spam Gmail
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {spamRisk === 'blocked' 
                  ? '⛔ Limite orario raggiunto! Attendi prima di inviare altre email.'
                  : spamRisk === 'danger'
                  ? '🔴 Quasi al limite! Rallenta gli invii per evitare blocchi.'
                  : spamRisk === 'warning'
                  ? '🟡 Attenzione: stai inviando molte email. Considera una pausa.'
                  : spamRisk === 'caution'
                  ? '🟢 Ritmo ok, ma monitora il contatore.'
                  : '✅ Tutto in regola. Invii sicuri.'}
              </p>
            </div>
            <Badge variant={spamRisk === 'blocked' || spamRisk === 'danger' ? 'destructive' : 'secondary'}>
              {hourlySent}/{GMAIL_HOURLY_LIMIT} /ora
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Invii ultima ora</span>
              <span>{hourlySent} di {GMAIL_HOURLY_LIMIT} (giornaliere: {dailySent}/{GMAIL_DAILY_LIMIT})</span>
            </div>
            <Progress 
              value={Math.min(hourlyProgress, 100)} 
              className={`h-2.5 ${
                spamRisk === 'blocked' ? '[&>div]:bg-destructive' :
                spamRisk === 'danger' ? '[&>div]:bg-orange-500' :
                spamRisk === 'warning' ? '[&>div]:bg-yellow-500' :
                '[&>div]:bg-green-500'
              }`}
            />
          </div>

          {/* Cooldown suggestion */}
          {isCooldownActive && (
            <Alert className="bg-orange-500/10 border-orange-500/30">
              <Timer className="h-4 w-4 text-orange-500" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-sm">
                  <strong>Pausa consigliata:</strong> attendi {cooldownRemaining} prima di continuare per evitare il blocco Gmail.
                </span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setCooldownDismissed(true)}
                  className="shrink-0 ml-2 text-xs"
                >
                  Ignora
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isAtLimit && (
            <Alert variant="destructive">
              <Ban className="h-4 w-4" />
              <AlertTitle>Invio bloccato</AlertTitle>
              <AlertDescription>
                Hai raggiunto il limite di {GMAIL_HOURLY_LIMIT} email/ora. 
                Attendi che il contatore si resetti per evitare che Gmail blocchi il tuo account.
              </AlertDescription>
            </Alert>
          )}

          {/* Tips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Email singole (no CC/BCC)
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Pausa auto ogni {COOLDOWN_THRESHOLD} email
            </div>
            <div className="flex items-center gap-1.5">
              <Ban className="h-3.5 w-3.5" />
              Blocco duplicati attivo
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setCurrentStep(2)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Modifica Aziende
        </Button>
        <Button variant="outline" onClick={() => setCurrentStep(4)}>
          <History className="h-4 w-4 mr-2" />
          Vedi Già Inviato
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
