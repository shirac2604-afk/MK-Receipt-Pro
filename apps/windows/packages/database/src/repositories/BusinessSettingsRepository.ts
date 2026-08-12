import { randomUUID } from "node:crypto";
import type { DatabaseConnection } from "../DatabaseConnection";
import type { BusinessSettingsInput, BusinessSettingsRecord } from "../types";

interface BusinessSettingsRow {
  id: string; business_name: string; owner_name: string; business_number: string; tax_status: string;
  phone: string | null; email: string | null; address: string | null; slogan: string | null;
  setup_completed: number; logo_path: string | null; signature_path: string | null; brand_color: string;
  backup_folder: string | null; google_drive_folder: string | null; pin_salt: string | null; pin_hash: string | null;
  auto_lock_minutes: 0 | 5 | 10 | 15 | 30; created_at: string; updated_at: string;
}

export type SetupPersistenceInput = Omit<BusinessSettingsInput, "phone" | "email" | "address" | "slogan" | "logoPath" | "signaturePath" | "pin"> & {
  phone: string | null; email: string | null; address: string | null; slogan: string | null;
  logoPath: string | null; signaturePath: string | null; pinSalt: string | null; pinHash: string | null;
};

export class BusinessSettingsRepository {
  constructor(private readonly connection: DatabaseConnection) {}

  get(): BusinessSettingsRecord | null {
    const row = this.connection.prepare("SELECT * FROM business_settings LIMIT 1").get() as unknown as BusinessSettingsRow | undefined;
    return row ? this.map(row) : null;
  }

  getPinCredentials(): { pinSalt: string | null; pinHash: string | null } | null {
    const row = this.connection.prepare("SELECT pin_salt, pin_hash FROM business_settings LIMIT 1").get() as unknown as { pin_salt: string | null; pin_hash: string | null } | undefined;
    return row ? { pinSalt: row.pin_salt, pinHash: row.pin_hash } : null;
  }

  createFoundationDefaults(): BusinessSettingsRecord {
    const existing = this.get(); if (existing) return existing;
    const now = new Date().toISOString();
    this.connection.prepare(`
      INSERT INTO business_settings(
        id,business_name,owner_name,business_number,tax_status,phone,email,address,slogan,setup_completed,
        logo_path,signature_path,brand_color,backup_folder,google_drive_folder,pin_salt,pin_hash,auto_lock_minutes,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(randomUUID(),"מפתחות להצלחה","כהן שירה","039375365","עוסק פטור","052-5275122","shirac2604@gmail.com","נחל דליות 39, דירה 6, באר שבע 8486275","ללמוד • לגדול • להצליח",0,null,null,"#4F46E5",null,null,null,null,0,now,now);
    const created=this.get(); if(!created) throw new Error("BUSINESS_SETTINGS_MISSING"); return created;
  }

  updateSetup(input: SetupPersistenceInput): void {
    this.connection.prepare(`
      UPDATE business_settings SET
        business_name=?, owner_name=?, business_number=?, tax_status=?, phone=?, email=?, address=?, slogan=?,
        logo_path=?, signature_path=?, brand_color=?, backup_folder=?, google_drive_folder=?, pin_salt=?, pin_hash=?,
        auto_lock_minutes=?, setup_completed=1, updated_at=?
      WHERE id=(SELECT id FROM business_settings LIMIT 1)
    `).run(
      input.businessName.trim(), input.ownerName.trim(), input.businessNumber.trim(), input.taxStatus,
      input.phone, input.email, input.address, input.slogan, input.logoPath, input.signaturePath,
      input.brandColor ?? "#4F46E5", input.backupFolder?.trim() || null, input.googleDriveFolder?.trim() || null,
      input.pinSalt, input.pinHash, input.autoLockMinutes, new Date().toISOString(),
    );
  }

  private map(row: BusinessSettingsRow): BusinessSettingsRecord {
    return {
      id: row.id, businessName: row.business_name, ownerName: row.owner_name, businessNumber: row.business_number,
      taxStatus: row.tax_status, phone: row.phone, email: row.email, address: row.address, slogan: row.slogan,
      setupCompleted: row.setup_completed === 1, logoPath: row.logo_path, signaturePath: row.signature_path,
      brandColor: row.brand_color, backupFolder: row.backup_folder, googleDriveFolder: row.google_drive_folder,
      pinConfigured: Boolean(row.pin_hash), autoLockMinutes: row.auto_lock_minutes, createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}
