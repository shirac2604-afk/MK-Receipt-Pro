import fs from "node:fs";

const files=[
  "src/tax-authority/TaxAuthorityMobile2027.ts",
  "src/tax-authority/TaxAuthorityMobile2027SecureStore.ts",
  "src/tax-authority/TaxAuthorityMobile2027BrokerClient.ts",
  "src/tax-authority/TaxAuthorityMobile2027Config.ts",
];
for(const file of files)if(!fs.existsSync(file))throw new Error(`missing Android Tax Authority 2027 file: ${file}`);

const all=files.map(file=>fs.readFileSync(file,"utf8")).join("\n");
for(const token of ["SecureStore","tax-authority-oauth-2027","PRODUCTION_NOT_CONFIRMED","refreshToken"]){
  if(!all.includes(token))throw new Error(`Android Tax Authority 2027 control missing: ${token}`);
}
for(const forbidden of ["TAX_AUTHORITY_CLIENT_SECRET","client_secret","AsyncStorage.setItem","service_role"]){
  if(all.includes(forbidden))throw new Error(`Android Tax Authority 2027 must not contain secret/insecure persistence: ${forbidden}`);
}
if(!all.includes("supabase.auth.getSession"))throw new Error("Android broker calls must be authenticated with the current Supabase session");
console.log("✓ Android Tax Authority 2027 foundation is secure and production-guarded");
