import {randomBytes,scryptSync} from "node:crypto";
import {SettingsService} from "../packages/application/src/SettingsService.ts";

const salt=randomBytes(16).toString("hex");
const repository={getPinCredentials:()=>({pinSalt:salt,pinHash:scryptSync("1234",Buffer.from(salt,"hex"),32).toString("hex")})};
let now=100_000;
const service=new SettingsService({},repository,"",()=>now);

for(let attempt=0;attempt<5;attempt+=1){
  if(service.verifyPin("0000")!==false)throw new Error("WRONG_PIN_ACCEPTED");
}
let locked=false;
try{service.verifyPin("1234");}catch(error){locked=error instanceof Error&&error.message==="PIN_LOCKED";}
if(!locked)throw new Error("PIN_RATE_LIMIT_NOT_ENFORCED");
now+=30_000;
if(service.verifyPin("1234")!==true)throw new Error("VALID_PIN_REJECTED_AFTER_LOCK_EXPIRY");
if(service.verifyPin("0000")!==false)throw new Error("PIN_RATE_LIMIT_DID_NOT_RESET_AFTER_VALID_PIN");
console.log("✓ PIN verification locks after repeated failures and resets after a valid PIN");
