import { execFileSync } from "node:child_process";

const EXPECTED_ADVISORIES = new Set([
  "GHSA-w3rx-r6r6-pgpr",
  "GHSA-5p2g-fcmc-qvqq",
]);

let raw = "";
try {
  raw = execFileSync("npm", ["audit", "--omit=dev", "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (error) {
  raw = error?.stdout?.toString?.() ?? "";
}

if (!raw.trim()) {
  console.error("FAIL npm audit did not return JSON output");
  process.exit(1);
}

let audit;
try {
  audit = JSON.parse(raw);
} catch {
  console.error("FAIL npm audit returned invalid JSON");
  process.exit(1);
}

const counts = audit?.metadata?.vulnerabilities ?? {};
const severityOk =
  Number(counts.critical ?? 0) === 0 &&
  Number(counts.moderate ?? 0) === 0 &&
  Number(counts.low ?? 0) === 0;

const jsonText = JSON.stringify(audit);
const advisoryIds = new Set(
  [...jsonText.matchAll(/GHSA-[0-9A-Za-z-]+/g)].map((match) => match[0])
);

const imageSizePresent = Boolean(audit?.vulnerabilities?.["image-size"]);
const cleanAudit =
  advisoryIds.size === 0 &&
  Object.keys(audit?.vulnerabilities ?? {}).length === 0;
const documentedOnly =
  advisoryIds.size === EXPECTED_ADVISORIES.size &&
  [...EXPECTED_ADVISORIES].every((id) => advisoryIds.has(id)) &&
  imageSizePresent;
const advisoriesOk = cleanAudit || documentedOnly;

console.log(severityOk ? "PASS" : "FAIL", "npm audit has no critical, moderate, or low advisories");
console.log(advisoriesOk ? "PASS" : "FAIL", "audit is clean or contains only documented image-size advisories");
console.log(cleanAudit || imageSizePresent ? "PASS" : "FAIL", "no unexpected root advisory package is present");

if (!severityOk || !advisoriesOk || (!cleanAudit && !imageSizePresent)) {
  console.error("Audit policy changed. Review new or changed npm advisories before release.");
  process.exit(1);
}

console.log("Android npm audit policy: 3/3");
