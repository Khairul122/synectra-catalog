import { supabaseAdmin } from '../infrastructure/supabase.admin';
import type { Product } from '../types';

export class ProductRepository {
  async getActiveProducts(category?: string): Promise<Product[]> {
    let query = supabaseAdmin
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`ProductRepository.getActiveProducts failed: ${error.message}`);
    }

    return (data || []) as Product[];
  }

  async getAllProducts(): Promise<Product[]> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`ProductRepository.getAllProducts failed: ${error.message}`);
    }

    return (data || []) as Product[];
  }

  async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`ProductRepository.getProductById failed: ${error.message}`);
    }

    return data as Product | null;
  }

  async createProduct(
    payload: Omit<Product, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<Product> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw new Error(`ProductRepository.createProduct failed: ${error.message}`);
    }

    return data as Product;
  }

  async updateProduct(
    id: string,
    payload: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>,
  ): Promise<Product> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`ProductRepository.updateProduct failed: ${error.message}`);
    }

    return data as Product;
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('products').delete().eq('id', id);

    if (error) {
      throw new Error(`ProductRepository.deleteProduct failed: ${error.message}`);
    }
  }
}

export const productRepository = new ProductRepository();
