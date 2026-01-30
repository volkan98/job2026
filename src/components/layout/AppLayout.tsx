import { ReactNode } from 'react';
import { StepIndicator } from './StepIndicator';
import { useCVContext } from '@/contexts/CVContext';
import { Briefcase } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { currentStep, setCurrentStep } = useCVContext();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Briefcase className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground">
              Job Outreach Assistant
            </h1>
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
          <p className="text-sm text-muted">
            © 2024 Job Outreach Assistant • I tuoi dati sono protetti
          </p>
        </div>
      </footer>
    </div>
  );
}
