import { supabase } from '@/integrations/supabase/client';

export interface CVData {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  citta: string;
  cap: string;
  profilo: string;
  competenze: string[];
  esperienze: Array<{
    ruolo: string;
    azienda: string;
    dataInizio: string;
    dataFine: string;
    descrizione: string;
  }>;
  istruzione: Array<{
    titolo: string;
    istituto: string;
    anno: string;
  }>;
  lingue: Array<{
    lingua: string;
    livello: string;
  }>;
  sintesiBreve: string;
  sintesiCompleta: string;
}

export interface Company {
  id?: string;
  name: string;
  sector?: string;
  address?: string;
  city?: string;
  website?: string;
  email?: string | null;
  email_verified?: 'verified_official' | 'verified_directory' | 'directory_only' | 'unverified' | null;
  email_source?: string | null;
  phone?: string | null;
  contact_type?: string;
  source?: string;
  match_score?: number;
  match_reasons?: string[];
  distance_km?: number;
  travel_time?: string;
  domain_valid?: boolean | null;
  email_explicit?: boolean;
  email_source_type?: 'page_text' | 'mailto' | 'verified_directory' | 'unknown' | null;
  smtp_status?: 'valid_email' | 'invalid_email' | 'unverifiable_email' | 'catch_all_domain' | null;
  catch_all?: boolean | null;
  confidence_score?: number;
  final_status?: 'ready_to_send' | 'risky_send' | 'discarded';
  contact_form_url?: string | null;
}

export interface EmailTemplate {
  oggetto: string;
  corpo: string;
  firma: string;
  matchPoints?: string[];
}

export const aiAgent = {
  // Parse CV using AI
  async parseCV(cvText: string): Promise<{ success: boolean; data?: CVData; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('ai-parse-cv', {
        body: { cvText },
      });

      if (error) {
        console.error('Error calling ai-parse-cv:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (error: any) {
      console.error('Error parsing CV:', error);
      return { success: false, error: error.message };
    }
  },

  // Search companies using AI
  async searchCompanies(
    location: string,
    radius: number,
    keywords: string[],
    cvSkills?: string[],
    targetRole?: string,
    minResults: number = 30,
    userCity?: string, // Città di residenza dell'utente
    onlySelectedCity?: boolean // Se true, cerca SOLO nella città selezionata
  ): Promise<{ success: boolean; data?: Company[]; total?: number; originCity?: string; searchStats?: any; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('ai-search-companies', {
        body: { location, radius, keywords, cvSkills, targetRole, minResults, userCity, onlySelectedCity },
      });

      if (error) {
        console.error('Error calling ai-search-companies:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (error: any) {
      console.error('Error searching companies:', error);
      return { success: false, error: error.message };
    }
  },

  // Generate personalized email using AI
  async generateEmail(
    company: Company,
    cvData: Partial<CVData>,
    variant: 'breve' | 'standard' | 'formale',
    targetRole?: string,
    availability?: string
  ): Promise<{ success: boolean; data?: EmailTemplate; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-email', {
        body: { company, cvData, variant, targetRole, availability },
      });

      if (error) {
        console.error('Error calling ai-generate-email:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (error: any) {
      console.error('Error generating email:', error);
      return { success: false, error: error.message };
    }
  },

  // Check if email/company was already contacted
  async checkDuplicate(
    email: string,
    companyName: string,
    checkDomain: boolean = true
  ): Promise<{
    isDuplicate: boolean;
    duplicateType?: string;
    lastSentDate?: string;
    originalCompany?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('check_duplicate_contact', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_email: email,
        p_company_name: companyName,
        p_check_domain: checkDomain,
      });

      if (error) {
        console.error('Error checking duplicate:', error);
        return { isDuplicate: false };
      }

      if (data && data.length > 0 && data[0].is_duplicate) {
        return {
          isDuplicate: true,
          duplicateType: data[0].duplicate_type,
          lastSentDate: data[0].last_sent_date,
          originalCompany: data[0].original_company,
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error checking duplicate:', error);
      return { isDuplicate: false };
    }
  },

  // Save sent email record
  async recordSentEmail(
    companyId: string | null,
    companyName: string,
    email: string,
    subject: string,
    body?: string,
    cvVersion?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        return { success: false, error: 'User not authenticated' };
      }

      const domain = email.split('@')[1]?.toLowerCase() || '';

      const { error } = await supabase.from('sent_emails').insert({
        user_id: user.data.user.id,
        company_id: companyId,
        company_name: companyName,
        email: email.toLowerCase(),
        domain,
        subject,
        body,
        cv_version: cvVersion,
        status: 'sent',
      });

      if (error) {
        console.error('Error recording sent email:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error recording sent email:', error);
      return { success: false, error: error.message };
    }
  },

  // Get sent emails history
  async getSentEmails(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('sent_emails')
        .select('*')
        .order('sent_at', { ascending: false });

      if (error) {
        console.error('Error fetching sent emails:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching sent emails:', error);
      return [];
    }
  },

  // Save company to database
  async saveCompany(company: Company): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('companies')
        .insert({
          user_id: user.data.user.id,
          name: company.name,
          sector: company.sector,
          address: company.address,
          city: company.city,
          website: company.website,
          email: company.email,
          phone: company.phone,
          contact_type: company.contact_type || 'generic',
          source: company.source,
          match_score: company.match_score || 0,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error saving company:', error);
        return { success: false, error: error.message };
      }

      return { success: true, id: data.id };
    } catch (error: any) {
      console.error('Error saving company:', error);
      return { success: false, error: error.message };
    }
  },

  // Get saved companies
  async getSavedCompanies(): Promise<Company[]> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching companies:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
  },
};
