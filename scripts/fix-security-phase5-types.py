from pathlib import Path

p = Path(__file__).resolve().parents[1] / "apps/windows/apps/desktop/electron/ipc/databaseHandlers.ts"
s = p.read_text(encoding="utf-8")
s = s.replace(
    'const secured={...parsed,logoPath:safeLogoPath};',
    'const secured={...parsed,...(safeLogoPath?{logoPath:safeLogoPath}:{})};',
)
s = s.replace(
    'notes:typeof input?.notes==="string"?input.notes:undefined,attachmentSourcePath};',
    'notes:typeof input?.notes==="string"?input.notes:undefined,...(attachmentSourcePath?{attachmentSourcePath}:{})};',
)
s = s.replace(
    'notes:typeof input?.notes==="string"?input.notes:undefined,attachmentSourcePath,removeAttachment:Boolean(input?.removeAttachment)};',
    'notes:typeof input?.notes==="string"?input.notes:undefined,...(attachmentSourcePath?{attachmentSourcePath}:{}),removeAttachment:Boolean(input?.removeAttachment)};',
)
p.write_text(s, encoding="utf-8")
print("Phase 5 exact optional types fixed")
