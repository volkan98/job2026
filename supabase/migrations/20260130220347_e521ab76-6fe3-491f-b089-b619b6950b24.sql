-- Create companies table for storing found companies
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  sector TEXT,
  address TEXT,
  city TEXT,
  website TEXT,
  email TEXT,
  phone TEXT,
  contact_type TEXT DEFAULT 'generic', -- 'generic', 'hr', 'jobs', 'recruitment'
  source TEXT,
  match_score INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sent_emails table for tracking sent emails and preventing duplicates
CREATE TABLE public.sent_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  domain TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'error', 'pending'
  error_message TEXT,
  cv_version TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_profiles table for storing CV data and preferences
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  cap TEXT,
  profile_summary TEXT,
  skills TEXT[],
  cv_short_summary TEXT,
  cv_full_summary TEXT,
  target_role TEXT,
  availability TEXT DEFAULT 'immediate',
  shift_preference TEXT,
  search_radius_km INTEGER DEFAULT 30,
  exclude_same_domain BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_companies_user_id ON public.companies(user_id);
CREATE INDEX idx_companies_email ON public.companies(email);
CREATE INDEX idx_sent_emails_user_id ON public.sent_emails(user_id);
CREATE INDEX idx_sent_emails_email ON public.sent_emails(email);
CREATE INDEX idx_sent_emails_domain ON public.sent_emails(domain);
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Users can view their own companies" 
ON public.companies FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own companies" 
ON public.companies FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies" 
ON public.companies FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies" 
ON public.companies FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for sent_emails
CREATE POLICY "Users can view their own sent emails" 
ON public.sent_emails FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sent emails" 
ON public.sent_emails FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sent emails" 
ON public.sent_emails FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sent emails" 
ON public.sent_emails FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.user_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to extract domain from email
CREATE OR REPLACE FUNCTION public.extract_email_domain(email_address TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(SPLIT_PART(email_address, '@', 2));
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Create function to check if email/domain already contacted
CREATE OR REPLACE FUNCTION public.check_duplicate_contact(
  p_user_id UUID,
  p_email TEXT,
  p_company_name TEXT,
  p_check_domain BOOLEAN DEFAULT true
)
RETURNS TABLE(
  is_duplicate BOOLEAN,
  duplicate_type TEXT,
  last_sent_date TIMESTAMP WITH TIME ZONE,
  original_company TEXT
) AS $$
DECLARE
  v_domain TEXT;
BEGIN
  v_domain := public.extract_email_domain(p_email);
  
  -- Check exact email match
  RETURN QUERY
  SELECT 
    true AS is_duplicate,
    'exact_email'::TEXT AS duplicate_type,
    se.sent_at AS last_sent_date,
    se.company_name AS original_company
  FROM public.sent_emails se
  WHERE se.user_id = p_user_id 
    AND LOWER(se.email) = LOWER(p_email)
  ORDER BY se.sent_at DESC
  LIMIT 1;
  
  IF FOUND THEN RETURN; END IF;
  
  -- Check domain match if enabled
  IF p_check_domain THEN
    RETURN QUERY
    SELECT 
      true AS is_duplicate,
      'same_domain'::TEXT AS duplicate_type,
      se.sent_at AS last_sent_date,
      se.company_name AS original_company
    FROM public.sent_emails se
    WHERE se.user_id = p_user_id 
      AND se.domain = v_domain
    ORDER BY se.sent_at DESC
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
  END IF;
  
  -- No duplicate found
  RETURN QUERY SELECT false, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;