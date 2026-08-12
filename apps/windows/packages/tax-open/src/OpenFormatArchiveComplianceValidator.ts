import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";

export interface ArchiveAuditIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
}

export interface ArchiveEntryAudit {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  crc32: string;
  sha256: string;
}

export interface OpenFormatArchiveAuditResult {
  valid: boolean;
  archiveFileName: string;
  archiveSize: number;
  archiveSha256: string;
  expectedCompressionName: string;
  iniCompressionName: string;
  entryCount: number;
  entries: ArchiveEntryAudit[];
  dataMatchesSource: boolean;
  issues: ArchiveAuditIssue[];
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const hash = (data: Buffer) => createHash("sha256").update(data).digest("hex");

interface ParsedEntry { name:string; method:number; compressedSize:number; uncompressedSize:number; expectedCrc:number; data:Buffer; }

function parseZip(buffer: Buffer): ParsedEntry[] {
  const endSignature = 0x06054b50;
  let endOffset = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i -= 1) {
    if (buffer.readUInt32LE(i) === endSignature) { endOffset = i; break; }
  }
  if (endOffset < 0) throw new Error("ZIP_END_RECORD_MISSING");
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const centralOffset = buffer.readUInt32LE(endOffset + 16);
  const entries: ParsedEntry[] = [];
  let cursor = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error("ZIP_CENTRAL_HEADER_INVALID");
    const method = buffer.readUInt16LE(cursor + 10);
    const expectedCrc = buffer.readUInt32LE(cursor + 16);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("ZIP_LOCAL_HEADER_INVALID");
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const payloadStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(payloadStart, payloadStart + compressedSize);
    let data: Buffer;
    if (method === 0) data = Buffer.from(compressed);
    else if (method === 8) data = inflateRawSync(compressed);
    else throw new Error(`ZIP_UNSUPPORTED_COMPRESSION_${method}`);
    entries.push({ name, method, compressedSize, uncompressedSize, expectedCrc, data });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

export function auditOpenFormatArchive(input: {
  archivePath: string;
  sourceData: Buffer;
  iniCompressionName: string;
}): OpenFormatArchiveAuditResult {
  const issues: ArchiveAuditIssue[] = [];
  const error = (code:string,message:string) => issues.push({severity:"error",code,message});
  const warning = (code:string,message:string) => issues.push({severity:"warning",code,message});
  const archive = fs.readFileSync(input.archivePath);
  let parsed: ParsedEntry[] = [];
  try { parsed = parseZip(archive); }
  catch (cause) { error("ARCHIVE_PARSE_FAILED", cause instanceof Error ? cause.message : "לא ניתן לקרוא את הארכיב."); }

  const archiveFileName = path.basename(input.archivePath);
  if (archiveFileName !== "BKMVDATA.TXT") error("ARCHIVE_FILE_NAME", `שם הארכיב הוא ${archiveFileName} במקום BKMVDATA.TXT.`);
  if (input.iniCompressionName.trim().toUpperCase() !== "ZIP") error("INI_COMPRESSION_NAME", "שדה תוכנת הכיווץ ב-INI.TXT חייב להיות ZIP עבור BKMVDATA.TXT.");
  if (parsed.length !== 1) error("ARCHIVE_ENTRY_COUNT", `הארכיב מכיל ${parsed.length} פריטים במקום פריט אחד.`);
  const entry = parsed[0];
  if (entry && entry.name !== "BKMVDATA.TXT") error("ARCHIVE_ENTRY_NAME", `שם הפריט בארכיב הוא ${entry.name} במקום BKMVDATA.TXT.`);
  if (entry && (entry.name.includes("/") || entry.name.includes("\\"))) error("ARCHIVE_NESTED_PATH", "BKMVDATA.TXT נמצא בתיקיית משנה בתוך הארכיב.");
  if (entry && ![0,8].includes(entry.method)) error("ARCHIVE_COMPRESSION_METHOD", `שיטת הכיווץ ${entry.method} אינה נתמכת.`);
  if (entry && entry.data.length !== entry.uncompressedSize) error("ARCHIVE_SIZE", "גודל הפריט לאחר פתיחה אינו תואם לכותרת ZIP.");
  if (entry && crc32(entry.data) !== entry.expectedCrc) error("ARCHIVE_CRC", "בדיקת CRC של BKMVDATA.TXT נכשלה.");
  const dataMatchesSource = Boolean(entry && entry.data.equals(input.sourceData));
  if (entry && !dataMatchesSource) error("ARCHIVE_CONTENT_MISMATCH", "תוכן BKMVDATA.TXT בארכיב אינו זהה לקובץ שנבדק לפני הכיווץ.");
  if (archive.length > 4 * 1024 * 1024) warning("ARCHIVE_OVER_SIMULATOR_LIMIT", "גודל הארכיב גדול מ-4MB ויש לבדוק את מגבלת הסימולטור לפני העלאה.");

  return {
    valid: !issues.some(item=>item.severity==="error"),
    archiveFileName,
    archiveSize: archive.length,
    archiveSha256: hash(archive),
    expectedCompressionName: "ZIP",
    iniCompressionName: input.iniCompressionName.trim(),
    entryCount: parsed.length,
    entries: parsed.map(item=>({name:item.name,compressionMethod:item.method,compressedSize:item.compressedSize,uncompressedSize:item.uncompressedSize,crc32:item.expectedCrc.toString(16).padStart(8,"0"),sha256:hash(item.data)})),
    dataMatchesSource,
    issues,
  };
}
