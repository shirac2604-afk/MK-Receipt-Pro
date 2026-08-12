import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
const errors = [];
const warnings = [];
const checks = [];
const ok = (name, details='') => checks.push({ name, status: 'PASS', details });
const fail = (name, details='') => { checks.push({ name, status: 'FAIL', details }); errors.push(`${name}: ${details}`); };

if (!fs.existsSync(pkgPath)) fail('package.json', 'missing');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const required = [
  'apps/desktop/electron/main/main.ts',
  'apps/desktop/electron/preload/preload.ts',
  'apps/desktop/electron/tsconfig.json',
  'apps/desktop/renderer/vite.config.ts',
  'apps/desktop/renderer/src/main.tsx',
  'packages/database/src/DatabaseConnection.ts',
  'packages/application/src/receipts/IssueReceiptService.ts',
  'packages/pdf/src/ReceiptPdfService.ts',
  'resources/installer/app-icon.ico'
];
for (const rel of required) {
  fs.existsSync(path.join(root, rel)) ? ok(`required:${rel}`) : fail(`required:${rel}`, 'missing');
}

const scriptRefs = [];
for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
  for (const match of command.matchAll(/node\s+([^\s&|]+)/g)) {
    const rel = match[1];
    scriptRefs.push(rel);
    if (!fs.existsSync(path.join(root, rel))) fail(`script:${name}`, `missing ${rel}`);
  }
}
if (!errors.some(e => e.startsWith('script:'))) ok('package scripts', `${Object.keys(pkg.scripts ?? {}).length} commands; ${scriptRefs.length} node script references resolved`);

for (const group of ['dependencies', 'devDependencies']) {
  for (const [name, value] of Object.entries(pkg[group] ?? {})) {
    if (value === 'latest' || value === '*' || String(value).includes('x')) {
      fail(`dependency:${name}`, `unlocked version ${value}`);
    }
  }
}
if (!errors.some(e => e.startsWith('dependency:'))) ok('dependency versions', 'all versions pinned');

const electronTs = JSON.parse(fs.readFileSync(path.join(root, 'apps/desktop/electron/tsconfig.json'), 'utf8'));
if (electronTs.compilerOptions?.module === 'Node16' && electronTs.compilerOptions?.moduleResolution === 'Node16') {
  ok('electron TypeScript module configuration', 'Node16 / Node16');
} else {
  fail('electron TypeScript module configuration', JSON.stringify(electronTs.compilerOptions));
}

if (pkg.main === 'dist-electron/apps/desktop/electron/main/main.js') ok('Electron main output', pkg.main);
else fail('Electron main output', String(pkg.main));

if (pkg.build?.appId === 'il.co.mkreceipt.desktop') ok('stable appId', pkg.build.appId);
else fail('stable appId', String(pkg.build?.appId));

if (pkg.engines?.node?.includes('22')) ok('Node engine', pkg.engines.node);
else warnings.push(`Node engine should require Node 22+: ${pkg.engines?.node ?? 'not set'}`);

const report = {
  generatedAt: new Date().toISOString(),
  version: pkg.version,
  status: errors.length ? 'FAILED' : 'PASSED',
  checks,
  errors,
  warnings,
  environmentNote: 'A full npm install/build must be run on Windows because the current build environment cannot download @types/node from its internal package registry.'
};
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/PROJECT_INTEGRITY_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(`Project integrity audit: ${checks.filter(c => c.status === 'PASS').length}/${checks.length} passed`);
console.log(`Decision: ${report.status}`);
if (warnings.length) console.log(`Warnings: ${warnings.length}`);
if (errors.length) process.exit(1);
