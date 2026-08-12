import fs from "node:fs";
import path from "node:path";

const input=process.argv[2];
if(!input){
  console.error('Usage: npm run google:import -- "C:\\path\\to\\client_secret_....json"');
  process.exit(1);
}
const raw=JSON.parse(fs.readFileSync(path.resolve(input),"utf8"));
const c=raw.installed ?? raw.web;
if(!c?.client_id || !c?.client_secret){
  console.error("The JSON does not contain client_id and client_secret.");
  process.exit(1);
}
if(!String(c.client_id).endsWith(".apps.googleusercontent.com")){
  console.error("Invalid Google OAuth client id.");
  process.exit(1);
}
const target="resources/google/oauth-client.json";
fs.writeFileSync(target,JSON.stringify({
  clientId:c.client_id,
  clientSecret:c.client_secret,
  credentialStatus:"FINAL_ROTATED"
},null,2)+"\n","utf8");
console.log("New Google OAuth credential imported for final build.");
