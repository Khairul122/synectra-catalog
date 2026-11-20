import { supabaseAdmin } from '@/infrastructure/supabase.admin';
import { env } from '@/config/env';

export class StorageRepository {
  async createSignedUrl(
    bucket: string,
    filePath: string,
    expiresIn = env.SIGNED_URL_EXPIRES_IN,
  ): Promise<string> {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error || !data?.signedUrl) {
      throw new Error(`StorageRepository.createSignedUrl failed: ${error?.message || 'Empty signed URL'}`);
    }

    return data.signedUrl;
  }

  async createSignedUploadUrl(
    bucket: string,
    filePath: string,
  ): Promise<{ signedUrl: string; token: string; path: string }> {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(filePath);

    if (error || !data?.signedUrl) {
      throw new Error(`StorageRepository.createSignedUploadUrl failed: ${error?.message || 'Failed'}`);
    }

    return {
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
    };
  }

  async uploadFile(
    bucket: string,
    filePath: string,
    fileBuffer: Buffer | Uint8Array,
    contentType: string,
  ): Promise<{ path: string }> {
    const { data, error } = await supabaseAdmin.storage.from(bucket).upload(filePath, fileBuffer, {
      contentType,
      upsert: true,
    });

    if (error || !data?.path) {
      throw new Error(`StorageRepository.uploadFile failed: ${error?.message || 'Upload failed'}`);
    }

    return { path: data.path };
  }

  getPublicUrl(bucket: string, filePath: string): string {
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  async deleteFile(bucket: string, filePath: string): Promise<void> {
    const { error } = await supabaseAdmin.storage.from(bucket).remove([filePath]);
    if (error) {
      throw new Error(`StorageRepository.deleteFile failed: ${error.message}`);
    }
  }
}

export const storageRepository = new StorageRepository();
