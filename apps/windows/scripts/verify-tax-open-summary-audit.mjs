import fs from "node:fs";
const required = [
  "packages/tax-open/src/OpenFormatSummaryComplianceValidator.ts",
  "scripts/tax-open-summary-audit.mjs",
  "docs/TAX_OPEN_SUMMARY_AUDIT_RC12.md"
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const service = fs.readFileSync("packages/tax-open/src/OpenFormatService.ts", "utf8");
if (!service.includes("OPEN-FORMAT-SUMMARY-AUDIT.json")) throw new Error("Summary audit output missing");
if (!service.includes("report54SummaryTotal")) throw new Error("Report 5.4 summary total missing");
console.log("✓ Open Format summary cross-check structure exists");
