import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "test-output", "tax-open-simulator-fixture", "BKMVDATA.TXT");
const bytes = fs.readFileSync(file);
const text = new TextDecoder("iso-8859-8").decode(bytes);
const lines = text.split(/\r\n/).filter(Boolean);
const b100 = lines.filter((line) => line.startsWith("B100"));
if (b100.length !== 2) throw new Error(`Expected 2 B100 records, got ${b100.length}`);
for (const [index, line] of b100.entries()) {
  const quantity = line.slice(236, 248);
  if (!/^[+-]\d{11}$/.test(quantity)) {
    throw new Error(`B100 record ${index + 1} field 1370 invalid: ${JSON.stringify(quantity)}`);
  }
  if (quantity !== "+00000000000") {
    throw new Error(`B100 record ${index + 1} field 1370 expected signed zero, got ${quantity}`);
  }
}
console.log("B100 field 1370 signed-quantity audit: PASSED");
