import type { Migration } from "../types";

export const onboardingSettingsMigration: Migration = {
  version: 4,
  name: "onboarding_settings",
  checksum: "sha256:mk-onboarding-settings-v4",
  up(sql) {
    sql(`ALTER TABLE business_settings ADD COLUMN logo_path TEXT`);
    sql(`ALTER TABLE business_settings ADD COLUMN signature_path TEXT`);
    sql(`ALTER TABLE business_settings ADD COLUMN brand_color TEXT NOT NULL DEFAULT '#4F46E5'`);
    sql(`ALTER TABLE business_settings ADD COLUMN backup_folder TEXT`);
    sql(`ALTER TABLE business_settings ADD COLUMN google_drive_folder TEXT`);
    sql(`ALTER TABLE business_settings ADD COLUMN pin_salt TEXT`);
    sql(`ALTER TABLE business_settings ADD COLUMN pin_hash TEXT`);
    sql(`ALTER TABLE business_settings ADD COLUMN auto_lock_minutes INTEGER NOT NULL DEFAULT 0 CHECK (auto_lock_minutes IN (0,5,10,15,30))`);
  },
  verify(tableExists) {
    if (!tableExists("business_settings")) throw new Error("Migration verification failed: missing table business_settings");
  },
};
