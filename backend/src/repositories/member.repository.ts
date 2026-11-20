import { supabaseAdmin } from '../infrastructure/supabase.admin';
import type { Member } from '../types';

export type MemberInput = Partial<Omit<Member, 'user_id' | 'updated_at'>>;

export class MemberRepository {
  async get(userId: string): Promise<Member | null> {
    const { data, error } = await supabaseAdmin.from('members').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw new Error(`MemberRepository.get failed: ${error.message}`);
    return data as Member | null;
  }

  async upsert(userId: string, input: MemberInput): Promise<Member> {
    const { data, error } = await supabaseAdmin
      .from('members')
      .upsert({ ...input, user_id: userId, updated_at: new Date().toISOString() })
      .select('*')
      .single();
    if (error) throw new Error(`MemberRepository.upsert failed: ${error.message}`);
    return data as Member;
  }
}

export const memberRepository = new MemberRepository();
