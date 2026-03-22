import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

const HOURLY_LIMIT = 15;
const BURST_LIMIT = 8;
const COOLDOWN_MINUTES = 10;
const EMAILS_PER_INVOCATION = 3;

function supabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function logEvent(sb: any, campaignId: string, userId: string, eventType: string, message: string, metadata: any = {}) {
  await sb.from('campaign_events').insert({
    campaign_id: campaignId,
    user_id: userId,
    event_type: eventType,
    message,
    metadata,
  });
}

async function updateCampaignStats(sb: any, campaignId: string) {
  const counts = await Promise.all([
    sb.from('campaign_queue').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId),
    sb.from('campaign_queue').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'sent'),
    sb.from('campaign_queue').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'failed'),
    sb.from('campaign_queue').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'email_generated'),
    sb.from('campaign_queue').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'discarded'),
  ]);

  await sb.from('auto_campaigns').update({
    total_found: counts[0].count || 0,
    total_sent: counts[1].count || 0,
    total_failed: counts[2].count || 0,
    total_generated: counts[3].count || 0,
    total_skipped: counts[4].count || 0,
    last_processed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', campaignId);
}

async function getHourlySentCount(sb: any, userId: string): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await sb.from('sent_emails').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).gte('sent_at', oneHourAgo);
  return count || 0;
}

async function getDailySentCount(sb: any, userId: string): Promise<number> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await sb.from('sent_emails').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).gte('sent_at', oneDayAgo);
  return count || 0;
}

async function refreshGoogleToken(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });
  if (!response.ok) throw new Error('Failed to refresh Google token');
  return await response.json();
}

function bodyToHtml(body: string): string {
  const escaped = body
    .replace(/<b>/g, '%%%B_OPEN%%%').replace(/<\/b>/g, '%%%B_CLOSE%%%')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/%%%B_OPEN%%%/g, '<b>').replace(/%%%B_CLOSE%%%/g, '</b>')
    .replace(/\n/g, '<br>');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333;">${escaped}</body></html>`;
}

