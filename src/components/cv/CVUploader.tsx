import { useCallback, useState, useEffect } from 'react';
import { Upload, FileText, X, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCVContext } from '@/contexts/CVContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { aiAgent } from '@/lib/api/ai-agent';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`;

export function CVUploader() {
  const { setCvFile, setCvData, setSintesiBreve, setSintesiCompleta, setCurrentStep } = useCVContext();
  const { profile, isLoading: isProfileLoading, hasSavedCV, getCVDataFromProfile, uploadCV } = useUserProfile();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load saved profile data on mount
  useEffect(() => {
    if (profile && hasSavedCV) {
      const savedCVData = getCVDataFromProfile();
      if (savedCVData) {
        setCvData(savedCVData);
        setSintesiBreve(profile.cv_short_summary || '');
        setSintesiCompleta(profile.cv_full_summary || '');
      }
    }
  }, [profile, hasSavedCV, getCVDataFromProfile, setCvData, setSintesiBreve, setSintesiCompleta]);

  const handleUseSavedCV = () => {
    if (profile && hasSavedCV) {
      const savedCVData = getCVDataFromProfile();
      if (savedCVData) {
        setCvData(savedCVData);
        setSintesiBreve(profile.cv_short_summary || '');
        setSintesiCompleta(profile.cv_full_summary || '');
        toast({
          title: 'CV caricato',
          description: 'I dati del tuo CV salvato sono stati caricati.',
        });
        setCurrentStep(1);
      }
    }
  };

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
      'text/plain',
    ];
    
    if (!validTypes.includes(file.type)) {
      setError('Formato non supportato. Carica un file PDF, DOCX o TXT.');
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

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }
      
      return fullText.trim();
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      return '';
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    // For text files, read directly
    if (file.type === 'text/plain') {
      return await file.text();
    }
    
    // For PDF files, use pdf.js to extract text
    if (file.type === 'application/pdf') {
      const pdfText = await extractTextFromPDF(file);
      if (pdfText && pdfText.length > 50) {
        console.log('Extracted PDF text length:', pdfText.length);
        return pdfText.substring(0, 15000); // Limit text length
      }
    }
    
    // For DOCX, try to read as text (basic extraction)
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // DOCX is a zip file, we'll try to extract basic text
      const text = await file.text().catch(() => '');
      // Extract text between XML tags
      const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanText.length > 50) {
        return cleanText.substring(0, 15000);
      }
    }
    
    // Fallback: ask user to provide text or use filename as context
    throw new Error('Impossibile estrarre il testo dal file. Prova con un file PDF o TXT.');
  };

  const handleAnalyze = async () => {
    if (!file) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const cvText = await extractTextFromFile(file);
      
      const result = await aiAgent.parseCV(cvText);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Errore durante l\'analisi del CV');
      }
      
      const parsedData = {
        nome: result.data.nome || '',
        cognome: result.data.cognome || '',
        email: result.data.email || '',
        telefono: result.data.telefono || '',
        citta: result.data.citta || '',
        cap: result.data.cap || '',
        profilo: result.data.profilo || '',
        competenze: result.data.competenze || [],
        esperienze: (result.data.esperienze || []).map((exp, i) => ({
          id: String(i + 1),
          ruolo: exp.ruolo || '',
          azienda: exp.azienda || '',
          dataInizio: exp.dataInizio || '',
          dataFine: exp.dataFine || '',
          descrizione: exp.descrizione || '',
        })),
        istruzione: (result.data.istruzione || []).map((edu, i) => ({
          id: String(i + 1),
          titolo: edu.titolo || '',
          istituto: edu.istituto || '',
          anno: edu.anno || '',
        })),
        lingue: (result.data.lingue || []).map((lang, i) => ({
          id: String(i + 1),
          lingua: lang.lingua || '',
          livello: lang.livello || '',
        })),
      };
      
      setCvFile(file);
      setCvData(parsedData);
      setSintesiBreve(result.data.sintesiBreve || '');
      setSintesiCompleta(result.data.sintesiCompleta || '');

      // Upload CV file to storage
      await uploadCV(file);
      
      toast({
        title: 'CV analizzato con successo!',
        description: 'I dati sono stati estratti e salvati nel tuo profilo.',
      });
      
      setCurrentStep(1);
    } catch (err: any) {
      console.error('Error analyzing CV:', err);
      setError(err.message || 'Errore durante l\'analisi del CV. Riprova.');
      toast({
        title: 'Errore',
        description: err.message || 'Errore durante l\'analisi del CV.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isProfileLoading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          Carica il tuo CV
        </h2>
        <p className="text-muted-foreground">
          Trascina il tuo CV in formato PDF o DOCX per iniziare
        </p>
      </div>

      {/* Show saved CV option if available */}
      {hasSavedCV && (
        <Alert className="bg-green-500/10 border-green-500/30">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="text-green-700">
                Hai già un CV salvato nel tuo profilo ({profile?.full_name})
              </span>
              <Button size="sm" onClick={handleUseSavedCV}>
                Usa CV salvato
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

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
                    isDragging ? 'text-primary' : 'text-muted-foreground'
                  )} />
                </div>
                
                <div className="space-y-2">
                  <p className="text-lg font-medium text-foreground">
                    Trascina qui il tuo CV
                  </p>
                  <p className="text-sm text-muted-foreground">
                    oppure
                  </p>
                </div>

                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button variant="outline" asChild>
                    <span>Seleziona file</span>
                  </Button>
                </label>

                <p className="text-xs text-muted-foreground">
                  Formati supportati: PDF, DOCX, TXT • Max 10MB
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
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  className="shrink-0"
                  disabled={isLoading}
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analisi AI in corso...
                  </>
                ) : (
                  'Analizza CV con AI'
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
