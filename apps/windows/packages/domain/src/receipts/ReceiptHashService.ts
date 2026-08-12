import { createHash } from "node:crypto";

export class ReceiptHashService {
  create(parts: readonly string[]): string {
    return createHash("sha256").update(parts.join("\n"), "utf8").digest("hex");
  }
}
