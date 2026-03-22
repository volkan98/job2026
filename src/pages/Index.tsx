import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCVContext } from '@/contexts/CVContext';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { CVUploader } from '@/components/cv/CVUploader';
import { CVSummary } from '@/components/cv/CVSummary';
import { CompanySearch } from '@/components/companies/CompanySearch';
import { EmailComposer } from '@/components/email/EmailComposer';
import { SentEmailsHistory } from '@/components/email/SentEmailsHistory';
import { Skeleton } from '@/components/ui/skeleton';

function MainContent() {
  const { currentStep } = useCVContext();

  switch (currentStep) {
    case 0:
      return <CVUploader />;
    case 1:
      return <CVSummary />;
    case 2:
      return <CompanySearch />;
    case 3:
      return <EmailComposer />;
    case 4:
      return <SentEmailsHistory />;
    default:
      return <CVUploader />;
  }
}

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <MainContent />
    </AppLayout>
  );
};

export default Index;
