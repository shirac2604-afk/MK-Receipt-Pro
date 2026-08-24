import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const css=fs.readFileSync("apps/desktop/renderer/src/styles.css","utf8");
const ui=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const checks=[
 [pkg.version==="1.1.6","production release version"],
 [css.includes("user-select: none"),"sidebar text selection disabled"],
 [css.includes(".sidebar .nav-item.active"),"active-only selector"],
 [css.includes("background: #eef8f6"),"mint active background"],
 [css.includes("box-shadow: inset -4px 0 0 #0f8a83"),"teal active edge"],
 [css.includes(".sidebar .nav-item:hover:not(.active)"),"inactive hover isolated"],
 [ui.includes('view==="dashboard"?"active":""'),"view-driven active state"],
 [ui.includes('view==="customers"?"active":""'),"active state follows navigation"]
];
let ok=0;for(const[p,l]of checks){console.log(p?"PASS":"FAIL",l);if(p)ok++;}
console.log(`Windows sidebar UI: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
