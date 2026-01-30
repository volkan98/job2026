import { useCallback, useState } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCVContext } from '@/contexts/CVContext';
import { CVData } from '@/types/cv';

// Mock parsing function - will be replaced with real backend
function mockParseCV(): CVData {
  return {
    nome: 'Mario',
    cognome: 'Rossi',
    email: 'mario.rossi@email.com',
    telefono: '+39 333 1234567',
    citta: 'Milano',
    cap: '20121',
    profilo: 'Professionista con 8 anni di esperienza nel settore metalmeccanico, specializzato in gestione della produzione e controllo qualità. Orientato ai risultati con forte capacità di leadership.',
    competenze: [
      'Gestione produzione',
      'Controllo qualità',
      'Lean Manufacturing',
      'Problem solving',
      'Microsoft Office',
      'SAP',
      'AutoCAD',
    ],
    esperienze: [
      {
        id: '1',
        ruolo: 'Responsabile Produzione',
        azienda: 'Industrie Meccaniche SpA',
        dataInizio: '2020-03',
        dataFine: 'Presente',
        descrizione: 'Gestione di un team di 25 operatori. Implementazione metodologie Lean con riduzione sprechi del 20%.',
      },
      {
        id: '2',
        ruolo: 'Addetto Controllo Qualità',
        azienda: 'TechMetal Srl',
        dataInizio: '2016-06',
        dataFine: '2020-02',
        descrizione: 'Controllo qualità su linea di produzione. Gestione non conformità e reportistica.',
      },
    ],
    istruzione: [
      {
        id: '1',
        titolo: 'Laurea in Ingegneria Gestionale',
        istituto: 'Politecnico di Milano',
        anno: '2016',
      },
      {
        id: '2',
        titolo: 'Diploma Tecnico Industriale',
        istituto: 'ITIS Milano',
        anno: '2011',
      },
    ],
    lingue: [
      { id: '1', lingua: 'Italiano', livello: 'Madrelingua' },
      { id: '2', lingua: 'Inglese', livello: 'B2' },
    ],
  };
}

export function CVUploader() {
  const { setCvFile, setCvData, setCurrentStep } = useCVContext();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): boolean => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    
    if (!validTypes.includes(file.type)) {
      setError('Formato non supportato. Carica un file PDF o DOCX.');
      return false;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError('Il file è troppo grande. Dimensione massima: 10MB.');
      return false;
    }
    
    return true;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && validateFile(droppedFile)) {
      setFile(droppedFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile);
    }
  }, []);

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock parsing - in production this would call the backend
      const parsedData = mockParseCV();
      
      setCvFile(file);
      setCvData(parsedData);
      setCurrentStep(1);
    } catch (err) {
      setError('Errore durante l\'analisi del CV. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          Carica il tuo CV
        </h2>
        <p className="text-muted">
          Trascina il tuo CV in formato PDF o DOCX per iniziare
        </p>
      </div>

      <Alert className="bg-primary/5 border-primary/20">
        <AlertCircle className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <strong>Privacy:</strong> Il tuo CV contiene dati personali. I file vengono elaborati in modo sicuro e non vengono condivisi con terze parti.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-6">
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 md:p-12 transition-all duration-200 text-center',
                isDragging
                  ? 'border-primary bg-primary/5 scale-[1.02]'
                  : 'border-border hover:border-primary/50 hover:bg-accent/50'
              )}
            >
              <div className="flex flex-col items-center gap-4">
                <div className={cn(
                  'p-4 rounded-full transition-colors',
                  isDragging ? 'bg-primary/20' : 'bg-accent'
                )}>
                  <Upload className={cn(
                    'h-10 w-10 transition-colors',
                    isDragging ? 'text-primary' : 'text-muted'
                  )} />
                </div>
                
                <div className="space-y-2">
                  <p className="text-lg font-medium text-foreground">
                    Trascina qui il tuo CV
                  </p>
                  <p className="text-sm text-muted">
                    oppure
                  </p>
                </div>

                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button variant="outline" asChild>
                    <span>Seleziona file</span>
                  </Button>
                </label>

                <p className="text-xs text-muted">
                  Formati supportati: PDF, DOCX • Max 10MB
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-accent rounded-lg">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-muted">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  className="shrink-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Analisi in corso...
                  </>
                ) : (
                  'Analizza CV'
                )}
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
