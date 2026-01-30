import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function OAuthCallback() {
  useEffect(() => {
    // The useEmailOAuth hook in the parent component will handle the callback
    // This page just shows a loading state
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <h2 className="text-xl font-semibold text-foreground">
          Connessione in corso...
        </h2>
        <p className="text-muted-foreground">
          Completamento autenticazione email
        </p>
      </div>
    </div>
  );
}
