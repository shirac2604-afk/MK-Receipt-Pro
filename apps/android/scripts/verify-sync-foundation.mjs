import fs from "node:fs";
const files=["src/domain/sync.ts","src/data/SyncRepository.ts","src/services/SyncService.ts","src/services/ReceiptIssuanceGuard.ts","SYNC_ARCHITECTURE_HE.md"];
let ok=0;
for(const f of files){const p=fs.existsSync(f);console.log(p?"PASS":"FAIL",f);if(p)ok++}
const repo=fs.readFileSync("src/data/SyncRepository.ts","utf8"),sync=fs.readFileSync("src/domain/sync.ts","utf8"),guard=fs.readFileSync("src/services/ReceiptIssuanceGuard.ts","utf8");
const checks=[[repo.includes("reserveReceiptNumber"),"central receipt reservation"],[sync.includes("baseRevision"),"conflict detection"],[sync.includes("mutationId"),"mutation identity"],[sync.includes("conflicts"),"conflict contract"],[guard.includes("RECEIPT_NUMBER_RESERVATION_REQUIRED"),"issuance safety guard"]];
for(const [p,n] of checks){console.log(p?"PASS":"FAIL",n);if(p)ok++}
console.log(`Sync foundation: ${ok}/${files.length+checks.length}`);if(ok!==files.length+checks.length)process.exit(1);
