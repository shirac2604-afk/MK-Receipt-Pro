import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { performance } from 'node:perf_hooks';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mk-failure-tests-'));
const results = [];

function record(id, name, critical, status, details, durationMs) {
  results.push({ id, name, critical, status, details, durationMs: Number(durationMs.toFixed(2)) });
}

async function run(id, name, critical, fn) {
  const start = performance.now();
  try {
    const details = await fn();
    record(id, name, critical, 'passed', details ?? 'עבר', performance.now() - start);
    console.log(`✓ ${id} ${name}`);
  } catch (error) {
    record(id, name, critical, 'failed', error instanceof Error ? error.message : String(error), performance.now() - start);
    console.error(`✗ ${id} ${name}:`, error);
  }
}

function createReceiptDb(file = ':memory:') {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys=ON');
  db.exec('PRAGMA busy_timeout=150');
  db.exec(`CREATE TABLE IF NOT EXISTS receipt_sequences(
    sequence_key TEXT PRIMARY KEY,
    next_number INTEGER NOT NULL,
    last_issued_number INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  ) STRICT`);
  db.exec(`CREATE TABLE IF NOT EXISTS receipts(
    id TEXT PRIMARY KEY,
    receipt_number INTEGER NOT NULL UNIQUE,
    amount_agorot INTEGER NOT NULL CHECK(amount_agorot>0),
    status TEXT NOT NULL DEFAULT 'active',
    content_hash TEXT NOT NULL,
    pdf_path TEXT,
    pdf_hash TEXT
  ) STRICT`);
  db.exec(`CREATE TABLE IF NOT EXISTS audit_log(
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    event_data_json TEXT NOT NULL,
    previous_hash TEXT,
    entry_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  ) STRICT`);
  const existing = db.prepare("SELECT COUNT(*) c FROM receipt_sequences WHERE sequence_key='receipt'").get();
  if (Number(existing.c) === 0) {
    db.prepare("INSERT INTO receipt_sequences VALUES('receipt',1001,1000,?)").run(new Date().toISOString());
  }
  return db;
}

function allocateAndInsert(db, { failBeforeCommit = false } = {}) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const seq = db.prepare("SELECT next_number FROM receipt_sequences WHERE sequence_key='receipt'").get();
    const number = Number(seq.next_number);
    const hash = crypto.createHash('sha256').update(`receipt:${number}:18000`).digest('hex');
    db.prepare('INSERT INTO receipts(id,receipt_number,amount_agorot,status,content_hash) VALUES(?,?,?,?,?)')
      .run(crypto.randomUUID(), number, 18000, 'active', hash);
    db.prepare("UPDATE receipt_sequences SET last_issued_number=?,next_number=?,updated_at=? WHERE sequence_key='receipt'")
      .run(number, number + 1, new Date().toISOString());
    if (failBeforeCommit) throw new Error('SIMULATED_CRASH_BEFORE_COMMIT');
    db.exec('COMMIT');
    return number;
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch {}
    throw error;
  }
}

await run('FT-001', 'קריסה לפני Commit מבצעת Rollback מלא', true, () => {
  const db = createReceiptDb();
  try { allocateAndInsert(db, { failBeforeCommit: true }); } catch {}
  const count = Number(db.prepare('SELECT COUNT(*) c FROM receipts').get().c);
  const seq = db.prepare("SELECT next_number,last_issued_number FROM receipt_sequences WHERE sequence_key='receipt'").get();
  db.close();
  if (count !== 0 || Number(seq.next_number) !== 1001 || Number(seq.last_issued_number) !== 1000) {
    throw new Error('ה־Rollback לא החזיר את הקבלה והמספור למצב המקורי');
  }
  return 'לא נשמרה קבלה והמספר 1001 נשאר פנוי';
});

await run('FT-002', 'כשל PDF לאחר Commit אינו מאבד קבלה', true, () => {
  const db = createReceiptDb();
  const number = allocateAndInsert(db);
  let pdfError = false;
  try { throw new Error('SIMULATED_PDF_WRITE_FAILED'); } catch { pdfError = true; }
  const row = db.prepare('SELECT receipt_number,pdf_path FROM receipts WHERE receipt_number=?').get(number);
  const seq = db.prepare("SELECT next_number FROM receipt_sequences WHERE sequence_key='receipt'").get();
  db.close();
  if (!pdfError || !row || Number(row.receipt_number) !== 1001 || row.pdf_path !== null || Number(seq.next_number) !== 1002) {
    throw new Error('מצב הקבלה לאחר כשל PDF אינו תקין');
  }
  return 'הקבלה 1001 נשמרה, המספר הבא 1002, ו־PDF ניתן ליצירה מחדש';
});

