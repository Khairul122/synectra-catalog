import type { Metadata } from 'next';
import { Storefront } from '@/components/storefront/Storefront';
import type { Profile } from '@/types';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL;

/** Server-side profile read for SEO only; the page itself loads data on the client. */
async function getProfile(): Promise<Profile | null> {
  if (!SITE_URL) return null;
  try {
    const res = await fetch(`${SITE_URL}/api/catalog`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { profile?: Profile | null } };
    return json.data?.profile ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  const name = profile?.business_name || profile?.display_name || 'Synectra Digital';
  const description = profile?.bio || `Produk digital dari ${name}. Bayar online, akses langsung setelah pembayaran.`;
  const image = profile?.cover_banner_url || profile?.avatar_url || undefined;
  return {
    title: { absolute: name },
    description,
    alternates: { canonical: '/' },
    openGraph: { type: 'website', locale: 'id_ID', url: '/', siteName: name, title: name, description, images: image ? [image] : undefined },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: name, description, images: image ? [image] : undefined },
  };
}

export default async function StorefrontPage() {
  const profile = await getProfile();
  const sameAs = [profile?.instagram_url, profile?.tiktok_url, profile?.youtube_url].filter(Boolean);
  const jsonLd = profile && {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: profile.business_name || profile.display_name,
    description: profile.bio ?? undefined,
    url: SITE_URL,
    image: profile.avatar_url ?? undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };

  return (
    <>
      {jsonLd && (
        // Escape "<" so profile text can never close the script tag.
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      )}
      <Storefront />
    </>
  );
}
