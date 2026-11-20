import { describe, expect, it } from 'vitest';
import { buildInvoicePdf, formatRupiah } from '@/infrastructure/invoice-pdf';

describe('invoice PDF', () => {
  it('builds a PDF whose xref offsets point at each object', () => {
    const pdf = buildInvoicePdf({
      invoiceId: 'INV-1',
      storeName: 'Toko (Tes)',
      buyerName: String.raw`Budi \ Ünïcode 日本`,
      buyerEmail: 'b@example.com',
      buyerPhone: '628123456789',
      paidAt: new Date('2026-11-20T10:00:00Z'),
      paymentMethod: 'QRIS',
      items: [{ title: 'Produk A', price: 50000 }],
      total: 50000,
    }).toString('latin1');
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain(String.raw`(Toko \(Tes\))`);
    const xrefAt = Number(pdf.match(/startxref\n(\d+)/)![1]);
    expect(pdf.slice(xrefAt, xrefAt + 4)).toBe('xref');
    const offsets = [...pdf.slice(xrefAt).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
    offsets.forEach((o, i) => expect(pdf.slice(o).startsWith(`${i + 1} 0 obj`)).toBe(true));
  });

  it('formats rupiah with dot separators', () => {
    expect(formatRupiah(1250000)).toBe('Rp 1.250.000');
  });
});
