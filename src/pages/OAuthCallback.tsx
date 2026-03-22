import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function OAuthCallback() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (!code) {
        setStatus('error');
        setMessage('Nessun codice di autorizzazione ricevuto.');
        setTimeout(() => window.location.href = '/', 3000);
        return;
      }

      const storedProvider = sessionStorage.getItem('oauth_provider') || 'gmail';
      const redirectUri = `${window.location.origin}/oauth-callback`;

      try {
        const { data, error } = await supabase.functions.invoke('email-oauth', {
          body: {
            action: 'exchange_code',
            provider: storedProvider,
            code,
            redirect_uri: redirectUri,
          },
        });

        if (error) throw error;

        if (data?.success) {
          setStatus('success');
          setMessage(`${storedProvider === 'gmail' ? 'Gmail' : 'Outlook'} connesso: ${data.email}`);
        } else {
          throw new Error(data?.error || 'Errore durante la connessione');
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setStatus('error');
        setMessage(err.message || 'Impossibile completare la connessione');
      } finally {
        sessionStorage.removeItem('oauth_provider');
        sessionStorage.removeItem('oauth_return_step');
        // Step is already persisted in sessionStorage by CVContext, just redirect
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === 'processing' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Connessione in corso...</h2>
            <p className="text-muted-foreground">Completamento autenticazione email</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Connesso!</h2>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-xs text-muted-foreground">Reindirizzamento...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Errore</h2>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-xs text-muted-foreground">Reindirizzamento...</p>
          </>
        )}
      </div>
    </div>
  );
}
