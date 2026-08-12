import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { migrations } from "./migrations";
import type { DatabaseHealthReport, Migration } from "./types";

interface MigrationRow {
  version: number;
  migration_name: string;
  checksum: string;
}

interface CountRow { count: number }
interface ValueRow { value: string | number }

export class DatabaseConnection {
  private readonly database: DatabaseSync;

  constructor(public readonly databasePath: string) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.configure();
  }

  private configure(): void {
    this.database.exec("PRAGMA foreign_keys = ON");
    this.database.exec("PRAGMA journal_mode = WAL");
    this.database.exec("PRAGMA synchronous = FULL");
    this.database.exec("PRAGMA busy_timeout = 5000");
  }

  migrate(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        migration_name TEXT NOT NULL,
        applied_at TEXT NOT NULL,
        checksum TEXT NOT NULL
      ) STRICT
    `);

    const appliedRows = this.database
      .prepare("SELECT version, migration_name, checksum FROM schema_migrations ORDER BY version")
      .all() as unknown as MigrationRow[];
    const appliedByVersion = new Map(appliedRows.map((row) => [row.version, row]));

    for (const migration of migrations) {
      const applied = appliedByVersion.get(migration.version);
      if (applied) {
        if (applied.checksum !== migration.checksum) {
          throw new Error(`Migration checksum mismatch for version ${migration.version}`);
        }
        continue;
      }
      this.applyMigration(migration);
    }
  }

  private applyMigration(migration: Migration): void {
    this.transaction(() => {
      migration.up((statement) => this.database.exec(statement));
      migration.verify((tableName) => this.tableExists(tableName));
      this.database.prepare(`
        INSERT INTO schema_migrations(version, migration_name, applied_at, checksum)
        VALUES (?, ?, ?, ?)
      `).run(migration.version, migration.name, new Date().toISOString(), migration.checksum);
    });
  }

  transaction<T>(operation: () => T): T {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  exec(statement: string): void {
    this.database.exec(statement);
  }

  prepare(statement: string): ReturnType<DatabaseSync["prepare"]> {
    return this.database.prepare(statement);
  }

  tableExists(tableName: string): boolean {
    const row = this.database.prepare(`
      SELECT COUNT(*) AS count
      FROM sqlite_master
      WHERE type = 'table' AND name = ?
    `).get(tableName) as unknown as CountRow;
    return row.count === 1;
  }

  createSnapshot(targetPath: string): void {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.rmSync(targetPath, { force: true });
    this.database.exec("PRAGMA wal_checkpoint(FULL)");
    const escaped = targetPath.replaceAll("'", "''");
    this.database.exec(`VACUUM INTO '${escaped}'`);
    const snapshot = new DatabaseSync(targetPath);
    const result = snapshot.prepare("PRAGMA integrity_check").get() as unknown as Record<string,string>;
    snapshot.close();
    if (Object.values(result)[0] !== "ok") throw new Error("BACKUP_DATABASE_SNAPSHOT_FAILED");
  }

  healthCheck(): DatabaseHealthReport {
    const integrity = this.database.prepare("PRAGMA integrity_check").get() as unknown as Record<string, string>;
    const foreignKeys = this.database.prepare("PRAGMA foreign_keys").get() as unknown as Record<string, number>;
    const journalMode = this.database.prepare("PRAGMA journal_mode").get() as unknown as Record<string, string>;
    const tableCount = this.database.prepare(`
      SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `).get() as unknown as CountRow;
    const migrationCount = this.database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get() as unknown as CountRow;
    const schemaVersionRow = this.database.prepare("SELECT COALESCE(MAX(version), 0) AS value FROM schema_migrations").get() as unknown as ValueRow;

    const integrityValue = Object.values(integrity)[0] ?? "unknown";
    const foreignKeysValue = Object.values(foreignKeys)[0] === 1;
    const journalModeValue = String(Object.values(journalMode)[0] ?? "unknown");
    const healthy = integrityValue === "ok" && foreignKeysValue && journalModeValue.toLowerCase() === "wal";

    return {
      status: healthy ? "healthy" : "critical",
      databasePath: this.databasePath,
      schemaVersion: Number(schemaVersionRow.value),
      sqliteIntegrity: integrityValue,
      foreignKeysEnabled: foreignKeysValue,
      journalMode: journalModeValue,
      tableCount: tableCount.count,
      appliedMigrations: migrationCount.count,
      checkedAt: new Date().toISOString(),
    };
  }

  close(): void {
    this.database.close();
  }
}
