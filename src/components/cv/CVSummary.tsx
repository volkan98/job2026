import { useState, useEffect } from 'react';
import { useCVContext } from '@/contexts/CVContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Briefcase, 
  GraduationCap, 
  Languages, 
  Star,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Plus,
  X
} from 'lucide-react';

function generateSintesiBreve(cvData: any): string {
  const anniEsperienza = cvData.esperienze?.length > 0 ? 
    `con ${cvData.esperienze.length + 3} anni di esperienza` : '';
  
  return `Professionista ${anniEsperienza} nel settore ${cvData.esperienze?.[0]?.azienda?.includes('Meccaniche') ? 'metalmeccanico' : 'industriale'}, con competenze in ${cvData.competenze?.slice(0, 3).join(', ')}. Disponibile per nuove opportunità nella zona di ${cvData.citta}.`;
}

function generateSintesiCompleta(cvData: any): string {
  return `• **Profilo professionale**: ${cvData.profilo}

• **Esperienza**: ${cvData.esperienze?.length || 0} ruoli ricoperti, ultimo incarico come ${cvData.esperienze?.[0]?.ruolo} presso ${cvData.esperienze?.[0]?.azienda}

• **Competenze chiave**: ${cvData.competenze?.join(', ')}

• **Formazione**: ${cvData.istruzione?.[0]?.titolo} - ${cvData.istruzione?.[0]?.istituto}

• **Lingue**: ${cvData.lingue?.map((l: any) => `${l.lingua} (${l.livello})`).join(', ')}

• **Disponibilità**: Immediata, zona ${cvData.citta} e province limitrofe`;
}

export function CVSummary() {
  const { cvData, setCvData, setSintesiBreve, setSintesiCompleta, sintesiBreve, sintesiCompleta, setCurrentStep } = useCVContext();
  const [editedData, setEditedData] = useState(cvData);
  const [newCompetenza, setNewCompetenza] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (cvData && !sintesiBreve) {
      setSintesiBreve(generateSintesiBreve(cvData));
      setSintesiCompleta(generateSintesiCompleta(cvData));
    }
  }, [cvData, sintesiBreve, setSintesiBreve, setSintesiCompleta]);

  useEffect(() => {
    setEditedData(cvData);
  }, [cvData]);

  if (!cvData || !editedData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Nessun CV caricato. Torna al primo step.</p>
        <Button onClick={() => setCurrentStep(0)} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Carica CV
        </Button>
      </div>
    );
  }

  const handleRegenerate = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSintesiBreve(generateSintesiBreve(editedData));
    setSintesiCompleta(generateSintesiCompleta(editedData));
    setIsGenerating(false);
  };

  const handleAddCompetenza = () => {
    if (newCompetenza.trim() && editedData) {
      setEditedData({
        ...editedData,
        competenze: [...editedData.competenze, newCompetenza.trim()]
      });
      setNewCompetenza('');
    }
  };

  const handleRemoveCompetenza = (index: number) => {
    if (editedData) {
      setEditedData({
        ...editedData,
        competenze: editedData.competenze.filter((_, i) => i !== index)
      });
    }
  };

  const handleNext = () => {
    setCvData(editedData);
    setCurrentStep(2);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          Sintesi del CV
        </h2>
        <p className="text-muted">
          Verifica i dati estratti e modifica se necessario
        </p>
      </div>

      <Tabs defaultValue="dati" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dati">Dati Personali</TabsTrigger>
          <TabsTrigger value="sintesi">Sintesi Generate</TabsTrigger>
        </TabsList>

        <TabsContent value="dati" className="space-y-4 mt-4">
          {/* Info Personali */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Informazioni Personali
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Nome</label>
                <Input
                  value={editedData.nome}
                  onChange={e => setEditedData({ ...editedData, nome: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Cognome</label>
                <Input
                  value={editedData.cognome}
                  onChange={e => setEditedData({ ...editedData, cognome: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email
                </label>
                <Input
                  type="email"
                  value={editedData.email}
                  onChange={e => setEditedData({ ...editedData, email: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Telefono
                </label>
                <Input
                  value={editedData.telefono}
                  onChange={e => setEditedData({ ...editedData, telefono: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Città
                </label>
                <Input
                  value={editedData.citta}
                  onChange={e => setEditedData({ ...editedData, citta: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">CAP</label>
                <Input
                  value={editedData.cap}
                  onChange={e => setEditedData({ ...editedData, cap: e.target.value })}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Profilo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Profilo Professionale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editedData.profilo}
                onChange={e => setEditedData({ ...editedData, profilo: e.target.value })}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Competenze */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Competenze
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {editedData.competenze.map((comp, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1 py-1 px-3">
                    {comp}
                    <button onClick={() => handleRemoveCompetenza(index)}>
                      <X className="h-3 w-3 ml-1 hover:text-destructive" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Aggiungi competenza..."
                  value={newCompetenza}
                  onChange={e => setNewCompetenza(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddCompetenza()}
                />
                <Button variant="outline" size="icon" onClick={handleAddCompetenza}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Esperienze */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Esperienze Lavorative
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editedData.esperienze.map((exp, index) => (
                <div key={exp.id} className="p-4 bg-accent/50 rounded-lg space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{exp.ruolo}</p>
                      <p className="text-sm text-muted">{exp.azienda}</p>
                    </div>
                    <Badge variant="outline">
                      {exp.dataInizio} - {exp.dataFine}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted">{exp.descrizione}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Istruzione */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Istruzione
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {editedData.istruzione.map(edu => (
                <div key={edu.id} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{edu.titolo}</p>
                    <p className="text-sm text-muted">{edu.istituto}</p>
                  </div>
                  <Badge variant="outline">{edu.anno}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Lingue */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Languages className="h-5 w-5 text-primary" />
                Lingue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {editedData.lingue.map(lang => (
                  <Badge key={lang.id} variant="secondary">
                    {lang.lingua}: {lang.livello}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sintesi" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Sintesi Breve</CardTitle>
              <p className="text-sm text-muted">3-5 righe per presentazione rapida</p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={sintesiBreve}
                onChange={e => setSintesiBreve(e.target.value)}
                rows={3}
                className="mb-3"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Sintesi Completa</CardTitle>
              <p className="text-sm text-muted">Bullet points dettagliati</p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={sintesiCompleta}
                onChange={e => setSintesiCompleta(e.target.value)}
                rows={10}
                className="mb-3 font-mono text-sm"
              />
              <Button 
                variant="outline" 
                onClick={handleRegenerate}
                disabled={isGenerating}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                Rigenera Sintesi
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setCurrentStep(0)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>
        <Button onClick={handleNext}>
          Trova Aziende
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
