import crypto from "node:crypto";

export const MIN_NEW_PASSWORD_LENGTH=10;
export const MAX_PASSWORD_LENGTH=128;
const HIBP_RANGE_URL="https://api.pwnedpasswords.com/range/";

const COMMON_PASSWORDS=new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "qwerty123",
  "letmein123"
]);

export type NewPasswordValidationError="AUTH_PASSWORD_TOO_SHORT"|"AUTH_PASSWORD_TOO_LONG"|"AUTH_PASSWORD_TOO_COMMON"|"AUTH_PASSWORD_CONTAINS_EMAIL"|"AUTH_PASSWORD_LEAKED"|"AUTH_PASSWORD_BREACH_CHECK_UNAVAILABLE";

export function validateNewPassword(email:string,password:string):NewPasswordValidationError|null{
  if(password.length<MIN_NEW_PASSWORD_LENGTH)return "AUTH_PASSWORD_TOO_SHORT";
  if(password.length>MAX_PASSWORD_LENGTH)return "AUTH_PASSWORD_TOO_LONG";
  const normalizedPassword=password.toLocaleLowerCase("en-US");
  if(COMMON_PASSWORDS.has(normalizedPassword))return "AUTH_PASSWORD_TOO_COMMON";
  const emailName=email.trim().toLocaleLowerCase("en-US").split("@",1)[0]??"";
  if(emailName.length>=3&&normalizedPassword.includes(emailName))return "AUTH_PASSWORD_CONTAINS_EMAIL";
  return null;
}

/**
 * Checks only the first five SHA-1 characters with HIBP's k-anonymity API.
 * The password itself, and its complete hash, never leave this device.
 */
export async function validatePasswordNotLeaked(password:string):Promise<Extract<NewPasswordValidationError,"AUTH_PASSWORD_LEAKED"|"AUTH_PASSWORD_BREACH_CHECK_UNAVAILABLE">|null>{
  const hash=crypto.createHash("sha1").update(password,"utf8").digest("hex").toUpperCase();
  const prefix=hash.slice(0,5);
  const suffix=hash.slice(5);
  try{
    const response=await fetch(`${HIBP_RANGE_URL}${prefix}`,{headers:{"Add-Padding":"true"},signal:AbortSignal.timeout(8_000)});
    if(!response.ok)return "AUTH_PASSWORD_BREACH_CHECK_UNAVAILABLE";
    const ranges=await response.text();
    for(const line of ranges.split(/\r?\n/)){
      const [candidate]=line.trim().split(":",1);
      if(candidate===suffix)return "AUTH_PASSWORD_LEAKED";
    }
    return null;
  }catch{return "AUTH_PASSWORD_BREACH_CHECK_UNAVAILABLE";}
}

export async function validateNewPasswordSecurity(email:string,password:string):Promise<NewPasswordValidationError|null>{
  const localError=validateNewPassword(email,password);
  return localError??await validatePasswordNotLeaked(password);
}
