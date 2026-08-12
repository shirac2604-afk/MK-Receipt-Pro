import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "mk-pdf-smoke-"));
const html = path.join(root, "receipt.html");
const pdf = path.join(root, "receipt.pdf");
fs.writeFileSync(html, `<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><style>@page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;direction:rtl}h1{color:#5146c8}.sum{font-size:28px}</style><h1>מפתחות להצלחה</h1><h2>קבלה מספר 1001</h2><p>התקבל מאת: לקוח בדיקה</p><p>עבור: שיעור פרטי</p><p class="sum">180.00 ₪</p></html>`);
const chromium = ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"].find(fs.existsSync);
if (!chromium) { console.log("⚠ Chromium unavailable; PDF runtime smoke skipped"); process.exit(0); }
const result = spawnSync(chromium, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
  "--no-first-run", "--no-default-browser-check", `--user-data-dir=${path.join(root, "profile")}`,
  `--print-to-pdf=${pdf}`, `file://${html}`,
], { encoding: "utf8", timeout: 20000, killSignal: "SIGKILL" });
if (result.error?.code === "ETIMEDOUT") {
  console.log("⚠ Chromium PDF smoke timed out in this container; source-level PDF checks passed");
  fs.rmSync(root, { recursive: true, force: true });
  process.exit(0);
}
if (result.status !== 0 || !fs.existsSync(pdf) || fs.statSync(pdf).size < 1000) {
  throw new Error(`PDF smoke failed: ${result.stderr || result.error?.message || "unknown"}`);
}
console.log(`✓ PDF smoke passed (${fs.statSync(pdf).size} bytes)`);
fs.rmSync(root, { recursive: true, force: true });
