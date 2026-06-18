/**
 * Invoice PDF generator (Worker-safe via pdf-lib).
 *
 * Produces a single-page A4 invoice branded for "Total Reward App".
 * Pure server-side: no DOM, no canvas, no native binaries.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface InvoiceItem {
  title: string;
  qty: number;
  price: number; // unit price
}

export interface InvoiceData {
  invoiceNumber: string;
  issuedAt: Date;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  items: InvoiceItem[];
  subtotal: number;
  vat: number;
  total: number;
  currency: string;
  planName?: string | null;
  billingCycle?: string | null;
}

const BRAND = {
  name: "Total Reward App",
  address: "Riyadh, Saudi Arabia",
  email: "support@totalreward.app",
  site: "totalreward.app",
};

function fmt(n: number, currency: string) {
  return `${currency} ${n.toFixed(2)}`;
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4 portrait
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(0.05, 0.1, 0.2);
  const muted = rgb(0.45, 0.5, 0.58);
  const line = rgb(0.86, 0.89, 0.93);
  const accent = rgb(0.13, 0.4, 0.86);

  const { width, height } = page.getSize();
  const left = 50;
  const right = width - 50;
  let y = height - 60;

  // ── Header ────────────────────────────────────────────────────────────────
  page.drawText(BRAND.name, { x: left, y, size: 22, font: bold, color: navy });
  page.drawText("INVOICE", { x: right - bold.widthOfTextAtSize("INVOICE", 22), y, size: 22, font: bold, color: accent });
  y -= 22;
  page.drawText(BRAND.address, { x: left, y, size: 10, font, color: muted });
  page.drawText(`No. ${data.invoiceNumber}`, { x: right - font.widthOfTextAtSize(`No. ${data.invoiceNumber}`, 10), y, size: 10, font, color: muted });
  y -= 14;
  page.drawText(BRAND.email, { x: left, y, size: 10, font, color: muted });
  const issued = `Issued ${data.issuedAt.toISOString().slice(0, 10)}`;
  page.drawText(issued, { x: right - font.widthOfTextAtSize(issued, 10), y, size: 10, font, color: muted });

  y -= 30;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: line });

  // ── Bill to ───────────────────────────────────────────────────────────────
  y -= 24;
  page.drawText("BILL TO", { x: left, y, size: 9, font: bold, color: muted });
  y -= 14;
  page.drawText(data.customerName, { x: left, y, size: 12, font: bold, color: navy });
  if (data.customerEmail) { y -= 13; page.drawText(data.customerEmail, { x: left, y, size: 10, font, color: navy }); }
  if (data.customerPhone) { y -= 13; page.drawText(data.customerPhone, { x: left, y, size: 10, font, color: navy }); }

  // Plan summary right side (aligned to BILL TO row)
  let planY = y + (data.customerEmail ? 13 : 0) + (data.customerPhone ? 13 : 0);
  if (data.planName) {
    page.drawText("PLAN", { x: right - 180, y: planY + 14, size: 9, font: bold, color: muted });
    page.drawText(`${data.planName}${data.billingCycle ? ` · ${data.billingCycle}` : ""}`, {
      x: right - 180, y: planY, size: 12, font: bold, color: navy,
    });
  }

  y -= 30;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: line });

  // ── Items table ───────────────────────────────────────────────────────────
  y -= 22;
  page.drawText("DESCRIPTION", { x: left, y, size: 9, font: bold, color: muted });
  page.drawText("QTY", { x: right - 200, y, size: 9, font: bold, color: muted });
  page.drawText("PRICE", { x: right - 140, y, size: 9, font: bold, color: muted });
  page.drawText("AMOUNT", { x: right - 70, y, size: 9, font: bold, color: muted });
  y -= 8;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: line });

  for (const it of data.items) {
    y -= 18;
    const amount = it.qty * it.price;
    page.drawText(it.title.slice(0, 60), { x: left, y, size: 11, font, color: navy });
    page.drawText(String(it.qty), { x: right - 200, y, size: 11, font, color: navy });
    page.drawText(fmt(it.price, data.currency), { x: right - 140, y, size: 11, font, color: navy });
    page.drawText(fmt(amount, data.currency), { x: right - 70, y, size: 11, font, color: navy });
  }

  y -= 18;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: line });

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalsX = right - 180;
  y -= 22;
  page.drawText("Subtotal", { x: totalsX, y, size: 11, font, color: muted });
  page.drawText(fmt(data.subtotal, data.currency), { x: right - 70, y, size: 11, font, color: navy });
  y -= 16;
  page.drawText("VAT (15%)", { x: totalsX, y, size: 11, font, color: muted });
  page.drawText(fmt(data.vat, data.currency), { x: right - 70, y, size: 11, font, color: navy });
  y -= 10;
  page.drawLine({ start: { x: totalsX, y }, end: { x: right, y }, thickness: 0.5, color: line });
  y -= 18;
  page.drawText("Total paid", { x: totalsX, y, size: 13, font: bold, color: navy });
  page.drawText(fmt(data.total, data.currency), { x: right - 70, y, size: 13, font: bold, color: accent });

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerY = 60;
  page.drawLine({ start: { x: left, y: footerY + 22 }, end: { x: right, y: footerY + 22 }, thickness: 0.5, color: line });
  page.drawText("Thank you for choosing Total Reward.", { x: left, y: footerY + 8, size: 10, font, color: muted });
  page.drawText(BRAND.site, { x: right - font.widthOfTextAtSize(BRAND.site, 10), y: footerY + 8, size: 10, font, color: muted });
  page.drawText("This invoice was generated automatically and is valid without a signature.", {
    x: left, y: footerY - 6, size: 8, font, color: muted,
  });

  return await pdf.save();
}

/**
 * Sign a download token for a given order so the link can be put in emails.
 * HMAC-SHA256 with the service-role key as the secret (already server-only).
 */
export async function signInvoiceToken(orderId: string, exp: number): Promise<string> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const payload = `${orderId}.${exp}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${exp}.${b64}`;
}

export async function verifyInvoiceToken(orderId: string, token: string): Promise<boolean> {
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig) return false;
  if (Date.now() / 1000 > exp) return false;
  const expected = await signInvoiceToken(orderId, exp);
  return expected === token;
}
