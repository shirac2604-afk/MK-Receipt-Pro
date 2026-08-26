export function formatUnknownError(error:unknown):string{
  let raw="";
  if(error instanceof Error) raw=error.message||error.name||"";
  else if(error && typeof error==="object"){
    const value=error as Record<string,unknown>;
    raw=[value.code,value.message,value.details,value.hint].filter(v=>typeof v==="string"&&v).join("\n");
    if(!raw){try{raw=JSON.stringify(value)}catch{raw=""}}
  }else raw=typeof error==="string"?error:"";

  if(raw.includes("RECEIPT_ISSUE_ALREADY_IN_PROGRESS"))return "הפקת קבלה כבר מתבצעת. יש להמתין לסיום הפעולה.";
  if(raw.includes("RECEIPT_CANCEL_ALREADY_IN_PROGRESS"))return "ביטול הקבלה כבר מתבצע. יש להמתין לסיום הפעולה.";
  if(raw.includes("CLOUD_CONNECTION_REQUIRED")||raw.includes("Auth session missing"))return "אין חיבור פעיל לענן. מטעמי בטיחות לא ניתן לבצע פעולה זו ללא חיבור.";
  if(raw.includes("AUTH_CURRENT_PASSWORD_REQUIRED"))return "יש להזין את הסיסמה הנוכחית.";
  if(raw.includes("AUTH_CURRENT_PASSWORD_INVALID"))return "הסיסמה הנוכחית אינה נכונה.";
  if(raw.includes("AUTH_PASSWORD_UNCHANGED"))return "הסיסמה החדשה חייבת להיות שונה מהסיסמה הנוכחית.";
  if(raw.includes("AUTH_PASSWORD_TOO_SHORT"))return "הסיסמה החדשה חייבת להכיל לפחות 8 תווים.";
  if(raw.includes("AUTH_PASSWORD_TOO_LONG"))return "הסיסמה החדשה יכולה להכיל עד 128 תווים.";
  if(raw.includes("AUTH_PASSWORD_TOO_COMMON"))return "הסיסמה החדשה נפוצה מדי. יש לבחור סיסמה אחרת.";
  if(raw.includes("AUTH_PASSWORD_CONTAINS_EMAIL"))return "הסיסמה החדשה לא יכולה לכלול את החלק הראשון של כתובת האימייל.";
  if(raw.includes("AUTH_SESSION_REQUIRED")||raw.includes("AUTH_IDENTITY_CHANGED"))return "החיבור לחשבון השתנה. יש להתנתק ולהתחבר מחדש לפני שינוי הסיסמה.";
  if(raw.includes("AUTH_PASSWORD_CHANGE_FAILED"))return "שינוי הסיסמה לא הושלם. הסיסמה הקיימת נשארה ללא שינוי.";
  if(raw.includes("AUTH_RECOVERY_REQUEST_COOLDOWN"))return "כדי להגן על החשבון, יש להמתין דקה לפני בקשה נוספת.";
  if(raw.includes("AUTH_RECOVERY_REQUEST_LIMIT"))return "בוצעו יותר מדי בקשות לשחזור. יש לנסות שוב מאוחר יותר.";
  if(raw.includes("AUTH_RECOVERY_CODE_INVALID"))return "הקוד אינו תקין או שפג תוקפו. יש לבקש קוד חדש.";
  if(raw.includes("AUTH_RECOVERY_VERIFY_LIMIT"))return "בוצעו יותר מדי ניסיונות עם קוד שחזור. יש לבקש קוד חדש.";
  if(raw.includes("AUTH_RECOVERY_UPDATE_FAILED"))return "לא ניתן היה לעדכן את הסיסמה. הסיסמה הקודמת נשארה ללא שינוי.";
  if(raw.includes("AUTH_RECOVERY_GLOBAL_SIGNOUT_FAILED"))return "הסיסמה עודכנה, אך נדרש ניסיון שחזור חדש כדי להשלים את ניתוק המכשירים.";
  if(/network request failed|fetch|network|timeout|timed out/i.test(raw))return "לא ניתן להשלים את הפעולה מול הענן. בדוק את החיבור לאינטרנט ורענן את הרשימה לפני ניסיון נוסף.";
  return raw||"אירעה שגיאה לא צפויה. נסה לרענן ולבצע שוב.";
}
