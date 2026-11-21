import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TOKEN_KEY = 'synectra_admin_token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function removeStoredToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/** Emails a one-time code. New emails get a buyer account; admin access is still checked server-side (profiles row). */
export async function sendLoginOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw new Error(error.message);
}

export async function verifyLoginOtp(email: string, token: string): Promise<string> {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error || !data?.session?.access_token) {
    throw new Error('Kode salah atau sudah kedaluwarsa.');
  }
  setStoredToken(data.session.access_token);
  return data.session.access_token;
}

/** Password sign-in for the store owner; the account is created in Supabase Authentication, never here. */
export async function signInWithPassword(email: string, password: string): Promise<string> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data?.session?.access_token) {
    throw new Error('Email atau password salah.');
  }
  setStoredToken(data.session.access_token);
  return data.session.access_token;
}

export async function adminSignOut(): Promise<void> {
  removeStoredToken();
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore error if offline
  }
}

export async function getSession(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      setStoredToken(data.session.access_token);
      return data.session.access_token;
    }
  } catch {
    // Fall back to stored token
  }
  return getStoredToken();
}

export async function uploadFile(bucket: string, path: string, file: File, token: string) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw error;
  return data;
}

export async function getPublicUrl(bucket: string, path: string): Promise<string> {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
