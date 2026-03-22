import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type EmailProvider = 'gmail' | 'outlook';

interface ConnectedProvider {
  provider: EmailProvider;
  email: string;
  connected: boolean;
}

export function useEmailOAuth() {
  const [connectedProviders, setConnectedProviders] = useState<ConnectedProvider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const getRedirectUri = useCallback(() => {
    return `${window.location.origin}/oauth-callback`;
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('email-oauth', {
        body: { action: 'get_status' },
      });

      if (error) throw error;
      if (data?.success) {
        setConnectedProviders(data.providers || []);
      }
    } catch (error) {
      console.error('Error fetching OAuth status:', error);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Handle OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state'); // We'll use state to store provider

      if (code && window.location.pathname === '/oauth-callback') {
        setIsConnecting(true);
        
        // Determine provider from stored state or URL
        const storedProvider = sessionStorage.getItem('oauth_provider') as EmailProvider;
        const provider = storedProvider || 'gmail';

        try {
          const { data, error } = await supabase.functions.invoke('email-oauth', {
            body: {
              action: 'exchange_code',
              provider,
              code,
              redirect_uri: getRedirectUri(),
            },
          });

          if (error) throw error;

          if (data?.success) {
            toast({
              title: 'Account connesso!',
              description: `${provider === 'gmail' ? 'Gmail' : 'Outlook'} collegato: ${data.email}`,
            });
            await fetchStatus();
          } else {
            throw new Error(data?.error || 'Errore durante la connessione');
          }
        } catch (error: any) {
          console.error('OAuth callback error:', error);
          toast({
            title: 'Errore connessione',
            description: error.message || 'Impossibile completare la connessione',
            variant: 'destructive',
          });
        } finally {
          setIsConnecting(false);
          sessionStorage.removeItem('oauth_provider');
          // Clean URL
          window.history.replaceState({}, document.title, '/');
        }
      }
    };

    handleCallback();
  }, [fetchStatus, getRedirectUri, toast]);

  const connect = useCallback(async (provider: EmailProvider) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('email-oauth', {
        body: {
          action: 'get_auth_url',
          provider,
          redirect_uri: getRedirectUri(),
        },
      });

      if (error) throw error;

      if (data?.success && data.authUrl) {
        // Store provider and current step for callback
        sessionStorage.setItem('oauth_provider', provider);
        sessionStorage.setItem('oauth_return_step', '3');
        // Redirect to OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error(data?.error || 'Errore durante la connessione');
      }
    } catch (error: any) {
      console.error('Connect error:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile avviare la connessione',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [getRedirectUri, toast]);

  const disconnect = useCallback(async (provider: EmailProvider) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('email-oauth', {
        body: { action: 'disconnect', provider },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Disconnesso',
          description: `${provider === 'gmail' ? 'Gmail' : 'Outlook'} disconnesso.`,
        });
        await fetchStatus();
      }
    } catch (error: any) {
      console.error('Disconnect error:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile disconnettere',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchStatus, toast]);

  const sendEmail = useCallback(async (
    provider: EmailProvider,
    to: string,
    subject: string,
    body: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('email-oauth', {
        body: {
          action: 'send_email',
          provider,
          email_data: { to, subject, body },
        },
      });

      if (error) throw error;

      if (data?.success) {
        return { success: true };
      } else {
        return { success: false, error: data?.error || 'Errore invio email' };
      }
    } catch (error: any) {
      console.error('Send email error:', error);
      return { success: false, error: error.message || 'Errore invio email' };
    }
  }, []);

  const isConnected = useCallback((provider: EmailProvider) => {
    return connectedProviders.some(p => p.provider === provider && p.connected);
  }, [connectedProviders]);

  const getConnectedEmail = useCallback((provider: EmailProvider) => {
    const found = connectedProviders.find(p => p.provider === provider);
    return found?.email;
  }, [connectedProviders]);

  const getActiveProvider = useCallback((): EmailProvider | null => {
    if (connectedProviders.length > 0) {
      return connectedProviders[0].provider as EmailProvider;
    }
    return null;
  }, [connectedProviders]);

  return {
    connectedProviders,
    isLoading,
    isConnecting,
    connect,
    disconnect,
    sendEmail,
    isConnected,
    getConnectedEmail,
    getActiveProvider,
    refresh: fetchStatus,
  };
}
