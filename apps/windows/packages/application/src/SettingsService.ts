import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { DatabaseConnection } from "../../database/src/DatabaseConnection";
import type { BusinessSettingsInput, BusinessSettingsRecord, OnboardingStatus } from "../../database/src/types";
import type { BusinessSettingsRepository } from "../../database/src/repositories/BusinessSettingsRepository";

function clean(value?: string): string | null { const result = value?.trim(); return result ? result : null; }
function hashPin(pin: string, saltHex?: string): { salt: string; hash: string } {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : randomBytes(16);
  return { salt: salt.toString("hex"), hash: scryptSync(pin, salt, 32).toString("hex") };
}

export class SettingsService {
  constructor(
    private readonly connection: DatabaseConnection,
    private readonly repository: BusinessSettingsRepository,
    private readonly brandingFolder: string,
  ) {}

  getStatus(): OnboardingStatus {
    const settings = this.repository.get();
    const sequence = this.connection.prepare("SELECT next_number FROM receipt_sequences WHERE sequence_key = 'receipt'").get() as unknown as { next_number: number } | undefined;
    return {
      setupCompleted: Boolean(settings?.setupCompleted),
      businessName: settings?.businessName ?? "",
      nextReceiptNumber: sequence?.next_number ?? 1001,
      logoConfigured: Boolean(settings?.logoPath),
      signatureConfigured: Boolean(settings?.signaturePath),
      backupConfigured: Boolean(settings?.backupFolder),
      pinConfigured: Boolean(settings?.pinConfigured),
    };
  }

  completeSetup(input: BusinessSettingsInput): BusinessSettingsRecord {
    this.validate(input);
    const existingReceipts = this.connection.prepare("SELECT COUNT(*) AS count FROM receipts").get() as unknown as { count: number };
    const now = new Date().toISOString();
    const logoPath = input.logoPath ? this.copyBrandAsset(input.logoPath, "logo") : null;
    const signaturePath = input.signaturePath ? this.copyBrandAsset(input.signaturePath, "signature") : null;
    const pin = input.pin ? hashPin(input.pin) : { salt: null, hash: null };

    this.connection.transaction(() => {
      if (existingReceipts.count === 0) {
        this.connection.prepare(`
          INSERT INTO receipt_sequences(sequence_key, next_number, last_issued_number, updated_at)
          VALUES ('receipt', ?, ?, ?)
          ON CONFLICT(sequence_key) DO UPDATE SET next_number = excluded.next_number, last_issued_number = excluded.last_issued_number, updated_at = excluded.updated_at
        `).run(input.firstReceiptNumber, input.firstReceiptNumber - 1, now);
      }
      this.repository.updateSetup({
        ...input,
        phone: clean(input.phone), email: clean(input.email), address: clean(input.address), slogan: clean(input.slogan),
        logoPath, signaturePath, pinSalt: pin.salt, pinHash: pin.hash,
      });
      this.connection.prepare(`
        INSERT INTO audit_log(id,event_type,entity_type,entity_id,event_data_json,previous_hash,entry_hash,created_at)
        VALUES (lower(hex(randomblob(16))),'SETUP_COMPLETED','business_settings','primary',?,NULL,lower(hex(randomblob(32))),?)
      `).run(JSON.stringify({ businessName: input.businessName, firstReceiptNumber: input.firstReceiptNumber, pinConfigured: Boolean(input.pin) }), now);
    });
    const updated = this.repository.get();
    if (!updated) throw new Error("BUSINESS_SETTINGS_MISSING");
    return updated;
  }

  verifyPin(pin: string): boolean {
    const raw = this.repository.getPinCredentials();
    if (!raw?.pinHash || !raw.pinSalt) return true;
    const candidate = Buffer.from(hashPin(pin, raw.pinSalt).hash, "hex");
    const expected = Buffer.from(raw.pinHash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  }

  private validate(input: BusinessSettingsInput): void {
    if (input.businessName.trim().length < 2 || input.businessName.length > 150) throw new Error("INVALID_INPUT");
    if (input.ownerName.trim().length < 2 || input.ownerName.length > 150) throw new Error("INVALID_INPUT");
    if (!/^\d{5,12}$/.test(input.businessNumber.trim())) throw new Error("INVALID_INPUT");
    if (!Number.isInteger(input.firstReceiptNumber) || input.firstReceiptNumber < 1) throw new Error("INVALID_INPUT");
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error("INVALID_INPUT");
    if (input.pin && !/^\d{4,8}$/.test(input.pin)) throw new Error("INVALID_INPUT");
    if (!/^#[0-9a-fA-F]{6}$/.test(input.brandColor ?? "#4F46E5")) throw new Error("INVALID_INPUT");
  }

  private copyBrandAsset(source: string, name: string): string {
    if (!fs.existsSync(source)) throw new Error("INVALID_INPUT");
    const ext = path.extname(source).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) throw new Error("INVALID_INPUT");
    const stat = fs.statSync(source);
    if (stat.size > 5 * 1024 * 1024) throw new Error("INVALID_INPUT");
    fs.mkdirSync(this.brandingFolder, { recursive: true });
    const destination = path.join(this.brandingFolder, `${name}${ext}`);
    fs.copyFileSync(source, destination);
    return destination;
  }
}
