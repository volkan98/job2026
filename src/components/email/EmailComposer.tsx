import { useState, useEffect } from 'react';
import { useCVContext } from '@/contexts/CVContext';
import { EmailTemplate } from '@/types/cv';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mail, 
  Send, 
  RefreshCw, 
  ArrowLeft,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Paperclip,
  User
} from 'lucide-react';

type EmailStyle = 'breve' | 'standard' | 'formale';

function generateEmail(style: EmailStyle, cvData: any, azienda?: string): EmailTemplate {
  const nome = `${cvData.nome} ${cvData.cognome}`;
  const competenze = cvData.competenze.slice(0, 3).join(', ');
  
  const templates: Record<EmailStyle, EmailTemplate> = {
    breve: {
      oggetto: `Candidatura spontanea - ${cvData.esperienze?.[0]?.ruolo || 'Profilo professionale'}`,
      corpo: `Gentili Signori${azienda ? ` di ${azienda}` : ''},

mi permetto di inviarVi la mia candidatura spontanea per eventuali posizioni aperte presso la Vostra azienda.

Ho ${cvData.esperienze?.length + 3} anni di esperienza nel settore, con competenze in ${competenze}.

Allego il mio CV per la Vostra valutazione e resto a disposizione per un colloquio conoscitivo.

Cordiali saluti`,
      firma: `${nome}\n${cvData.email}\n${cvData.telefono}\n${cvData.citta}`,
    },
    standard: {
      oggetto: `Candidatura - ${cvData.esperienze?.[0]?.ruolo || 'Professionista settore industriale'}`,
      corpo: `Spett.le ${azienda || 'Azienda'},

con la presente mi permetto di sottoporre alla Vostra cortese attenzione la mia candidatura per eventuali posizioni aperte o future opportunità lavorative.

${cvData.profilo}

Nel corso della mia carriera ho maturato significative esperienze come ${cvData.esperienze?.[0]?.ruolo} presso ${cvData.esperienze?.[0]?.azienda}, sviluppando competenze in:
${cvData.competenze.slice(0, 5).map((c: string) => `• ${c}`).join('\n')}

Sono attualmente disponibile e residente nella zona di ${cvData.citta}, il che mi consentirebbe di raggiungere agevolmente la Vostra sede.

Allego il mio curriculum vitae e resto a completa disposizione per un colloquio conoscitivo, durante il quale potrò illustrarVi più nel dettaglio le mie esperienze e motivazioni.

RingraziandoVi per l'attenzione, porgo cordiali saluti`,
      firma: `${nome}\n${cvData.email}\n${cvData.telefono}\n${cvData.citta}`,
    },
    formale: {
      oggetto: `Candidatura spontanea per posizioni in ambito ${cvData.esperienze?.[0]?.ruolo?.split(' ')[0] || 'produzione'}`,
      corpo: `Spett.le Direzione Risorse Umane
${azienda || ''}

Oggetto: Candidatura spontanea

Con la presente, desidero sottoporre alla Vostra cortese attenzione la mia candidatura per eventuali posizioni attualmente vacanti o che si renderanno disponibili in futuro presso la Vostra stimata Azienda.

Mi chiamo ${nome} e sono un professionista con oltre ${cvData.esperienze?.length + 3} anni di esperienza nel settore industriale. Attualmente ricopro il ruolo di ${cvData.esperienze?.[0]?.ruolo} e ho sviluppato una solida expertise nelle seguenti aree:

${cvData.competenze.map((c: string) => `• ${c}`).join('\n')}

Il mio percorso professionale mi ha permesso di acquisire una visione completa dei processi ${cvData.settore || 'produttivi'} e di sviluppare capacità di problem solving e gestione team.

${cvData.profilo}

Sono residente in ${cvData.citta} e sarei disponibile a iniziare immediatamente, con disponibilità anche a trasferte occasionali se richiesto.

Allego alla presente il mio curriculum vitae completo e mi rendo disponibile per un colloquio conoscitivo presso la Vostra sede, nel quale potrò illustrare più dettagliatamente le mie esperienze, competenze e motivazioni.

In attesa di un Vostro cortese riscontro, porgo distinti saluti.`,
      firma: `${nome}\nTel: ${cvData.telefono}\nEmail: ${cvData.email}\nResidenza: ${cvData.citta}, ${cvData.cap}`,
    },
  };

  return templates[style];
}

