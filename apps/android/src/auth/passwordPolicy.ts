export const MIN_NEW_PASSWORD_LENGTH=10;
export const MAX_PASSWORD_LENGTH=128;

const COMMON_PASSWORDS=new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "qwerty123",
  "letmein123"
]);

export type NewPasswordValidationError=
 |"AUTH_PASSWORD_TOO_SHORT"
 |"AUTH_PASSWORD_TOO_LONG"
 |"AUTH_PASSWORD_TOO_COMMON"
 |"AUTH_PASSWORD_CONTAINS_EMAIL"
 |"AUTH_PASSWORD_LEAKED"
 |"AUTH_PASSWORD_BREACH_CHECK_UNAVAILABLE";

const HIBP_RANGE_URL="https://api.pwnedpasswords.com/range/";

// SHA-1 is required by the Pwned Passwords k-anonymity protocol. It is not
// used to protect stored passwords; Supabase remains responsible for that.
function sha1Hex(value:string):string{
 const bytes=new TextEncoder().encode(value);
 const bitLength=bytes.length*8;
 const paddedLength=(((bytes.length+9+63)>>6)<<6);
 const data=new Uint8Array(paddedLength);
 data.set(bytes);data[bytes.length]=0x80;
 const high=Math.floor(bitLength/0x1_0000_0000);
 const low=bitLength>>>0;
 data[paddedLength-8]=(high>>>24)&255;data[paddedLength-7]=(high>>>16)&255;data[paddedLength-6]=(high>>>8)&255;data[paddedLength-5]=high&255;
 data[paddedLength-4]=(low>>>24)&255;data[paddedLength-3]=(low>>>16)&255;data[paddedLength-2]=(low>>>8)&255;data[paddedLength-1]=low&255;
 let h0=0x67452301,h1=0xEFCDAB89,h2=0x98BADCFE,h3=0x10325476,h4=0xC3D2E1F0;
 const words=new Uint32Array(80);
 for(let offset=0;offset<data.length;offset+=64){
  for(let i=0;i<16;i++){const at=offset+i*4;words[i]=((data[at]!<<24)|(data[at+1]!<<16)|(data[at+2]!<<8)|data[at+3]!)>>>0;}
  for(let i=16;i<80;i++){const x=words[i-3]!^words[i-8]!^words[i-14]!^words[i-16]!;words[i]=((x<<1)|(x>>>31))>>>0;}
  let a=h0,b=h1,c=h2,d=h3,e=h4;
  for(let i=0;i<80;i++){
   const f=i<20?((b&c)|((~b)&d)):i<40?(b^c^d):i<60?((b&c)|(b&d)|(c&d)):(b^c^d);
   const k=i<20?0x5A827999:i<40?0x6ED9EBA1:i<60?0x8F1BBCDC:0xCA62C1D6;
   const rotated=((a<<5)|(a>>>27))>>>0;
   const next=((((rotated+f)>>>0)+((e+k)>>>0)+words[i]!)>>>0);
   e=d;d=c;c=((b<<30)|(b>>>2))>>>0;b=a;a=next;
  }
  h0=(h0+a)>>>0;h1=(h1+b)>>>0;h2=(h2+c)>>>0;h3=(h3+d)>>>0;h4=(h4+e)>>>0;
 }
 return [h0,h1,h2,h3,h4].map(part=>part.toString(16).padStart(8,"0")).join("").toUpperCase();
}

export function passwordErrorMessage(error:NewPasswordValidationError):string{
 const messages:Record<NewPasswordValidationError,string>={
  AUTH_PASSWORD_TOO_SHORT:`סיסמה חדשה חייבת להכיל לפחות ${MIN_NEW_PASSWORD_LENGTH} תווים.`,
  AUTH_PASSWORD_TOO_LONG:`סיסמה חדשה יכולה להכיל עד ${MAX_PASSWORD_LENGTH} תווים.`,
  AUTH_PASSWORD_TOO_COMMON:"הסיסמה נפוצה מדי. יש לבחור סיסמה אחרת.",
  AUTH_PASSWORD_CONTAINS_EMAIL:"אין להשתמש בשם האימייל כחלק מהסיסמה.",
  AUTH_PASSWORD_LEAKED:"הסיסמה הופיעה במאגר סיסמאות שדלפו. יש לבחור סיסמה אחרת.",
  AUTH_PASSWORD_BREACH_CHECK_UNAVAILABLE:"לא ניתן לאמת כרגע שהסיסמה לא דלפה. יש לבדוק את החיבור ולנסות שוב."
 };
 return messages[error];
}

export function validateNewPassword(email:string,password:string):NewPasswordValidationError|null{
  if(password.length<MIN_NEW_PASSWORD_LENGTH)return "AUTH_PASSWORD_TOO_SHORT";
  if(password.length>MAX_PASSWORD_LENGTH)return "AUTH_PASSWORD_TOO_LONG";
  const normalizedPassword=password.toLocaleLowerCase("en-US");
  if(COMMON_PASSWORDS.has(normalizedPassword))return "AUTH_PASSWORD_TOO_COMMON";
  const emailName=email.trim().toLocaleLowerCase("en-US").split("@",1)[0]??"";
  if(emailName.length>=3&&normalizedPassword.includes(emailName))return "AUTH_PASSWORD_CONTAINS_EMAIL";
  return null;
}

export async function validatePasswordNotLeaked(password:string):Promise<NewPasswordValidationError|null>{
 const hash=sha1Hex(password);
 const prefix=hash.slice(0,5);
 const suffix=hash.slice(5);
 try{
  const response=await fetch(`${HIBP_RANGE_URL}${prefix}`,{headers:{"Add-Padding":"true"}});
  if(!response.ok)return "AUTH_PASSWORD_BREACH_CHECK_UNAVAILABLE";
  const found=(await response.text()).split(/\r?\n/).some(line=>{
   const [candidate,count]=line.trim().split(":");
   return candidate?.toUpperCase()===suffix&&Number(count)>0;
  });
  return found?"AUTH_PASSWORD_LEAKED":null;
 }catch{return "AUTH_PASSWORD_BREACH_CHECK_UNAVAILABLE";}
}

export const __passwordPolicyTestOnly={sha1Hex};
