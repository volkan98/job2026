import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const MICROSOFT_CLIENT_ID = Deno.env.get('MICROSOFT_CLIENT_ID');
const MICROSOFT_CLIENT_SECRET = Deno.env.get('MICROSOFT_CLIENT_SECRET');

interface EmailAttachment {
  filename: string;
  content: string; // base64
  mimeType: string;
}

interface OAuthRequest {
  action: 'get_auth_url' | 'exchange_code' | 'send_email' | 'disconnect' | 'get_status';
  provider?: 'gmail' | 'outlook';
  code?: string;
  redirect_uri?: string;
  email_data?: {
    to: string;
    subject: string;
    body: string;
    attachment_path?: string; // storage path to CV file
  };
}

// Get Google OAuth URL
function getGoogleAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Get Microsoft OAuth URL
function getMicrosoftAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access',
    response_mode: 'query',
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

// Exchange Google code for tokens
async function exchangeGoogleCode(code: string, redirectUri: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Google token exchange error:', error);
    throw new Error('Failed to exchange Google code');
  }

  const tokens = await response.json();
  
  const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userResponse.json();

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    email: userInfo.email,
  };
}

// Exchange Microsoft code for tokens
async function exchangeMicrosoftCode(code: string, redirectUri: string) {
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: MICROSOFT_CLIENT_ID!,
      client_secret: MICROSOFT_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Microsoft token exchange error:', error);
    throw new Error('Failed to exchange Microsoft code');
  }

  const tokens = await response.json();
  
  const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userResponse.json();

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    email: userInfo.mail || userInfo.userPrincipalName,
  };
}

// Refresh Google token
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

  if (!response.ok) {
    throw new Error('Failed to refresh Google token');
  }

  return await response.json();
}

// Refresh Microsoft token
async function refreshMicrosoftToken(refreshToken: string) {
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: MICROSOFT_CLIENT_ID!,
      client_secret: MICROSOFT_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Microsoft token');
  }

  return await response.json();
}

// Helper: build a MIME multipart message for Gmail with optional attachment
function buildGmailMimeMessage(
  to: string,
  subject: string,
  body: string,
  attachment?: EmailAttachment
): string {
  if (!attachment) {
    const message = [
      `To: ${to}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      btoa(unescape(encodeURIComponent(body))),
    ].join('\r\n');
    return message;
  }

  const boundary = `boundary_${crypto.randomUUID().replace(/-/g, '')}`;
  
  const messageParts = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(body))),
    '',
    `--${boundary}`,
    `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${attachment.filename}"`,
    '',
    attachment.content,
    '',
    `--${boundary}--`,
  ];

  return messageParts.join('\r\n');
}

// Send email via Gmail API (with optional attachment)
async function sendGmailEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  attachment?: EmailAttachment
) {
  const rawMessage = buildGmailMimeMessage(to, subject, body, attachment);

  const encodedMessage = btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Gmail send error:', error);
    throw new Error('Failed to send Gmail email');
  }

  return await response.json();
}

// Send email via Microsoft Graph API (with optional attachment)
async function sendOutlookEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  attachment?: EmailAttachment
) {
  const message: any = {
    subject,
    body: {
      contentType: 'Text',
      content: body,
    },
    toRecipients: [{ emailAddress: { address: to } }],
  };

  if (attachment) {
    message.attachments = [{
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: attachment.filename,
      contentType: attachment.mimeType,
      contentBytes: attachment.content,
    }];
  }

  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Outlook send error:', error);
    throw new Error('Failed to send Outlook email');
  }

  return { success: true };
}

