import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';

const sizes = [1_000, 10_000, 50_000, 100_000];
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mk-stress-'));
const results = { generatedAt: new Date().toISOString(), platform: process.platform, node: process.version, runs: [] };

const ms = (n) => Math.round(n * 100) / 100;
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

function time(fn) {
  const start = performance.now();
  const value = fn();
  return { value, durationMs: performance.now() - start };
}

function setup(db) {
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA synchronous=NORMAL;
    PRAGMA foreign_keys=ON;
    CREATE TABLE receipt_sequences(sequence_key TEXT PRIMARY KEY, next_number INTEGER NOT NULL, last_issued_number INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL) STRICT;
    CREATE TABLE receipts(
      id TEXT PRIMARY KEY,
      receipt_number INTEGER NOT NULL UNIQUE,
      payment_date TEXT NOT NULL,
      issued_at TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_phone TEXT,
      client_email TEXT,
      description TEXT NOT NULL,
      amount_agorot INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      reference_number TEXT,
      status TEXT NOT NULL,
      content_hash TEXT NOT NULL
    ) STRICT;
    CREATE INDEX idx_receipts_date ON receipts(payment_date);
    CREATE INDEX idx_receipts_status ON receipts(status);
    CREATE INDEX idx_receipts_client_name ON receipts(client_name);
    CREATE INDEX idx_receipts_issued_at ON receipts(issued_at);
    INSERT INTO receipt_sequences VALUES('receipt',1001,1000,datetime('now'));
  `);
}

function insertRows(db, count) {
  const insert = db.prepare(`INSERT INTO receipts VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const updateSeq = db.prepare(`UPDATE receipt_sequences SET next_number=?, last_issued_number=?, updated_at=? WHERE sequence_key='receipt'`);
  db.exec('BEGIN IMMEDIATE');
  try {
    for (let i = 0; i < count; i++) {
      const number = 1001 + i;
      const month = String((i % 12) + 1).padStart(2, '0');
      const day = String((i % 28) + 1).padStart(2, '0');
      const date = `2026-${month}-${day}`;
      const clientIndex = i % 5000;
      const status = i % 31 === 0 ? 'cancelled' : 'active';
      const amount = 12_000 + (i % 900) * 50;
      insert.run(
        `r-${number}`, number, date, `${date}T10:00:00.000Z`,
        `לקוח ${clientIndex}`, `05${String(clientIndex).padStart(8,'0').slice(0,8)}`,
        `client${clientIndex}@example.test`, i % 3 === 0 ? 'שיעור עברית' : 'שיעור אנגלית',
        amount, i % 2 === 0 ? 'bit' : 'cash', `REF-${number}`, status,
        sha256(`${number}|${date}|${amount}|${status}`)
      );
    }
    updateSeq.run(1001 + count, 1000 + count, new Date().toISOString());
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function runQueries(db, count) {
  const exact = time(() => db.prepare('SELECT * FROM receipts WHERE receipt_number=?').get(1000 + Math.floor(count / 2)));
  const client = time(() => db.prepare("SELECT COUNT(*) c FROM receipts WHERE client_name LIKE ?").get('%לקוח 1234%'));
  const combined = time(() => db.prepare(`SELECT COUNT(*) c FROM receipts WHERE client_name LIKE ? AND payment_date LIKE ? AND CAST(amount_agorot/100.0 AS TEXT) LIKE ? AND payment_method=?`).get('%לקוח 1234%', '%07%', '%120%', 'bit'));
  const dateRange = time(() => db.prepare(`SELECT COUNT(*) c, COALESCE(SUM(CASE WHEN status='active' THEN amount_agorot ELSE 0 END),0) income FROM receipts WHERE payment_date BETWEEN ? AND ?`).get('2026-01-01','2026-12-31'));
  const annual = time(() => db.prepare(`SELECT substr(payment_date,1,7) month, COUNT(*) count, COALESCE(SUM(CASE WHEN status='active' THEN amount_agorot ELSE 0 END),0) income FROM receipts GROUP BY substr(payment_date,1,7) ORDER BY month`).all());
  const page = time(() => db.prepare(`SELECT receipt_number,client_name,amount_agorot,status FROM receipts ORDER BY receipt_number DESC LIMIT 50 OFFSET ?`).all(Math.max(0,count-50)));
  return {
    exactReceiptMs: ms(exact.durationMs),
    clientSearchMs: ms(client.durationMs),
    combinedSearchMs: ms(combined.durationMs),
    annualRangeMs: ms(dateRange.durationMs),
    monthlyBreakdownMs: ms(annual.durationMs),
    deepPageMs: ms(page.durationMs),
  };
}

for (const count of sizes) {
  const dir = path.join(root, String(count));
  fs.mkdirSync(dir, { recursive: true });
  const dbPath = path.join(dir, 'stress.sqlite');
  const db = new DatabaseSync(dbPath);
  setup(db);
  const insertion = time(() => insertRows(db, count));
  const integrity = time(() => db.prepare('PRAGMA integrity_check').get());
  const sequence = db.prepare("SELECT next_number,last_issued_number FROM receipt_sequences WHERE sequence_key='receipt'").get();
  const duplicates = db.prepare('SELECT COUNT(*) c FROM (SELECT receipt_number FROM receipts GROUP BY receipt_number HAVING COUNT(*)>1)').get();
  const queries = runQueries(db, count);
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  db.close();

  const dbBytes = fs.readFileSync(dbPath);
  const backup = time(() => gzipSync(dbBytes, { level: 6 }));
  const verify = time(() => {
    const restored = gunzipSync(backup.value);
    if (sha256(restored) !== sha256(dbBytes)) throw new Error('backup hash mismatch');
    return restored.length;
  });

  const run = {
    receiptCount: count,
    insertMs: ms(insertion.durationMs),
    insertPerSecond: Math.round(count / (insertion.durationMs / 1000)),
    integrityCheckMs: ms(integrity.durationMs),
    databaseSizeMb: ms(dbBytes.length / 1024 / 1024),
    compressedBackupSizeMb: ms(backup.value.length / 1024 / 1024),
    backupCompressMs: ms(backup.durationMs),
    backupVerifyMs: ms(verify.durationMs),
    nextNumber: sequence.next_number,
    lastIssuedNumber: sequence.last_issued_number,
    duplicateNumbers: duplicates.c,
    ...queries,
  };
  results.runs.push(run);
  console.log(JSON.stringify(run));
}

const output = path.resolve('docs/STRESS_TEST_RESULTS_RC1.json');
fs.writeFileSync(output, JSON.stringify(results, null, 2));
console.log(`Stress results written to ${output}`);
fs.rmSync(root, { recursive: true, force: true });
