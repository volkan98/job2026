import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, Loader2, Building2, MapPin, Mail, CheckCircle2 } from 'lucide-react';

interface ManualSearchResult {
  name: string;
  email?: string;
  city?: string;
  sector?: string;
  website?: string;
  phone?: string;
  source?: string;
  address?: string;
  confidence_score?: number;
  final_status?: string;
}

interface ManualCompanySearchProps {
  campaignId: string;
}

export function ManualCompanySearch({ campaignId }: ManualCompanySearchProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState<ManualSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedEmails, setAddedEmails] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('ai-search-companies', {
        body: {
          location: location || 'Svizzera',
          radius: 50,
          keywords: query.split(',').map(k => k.trim()).filter(Boolean),
          minResults: 20,
          userCity: location || undefined,
          onlySelectedCity: !!location,
        },
      });

      if (error) throw error;
      if (data?.success && data.data?.length) {
        setResults(data.data);
      } else {
        toast({ title: 'Nessun risultato', description: 'Prova con parole chiave diverse.' });
      }
    } catch (err: any) {
      toast({ title: 'Errore ricerca', description: err.message, variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const addToQueue = async (company: ManualSearchResult) => {
    if (!user?.id || !company.email) return;

    // Check duplicate in queue
    const { count } = await supabase.from('campaign_queue')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('company_email', company.email.toLowerCase()) as any;

    if ((count || 0) > 0) {
      toast({ title: 'Già in coda', description: `${company.name} è già nella coda.` });
      return;
    }

    // Check sent_emails duplicate
    const { data: dupCheck } = await supabase.rpc('check_duplicate_contact', {
      p_user_id: user.id,
      p_email: company.email,
      p_company_name: company.name,
      p_check_domain: true,
    });

    if (dupCheck?.[0]?.is_duplicate) {
      toast({ title: 'Già contattata', description: `Email già inviata a ${dupCheck[0].original_company}.` });
      return;
    }

    const { error } = await supabase.from('campaign_queue').insert({
      campaign_id: campaignId,
      user_id: user.id,
      company_name: company.name,
      company_email: company.email.toLowerCase(),
      company_city: company.city || null,
      company_sector: company.sector || null,
      company_website: company.website || null,
      company_phone: company.phone || null,
      company_source: 'manual_search',
      company_address: company.address || null,
      contact_final_status: company.final_status || 'valid_email',
      confidence_score: company.confidence_score || 70,
      status: 'pending',
    } as any);

    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return;
    }

    setAddedEmails(prev => new Set(prev).add(company.email!.toLowerCase()));
    toast({ title: '✅ Aggiunta!', description: `${company.name} aggiunta alla coda.` });

    // Log event
    await supabase.from('campaign_events').insert({
      campaign_id: campaignId,
      user_id: user.id,
      event_type: 'manual_add',
      message: `Aggiunta manuale: ${company.name} (${company.email})`,
    } as any);
  };

  const addAll = async () => {
    const validResults = results.filter(r => r.email && !addedEmails.has(r.email.toLowerCase()));
    for (const company of validResults) {
      await addToQueue(company);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          Ricerca Manuale
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="es: metalmeccanica, logistica"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Città (opzionale)"
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="text-sm"
          />
          <Button size="sm" onClick={handleSearch} disabled={isSearching || !query.trim()}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{results.length} risultati</span>
            <Button size="sm" variant="outline" onClick={addAll} className="text-xs h-7">
              <Plus className="h-3 w-3 mr-1" /> Aggiungi tutte
            </Button>
          </div>
        )}

        <ScrollArea className="h-[250px]">
          <div className="space-y-1.5">
            {isSearching && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm">Cercando...</span>
              </div>
            )}
            {results.map((company, i) => {
              const emailLower = company.email?.toLowerCase() || '';
              const isAdded = addedEmails.has(emailLower);
              return (
                <div key={`${company.name}-${i}`} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{company.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {company.email && (
                        <span className="flex items-center gap-0.5 truncate">
                          <Mail className="h-3 w-3 shrink-0" />
                          {company.email}
                        </span>
                      )}
                    </div>
                    {company.city && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {company.city}
                      </span>
                    )}
                  </div>
                  {company.email ? (
                    isAdded ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 shrink-0"
                        onClick={() => addToQueue(company)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">No email</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
