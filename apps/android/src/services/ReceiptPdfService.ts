import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {decode} from "base64-arraybuffer";
import {supabase} from "../lib/supabase";
import type {Receipt} from "../domain/types";
import {COMPANY_BRAND} from "../branding/CompanyBrand";

const BUCKET="receipt-documents";

export interface ReceiptBusinessProfile{
  businessName:string;
  ownerName:string;
  businessNumber:string;
  taxStatus:string;
  phone:string|null;
  email:string|null;
  address:string|null;
  slogan:string|null;
  logoDataUrl?:string|null;
}

const escapeHtml=(value:string):string=>value
  .replaceAll("&","&amp;")
  .replaceAll("<","&lt;")
  .replaceAll(">","&gt;")
  .replaceAll('"',"&quot;")
  .replaceAll("'","&#039;");

const money=(agorot:number):string=>new Intl.NumberFormat("he-IL",{
  style:"currency",
  currency:"ILS",
  minimumFractionDigits:2,
  maximumFractionDigits:2
}).format(agorot/100);

const date=(iso:string):string=>new Intl.DateTimeFormat("he-IL",{
  year:"numeric",month:"2-digit",day:"2-digit"
}).format(new Date(`${iso.slice(0,10)}T12:00:00`));

const dateTime=(iso:string):string=>new Intl.DateTimeFormat("he-IL",{
  year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"
}).format(new Date(iso));

const paymentLabels:Record<string,string>={
  cash:"מזומן",
  bank_transfer:"העברה בנקאית",
  bit:"ביט",
  paybox:"פייבוקס"
};

