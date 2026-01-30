import { CVProvider, useCVContext } from '@/contexts/CVContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { CVUploader } from '@/components/cv/CVUploader';
import { CVSummary } from '@/components/cv/CVSummary';
import { CompanySearch } from '@/components/companies/CompanySearch';
import { EmailComposer } from '@/components/email/EmailComposer';

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
    default:
      return <CVUploader />;
  }
}

const Index = () => {
  return (
    <CVProvider>
      <AppLayout>
        <MainContent />
      </AppLayout>
    </CVProvider>
  );
};

export default Index;