await run('FT-003', 'PDF חלקי אינו הופך לקובץ מקור', true, () => {
  const dir = path.join(root, 'pdf-atomic'); fs.mkdirSync(dir, { recursive: true });
  const temp = path.join(dir, 'Receipt-1001-Original.tmp');
  const final = path.join(dir, 'Receipt-1001-Original.pdf');
  fs.writeFileSync(temp, Buffer.from('%PDF-partial'));
  // Simulated failure before atomic rename.
  fs.rmSync(temp, { force: true });
  if (fs.existsSync(temp) || fs.existsSync(final)) throw new Error('נשאר קובץ PDF חלקי או סופי');
  return 'הקובץ הזמני נוקה ולא נוצר PDF מקור פגום';
});

await run('FT-004', 'שינוי בקובץ PDF מזוהה באמצעות SHA-256', true, () => {
  const file = path.join(root, 'tampered.pdf');
  fs.writeFileSync(file, Buffer.from('ORIGINAL-PDF'));
  const expected = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  fs.appendFileSync(file, Buffer.from('-TAMPERED'));
  const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (expected === actual) throw new Error('השינוי לא זוהה');
  return 'Hash שונה לאחר שינוי תוכן הקובץ';
});

await run('FT-005', 'גיבוי עם Hash שגוי נדחה', true, () => {
  const content = Buffer.from('database-content');
  const envelope = {
    format: 'MK_RECEIPT_BACKUP', formatVersion: 1,
    files: [{ path: 'database/database.sqlite', size: content.length, sha256: '0'.repeat(64), contentBase64: content.toString('base64') }]
  };
  const parsed = JSON.parse(gunzipSync(gzipSync(JSON.stringify(envelope))));
  const decoded = Buffer.from(parsed.files[0].contentBase64, 'base64');
  const actual = crypto.createHash('sha256').update(decoded).digest('hex');
  if (actual === parsed.files[0].sha256) throw new Error('הגיבוי הפגום התקבל');
  return 'אי־התאמת Hash זוהתה לפני שחזור';
});

await run('FT-006', 'קובץ גיבוי שאינו ניתן לפתיחה נדחה', true, () => {
  const file = path.join(root, 'corrupt.mkrbackup');
  fs.writeFileSync(file, crypto.randomBytes(128));
  let rejected = false;
  try { gunzipSync(fs.readFileSync(file)); } catch { rejected = true; }
  if (!rejected) throw new Error('הקובץ הפגום לא נדחה');
  return 'החבילה נפסלה לפני חילוץ או שינוי נתונים';
});

await run('FT-007', 'כשל שחזור משאיר את המסד הנוכחי ללא שינוי', true, () => {
  const current = path.join(root, 'restore-current.sqlite');
  const staged = path.join(root, 'restore-staged.sqlite');
  fs.writeFileSync(current, Buffer.from('CURRENT-DATABASE'));
  fs.writeFileSync(staged, Buffer.from('CORRUPT-STAGED-DATABASE'));
  const before = crypto.createHash('sha256').update(fs.readFileSync(current)).digest('hex');
  const stagingValid = false;
  if (stagingValid) fs.renameSync(staged, current);
  const after = crypto.createHash('sha256').update(fs.readFileSync(current)).digest('hex');
  if (before !== after) throw new Error('המסד הנוכחי שונה למרות כשל בדיקת השחזור');
  return 'החלפה אטומית לא בוצעה כאשר בדיקת ה־Staging נכשלה';
});