export function renderReceiptHtml(receipt:Receipt,business:ReceiptBusinessProfile):string{
  const contactParts=[business.address,business.phone,business.email]
    .filter((v):v is string=>Boolean(v));
  const clientParts=[receipt.clientPhone,receipt.clientEmail]
    .filter((v):v is string=>Boolean(v));
  const reference=receipt.referenceNumber
    ? `<div class="data-item"><span>אסמכתה</span><strong class="ltr">${escapeHtml(receipt.referenceNumber)}</strong></div>`
    : "";
  const logo=business.logoDataUrl
    ? `<img class="logo" src="${business.logoDataUrl}" alt="">`
    : "";

  return `<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="UTF-8"><style>
@page{size:A4;margin:10mm}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff}
body{font-family:"Segoe UI",Arial,sans-serif;color:#18213a;direction:rtl;font-size:10.5px;line-height:1.35}
.page{min-height:277mm;display:flex;flex-direction:column;position:relative;overflow:hidden}
.top-accent{height:5px;background:linear-gradient(90deg,#5146c8,#7c6ee6,#62c6c2);border-radius:5px;margin-bottom:10px}
.header{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:18px;align-items:start;padding-bottom:10px;border-bottom:1px solid #dfe4ee}
.brand{display:flex;gap:11px;align-items:center;min-width:0}
.logo{width:64px;height:64px;object-fit:contain;flex:0 0 auto}
.business{min-width:0}
.business h1{font-size:21px;line-height:1.1;margin:0 0 4px;color:#302a8f}
.business .owner{font-weight:700;margin-bottom:3px}
.business .status{color:#5146c8;font-weight:700}
.business .contact{margin-top:5px;color:#5d687c;font-size:9.5px;display:flex;gap:5px;flex-wrap:wrap}
.business .contact span:not(:last-child)::after{content:" •";margin-right:5px}
.document{text-align:left}
.document h2{font-size:24px;line-height:1;margin:0;color:#5146c8}
.document .sub{font-size:9px;color:#6c7688;margin-top:4px}
.document .number{font-size:17px;font-weight:850;margin-top:8px;color:#202a44}
.document .dates{margin-top:5px;color:#5e687a;font-size:9.5px;line-height:1.55}
.summary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:11px}
.card{border:1px solid #dfe4ee;border-radius:10px;padding:10px 12px;break-inside:avoid;background:#fff}
.card h3{font-size:10px;margin:0 0 7px;color:#5146c8}
.primary-line{font-size:13px;font-weight:800;color:#202a44}
.secondary-line{margin-top:3px;color:#687386;font-size:9.5px;overflow-wrap:anywhere}
.service{margin-top:10px;border:1px solid #dfe4ee;border-radius:10px;padding:10px 12px;break-inside:avoid}
.service h3{font-size:10px;margin:0 0 5px;color:#5146c8}
.description{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.45;font-size:11px;color:#26314a}
.payment-wrap{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:10px;margin-top:10px;align-items:stretch;break-inside:avoid}
.payment{border:1px solid #dfe4ee;border-radius:10px;padding:9px 12px;display:grid;grid-template-columns:1fr 1fr;gap:5px 16px}
.data-item{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #eef1f6;padding:4px 0}
.data-item:nth-last-child(-n+2){border-bottom:0}
.data-item span{color:#6c7688}
.data-item strong{color:#26314a}
.amount{background:linear-gradient(135deg,#f0edff,#e9fbfa);border:1px solid #cbd3ef;border-radius:10px;padding:10px 14px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
.amount span{font-size:11px;color:#4d5870}
.amount strong{font-size:25px;color:#302a8f;direction:ltr;line-height:1.15;margin-top:3px}
.footer{margin-top:auto;padding-top:9px;border-top:1px solid #dfe4ee;text-align:center;color:#657085;font-size:9px;break-inside:avoid}
.footer-row{display:flex;justify-content:space-between;align-items:end;gap:12px}
.footer-message{text-align:right}
.footer-message strong{display:block;color:#5146c8;font-size:10px}
.legal{text-align:center;max-width:330px}
.disclaimer{font-weight:850;color:#303b52;font-size:10px;margin-top:3px}
.technical{text-align:left;direction:ltr;color:#98a2b3;font-size:7.5px}
.company-brand{position:absolute;left:0;bottom:30px;width:118px;text-align:center;opacity:.88}
.company-brand img{display:block;max-width:105px;max-height:70px;object-fit:contain;margin:0 auto 2px}
.company-brand .powered{font-size:6.7px;color:#737d90;direction:rtl}
.ltr{direction:ltr;unicode-bidi:isolate}
</style></head><body><main class="page">
<div class="top-accent"></div>
<header class="header">
  <div class="brand">
    ${logo}
    <div class="business">
      <h1>${escapeHtml(business.businessName)}</h1>
      <div class="owner">${escapeHtml(business.ownerName)}</div>
      <div class="status">${escapeHtml(business.taxStatus)} • מס׳ עוסק <span class="ltr">${escapeHtml(business.businessNumber)}</span></div>
      ${contactParts.length?`<div class="contact">${contactParts.map(part=>`<span>${escapeHtml(part)}</span>`).join("")}</div>`:""}
    </div>
  </div>
  <div class="document">
    <h2>קבלה</h2>
    <div class="sub">מסמך תקבול לעוסק פטור</div>
    <div class="number">מספר ${receipt.receiptNumber}</div>
    <div class="dates">
      תאריך תשלום: ${date(receipt.paymentDate)}<br>
      מועד הפקה: ${dateTime(receipt.issuedAt)}
    </div>
  </div>
</header>

<section class="summary">
  <article class="card">
    <h3>התקבל מאת</h3>
    <div class="primary-line">${escapeHtml(receipt.clientName)}</div>
    ${clientParts.length?`<div class="secondary-line">${clientParts.map(escapeHtml).join(" • ")}</div>`:""}
  </article>
  <article class="card">
    <h3>פרטי העסק</h3>
    <div class="primary-line">עוסק פטור לפי חוק מס ערך מוסף</div>
    <div class="secondary-line">מסמך זה הוא קבלה על תקבול ואינו חשבונית מס.</div>
  </article>
</section>

<section class="service">
  <h3>עבור</h3>
  <div class="description">${escapeHtml(receipt.description)}</div>
</section>

<section class="payment-wrap">
  <div class="payment">
    <div class="data-item"><span>אופן התשלום</span><strong>${escapeHtml(paymentLabels[receipt.paymentMethod]??receipt.paymentMethod)}</strong></div>
    <div class="data-item"><span>תאריך התשלום</span><strong>${date(receipt.paymentDate)}</strong></div>
    ${reference}
  </div>
  <div class="amount">
    <span>סה״כ התקבל</span>
    <strong>${money(receipt.amountAgorot)}</strong>
  </div>
</section>

<aside class="company-brand">
  <img src="${COMPANY_BRAND.logoDataUrl}" alt="${escapeHtml(COMPANY_BRAND.companyName)}">
  <div class="powered">מופק באמצעות ${escapeHtml(COMPANY_BRAND.companyName)}</div>
</aside>

<footer class="footer">
  <div class="footer-row">
    <div class="footer-message">
      <strong>תודה שבחרתם ב${escapeHtml(business.businessName)}</strong>
      <span>${escapeHtml(business.slogan??"")}</span>
    </div>
    <div class="legal">
      עוסק פטור אינו רשאי להוציא חשבונית מס.
      <div class="disclaimer">ט.ל.ח</div>
    </div>
    <div class="technical">
      Receipt ${receipt.receiptNumber}
    </div>
  </div>
</footer>
</main></body></html>`;
}

export async function createReceiptPdf(receipt:Receipt,business:ReceiptBusinessProfile){
  const html=renderReceiptHtml(receipt,business);
  return Print.printToFileAsync({html,base64:true});
}

export async function uploadReceiptPdf(businessId:string,receipt:Receipt,base64:string){
  const key=`${businessId}/${receipt.id}/${Date.now()}-receipt-${receipt.receiptNumber}.pdf`;
  const {error}=await supabase.storage
    .from(BUCKET)
    .upload(key,decode(base64),{
      contentType:"application/pdf",
      upsert:false
    });
  if(error)throw error;
  return key;
}

export async function shareReceiptPdf(uri:string){
  if(!(await Sharing.isAvailableAsync()))throw new Error("SHARING_NOT_AVAILABLE");
  await Sharing.shareAsync(uri,{
    mimeType:"application/pdf",
    dialogTitle:"שיתוף קבלה"
  });
}

export async function signedReceiptPdfUrl(storageKey:string){
  const {data,error}=await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storageKey,300);
  if(error)throw error;
  return data.signedUrl;
}
