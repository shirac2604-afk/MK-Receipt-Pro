import fs from "node:fs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const path="resources/google/oauth-client.json";
const rl=readline.createInterface({input,output});
const secret=(await rl.question("Paste the NEW Google Desktop OAuth client secret: ")).trim();
rl.close();

if(!secret){console.error("No secret entered.");process.exit(1)}
const cfg=JSON.parse(fs.readFileSync(path,"utf8"));
cfg.clientSecret=secret;
fs.writeFileSync(path,JSON.stringify(cfg,null,2)+"\n","utf8");
console.log("Google OAuth client secret saved locally in resources/google/oauth-client.json");
