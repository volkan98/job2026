import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Campaign {
  id: string;
  status: string;
  search_location: string;
  search_radius: number;
  search_keywords: string[];
  only_selected_city: boolean;
  target_total: number;
  email_style: string;
  include_risky: boolean;
  cv_file_path: string | null;
  total_found: number;
  total_sent: number;
  total_failed: number;
  total_generated: number;
  total_skipped: number;
  current_search_cycle: number;
  max_search_cycles: number;
  pause_reason: string | null;
  resume_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignEvent {
  id: string;
  event_type: string;
  message: string;
  metadata: any;
  created_at: string;
}

export interface QueueItem {
  id: string;
  company_name: string;
  company_email: string;
  company_city: string | null;
  company_sector: string | null;
  status: string;
  confidence_score: number;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface CampaignSetupData {
  search_location: string;
  search_location_query?: string;
  search_radius: number;
  search_keywords: string[];
  only_selected_city: boolean;
  target_total: number;
  email_style: string;
  include_risky: boolean;
  user_city?: string;
  cv_file_path?: string;
}

export function useAutoCampaign() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [events, setEvents] = useState<CampaignEvent[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch active campaign
  const fetchCampaign = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('auto_campaigns')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as any;
    setCampaign(data);
    setIsLoading(false);
    if (data?.id) {
      fetchEvents(data.id);
      fetchQueue(data.id);
    }
  }, [user?.id]);

  const fetchEvents = async (campaignId: string) => {
    const { data } = await supabase
      .from('campaign_events')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(50) as any;
    setEvents(data || []);
  };

  const fetchQueue = async (campaignId: string) => {
    const { data } = await supabase
      .from('campaign_queue')
      .select('id, company_name, company_email, company_city, company_sector, status, confidence_score, error_message, sent_at, created_at')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(200) as any;
    setQueueItems(data || []);
  };

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  // Realtime subscriptions
  useEffect(() => {
    if (!campaign?.id) return;

    const campaignChannel = supabase
      .channel(`campaign-${campaign.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auto_campaigns', filter: `id=eq.${campaign.id}` },
        (payload: any) => { if (payload.new) setCampaign(payload.new as Campaign); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'campaign_events', filter: `campaign_id=eq.${campaign.id}` },
        (payload: any) => { if (payload.new) setEvents(prev => [payload.new as CampaignEvent, ...prev].slice(0, 50)); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_queue', filter: `campaign_id=eq.${campaign.id}` },
        () => { fetchQueue(campaign.id); })
      .subscribe();

    return () => { supabase.removeChannel(campaignChannel); };
  }, [campaign?.id]);

  const startCampaign = async (setup: CampaignSetupData) => {
    if (!user?.id) return;

    const { data, error } = await supabase.from('auto_campaigns').insert({
      user_id: user.id,
      status: 'running',
      search_location: setup.search_location,
      search_location_query: setup.search_location_query || setup.search_location,
      search_radius: setup.search_radius,
      search_keywords: setup.search_keywords,
      only_selected_city: setup.only_selected_city,
      target_total: setup.target_total,
      email_style: setup.email_style,
      include_risky: setup.include_risky,
      cv_file_path: setup.cv_file_path || null,
      user_city: setup.user_city || setup.search_location,
      started_at: new Date().toISOString(),
    } as any).select().single() as any;

    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return;
    }

    setCampaign(data);
    toast({ title: '🚀 Auto Mode avviato!', description: 'La campagna automatica è partita.' });

    // Trigger immediate processing
    triggerProcessor(data.id);
  };

  const triggerProcessor = async (campaignId: string) => {
    try {
      await supabase.functions.invoke('auto-campaign-processor', {
        body: { campaign_id: campaignId },
      });
    } catch (err) {
      console.error('Trigger processor error:', err);
    }
  };

  const pauseCampaign = async () => {
    if (!campaign) return;
    await supabase.from('auto_campaigns').update({
      status: 'paused',
      pause_reason: 'Pausa manuale',
      updated_at: new Date().toISOString(),
    } as any).eq('id', campaign.id);
    toast({ title: 'Campagna in pausa' });
  };

  const resumeCampaign = async () => {
    if (!campaign) return;
    await supabase.from('auto_campaigns').update({
      status: 'running',
      pause_reason: null,
      resume_at: null,
      updated_at: new Date().toISOString(),
    } as any).eq('id', campaign.id);
    toast({ title: '▶️ Campagna ripresa!' });
    triggerProcessor(campaign.id);
  };

  const stopCampaign = async () => {
    if (!campaign) return;
    await supabase.from('auto_campaigns').update({
      status: 'stopped',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any).eq('id', campaign.id);
    toast({ title: '⏹️ Campagna fermata' });
  };

  const resetCampaign = async () => {
    setCampaign(null);
    setEvents([]);
    setQueueItems([]);
  };

  // Auto-poll for updates when campaign is running
  useEffect(() => {
    if (!campaign?.id || !['running', 'paused'].includes(campaign.status)) return;

    const interval = setInterval(() => {
      fetchCampaign();
      // Also trigger processor periodically from frontend as backup
      if (campaign.status === 'running') {
        triggerProcessor(campaign.id);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [campaign?.id, campaign?.status]);

  return {
    campaign,
    events,
    queueItems,
    isLoading,
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    stopCampaign,
    resetCampaign,
    triggerProcessor: () => campaign?.id && triggerProcessor(campaign.id),
    refetch: fetchCampaign,
  };
}
