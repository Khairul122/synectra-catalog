/**
 * Minimal one-page A4 invoice PDF using the built-in Helvetica fonts — no PDF dependency.
 * ponytail: Latin-1 text only (other characters print as "?"), single page; switch to pdf-lib if invoices need
 * images, Unicode titles, or more rows than fit on one page.
 */

export interface InvoiceData {
  invoiceId: string;
  storeName: string;
  buyerName: string;
  buyerPhone?: string | null;
  buyerEmail: string;
  paidAt: Date;
  paymentMethod: string;
  items: Array<{ title: string; price: number }>;
  total: number;
}

export const formatRupiah = (n: number) => `Rp ${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

export const formatPaidAt = (d: Date) =>
  `${d.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })} WIB`;

// Helvetica glyph widths (1/1000 em) for characters that appear in right-aligned columns; others use 556.
const WIDTHS: Record<string, number> = { ' ': 278, '.': 278, ',': 278, '-': 333, R: 722, p: 556, A: 667, D: 722, G: 778, H: 722, I: 278, L: 556, O: 778, T: 611 };
const textWidth = (s: string, size: number) => ([...s].reduce((w, ch) => w + (WIDTHS[ch] ?? 556), 0) * size) / 1000;

const pdfText = (s: string) =>
  s
    .replace(/[^\x20-\x7e\xa0-\xff]/g, '?')
    .replace(/[\\()]/g, (ch) => `\\${ch}`);

function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && (line + ' ' + word).length > maxChars) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.flatMap((l) => l.match(new RegExp(`.{1,${maxChars}}`, 'g')) ?? []);
}

export function buildInvoicePdf(data: InvoiceData): Buffer {
  const ops: string[] = [];
  const gray = '0.45 0.45 0.45 rg';
  const dark = '0.12 0.12 0.12 rg';
  const green = '0.06 0.6 0.42 rg';
  const text = (x: number, y: number, s: string, size = 9, bold = false, color = dark) =>
    ops.push(`BT ${color} /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${pdfText(s)}) Tj ET`);
  const right = (xRight: number, y: number, s: string, size = 9, bold = false, color = dark) =>
    text(xRight - textWidth(s, size), y, s, size, bold, color);
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    ops.push(`0.85 0.85 0.85 RG 0.6 w ${x1} ${y1} m ${x2} ${y2} l S`);

  // PAID stamp first so everything else draws on top of it.
  ops.push('q 0.8 0.93 0.87 RG 0.8 0.93 0.87 rg 3 w 0.866 0.5 -0.5 0.866 250 470 cm 0 0 190 64 re S');
  ops.push('BT /F2 48 Tf 30 16 Td (PAID) Tj ET Q');

  const L = 60;
  const R = 535;
  text(L, 780, data.storeName, 16, true);
  text(L, 735, 'Invoice', 26, true, gray);

  text(L, 700, 'Penjual:', 8, false, gray);
  text(L, 687, data.storeName, 11, true);
  text(320, 700, 'Ditagihkan kepada:', 8, false, gray);
  text(320, 687, data.buyerName, 11, true);
  text(320, 674, data.buyerEmail, 8, false, gray);
  if (data.buyerPhone) text(320, 663, data.buyerPhone, 8, false, gray);

  text(L, 640, 'Ref id:', 8, false, gray);
  text(L, 628, data.invoiceId, 9, false, green);
  text(L, 615, formatPaidAt(data.paidAt), 9);

  let y = 580;
  text(L, y, 'ITEM', 8, false, gray);
  text(330, y, 'QTY', 8, false, gray);
  right(445, y, 'HARGA', 8, false, gray);
  right(R, y, 'TOTAL', 8, false, gray);
  line(L, y - 6, R, y - 6);
  y -= 24;
  text(L, y, data.storeName, 9, true);
  y -= 16;
  for (const item of data.items) {
    const titleLines = wrap(item.title, 48);
    titleLines.forEach((l, i) => text(L, y - i * 12, l, 9));
    text(334, y, '1', 9);
    right(445, y, formatRupiah(item.price), 9);
    right(R, y, formatRupiah(item.price), 9);
    y -= titleLines.length * 12 + 10;
    if (y < 260) break; // ponytail: one page; extra rows are dropped from the PDF (the email lists them all)
  }
  line(L, y + 2, R, y + 2);

  y -= 22;
  text(330, y, 'Sub Total', 9, true);
  right(R, y, formatRupiah(data.total), 9, true);
  line(330, y - 8, R, y - 8);
  y -= 26;
  text(330, y, 'Metode pembayaran:', 8, false, gray);
  text(330, y - 12, data.paymentMethod, 9, true);

  text(L, 120, 'Invoice ini dibuat dan diproses otomatis oleh sistem.', 8, false, gray);
  text(L, 109, `Untuk pertanyaan atau bantuan, hubungi ${data.storeName}.`, 8, false, gray);
  const footer = `(c) ${data.paidAt.getFullYear()} ${data.storeName}. Semua hak dilindungi.`;
  text((595 - textWidth(footer, 7)) / 2, 70, footer, 7, false, gray);

  const content = ops.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
  ];
  // Every character is one byte in latin1, so string lengths are byte offsets.
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((obj, i) => {
    const at = pdf.length;
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    return at;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}
