import { createLocalServer } from './server';
import { env } from './config/env';

const port = Number(process.env.PORT ?? 8788);
const server = createLocalServer();

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} sudah dipakai — backend kemungkinan sudah berjalan di terminal lain. Hentikan dulu atau set PORT lain.`);
    process.exit(1);
  }
  throw err;
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Synectra backend listening on http://127.0.0.1:${port}`);
  if (!env.DOKU_SIMULATOR && (env.DOKU_CLIENT_ID === 'MALL-ID-DEMO' || env.DOKU_SECRET_KEY === 'doku-secret-demo')) {
    console.warn(
      '⚠ DOKU_CLIENT_ID / DOKU_SECRET_KEY belum diisi: checkout akan ditolak DOKU.\n' +
        '  Isi keduanya di .env (root) dari DOKU Dashboard > Integration > API Keys, atau set DOKU_SIMULATOR=true untuk uji lokal.',
    );
  }
  if (env.SUPABASE_URL.includes('placeholder.supabase.co')) {
    console.warn(
      '⚠ SUPABASE_URL belum diisi: semua endpoint yang butuh database akan membalas 503.\n' +
        '  Jalankan `npx supabase start` (butuh Docker), lalu isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env (root).',
    );
  }
});
