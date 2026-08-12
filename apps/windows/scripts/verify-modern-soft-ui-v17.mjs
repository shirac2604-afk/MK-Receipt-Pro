import fs from "node:fs";
const css=fs.readFileSync("apps/desktop/renderer/src/styles.css","utf8");
const pre=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const checks=[
 [css.includes("MODERN SOFT UI — 1.1.0-dev.17"),"theme layer"],
 [css.includes("--primary:#2f766f"),"new primary palette"],
 [css.includes(".sidebar{"),"sidebar redesign"],
 [css.includes(".nav-item.active"),"navigation state"],
 [css.includes(".primary-button{"),"buttons"],
 [css.includes(".history-table th"),"tables"],
 [css.includes(".field input:focus"),"forms"],
 [css.includes(".dashboard-hero"),"dashboard"],
 [css.includes(".filing-card"),"reporting"],
 [css.includes(".customer-list-card"),"customers"],
 [css.includes(".interactive-check-item"),"checklist"],
 [css.includes("::-webkit-scrollbar"),"scrollbars"],
 [pre.includes('foundationVersion:"1.1.0-dev.17"'),"version"]
];
let ok=0;for(const[c,l]of checks){console.log(c?"PASS":"FAIL",l);if(c)ok++}
console.log(`${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
