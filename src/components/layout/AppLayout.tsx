import { ReactNode } from 'react';
import { StepIndicator } from './StepIndicator';
import { useCVContext } from '@/contexts/CVContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Briefcase, LogOut, Sparkles } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { currentStep, setCurrentStep } = useCVContext();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-semibold text-foreground">
                  AI Job Agent
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Trova lavoro con l'intelligenza artificiale
                </p>
              </div>
            </div>
            
            {user && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground hidden md:block">
                  {user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Esci</span>
                </Button>
              </div>
            )}
          </div>
        </div>
        <StepIndicator currentStep={currentStep} onStepClick={setCurrentStep} />
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 AI Job Agent • I tuoi dati sono protetti • Powered by AI
          </p>
        </div>
      </footer>
    </div>
  );
}