export function EmailComposer() {
  const { cvData, aziendeSelezionate, logInvii, addLogInvio, setCurrentStep } = useCVContext();
  const [emailStyle, setEmailStyle] = useState<EmailStyle>('standard');
  const [currentEmail, setCurrentEmail] = useState<EmailTemplate | null>(null);
  const [selectedAziendaId, setSelectedAziendaId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [emailProvider, setEmailProvider] = useState<'gmail' | 'outlook' | null>(null);

  const selectedAzienda = aziendeSelezionate.find(a => a.id === selectedAziendaId);

  useEffect(() => {
    if (cvData) {
      setCurrentEmail(generateEmail(emailStyle, cvData, selectedAzienda?.nome));
    }
  }, [emailStyle, cvData, selectedAzienda]);

  useEffect(() => {
    if (aziendeSelezionate.length > 0 && !selectedAziendaId) {
      setSelectedAziendaId(aziendeSelezionate[0].id);
    }
  }, [aziendeSelezionate, selectedAziendaId]);

  const handleRegenerate = () => {
    if (cvData) {
      setCurrentEmail(generateEmail(emailStyle, cvData, selectedAzienda?.nome));
    }
  };

  const handleConnectEmail = (provider: 'gmail' | 'outlook') => {
    // This would trigger OAuth flow in production
    setEmailProvider(provider);
  };

  const handleSendEmail = async () => {
    if (!selectedAzienda || !currentEmail) return;
    
    setIsSending(true);
    
    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    addLogInvio({
      id: Date.now().toString(),
      data: new Date(),
      destinatario: selectedAzienda.nome,
      emailDestinatario: selectedAzienda.email!,
      oggetto: currentEmail.oggetto,
      stato: 'inviato',
    });
    
    // Move to next company
    const currentIndex = aziendeSelezionate.findIndex(a => a.id === selectedAziendaId);
    if (currentIndex < aziendeSelezionate.length - 1) {
      setSelectedAziendaId(aziendeSelezionate[currentIndex + 1].id);
    }
    
    setIsSending(false);
  };

  if (!cvData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Nessun CV caricato.</p>
        <Button onClick={() => setCurrentStep(0)} className="mt-4">
          Carica CV
        </Button>
      </div>
    );
  }

  if (aziendeSelezionate.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Nessuna azienda selezionata.</p>
        <Button onClick={() => setCurrentStep(2)} className="mt-4">
          Trova Aziende
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          Componi & Invia Email
        </h2>
        <p className="text-muted">
          Personalizza l'email e inviala alle aziende selezionate
        </p>
      </div>

      {/* Email Connection */}
      {!emailProvider && (
        <Alert className="bg-primary/5 border-primary/20">
          <Mail className="h-4 w-4 text-primary" />
          <AlertDescription>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <span>Collega il tuo account email per inviare direttamente dall'app</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleConnectEmail('gmail')}>
                  Connetti Gmail
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleConnectEmail('outlook')}>
                  Connetti Outlook
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {emailProvider && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Connesso a {emailProvider === 'gmail' ? 'Gmail' : 'Outlook'}. Puoi inviare email direttamente.
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
                      onClick={() => setSelectedAziendaId(azienda.id)}
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
                          <p className="text-xs text-muted truncate">
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
              <CardTitle className="text-lg">Componi Email</CardTitle>
              <Tabs value={emailStyle} onValueChange={v => setEmailStyle(v as EmailStyle)}>
                <TabsList>
                  <TabsTrigger value="breve">Breve</TabsTrigger>
                  <TabsTrigger value="standard">Standard</TabsTrigger>
                  <TabsTrigger value="formale">Formale</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedAzienda && currentEmail && (
              <>
                <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                  <User className="h-4 w-4 text-muted" />
                  <span className="text-sm text-muted">A:</span>
                  <span className="font-medium">{selectedAzienda.email}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {selectedAzienda.nome}
                  </Badge>
                </div>

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
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Corpo Email
                  </label>
                  <Textarea
                    value={currentEmail.corpo}
                    onChange={e => setCurrentEmail({ ...currentEmail, corpo: e.target.value })}
                    rows={12}
                    className="font-sans"
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

                <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg">
                  <Paperclip className="h-4 w-4 text-muted" />
                  <span className="text-sm text-muted">Allegato:</span>
                  <Badge variant="outline">CV allegato</Badge>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" onClick={handleRegenerate}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Rigenera
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleSendEmail}
                    disabled={!emailProvider || isSending}
                  >
                    {isSending ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Invio in corso...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Invia Email
                      </>
                    )}
                  </Button>
                </div>
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
              Storico Invii
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
                      <p className="text-xs text-muted">{log.emailDestinatario}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted">
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

      {/* Anti-spam Notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Suggerimenti anti-spam:</strong> Le email vengono inviate singolarmente (niente CC visibile). 
          Limite consigliato: max 20 email/ora. Non inviare email identiche a troppe aziende.
        </AlertDescription>
      </Alert>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setCurrentStep(2)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Modifica Aziende
        </Button>
      </div>
    </div>
  );
}
