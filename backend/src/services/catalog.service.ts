import { profileRepository } from '../repositories/profile.repository';
import { linkRepository } from '../repositories/link.repository';
import { productRepository } from '../repositories/product.repository';
import type { CatalogData } from '../types';

export class CatalogService {
  async getCatalog(category?: string): Promise<CatalogData> {
    // Let DB failures surface (500 -> storefront error/retry UI) instead of rendering an empty store.
    const [profile, links, products] = await Promise.all([
      profileRepository.getProfile(),
      linkRepository.getActiveLinks(),
      productRepository.getActiveProducts(category),
    ]);

    return {
      profile,
      links,
      // Allowlist (mirrors the anon column grant): the delivery link/file is what buyers pay for.
      products: products.map(({ id, title, description, price, thumbnail_url, category, is_active, created_at, updated_at }) => ({
        id, title, description, price, thumbnail_url, category, is_active, created_at, updated_at,
      })),
    };
  }
}

export const catalogService = new CatalogService();
