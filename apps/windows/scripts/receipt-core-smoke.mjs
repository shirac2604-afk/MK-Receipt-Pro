import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys=ON");
db.exec(`CREATE TABLE receipt_sequences(sequence_key TEXT PRIMARY KEY,next_number INTEGER NOT NULL,last_issued_number INTEGER NOT NULL,updated_at TEXT NOT NULL) STRICT`);
db.exec(`CREATE TABLE receipts(id TEXT PRIMARY KEY,receipt_number INTEGER NOT NULL UNIQUE,amount_agorot INTEGER NOT NULL CHECK(amount_agorot>0),content_hash TEXT NOT NULL) STRICT`);
db.prepare("INSERT INTO receipt_sequences VALUES('receipt',1001,1000,?)").run(new Date().toISOString());
function issue() {
  db.exec("BEGIN IMMEDIATE");
  try {
    const seq=db.prepare("SELECT next_number FROM receipt_sequences WHERE sequence_key='receipt'").get();
    const n=Number(seq.next_number); const hash=crypto.createHash('sha256').update(String(n)).digest('hex');
    db.prepare("INSERT INTO receipts VALUES(?,?,?,?)").run(crypto.randomUUID(),n,18000,hash);
    db.prepare("UPDATE receipt_sequences SET last_issued_number=?,next_number=?,updated_at=? WHERE sequence_key='receipt'").run(n,n+1,new Date().toISOString());
    db.exec("COMMIT"); return n;
  } catch(e) { db.exec("ROLLBACK"); throw e; }
}
const a=issue(), b=issue();
if (a!==1001 || b!==1002) throw new Error("Atomic numbering failed");
const count=db.prepare("SELECT COUNT(*) c FROM receipts").get();
if (Number(count.c)!==2) throw new Error("Receipt insert failed");
const seq=db.prepare("SELECT next_number,last_issued_number FROM receipt_sequences").get();
if (Number(seq.next_number)!==1003 || Number(seq.last_issued_number)!==1002) throw new Error("Sequence progression failed");
console.log("✓ Receipt Core smoke passed: 1001, 1002, next 1003");
db.close();
