import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CVData } from '@/types/cv';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  cap: string | null;
  skills: string[] | null;
  profile_summary: string | null;
  cv_short_summary: string | null;
  cv_full_summary: string | null;
  cv_file_path: string | null;
  target_role: string | null;
  search_radius_km: number | null;
  exclude_same_domain: boolean | null;
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [user?.id]);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return null;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const saveProfile = useCallback(async (
    cvData: CVData,
    sintesiBreve: string,
    sintesiCompleta: string
  ) => {
    if (!user?.id) return { success: false, error: 'Non autenticato' };

    setIsSaving(true);
    try {
      const profileData = {
        user_id: user.id,
        full_name: `${cvData.nome} ${cvData.cognome}`.trim(),
        email: cvData.email,
        phone: cvData.telefono,
        city: cvData.citta,
        cap: cvData.cap,
        skills: cvData.competenze,
        profile_summary: cvData.profilo,
        cv_short_summary: sintesiBreve,
        cv_full_summary: sintesiCompleta,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      return { success: true, data };
    } catch (error: any) {
      console.error('Error saving profile:', error);
      return { success: false, error: error.message };
    } finally {
      setIsSaving(false);
    }
  }, [user?.id]);

  const uploadCV = useCallback(async (file: File) => {
    if (!user?.id) return { success: false, error: 'Non autenticato' };

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/cv.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('cv-files')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update profile with file path
      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          cv_file_path: fileName,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (updateError) throw updateError;

      return { success: true, path: fileName };
    } catch (error: any) {
      console.error('Error uploading CV:', error);
      return { success: false, error: error.message };
    }
  }, [user?.id]);

  const downloadCV = useCallback(async () => {
    if (!profile?.cv_file_path) return null;

    try {
      const { data, error } = await supabase.storage
        .from('cv-files')
        .download(profile.cv_file_path);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error downloading CV:', error);
      return null;
    }
  }, [profile?.cv_file_path]);

  // Convert profile to CVData format
  const getCVDataFromProfile = useCallback((): CVData | null => {
    if (!profile) return null;

    const nameParts = (profile.full_name || '').split(' ');
    const nome = nameParts[0] || '';
    const cognome = nameParts.slice(1).join(' ') || '';

    return {
      nome,
      cognome,
      email: profile.email || '',
      telefono: profile.phone || '',
      citta: profile.city || '',
      cap: profile.cap || '',
      profilo: profile.profile_summary || '',
      competenze: profile.skills || [],
      esperienze: [], // Not stored in profile
      istruzione: [], // Not stored in profile
      lingue: [], // Not stored in profile
    };
  }, [profile]);

  return {
    profile,
    isLoading,
    isSaving,
    fetchProfile,
    saveProfile,
    uploadCV,
    downloadCV,
    getCVDataFromProfile,
    hasSavedCV: !!profile?.cv_short_summary,
  };
}
