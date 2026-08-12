import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseConnection } from "../../packages/database/src/DatabaseConnection";
import { BusinessSettingsRepository } from "../../packages/database/src/repositories/BusinessSettingsRepository";

const temporaryDirectories: string[] = [];

function createDatabase(): DatabaseConnection {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mk-receipt-db-"));
  temporaryDirectories.push(directory);
  const connection = new DatabaseConnection(path.join(directory, "test.sqlite"));
  connection.migrate();
  return connection;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe("Database Foundation", () => {
  it("applies the initial migration and passes health check", () => {
    const connection = createDatabase();
    const report = connection.healthCheck();
    expect(report.status).toBe("healthy");
    expect(report.schemaVersion).toBe(1);
    expect(report.appliedMigrations).toBe(1);
    expect(report.foreignKeysEnabled).toBe(true);
    connection.close();
  });

  it("rolls back a failed transaction", () => {
    const connection = createDatabase();
    expect(() => connection.transaction(() => {
      connection.prepare("INSERT INTO app_settings(setting_key, setting_value, updated_at) VALUES (?, ?, ?)")
        .run("theme", "dark", new Date().toISOString());
      throw new Error("intentional failure");
    })).toThrow("intentional failure");
    const row = connection.prepare("SELECT COUNT(*) AS count FROM app_settings").get() as unknown as { count: number };
    expect(row.count).toBe(0);
    connection.close();
  });

  it("creates foundation business settings only once", () => {
    const connection = createDatabase();
    const repository = new BusinessSettingsRepository(connection);
    const first = repository.createFoundationDefaults();
    const second = repository.createFoundationDefaults();
    expect(second.id).toBe(first.id);
    expect(second.businessName).toBe("מפתחות להצלחה");
    connection.close();
  });
});