function buildMimeMessage(to: string, subject: string, body: string, attachment?: { filename: string; content: string; mimeType: string }): string {
  const htmlBody = bodyToHtml(body);
  if (!attachment) {
    return [`To: ${to}`, `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'MIME-Version: 1.0', 'Content-Type: text/html; charset=utf-8', 'Content-Transfer-Encoding: base64', '',
      btoa(unescape(encodeURIComponent(htmlBody)))].join('\r\n');
  }
  const boundary = `boundary_${crypto.randomUUID().replace(/-/g, '')}`;
  return [`To: ${to}`, `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${boundary}"`, '',
    `--${boundary}`, 'Content-Type: text/html; charset=utf-8', 'Content-Transfer-Encoding: base64', '',
    btoa(unescape(encodeURIComponent(htmlBody))), '', `--${boundary}`,
    `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`, 'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${attachment.filename}"`, '', attachment.content, '', `--${boundary}--`].join('\r\n');
}

async function sendViaGmail(accessToken: string, to: string, subject: string, body: string, attachment?: any) {
  const rawMessage = buildMimeMessage(to, subject, body, attachment);
  const encodedMessage = btoa(unescape(encodeURIComponent(rawMessage))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: encodedMessage }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gmail send failed: ${error}`);
  }
  return await response.json();
}

async function fetchCVAttachment(sb: any, filePath: string) {
  try {
    const { data, error } = await sb.storage.from('cv-files').download(filePath);
    if (error || !data) return null;
    const arrayBuffer = await data.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i += 8192) {
      binary += String.fromCharCode(...uint8Array.subarray(i, i + 8192));
    }
    const ext = filePath.split('.').pop()?.toLowerCase() || 'pdf';
    const mimeMap: Record<string, string> = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    return { filename: `CV.${ext}`, content: btoa(binary), mimeType: mimeMap[ext] || 'application/octet-stream' };
  } catch { return null; }
}

async function isDuplicate(sb: any, userId: string, email: string, companyName: string): Promise<boolean> {
  const { data } = await sb.rpc('check_duplicate_contact', {
    p_user_id: userId, p_email: email, p_company_name: companyName, p_check_domain: true,
  });
  return data?.[0]?.is_duplicate || false;
}

// --- MAIN PROCESSOR ---

async function processCampaign(sb: any, campaign: any) {
  const { id: campaignId, user_id: userId } = campaign;
  console.log(`Processing campaign ${campaignId} for user ${userId}, status: ${campaign.status}`);

  // Check if paused and ready to resume
  if (campaign.status === 'paused' && campaign.resume_at) {
    if (new Date(campaign.resume_at) > new Date()) {
      console.log(`Campaign ${campaignId} paused until ${campaign.resume_at}`);
      return;
    }
    // Resume
    await sb.from('auto_campaigns').update({ status: 'running', pause_reason: null, resume_at: null, updated_at: new Date().toISOString() }).eq('id', campaignId);
    await logEvent(sb, campaignId, userId, 'auto_resume', 'Campagna ripresa automaticamente dopo pausa anti-spam');
  }

  // Check target reached
  const { count: sentCount } = await sb.from('campaign_queue').select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId).eq('status', 'sent');
  
  if ((sentCount || 0) >= campaign.target_total) {
    await sb.from('auto_campaigns').update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', campaignId);
    await logEvent(sb, campaignId, userId, 'target_completed', `Target di ${campaign.target_total} email raggiunto!`);
    await updateCampaignStats(sb, campaignId);
    return;
  }

  // Check rate limits
  const hourlySent = await getHourlySentCount(sb, userId);
  const dailySent = await getDailySentCount(sb, userId);

  if (dailySent >= 80) {
    const resumeAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await sb.from('auto_campaigns').update({ status: 'paused', pause_reason: 'Limite giornaliero (80 email) raggiunto', resume_at: resumeAt, updated_at: new Date().toISOString() }).eq('id', campaignId);
    await logEvent(sb, campaignId, userId, 'paused_rate_limit', 'Limite giornaliero raggiunto, pausa di 1 ora');
    return;
  }

  if (hourlySent >= HOURLY_LIMIT) {
    const resumeAt = new Date(Date.now() + COOLDOWN_MINUTES * 60 * 1000).toISOString();
    await sb.from('auto_campaigns').update({ status: 'paused', pause_reason: `Limite orario (${HOURLY_LIMIT}) raggiunto`, resume_at: resumeAt, updated_at: new Date().toISOString() }).eq('id', campaignId);
    await logEvent(sb, campaignId, userId, 'paused_rate_limit', `Pausa anti-spam di ${COOLDOWN_MINUTES} minuti`);
    return;
  }

  if (hourlySent >= BURST_LIMIT) {
    const resumeAt = new Date(Date.now() + COOLDOWN_MINUTES * 60 * 1000).toISOString();
    await sb.from('auto_campaigns').update({ status: 'paused', pause_reason: 'Pausa anti-spam preventiva', resume_at: resumeAt, updated_at: new Date().toISOString() }).eq('id', campaignId);
    await logEvent(sb, campaignId, userId, 'paused_rate_limit', `Pausa preventiva dopo ${BURST_LIMIT} invii consecutivi`);
    return;
  }

  // Get user's Gmail token
  const { data: tokenData } = await sb.from('email_oauth_tokens').select('*').eq('user_id', userId).eq('provider', 'gmail').single();
  if (!tokenData) {
    await sb.from('auto_campaigns').update({ status: 'paused', pause_reason: 'Gmail non connesso', updated_at: new Date().toISOString() }).eq('id', campaignId);
    await logEvent(sb, campaignId, userId, 'error', 'Gmail non connesso. Connetti Gmail per continuare.');
    return;
  }

  // Refresh token if needed
  let accessToken = tokenData.access_token;
  if (tokenData.token_expires_at && new Date(tokenData.token_expires_at) < new Date()) {
    try {
      const newTokens = await refreshGoogleToken(tokenData.refresh_token);
      accessToken = newTokens.access_token;
      await sb.from('email_oauth_tokens').update({
        access_token: newTokens.access_token,
        token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', tokenData.id);
    } catch (err) {
      await sb.from('auto_campaigns').update({ status: 'paused', pause_reason: 'Token Gmail scaduto, riconnetti', updated_at: new Date().toISOString() }).eq('id', campaignId);
      await logEvent(sb, campaignId, userId, 'error', 'Impossibile rinnovare token Gmail');
      return;
    }
  }

  // Check if we need more companies (queue is empty or depleted)
  const { count: pendingCount } = await sb.from('campaign_queue').select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId).in('status', ['pending', 'email_generated']);

  if ((pendingCount || 0) === 0) {
    // Need to search for more companies
    if (campaign.current_search_cycle > campaign.max_search_cycles) {
      await sb.from('auto_campaigns').update({ status: 'completed', completed_at: new Date().toISOString(), pause_reason: 'Ricerche esaurite', updated_at: new Date().toISOString() }).eq('id', campaignId);
      await logEvent(sb, campaignId, userId, 'search_exhausted', `Nessun nuovo risultato dopo ${campaign.max_search_cycles} cicli di ricerca`);
      await updateCampaignStats(sb, campaignId);
      return;
    }

    await logEvent(sb, campaignId, userId, 'search_started', `Ciclo di ricerca #${campaign.current_search_cycle}`);

    try {
      const searchResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-search-companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: campaign.search_location_query || campaign.search_location,
          radius: campaign.search_radius,
          keywords: campaign.search_keywords,
          minResults: Math.min(50, campaign.target_total - (sentCount || 0)),
          userCity: campaign.user_city,
          onlySelectedCity: campaign.only_selected_city,
        }),
      });

      if (!searchResponse.ok) throw new Error(`Search failed: ${searchResponse.status}`);
      const searchResult = await searchResponse.json();

      if (!searchResult.success || !searchResult.data?.length) {
        await sb.from('auto_campaigns').update({
          current_search_cycle: campaign.current_search_cycle + 1,
          updated_at: new Date().toISOString(),
        }).eq('id', campaignId);
        await logEvent(sb, campaignId, userId, 'search_empty', 'Nessun nuovo risultato trovato in questo ciclo');
        await updateCampaignStats(sb, campaignId);
        return;
      }

      // Filter and add to queue
      let added = 0;
      for (const company of searchResult.data) {
        if (!company.email || !company.name) continue;
        
        // Check status filter
        const status = company.final_status || 'discarded';
        if (status === 'discarded') continue;
        if (status === 'risky_send' && !campaign.include_risky) continue;

        // Check duplicate
        const dup = await isDuplicate(sb, userId, company.email, company.name);
        if (dup) continue;

        // Check if already in queue
        const { count: existsCount } = await sb.from('campaign_queue').select('id', { count: 'exact', head: true })
          .eq('campaign_id', campaignId).eq('company_email', company.email.toLowerCase());
        if ((existsCount || 0) > 0) continue;

        await sb.from('campaign_queue').insert({
          campaign_id: campaignId,
          user_id: userId,
          company_name: company.name,
          company_sector: company.sector || null,
          company_city: company.city || null,
          company_website: company.website || null,
          company_email: company.email.toLowerCase(),
          company_phone: company.phone || null,
          company_source: company.source || null,
          company_address: company.address || null,
          email_source_url: company.email_source || null,
          contact_final_status: status,
          confidence_score: company.confidence_score || 0,
          status: 'pending',
        });
        added++;
      }

      await sb.from('auto_campaigns').update({
        current_search_cycle: campaign.current_search_cycle + 1,
        updated_at: new Date().toISOString(),
      }).eq('id', campaignId);

      await logEvent(sb, campaignId, userId, 'search_completed', `Trovate ${added} nuove aziende valide`, { total_results: searchResult.data.length, added });
      await updateCampaignStats(sb, campaignId);
    } catch (err: any) {
      console.error('Search error:', err);
      await logEvent(sb, campaignId, userId, 'error', `Errore ricerca: ${err.message}`);
    }
    return; // Next invocation will process the queue
  }

  // STEP 1: Generate emails for pending items (up to 3)
  const { data: pendingItems } = await sb.from('campaign_queue').select('*')
    .eq('campaign_id', campaignId).eq('status', 'pending')
    .order('confidence_score', { ascending: false }).limit(EMAILS_PER_INVOCATION);

  if (pendingItems?.length > 0) {
    // Get user profile for CV data
    const { data: profile } = await sb.from('user_profiles').select('*').eq('user_id', userId).single();
    if (!profile) {
      await logEvent(sb, campaignId, userId, 'error', 'Profilo utente non trovato');
      return;
    }

    const nameParts = (profile.full_name || '').split(' ');
    const cvData = {
      nome: nameParts[0] || '',
      cognome: nameParts.slice(1).join(' ') || '',
      email: profile.email || '',
      telefono: profile.phone || '',
      citta: profile.city || '',
      profilo: profile.profile_summary || '',
      competenze: profile.skills || [],
      sintesiBreve: profile.cv_short_summary || '',
    };

    for (const item of pendingItems) {
      try {
        const genResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-generate-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company: {
              name: item.company_name,
              sector: item.company_sector,
              city: item.company_city,
              website: item.company_website,
            },
            cvData,
            variant: campaign.email_style || 'standard',
            availability: 'immediata',
          }),
        });

        if (!genResponse.ok) {
          if (genResponse.status === 429) {
            await logEvent(sb, campaignId, userId, 'rate_limit', 'AI rate limit, attesa...');
            break; // Stop generating, try next invocation
          }
          throw new Error(`Email gen failed: ${genResponse.status}`);
        }

        const genResult = await genResponse.json();
        if (!genResult.success || !genResult.data) throw new Error(genResult.error || 'Gen failed');

        await sb.from('campaign_queue').update({
          email_subject: genResult.data.oggetto,
          email_body: genResult.data.corpo,
          email_firma: genResult.data.firma,
          status: 'email_generated',
          processed_at: new Date().toISOString(),
        }).eq('id', item.id);

      } catch (err: any) {
        console.error(`Email gen error for ${item.company_name}:`, err);
        const retryCount = (item.retry_count || 0) + 1;
        if (retryCount >= item.max_retries) {
          await sb.from('campaign_queue').update({ status: 'failed', error_message: err.message, retry_count: retryCount }).eq('id', item.id);
        } else {
          await sb.from('campaign_queue').update({
            retry_count: retryCount,
            next_retry_at: new Date(Date.now() + retryCount * 60000).toISOString(),
            error_message: err.message,
          }).eq('id', item.id);
        }
      }
    }
  }

  // STEP 2: Send generated emails (up to remaining rate limit)
  const canSend = Math.min(EMAILS_PER_INVOCATION, HOURLY_LIMIT - hourlySent, BURST_LIMIT - hourlySent);
  if (canSend <= 0) return;

  const { data: readyItems } = await sb.from('campaign_queue').select('*')
    .eq('campaign_id', campaignId).eq('status', 'email_generated')
    .order('confidence_score', { ascending: false }).limit(canSend);

  if (!readyItems?.length) {
    await updateCampaignStats(sb, campaignId);
    return;
  }

  // Fetch CV attachment once
  let cvAttachment: any = null;
  if (campaign.cv_file_path) {
    cvAttachment = await fetchCVAttachment(sb, campaign.cv_file_path);
  }

  for (const item of readyItems) {
    try {
      // Double-check duplicate before sending
      const dup = await isDuplicate(sb, userId, item.company_email, item.company_name);
      if (dup) {
        await sb.from('campaign_queue').update({ status: 'discarded', error_message: 'Duplicato' }).eq('id', item.id);
        continue;
      }

      const fullBody = `${item.email_body}\n\n${item.email_firma}`;
      await sendViaGmail(accessToken, item.company_email, item.email_subject, fullBody, cvAttachment);

      // Record sent email
      const domain = item.company_email.split('@')[1]?.toLowerCase() || '';
      await sb.from('sent_emails').insert({
        user_id: userId,
        company_name: item.company_name,
        email: item.company_email,
        domain,
        subject: item.email_subject,
        body: item.email_body,
        cv_version: 'auto',
        status: 'sent',
      });

      await sb.from('campaign_queue').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).eq('id', item.id);

      await logEvent(sb, campaignId, userId, 'email_sent', `Email inviata a ${item.company_name} (${item.company_email})`);

      // Small delay between sends
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));

    } catch (err: any) {
      console.error(`Send error for ${item.company_name}:`, err);
      const isRateLimit = err.message?.includes('429') || err.message?.includes('rate') || err.message?.includes('quota');
      
      if (isRateLimit) {
        const resumeAt = new Date(Date.now() + COOLDOWN_MINUTES * 60 * 1000).toISOString();
        await sb.from('auto_campaigns').update({ status: 'paused', pause_reason: 'Rate limit Gmail', resume_at: resumeAt, updated_at: new Date().toISOString() }).eq('id', campaignId);
        await logEvent(sb, campaignId, userId, 'paused_rate_limit', 'Gmail rate limit, pausa automatica');
        break;
      }

      const retryCount = (item.retry_count || 0) + 1;
      const isTransient = err.message?.includes('timeout') || err.message?.includes('503') || err.message?.includes('500');
      
      if (isTransient && retryCount < item.max_retries) {
        await sb.from('campaign_queue').update({
          retry_count: retryCount,
          next_retry_at: new Date(Date.now() + retryCount * 2 * 60000).toISOString(),
          error_message: err.message,
        }).eq('id', item.id);
      } else {
        await sb.from('campaign_queue').update({ status: 'failed', error_message: err.message, retry_count: retryCount }).eq('id', item.id);
        await logEvent(sb, campaignId, userId, 'send_failed', `Invio fallito per ${item.company_name}: ${err.message}`);
      }
    }
  }

  await updateCampaignStats(sb, campaignId);
}

// --- ENTRY POINT ---

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sb = supabaseAdmin();

    // Check if called manually with a specific campaign_id
    let targetCampaignId: string | null = null;
    try {
      const body = await req.json();
      targetCampaignId = body?.campaign_id || null;
    } catch {}

    // Find campaigns to process
    let query = sb.from('auto_campaigns').select('*');
    
    if (targetCampaignId) {
      query = query.eq('id', targetCampaignId);
    } else {
      // Find running campaigns or paused ones ready to resume
      query = query.or(`status.eq.running,and(status.eq.paused,resume_at.lte.${new Date().toISOString()})`);
    }

    const { data: campaigns, error } = await query;
    if (error) throw error;

    if (!campaigns?.length) {
      return new Response(JSON.stringify({ success: true, message: 'No campaigns to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process campaigns (one at a time to respect timeouts)
    for (const campaign of campaigns.slice(0, 2)) {
      if (campaign.status === 'running' || (campaign.status === 'paused' && campaign.resume_at)) {
        await processCampaign(sb, campaign);
      }
    }

    return new Response(JSON.stringify({ success: true, processed: campaigns.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Processor error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
