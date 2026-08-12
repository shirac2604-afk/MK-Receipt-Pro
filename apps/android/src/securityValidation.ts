export const PHONE_RE=/^[0-9+() -]{7,20}$/;
export const EMAIL_RE=/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
export const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;

export function sanitizePhone(value:string){return value.replace(/[^0-9+() -]/g,"").slice(0,20)}
export function sanitizeDigits(value:string,max=15){return value.replace(/\D/g,"").slice(0,max)}
export function sanitizeMoney(value:string){
  const cleaned=value.replace(/[^0-9.,]/g,"").replace(",",".");
  const [whole="",...rest]=cleaned.split(".");
  const decimals=rest.join("").slice(0,2);
  return (whole.slice(0,10)+(cleaned.includes(".")?"."+decimals:""));
}
export function sanitizeDate(value:string){return value.replace(/[^0-9-]/g,"").slice(0,10)}
export function validPhone(value:string){const v=value.trim();return !v||PHONE_RE.test(v)}
export function validEmail(value:string){const v=value.trim();return !v||(v.length<=254&&EMAIL_RE.test(v))}
export function validDate(value:string){
  if(!DATE_RE.test(value))return false;
  const d=new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;
}