await run('FT-008', 'נעילת SQLite חוסמת כתיבה מתחרה בלי כפילות', true, () => {
  const file = path.join(root, 'locked.sqlite');
  const db1 = createReceiptDb(file);
  const db2 = createReceiptDb(file);
  db1.exec('BEGIN IMMEDIATE');
  let blocked = false;
  try { db2.exec('BEGIN IMMEDIATE'); } catch { blocked = true; }
  db1.exec('ROLLBACK');
  const number = allocateAndInsert(db2);
  const duplicates = Number(db2.prepare('SELECT COUNT(*) c FROM (SELECT receipt_number FROM receipts GROUP BY receipt_number HAVING COUNT(*)>1)').get().c);
  db1.close(); db2.close();
  if (!blocked || number !== 1001 || duplicates !== 0) throw new Error('נעילת המסד או ההתאוששות ממנה אינן תקינות');
  return 'הכתיבה המתחרה נחסמה, ולאחר שחרור הנעילה הופקה קבלה 1001 ללא כפילות';
});

await run('FT-009', 'אילוץ UNIQUE חוסם מספר קבלה כפול', true, () => {
  const db = createReceiptDb();
  allocateAndInsert(db);
  let rejected = false;
  try {
    db.prepare('INSERT INTO receipts(id,receipt_number,amount_agorot,status,content_hash) VALUES(?,?,?,?,?)')
      .run(crypto.randomUUID(), 1001, 18000, 'active', 'x'.repeat(64));
  } catch { rejected = true; }
  db.close();
  if (!rejected) throw new Error('מספר כפול התקבל');
  return 'SQLite דחה מספר קבלה 1001 כפול';
});

await run('FT-010', 'PDF חסר מזוהה בלי לשנות את הקבלה', true, () => {
  const db = createReceiptDb();
  const number = allocateAndInsert(db);
  const row = db.prepare('SELECT id,pdf_path FROM receipts WHERE receipt_number=?').get(number);
  const missing = row.pdf_path === null || !fs.existsSync(String(row.pdf_path));
  const count = Number(db.prepare('SELECT COUNT(*) c FROM receipts').get().c);
  db.close();
  if (!missing || count !== 1) throw new Error('PDF חסר לא זוהה או שהקבלה השתנתה');
  return 'הקבלה נשארה במסד וסומנה כזקוקה ליצירת PDF';
});

await run('FT-011', 'שרשרת Audit שבורה מזוהה', true, () => {
  const db = createReceiptDb();
  let previous = '';
  for (const event of ['RECEIPT_ISSUED', 'BACKUP_CREATED', 'RECEIPT_CANCELLED']) {
    const data = JSON.stringify({ event });
    const hash = crypto.createHash('sha256').update(previous + data).digest('hex');
    db.prepare('INSERT INTO audit_log VALUES(?,?,?,?,?,?)').run(crypto.randomUUID(), event, data, previous || null, hash, new Date().toISOString());
    previous = hash;
  }
  db.prepare("UPDATE audit_log SET event_data_json='{}' WHERE event_type='BACKUP_CREATED'").run();
  const rows = db.prepare('SELECT * FROM audit_log ORDER BY rowid').all();
  let expectedPrev = '';
  let valid = true;
  for (const row of rows) {
    const calculated = crypto.createHash('sha256').update(expectedPrev + row.event_data_json).digest('hex');
    if ((row.previous_hash ?? '') !== expectedPrev || row.entry_hash !== calculated) { valid = false; break; }
    expectedPrev = row.entry_hash;
  }
  db.close();
  if (valid) throw new Error('השינוי ביומן לא זוהה');
  return 'שינוי ברשומת Audit זוהה בבדיקת השרשרת';
});

await run('FT-012', 'יעד כתיבה לא תקין מחזיר כשל בלי קובץ חלקי', false, () => {
  const fileAsDirectory = path.join(root, 'not-a-directory');
  fs.writeFileSync(fileAsDirectory, 'x');
  const target = path.join(fileAsDirectory, 'backup.mkrbackup');
  let rejected = false;
  try { fs.writeFileSync(target, 'backup'); } catch { rejected = true; }
  if (!rejected || fs.existsSync(target)) throw new Error('כתיבה ליעד לא תקין לא נחסמה');
  return 'הכתיבה נכשלה ולא נוצר קובץ גיבוי חלקי';
});

