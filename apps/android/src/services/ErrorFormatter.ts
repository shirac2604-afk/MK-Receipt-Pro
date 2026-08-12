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
  if(/network request failed|fetch|network|timeout|timed out/i.test(raw))return "לא ניתן להשלים את הפעולה מול הענן. בדוק את החיבור לאינטרנט ורענן את הרשימה לפני ניסיון נוסף.";
  return raw||"אירעה שגיאה לא צפויה. נסה לרענן ולבצע שוב.";
}
