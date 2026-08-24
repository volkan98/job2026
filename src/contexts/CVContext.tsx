import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

const PREFIX = 'cv_app_';

function loadPersisted<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key) ?? sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// Persisted state hook: keeps value in localStorage so a page reload restores everything
function usePersistedState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => loadPersisted(key, fallback));

  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* quota or serialization issues are non-fatal */
    }
  }, [key, value]);

  return [value, setValue] as const;
}

export function CVProvider({ children }: { children: ReactNode }) {
  const [cvData, setCvData] = usePersistedState<CVData | null>('cvData', null);
  // File objects can't be serialized: kept in memory only
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [sintesiBreve, setSintesiBreve] = usePersistedState('sintesiBreve', '');
  const [sintesiCompleta, setSintesiCompleta] = usePersistedState('sintesiCompleta', '');
  const [aziendeSelezionate, setAziendeSelezionate] = usePersistedState<Azienda[]>(
    'cv_aziende_selezionate',
    [],
  );
  const [emailTemplate, setEmailTemplate] = usePersistedState<EmailTemplate | null>(
    'emailTemplate',
    null,
  );
  const [logInvii, setLogInvii] = usePersistedState<LogInvio[]>('logInvii', []);
  const [currentStep, setCurrentStep] = usePersistedState<number>('cv_current_step', 0);

  const addLogInvio = (log: LogInvio) => {
    setLogInvii((prev) => [log, ...prev]);
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