// Fetch CV file from storage and return as base64
async function fetchCVAttachment(
  supabase: any,
  filePath: string
): Promise<EmailAttachment | null> {
  try {
    const { data, error } = await supabase.storage
      .from('cv-files')
      .download(filePath);

    if (error || !data) {
      console.error('Error downloading CV:', error);
      return null;
    }

    const arrayBuffer = await data.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64Content = btoa(binary);

    // Determine filename and MIME type
    const ext = filePath.split('.').pop()?.toLowerCase() || 'pdf';
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      txt: 'text/plain',
    };

    const filename = `CV.${ext}`;
    const mimeType = mimeMap[ext] || 'application/octet-stream';

    return { filename, content: base64Content, mimeType };
  } catch (err) {
    console.error('Error fetching CV attachment:', err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const body: OAuthRequest = await req.json();
    const { action, provider, code, redirect_uri, email_data } = body;

    console.log(`Email OAuth action: ${action}, provider: ${provider}`);

    switch (action) {
      case 'get_auth_url': {
        if (!provider || !redirect_uri) {
          throw new Error('Missing provider or redirect_uri');
        }

        let authUrl: string;
        if (provider === 'gmail') {
          if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
            throw new Error('Google OAuth non configurato');
          }
          authUrl = getGoogleAuthUrl(redirect_uri);
        } else {
          if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
            throw new Error('Microsoft OAuth non configurato');
          }
          authUrl = getMicrosoftAuthUrl(redirect_uri);
        }

        return new Response(JSON.stringify({ success: true, authUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'exchange_code': {
        if (!provider || !code || !redirect_uri) {
          throw new Error('Missing provider, code, or redirect_uri');
        }

        let tokens;
        if (provider === 'gmail') {
          tokens = await exchangeGoogleCode(code, redirect_uri);
        } else {
          tokens = await exchangeMicrosoftCode(code, redirect_uri);
        }

        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
        
        const { error: dbError } = await supabase
          .from('email_oauth_tokens')
          .upsert({
            user_id: user.id,
            provider,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: expiresAt.toISOString(),
            email_address: tokens.email,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,provider' });

        if (dbError) {
          console.error('Error saving tokens:', dbError);
          throw new Error('Failed to save tokens');
        }

        return new Response(JSON.stringify({ 
          success: true, 
          email: tokens.email,
          provider 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_status': {
        const { data: tokens, error: dbError } = await supabase
          .from('email_oauth_tokens')
          .select('provider, email_address, token_expires_at')
          .eq('user_id', user.id);

        if (dbError) {
          throw new Error('Failed to get token status');
        }

        const connectedProviders = tokens?.map(t => ({
          provider: t.provider,
          email: t.email_address,
          connected: true,
        })) || [];

        return new Response(JSON.stringify({ success: true, providers: connectedProviders }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send_email': {
        if (!provider || !email_data) {
          throw new Error('Missing provider or email_data');
        }

        const { data: tokenData, error: dbError } = await supabase
          .from('email_oauth_tokens')
          .select('*')
          .eq('user_id', user.id)
          .eq('provider', provider)
          .single();

        if (dbError || !tokenData) {
          throw new Error(`Non connesso a ${provider}. Connetti prima il tuo account.`);
        }

        let accessToken = tokenData.access_token;

        // Check if token is expired and refresh if needed
        if (tokenData.token_expires_at && new Date(tokenData.token_expires_at) < new Date()) {
          console.log('Token expired, refreshing...');
          try {
            let newTokens;
            if (provider === 'gmail') {
              newTokens = await refreshGoogleToken(tokenData.refresh_token);
            } else {
              newTokens = await refreshMicrosoftToken(tokenData.refresh_token);
            }

            accessToken = newTokens.access_token;
            const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

            await supabase
              .from('email_oauth_tokens')
              .update({
                access_token: newTokens.access_token,
                refresh_token: newTokens.refresh_token || tokenData.refresh_token,
                token_expires_at: expiresAt.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', tokenData.id);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            throw new Error(`Token scaduto. Riconnetti il tuo account ${provider}.`);
          }
        }

        // Fetch CV attachment if path provided
        let attachment: EmailAttachment | null = null;
        if (email_data.attachment_path) {
          console.log('Fetching CV attachment:', email_data.attachment_path);
          attachment = await fetchCVAttachment(supabase, email_data.attachment_path);
          if (attachment) {
            console.log(`CV attachment loaded: ${attachment.filename} (${attachment.content.length} bytes base64)`);
          } else {
            console.warn('Could not load CV attachment, sending without it');
          }
        }

        // Send email
        if (provider === 'gmail') {
          await sendGmailEmail(accessToken, email_data.to, email_data.subject, email_data.body, attachment || undefined);
        } else {
          await sendOutlookEmail(accessToken, email_data.to, email_data.subject, email_data.body, attachment || undefined);
        }

        console.log(`Email sent successfully via ${provider} to ${email_data.to}${attachment ? ' with CV attached' : ''}`);

        return new Response(JSON.stringify({ 
          success: true, 
          message: `Email inviata tramite ${provider}${attachment ? ' con CV allegato' : ''}` 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'disconnect': {
        if (!provider) {
          throw new Error('Missing provider');
        }

        const { error: dbError } = await supabase
          .from('email_oauth_tokens')
          .delete()
          .eq('user_id', user.id)
          .eq('provider', provider);

        if (dbError) {
          throw new Error('Failed to disconnect');
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error: any) {
    console.error('Email OAuth error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
