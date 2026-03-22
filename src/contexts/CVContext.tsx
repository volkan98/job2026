import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CVData, Azienda, EmailTemplate, LogInvio } from '@/types/cv';

interface CVContextType {
  cvData: CVData | null;
  setCvData: (data: CVData | null) => void;
  cvFile: File | null;
  setCvFile: (file: File | null) => void;
  sintesiBreve: string;
  setSintesiBreve: (sintesi: string) => void;
  sintesiCompleta: string;
  setSintesiCompleta: (sintesi: string) => void;
  aziendeSelezionate: Azienda[];
  setAziendeSelezionate: (aziende: Azienda[]) => void;
  emailTemplate: EmailTemplate | null;
  setEmailTemplate: (template: EmailTemplate | null) => void;
  logInvii: LogInvio[];
  addLogInvio: (log: LogInvio) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

const CVContext = createContext<CVContextType | undefined>(undefined);

export function CVProvider({ children }: { children: ReactNode }) {
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [sintesiBreve, setSintesiBreve] = useState('');
  const [sintesiCompleta, setSintesiCompleta] = useState('');
  const [aziendeSelezionate, setAziendeSelezionateRaw] = useState<Azienda[]>(() => {
    try {
      const saved = sessionStorage.getItem('cv_aziende_selezionate');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const setAziendeSelezionate = (aziende: Azienda[]) => {
    setAziendeSelezionateRaw(aziende);
    try { sessionStorage.setItem('cv_aziende_selezionate', JSON.stringify(aziende)); } catch {}
  };
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate | null>(null);
  const [logInvii, setLogInvii] = useState<LogInvio[]>([]);
  const [currentStep, setCurrentStepRaw] = useState(() => {
    try {
      const saved = sessionStorage.getItem('cv_current_step');
      return saved ? parseInt(saved, 10) : 0;
    } catch { return 0; }
  });
  const setCurrentStep = (step: number) => {
    setCurrentStepRaw(step);
    try { sessionStorage.setItem('cv_current_step', String(step)); } catch {}
  };

  const addLogInvio = (log: LogInvio) => {
    setLogInvii(prev => [log, ...prev]);
  };

  return (
    <CVContext.Provider
      value={{
        cvData,
        setCvData,
        cvFile,
        setCvFile,
        sintesiBreve,
        setSintesiBreve,
        sintesiCompleta,
        setSintesiCompleta,
        aziendeSelezionate,
        setAziendeSelezionate,
        emailTemplate,
        setEmailTemplate,
        logInvii,
        addLogInvio,
        currentStep,
        setCurrentStep,
      }}
    >
      {children}
    </CVContext.Provider>
  );
}

export function useCVContext() {
  const context = useContext(CVContext);
  if (context === undefined) {
    throw new Error('useCVContext must be used within a CVProvider');
  }
  return context;
}
