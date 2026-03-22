import { Check, Upload, FileText, Building2, Mail, History, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: number;
  label: string;
  icon: React.ReactNode;
}

const steps: Step[] = [
  { id: 0, label: 'Carica CV', icon: <Upload className="h-4 w-4" /> },
  { id: 1, label: 'Sintesi CV', icon: <FileText className="h-4 w-4" /> },
  { id: 2, label: 'Trova Aziende', icon: <Building2 className="h-4 w-4" /> },
  { id: 3, label: 'Email & Invio', icon: <Mail className="h-4 w-4" /> },
  { id: 4, label: 'Già Inviato', icon: <History className="h-4 w-4" /> },
  { id: 5, label: 'Auto Mode', icon: <Rocket className="h-4 w-4" /> },
];

interface StepIndicatorProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <nav className="w-full py-4 px-4 md:px-8">
      <ol className="flex items-center justify-between max-w-3xl mx-auto">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isClickable = onStepClick && currentStep >= step.id;

          return (
            <li key={step.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={cn(
                  'flex flex-col items-center gap-2 group transition-all',
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300',
                    isCompleted && 'bg-primary border-primary',
                    isCurrent && 'border-primary bg-primary/10',
                    !isCompleted && !isCurrent && 'border-muted bg-card'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5 text-primary-foreground" />
                  ) : (
                    <span
                      className={cn(
                        isCurrent ? 'text-primary' : 'text-muted'
                      )}
                    >
                      {step.icon}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium hidden sm:block transition-colors',
                    isCurrent && 'text-primary',
                    isCompleted && 'text-primary',
                    !isCompleted && !isCurrent && 'text-muted'
                  )}
                >
                  {step.label}
                </span>
              </button>
              
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-4">
                  <div
                    className={cn(
                      'h-0.5 rounded-full transition-colors duration-300',
                      currentStep > step.id ? 'bg-primary' : 'bg-border'
                    )}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
