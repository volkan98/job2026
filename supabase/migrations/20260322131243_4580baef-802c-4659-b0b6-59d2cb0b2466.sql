
-- Campaign orchestration tables

CREATE TABLE public.auto_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'idle',
  search_location text NOT NULL,
  search_location_query text,
  search_radius integer NOT NULL DEFAULT 30,
  search_keywords text[] NOT NULL DEFAULT '{}',
  only_selected_city boolean DEFAULT false,
  target_total integer NOT NULL DEFAULT 50,
  email_style text NOT NULL DEFAULT 'standard',
  include_risky boolean DEFAULT false,
  cv_file_path text,
  user_city text,
  total_found integer DEFAULT 0,
  total_validated integer DEFAULT 0,
  total_generated integer DEFAULT 0,
  total_sent integer DEFAULT 0,
  total_failed integer DEFAULT 0,
  total_skipped integer DEFAULT 0,
  current_search_cycle integer DEFAULT 1,
  max_search_cycles integer DEFAULT 5,
  pause_reason text,
  resume_at timestamptz,
  last_processed_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.auto_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaigns" ON public.auto_campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own campaigns" ON public.auto_campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaigns" ON public.auto_campaigns FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaigns" ON public.auto_campaigns FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.campaign_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.auto_campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  company_sector text,
  company_city text,
  company_website text,
  company_email text,
  company_phone text,
  company_source text,
  company_address text,
  email_source_url text,
  contact_final_status text DEFAULT 'pending',
  confidence_score integer DEFAULT 0,
  email_subject text,
  email_body text,
  email_firma text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  next_retry_at timestamptz,
  processed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.campaign_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue" ON public.campaign_queue FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own queue" ON public.campaign_queue FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own queue" ON public.campaign_queue FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own queue" ON public.campaign_queue FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.auto_campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events" ON public.campaign_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON public.campaign_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Enable realtime for live dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.auto_campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_queue;

-- Enable pg_cron and pg_net for scheduled processing
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
