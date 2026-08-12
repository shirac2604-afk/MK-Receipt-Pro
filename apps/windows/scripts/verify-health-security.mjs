import fs from 'node:fs';
const required=['packages/application/src/HealthService.ts','packages/database/src/migrations/007_health_security.ts'];
for(const f of required)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const ui=fs.readFileSync('apps/desktop/renderer/src/main.tsx','utf8');
if(!ui.includes('יומן תקלות'))throw new Error('Missing separate error log view');
console.log('✓ Health Center and separate Error Log structure exist');
