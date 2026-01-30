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
  const [aziendeSelezionate, setAziendeSelezionate] = useState<Azienda[]>([]);
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate | null>(null);
  const [logInvii, setLogInvii] = useState<LogInvio[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

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
