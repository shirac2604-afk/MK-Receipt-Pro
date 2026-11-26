import fs from "node:fs";

const contract=fs.readFileSync("packages/tax-open/src/TaxAuthorityApi2027.ts","utf8");
const client=fs.readFileSync("packages/tax-open/src/TaxAuthorityApi2027Client.ts","utf8");
const service=fs.readFileSync("packages/tax-open/src/TaxAuthority2027PreparationService.ts","utf8");
const migration=fs.readFileSync("packages/database/src/migrations/010_tax_authority_transmissions.ts","utf8");
const repository=fs.readFileSync("packages/database/src/repositories/TaxAuthorityTransmissionRepository.ts","utf8");
const oauth=fs.readFileSync("packages/tax-open/src/TaxAuthorityOAuth2027.ts","utf8");
const broker=fs.readFileSync("packages/tax-open/src/TaxAuthorityOAuthBroker2027Client.ts","utf8");
const secureStore=fs.readFileSync("apps/desktop/electron/main/TaxAuthorityOAuth2027SecureStore.ts","utf8");
const edgeBroker=fs.readFileSync("../../supabase/functions/tax-authority-oauth-2027/index.ts","utf8");

const requiredContractTokens=[
  'requiredFrom:"2027-01-01"',
  'environment==="production"',
  'TAX_AUTHORITY_API_2027_PRODUCTION_NOT_CONFIRMED',
  'TaxAuthorityFileStatus="Uploaded"|"Approved"|"Rejected"|""',
];
for(const token of requiredContractTokens){
  if(!contract.includes(token))throw new Error(`2027 contract guard missing: ${token}`);
}

for(const token of ["Authorization:`Bearer ${token}`","Content-Range","TAX_AUTHORITY_API_2027_SANDBOX_PDF_ONLY"]){
  if(!client.includes(token))throw new Error(`2027 HTTP client contract missing: ${token}`);
}

for(const token of ["prepare(input","refreshStatuses(fileUniqueIds","status:\"Uploaded\"","status:\"Error\""]){
  if(!service.includes(token))throw new Error(`2027 preparation orchestrator missing: ${token}`);
}

for(const token of ["buildTaxAuthorityAuthorizationUrl","PRODUCTION_NOT_CONFIRMED"]){
  if(!oauth.includes(token))throw new Error(`OAuth public client guard missing: ${token}`);
}
for(const forbidden of ["clientSecret","client_secret","TAX_AUTHORITY_CLIENT_SECRET"]){
  if(oauth.includes(forbidden)||broker.includes(forbidden))throw new Error(`Desktop OAuth code must not contain client secret handling: ${forbidden}`);
}
for(const token of ["safeStorage.encryptString","safeStorage.decryptString","0o600"]){
  if(!secureStore.includes(token))throw new Error(`Secure token store control missing: ${token}`);
}
for(const token of ["TAX_AUTHORITY_CLIENT_SECRET","exchange_code","refresh_token","AUTHENTICATION_REQUIRED"]){
  if(!edgeBroker.includes(token))throw new Error(`Server OAuth broker control missing: ${token}`);
}
if(/console\.(log|info|debug)\([^\n]*(access_token|refresh_token|client_secret)/i.test(edgeBroker)){
  throw new Error("Server OAuth broker must not log token or secret values");
}

const persistenceText=`${migration}\n${repository}`.toLowerCase();
for(const forbidden of ["access_token","refresh_token","sign_url","signurl","upload_url","uploadurl","bearer "]){
  if(persistenceText.includes(forbidden))throw new Error(`Sensitive transient credential/url must not be persisted: ${forbidden}`);
}

for(const required of ["file_unique_id","transmission_unique_id","status","uploaded_at","status_updated_at"]){
  if(!persistenceText.includes(required))throw new Error(`Transmission persistence field missing: ${required}`);
}

const rendererFiles=[
  "apps/desktop/renderer/src/App.tsx",
  "apps/desktop/renderer/src/main.tsx",
].filter(fs.existsSync);
for(const file of rendererFiles){
  const text=fs.readFileSync(file,"utf8");
  if(/TaxAuthority(Api)?2027|TaxAuthority2027PreparationService/.test(text))throw new Error(`2027 module must remain disconnected from current renderer: ${file}`);
}

console.log("✓ Tax Authority 2027 preparation remains isolated, guarded, brokered and credential-safe");
