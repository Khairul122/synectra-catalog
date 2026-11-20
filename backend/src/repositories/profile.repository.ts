import { supabaseAdmin } from '../infrastructure/supabase.admin';
import type { Profile } from '../types';

export class ProfileRepository {
  async isOwner(userId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (error) {
      throw new Error(`ProfileRepository.isOwner failed: ${error.message}`);
    }
    return Boolean(data);
  }

  async getProfile(): Promise<Profile | null> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`ProfileRepository.getProfile failed: ${error.message}`);
    }

    return data as Profile | null;
  }

  async updateProfile(
    id: string,
    payload: Partial<
      Pick<
        Profile,
        | 'business_name'
        | 'display_name'
        | 'bio'
        | 'avatar_url'
        | 'cover_banner_url'
        | 'instagram_url'
        | 'tiktok_url'
        | 'youtube_url'
        | 'theme_color'
      >
    >,
  ): Promise<Profile> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`ProfileRepository.updateProfile failed: ${error.message}`);
    }

    return data as Profile;
  }
}

export const profileRepository = new ProfileRepository();
