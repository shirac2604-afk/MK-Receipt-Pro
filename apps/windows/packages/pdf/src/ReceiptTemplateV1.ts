import type { ReceiptPdfModel } from "./types";

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const money = (agorot: number): string => new Intl.NumberFormat("he-IL", {
  style: "currency", currency: "ILS", minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(agorot / 100);

const date = (iso: string): string => new Intl.DateTimeFormat("he-IL", {
  year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date(`${iso.slice(0, 10)}T12:00:00`));

const dateTime = (iso: string): string => new Intl.DateTimeFormat("he-IL", {
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
}).format(new Date(iso));

const paymentLabels: Record<string, string> = {
  cash: "מזומן", bank_transfer: "העברה בנקאית", bit: "ביט", paybox: "פייבוקס",
};

export function renderReceiptHtml(model: ReceiptPdfModel, logoDataUrl?: string): string {
  const b = model.business;
  const c = model.client;
  const r = model.receipt;
  const cancelled = Boolean(model.cancellation);
  const contactParts = [b.address, b.phone, b.email].filter((v): v is string => Boolean(v));
  const clientParts = [c.phone, c.email].filter((v): v is string => Boolean(v));
  const reference = r.referenceNumber ? `<div class="data-item"><span>אסמכתה</span><strong class="ltr">${escapeHtml(r.referenceNumber)}</strong></div>` : "";

  return `<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="UTF-8"><style>@page{size:A4;margin:10mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}body{font-family:"Segoe UI",Arial,sans-serif;color:#183b5a;direction:rtl;font-size:10.5px;line-height:1.4}.page{min-height:277mm;display:flex;flex-direction:column;position:relative}.header{text-align:center;padding:4px 0 13px}.logo{width:64px;height:64px;object-fit:contain;display:block;margin:0 auto 5px}.business h1{font-size:23px;margin:0;color:#183b5a}.business .owner{font-weight:700;margin-top:2px}.business .status,.business .contact{margin-top:3px;color:#597182;font-size:9.5px}.business .contact span:not(:last-child)::after{content:" •";margin-right:5px}.document-line{display:flex;justify-content:space-between;align-items:end;margin-top:20px;border-bottom:3px solid #4d76b8;padding:0 5px 8px}.document-line h2{font-size:22px;margin:0;color:#183b5a}.document-line .date{font-size:11px;font-weight:700}.parties{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:16px}.party{min-height:60px}.party h3,.section-title{font-size:11px;margin:0 0 5px;color:#183b5a}.primary-line{font-size:13px;font-weight:800}.secondary-line{font-size:9.5px;color:#637887;margin-top:3px}.table{width:100%;border-collapse:collapse;margin-top:20px;break-inside:avoid}.table th{background:#e6eceb;padding:8px 7px;font-size:10px;text-align:right;color:#183b5a}.table td{padding:9px 7px;border-bottom:1px solid #dfe7eb}.table .num{text-align:left;direction:ltr}.description{white-space:pre-wrap;overflow-wrap:anywhere}.total{width:265px;margin-top:16px;border-collapse:collapse;break-inside:avoid}.total td{padding:8px 10px;background:#f1f4f5}.total .grand td{background:#4d76b8;color:#fff;font-size:15px;font-weight:800}.total .amount{text-align:left;direction:ltr}.payment-title{margin-top:28px}.notes{margin-top:26px;min-height:60px}.footer{margin-top:auto;padding-top:12px;border-top:1px solid #dfe7eb;text-align:center;color:#687d89;font-size:9px}.seal{width:44px;height:44px;border:2px solid #4d76b8;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#4d76b8;font-size:27px;margin:14px auto 4px}.legal{font-weight:700;color:#364e61;margin-top:4px}.ltr{direction:ltr;unicode-bidi:isolate}.cancel-banner{margin:0 0 8px;padding:7px;border:1.5px solid #dc2626;color:#991b1b;background:#fff3f3;border-radius:8px;text-align:center;font-size:15px;font-weight:850}.watermark{position:fixed;top:43%;left:13%;transform:rotate(-28deg);font-size:68px;font-weight:900;color:rgba(220,38,38,.10);z-index:0}.cancel-details{margin-top:9px;border:1px solid #fecaca;background:#fff7f7;border-radius:9px;padding:8px 11px;color:#7f1d1d;break-inside:avoid}.cancel-details p{margin:3px 0}</style></head><body><main class="page">
${cancelled ? `<div class="watermark">מבוטלת</div><div class="cancel-banner">קבלה מבוטלת</div>` : ""}
<header class="header">${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" alt="">` : ""}<div class="business"><h1>${escapeHtml(b.businessName)}</h1><div class="owner">${escapeHtml(b.ownerName)}</div><div class="status">${escapeHtml(b.taxStatus)} • מס׳ עוסק <span class="ltr">${escapeHtml(b.businessNumber)}</span></div>${contactParts.length ? `<div class="contact">${contactParts.map(part => `<span>${escapeHtml(part)}</span>`).join("")}</div>` : ""}</div></header>
<section class="parties"><article class="party"><h3>לכבוד:</h3><div class="primary-line">${escapeHtml(c.name)}</div>${clientParts.length ? `<div class="secondary-line">${clientParts.map(escapeHtml).join(" • ")}</div>` : ""}</article><article class="party"><h3>מאת:</h3><div class="primary-line">${escapeHtml(b.ownerName)}</div><div class="secondary-line">${escapeHtml(b.businessName)}</div></article></section>
<section class="document-line"><div><h2>${cancelled ? "קבלה מבוטלת" : "קבלה"} מס׳ ${model.receiptNumber}</h2><div class="secondary-line">מסמך תקבול לעוסק פטור</div></div><div class="date">תאריך הפקה: ${dateTime(model.issuedAt)}</div></section>
<table class="table"><thead><tr><th>#</th><th>תיאור</th><th class="num">סכום</th></tr></thead><tbody><tr><td>1</td><td class="description">${escapeHtml(r.description)}</td><td class="num">${money(r.amountAgorot)}</td></tr></tbody></table>
<table class="total"><tr><td>סכום שהתקבל</td><td class="amount">${money(r.amountAgorot)}</td></tr><tr class="grand"><td>סה״כ</td><td class="amount">${money(r.amountAgorot)}</td></tr></table>
<h3 class="section-title payment-title">אמצעי תשלום</h3><table class="table"><thead><tr><th>אמצעי תשלום</th><th>אסמכתה</th><th>תאריך</th><th class="num">סכום</th></tr></thead><tbody><tr><td>${escapeHtml(paymentLabels[r.paymentMethod] ?? r.paymentMethod)}</td><td>${r.referenceNumber ? `<span class="ltr">${escapeHtml(r.referenceNumber)}</span>` : "—"}</td><td>${date(model.paymentDate)}</td><td class="num">${money(r.amountAgorot)}</td></tr></tbody></table>
${model.cancellation ? `<section class="cancel-details"><strong>פרטי הביטול</strong><p>בוטלה בתאריך ${dateTime(model.cancellation.cancelledAt)}</p><p>${escapeHtml(model.cancellation.reason)}</p></section>` : ""}
<section class="notes"><h3 class="section-title">הערות:</h3><div class="secondary-line">${escapeHtml(b.slogan ?? "")}</div></section>
<footer class="footer"><div>מסמך זה הופק באופן דיגיטלי ונשמר במערכת</div><div class="seal">✓</div><div class="legal">קבלה דיגיטלית מאושרת</div><div>עוסק פטור אינו רשאי להוציא חשבונית מס.</div></footer>
</main></body></html>`;
}
