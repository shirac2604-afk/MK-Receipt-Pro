import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const checks = [
  ['Database smoke', 'scripts/database-smoke.mjs'],
  ['Receipt core smoke', 'scripts/receipt-core-smoke.mjs'],
  ['History smoke', 'scripts/history-smoke.mjs'],
  ['Reports smoke', 'scripts/reports-smoke.mjs'],
  ['Backups smoke', 'scripts/backups-smoke.mjs'],
  ['Failure tests', 'scripts/failure-tests.mjs'],
  ['Tax Open fixture + preflight', 'scripts/tax-open-simulator-fixture.mjs'],
  ['Tax Open preflight', 'scripts/tax-open-preflight.mjs'],
  ['Tax Open field audit', 'scripts/tax-open-field-audit.mjs'],
  ['Tax Open record profile', 'scripts/tax-open-record-profile-smoke.mjs'],
  ['Tax Open headers', 'scripts/tax-open-header-audit.mjs'],
  ['Tax Open byte audit', 'scripts/tax-open-byte-audit.mjs'],
  ['Tax Open summary audit', 'scripts/tax-open-summary-audit.mjs'],
  ['Tax Open paths', 'scripts/tax-open-path-smoke.mjs'],
  ['Tax Open archive', 'scripts/tax-open-archive-smoke.mjs'],
  ['Tax Report 2.6', 'scripts/tax-report-26-smoke.mjs'],
  ['Tax Report 5.4', 'scripts/tax-report-54-smoke.mjs'],
];

const results = [];
for (const [name, script] of checks) {
  if (!existsSync(script)) {
    results.push({ name, status: 'failed', reason: `Missing ${script}` });
    continue;
  }
  const run = spawnSync(process.execPath, [script], { encoding: 'utf8', timeout: 120000 });
  results.push({
    name,
    status: run.status === 0 ? 'passed' : 'failed',
    exitCode: run.status,
    stdout: (run.stdout || '').slice(-4000),
    stderr: (run.stderr || '').slice(-4000),
  });
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const blockers = results.filter((r) => r.status !== 'passed');
const report = {
  product: 'מפתחות להצלחה',
  version: packageJson.version,
  generatedAt: new Date().toISOString(),
  featureFreeze: true,
  automatedChecks: results.length,
  passed: results.length - blockers.length,
  failed: blockers.length,
  windowsManualValidationRequired: true,
  officialTaxSimulatorRequired: true,
  releaseDecision: blockers.length === 0 ? 'READY_FOR_WINDOWS_RC_TESTING' : 'BLOCKED',
  results,
};
mkdirSync('test-output/rc-candidate', { recursive: true });
writeFileSync('test-output/rc-candidate/RC-CANDIDATE-VALIDATION.json', JSON.stringify(report, null, 2));
console.log(`RC candidate validation: ${report.passed}/${report.automatedChecks} passed`);
console.log(`Decision: ${report.releaseDecision}`);
if (blockers.length) process.exit(1);
