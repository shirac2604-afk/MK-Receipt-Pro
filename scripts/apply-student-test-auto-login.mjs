import fs from 'node:fs';
const p='apps/windows/apps/desktop/electron/main/SupabaseCloudService.ts';
let s=fs.readFileSync(p,'utf8');
if(!s.includes('STUDENT_TEST_MODE')){
  s=s.replace('import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, validateSupabaseConfig } from "./SupabaseCloudConfig";','import { STUDENT_TEST_MODE, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, validateSupabaseConfig } from "./SupabaseCloudConfig";');
}
const re=/  async initialize\(\):Promise<void>\{\r?\n    const \{data,error\}=await this\.client\.auth\.getSession\(\);\r?\n    if\(error\)\{this\.status=\{\.\.\.this\.status,message:error\.message\};return;\}\r?\n    if\(data\.session\)await this\.refresh\(\);\r?\n  \}/;
const neu=`  async initialize():Promise<void>{\n    const {data,error}=await this.client.auth.getSession();\n    if(error){this.status={...this.status,message:error.message};return;}\n    if(data.session){await this.refresh();return;}\n    if(STUDENT_TEST_MODE){\n      const {data:login,error:loginError}=await this.client.auth.signInWithPassword({email:\"student-test@mkreceipt.local\",password:\"RjwEZHV6JVhfM_I5P%T-\"});\n      if(loginError||!login.user){this.status={...this.status,message:\`TEST_AUTO_LOGIN_FAILED:\${loginError?.message??\"EMPTY_USER\"}\`};return;}\n      await this.refresh();\n    }\n  }`;
if(!re.test(s)) throw new Error('initialize marker not found');
s=s.replace(re,neu);
fs.writeFileSync(p,s,'utf8');
