#!/usr/bin/env node

import { spawn } from 'node:child_process';

const requireDb = process.argv.includes('--require-db');

function runCommand(label, command, args) {
  return new Promise((resolve) => {
    console.log(`\n[release-gate] ${label}`);
    console.log(`[release-gate] > ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    child.on('exit', (code) => {
      resolve(code ?? 1);
    });
  });
}

async function main() {
  const checks = [
    {
      label: 'validate (typecheck + tests)',
      command: 'npm',
      args: ['run', 'validate'],
      required: true
    },
    {
      label: 'policy scenarios',
      command: 'npm',
      args: ['run', 'scenario:test'],
      required: true
    }
  ];

  const results = [];
  const integrationLabel = 'api integration tests (auth/invites/chats/moderation/push/realtime)';

  if (process.env.DATABASE_URL) {
    checks.push({
      label: integrationLabel,
      command: 'npm',
      args: ['--workspace', 'services/api', 'run', 'test:integration'],
      required: true
    });
  } else if (requireDb) {
    console.error('[release-gate] DATABASE_URL is required but missing.');
    process.exit(1);
  } else {
    console.warn('[release-gate] DATABASE_URL not set, skipping integration tests.');
    console.warn('[release-gate] Re-run with DATABASE_URL and --require-db before production release.');
    results.push({
      label: integrationLabel,
      ok: false,
      skipped: true,
      reason: 'DATABASE_URL not set'
    });
  }

  for (const check of checks) {
    const code = await runCommand(check.label, check.command, check.args);
    const ok = code === 0;
    results.push({ ...check, ok, code });

    if (!ok && check.required) {
      console.error(`[release-gate] FAILED: ${check.label}`);
      printSummary(results);
      process.exit(code || 1);
    }
  }

  printSummary(results);
  if (results.some((result) => result.skipped)) {
    console.error('\n[release-gate] INCOMPLETE: database-backed integration was not verified.');
    process.exit(1);
  }

  console.log('\n[release-gate] PASS');
}

function printSummary(results) {
  console.log('\n[release-gate] Summary');
  for (const r of results) {
    if (r.skipped) {
      console.log(`- SKIP: ${r.label} (${r.reason})`);
      continue;
    }
    console.log(`- ${r.ok ? 'PASS' : 'FAIL'}: ${r.label}`);
  }
}

main().catch((error) => {
  console.error('[release-gate] Unhandled error:', error);
  process.exit(1);
});
