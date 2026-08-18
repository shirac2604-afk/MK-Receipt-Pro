import fs from 'node:fs';

function patchFile(path,replacements){let s=fs.readFileSync(path,'utf8');for(const [label,a,b] of replacements){const n=s.split(a).length-1;if(n!==1)throw new Error(`${path} ${label}: expected 1 match, got ${n}`);s=s.replace(a,b)}fs.writeFileSync(path,s,'utf8')}

patchFile('apps/windows/apps/desktop/electron/main/SupabaseCloudService.ts',[
 ['config import','import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, validateSupabaseConfig } from "./SupabaseCloudConfig";','import { STUDENT_TEST_MODE, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, validateSupabaseConfig } from "./SupabaseCloudConfig";'],
 ['signin',`  async signIn(email:string,password:string):Promise<SupabaseCloudStatus>{\n    if(!email.trim()||!password)throw new Error("CLOUD_CREDENTIALS_REQUIRED");\n    const {data,error}=await this.client.auth.signInWithPassword({email:email.trim().toLowerCase(),password});\n    if(error)throw new Error(\`CLOUD_AUTH_FAILED:\${error.message}\`);\n    if(!data.user)throw new Error("CLOUD_AUTH_EMPTY_USER");\n    return this.refresh();\n  }`,`  async signIn(email:string,password:string):Promise<SupabaseCloudStatus>{\n    if(!email.trim()||!password)throw new Error("CLOUD_CREDENTIALS_REQUIRED");\n    const normalized=email.trim().toLowerCase();\n    const {data,error}=await this.client.auth.signInWithPassword({email:normalized,password});\n    if(!error&&data.user)return this.refresh();\n    if(!STUDENT_TEST_MODE)throw new Error(\`CLOUD_AUTH_FAILED:\${error?.message??"UNKNOWN"}\`);\n    const signup=await this.client.auth.signUp({email:normalized,password});\n    if(signup.error)throw new Error(\`CLOUD_AUTH_FAILED:\${signup.error.message}\`);\n    if(!signup.data.session){\n      this.status={connected:false,email:normalized,userId:signup.data.user?.id??null,businessId:null,businessName:null,deviceId:null,receipts:0,customers:0,expenses:0,message:"חשבון בדיקה נוצר. אם התקבל מייל אישור, יש לאשר אותו ואז להתחבר שוב."};\n      return this.getStatus();\n    }\n    return this.refresh();\n  }`]
]);

patchFile('apps/windows/apps/desktop/renderer/src/students/LessonsScreen.tsx',[
 ['header','סימון הגיע + שולם מפיק קבלה אוטומטית ללקוח המשלם.','מצב בדיקה מבודד: סימון הגיע + שולם מעדכן תשלום בלבד. לא מופקת קבלה.'],
 ['paid label','שולם + קבלה','שולם']
]);
patchFile('apps/windows/apps/desktop/renderer/src/students/GroupsScreen.tsx',[
 ['group intro','כל מפגש משותף לקבוצה, אבל נוכחות, תשלום וקבלה מנוהלים בנפרד לכל תלמיד.','כל מפגש משותף לקבוצה, אבל נוכחות ותשלום מנוהלים בנפרד לכל תלמיד. במצב הבדיקה לא מופקות קבלות.'],
 ['paid label','שולם + קבלה','שולם']
]);
patchFile('apps/windows/apps/desktop/renderer/src/students/OpenPaymentsScreen.tsx',[
 ['intro','שיעורים שסומנו כהגיעו ועדיין לא שולמו. סימון תשלום מפעיל את מנגנון הקבלה האוטומטית הקיים.','שיעורים שסומנו כהגיעו ועדיין לא שולמו. במצב הבדיקה סימון תשלום אינו מפיק קבלה.'],
 ['button','שולם + קבלה','שולם']
]);
patchFile('apps/windows/apps/desktop/renderer/src/students/StudentsScreen.tsx',[
 ['finance heading','<h3>תשלום וקבלות</h3>','<h3>תשלום — מצב בדיקה</h3>'],
 ['payer label','<span>הלקוח שמקבל את הקבלה</span>','<span>קישור למערכת הקבלות — כבוי בבדיקה</span>'],
 ['payer help','התלמיד והלקוח המשלם יכולים להיות אנשים שונים.','בגרסת הבדיקה אין חיבור ללקוחות או לקבלות האמיתיים.']
]);
