import { productRepository } from '../repositories/product.repository';
import { linkRepository } from '../repositories/link.repository';
import { profileRepository } from '../repositories/profile.repository';
import { orderRepository, type OrderAnalyticsSummary } from '../repositories/order.repository';
import { storageRepository } from '../repositories/storage.repository';
import type {
  CreateProductDto,
  UpdateProductDto,
  CreateLinkDto,
  UpdateLinkDto,
  ReorderLinksDto,
  UpdateProfileDto,
} from '../dtos';
import type { Product, Link, Profile, Order, OrderStatus } from '../types';

export class AdminService {
  // --- Products ---
  async getAllProducts(): Promise<Product[]> {
    return productRepository.getAllProducts();
  }

  async getProductById(id: string): Promise<Product | null> {
    return productRepository.getProductById(id);
  }

  async createProduct(dto: CreateProductDto): Promise<Product> {
    return productRepository.createProduct(dto);
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
    return productRepository.updateProduct(id, dto);
  }

  async deleteProduct(id: string): Promise<void> {
    return productRepository.deleteProduct(id);
  }

  // --- Links ---
  async getAllLinks(): Promise<Link[]> {
    return linkRepository.getAllLinks();
  }

  async createLink(dto: CreateLinkDto): Promise<Link> {
    return linkRepository.createLink(dto);
  }

  async updateLink(id: string, dto: UpdateLinkDto): Promise<Link> {
    return linkRepository.updateLink(id, dto);
  }

  async deleteLink(id: string): Promise<void> {
    return linkRepository.deleteLink(id);
  }

  async reorderLinks(dto: ReorderLinksDto): Promise<void> {
    return linkRepository.reorderLinks(dto.items);
  }

  // --- Profile / Appearance ---
  async getProfile(): Promise<Profile | null> {
    return profileRepository.getProfile();
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<Profile> {
    return profileRepository.updateProfile(id, dto);
  }

  // --- Orders & Analytics ---
  async getAllOrders(status?: OrderStatus): Promise<Order[]> {
    return orderRepository.getAllOrders(status);
  }

  async getAnalytics(): Promise<OrderAnalyticsSummary> {
    return orderRepository.getAnalyticsSummary();
  }

  // --- Storage ---
  async generateUploadSignedUrl(bucket: string, fileName: string) {
    const ext = fileName.split('.').pop() || 'bin';
    const filePath = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const result = await storageRepository.createSignedUploadUrl(bucket, filePath);
    return {
      ...result,
      uploadUrl: result.signedUrl,
      publicUrl: bucket === 'public-assets' ? storageRepository.getPublicUrl(bucket, filePath) : null,
    };
  }
}

export const adminService = new AdminService();
