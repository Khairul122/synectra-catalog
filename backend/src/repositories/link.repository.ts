import { supabaseAdmin } from '@/infrastructure/supabase.admin';
import type { Link } from '@/types';

export class LinkRepository {
  async getActiveLinks(): Promise<Link[]> {
    const { data, error } = await supabaseAdmin
      .from('links')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`LinkRepository.getActiveLinks failed: ${error.message}`);
    }

    return (data || []) as Link[];
  }

  async getAllLinks(): Promise<Link[]> {
    const { data, error } = await supabaseAdmin
      .from('links')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`LinkRepository.getAllLinks failed: ${error.message}`);
    }

    return (data || []) as Link[];
  }

  async createLink(
    payload: Pick<Link, 'title' | 'url'> & Partial<Pick<Link, 'sort_order' | 'is_active'>>,
  ): Promise<Link> {
    const { data, error } = await supabaseAdmin
      .from('links')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw new Error(`LinkRepository.createLink failed: ${error.message}`);
    }

    return data as Link;
  }

  async updateLink(
    id: string,
    payload: Partial<Pick<Link, 'title' | 'url' | 'sort_order' | 'is_active'>>,
  ): Promise<Link> {
    const { data, error } = await supabaseAdmin
      .from('links')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`LinkRepository.updateLink failed: ${error.message}`);
    }

    return data as Link;
  }

  async deleteLink(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('links').delete().eq('id', id);

    if (error) {
      throw new Error(`LinkRepository.deleteLink failed: ${error.message}`);
    }
  }

  async reorderLinks(items: Array<{ id: string; sort_order: number }>): Promise<void> {
    const updates = items.map((item) =>
      supabaseAdmin.from('links').update({ sort_order: item.sort_order }).eq('id', item.id),
    );

    const results = await Promise.all(updates);
    const failure = results.find((r) => r.error);
    if (failure && failure.error) {
      throw new Error(`LinkRepository.reorderLinks failed: ${failure.error.message}`);
    }
  }
}

export const linkRepository = new LinkRepository();