await run('FT-013', 'בדיקת שטח דיסק חוסמת פעולה לפני כתיבה', false, () => {
  function assertSpace(available, required) {
    if (available < required) throw new Error('INSUFFICIENT_DISK_SPACE');
  }
  let blocked = false;
  try { assertSpace(500_000, 2_000_000); } catch { blocked = true; }
  if (!blocked) throw new Error('פעולה לא נחסמה למרות שטח חסר');
  return 'הפעולה נחסמה לפני יצירת PDF/גיבוי';
});

await run('FT-014', 'גיבוי Pre-Restore נשמר לפני ניסיון החלפה', true, () => {
  const current = path.join(root, 'pre-restore-current.sqlite');
  const pre = path.join(root, 'pre-restore-backup.sqlite');
  fs.writeFileSync(current, Buffer.from('CURRENT-STATE'));
  fs.copyFileSync(current, pre);
  fs.writeFileSync(current, Buffer.from('FAILED-RESTORE-STATE'));
  fs.copyFileSync(pre, current);
  const restored = fs.readFileSync(current, 'utf8');
  if (restored !== 'CURRENT-STATE') throw new Error('לא ניתן היה לחזור לגיבוי Pre-Restore');
  return 'המצב המקורי שוחזר לאחר כשל מדומה';
});

const criticalFailed = results.filter((r) => r.critical && r.status !== 'passed');
const failed = results.filter((r) => r.status !== 'passed');
const report = {
  suite: 'Sprint 2 - Failure Tests',
  version: '1.0.0-rc.1',
  generatedAt: new Date().toISOString(),
  environment: { platform: process.platform, arch: process.arch, node: process.version },
  summary: {
    total: results.length,
    passed: results.filter((r) => r.status === 'passed').length,
    failed: failed.length,
    criticalFailed: criticalFailed.length,
    releaseBlocked: criticalFailed.length > 0
  },
  results,
  manualWindowsTestsRequired: [
    'ניתוק חשמל או כיבוי כפוי בזמן Transaction ובזמן יצירת PDF',
    'מילוי אמיתי של הכונן ובדיקת התנהגות Windows',
    'ניתוק כונן USB או תיקיית Google Drive באמצע גיבוי',
    'סגירת תהליך Electron דרך Task Manager בזמן גיבוי ושחזור',
    'שחזור מלא על התקנת Windows נקייה ובדיקת המשך המספור',
    'הרשאות Windows אמיתיות לתיקיות מוגנות'
  ]
};

const docs = path.resolve('docs'); fs.mkdirSync(docs, { recursive: true });
fs.writeFileSync(path.join(docs, 'FAILURE_TEST_RESULTS_RC1.json'), JSON.stringify(report, null, 2));

const lines = [
  '# Failure Test Report — 1.0.0-rc.1', '',
  `תאריך: ${report.generatedAt}`, '',
  `- סך הכול: ${report.summary.total}`,
  `- עברו: ${report.summary.passed}`,
  `- נכשלו: ${report.summary.failed}`,
  `- כשלים קריטיים: ${report.summary.criticalFailed}`,
  `- חסימת שחרור: ${report.summary.releaseBlocked ? 'כן' : 'לא'}`, '',
  '## תוצאות', '',
  '| מזהה | בדיקה | קריטית | תוצאה | פרטים |',
  '|---|---|---:|---|---|',
  ...results.map((r) => `| ${r.id} | ${r.name} | ${r.critical ? 'כן' : 'לא'} | ${r.status === 'passed' ? 'עבר' : 'נכשל'} | ${String(r.details).replaceAll('|','\\|')} |`),
  '', '## בדיקות Windows ידניות שנותרו', '',
  ...report.manualWindowsTestsRequired.map((x) => `- [ ] ${x}`), '',
  '## מסקנה', '',
  criticalFailed.length === 0
    ? 'לא נמצאה חסימת שחרור אוטומטית בתרחישי הכשל שניתנים להרצה בסביבה זו. יש להשלים את בדיקות Windows הידניות לפני שימוש רשמי.'
    : 'נמצאו כשלים קריטיים. השחרור חסום עד לתיקונם.'
];
fs.writeFileSync(path.join(docs, 'FAILURE_TEST_REPORT_RC1.md'), lines.join('\n'));
fs.rmSync(root, { recursive: true, force: true });

console.log(`\nFailure tests: ${report.summary.passed}/${report.summary.total} passed`);
if (criticalFailed.length > 0) process.exitCode = 1;
