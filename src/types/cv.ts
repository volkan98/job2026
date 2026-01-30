export interface CVData {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  citta: string;
  cap: string;
  profilo: string;
  competenze: string[];
  esperienze: Esperienza[];
  istruzione: Istruzione[];
  lingue: Lingua[];
}

export interface Esperienza {
  id: string;
  ruolo: string;
  azienda: string;
  dataInizio: string;
  dataFine: string;
  descrizione: string;
}

export interface Istruzione {
  id: string;
  titolo: string;
  istituto: string;
  anno: string;
}

export interface Lingua {
  id: string;
  lingua: string;
  livello: string;
}

export interface Azienda {
  id: string;
  nome: string;
  indirizzo: string;
  citta: string;
  sito: string;
  email: string | null;
  telefono: string;
  settore: string;
  fonte: string;
  distanza: number;
  tempoPercorrenza?: string; // Tempo stimato in auto (es. "25 min", "1h 15min")
}

export interface EmailTemplate {
  oggetto: string;
  corpo: string;
  firma: string;
}

export interface LogInvio {
  id: string;
  data: Date;
  destinatario: string;
  emailDestinatario: string;
  oggetto: string;
  stato: 'inviato' | 'errore' | 'in_attesa';
  errore?: string;
}
