#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import { readJson, routeTask, getByPath } from './policy-engine.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const scenariosPath = path.resolve(process.cwd(), args[0] || path.join(__dirname, '../scenarios/test-cases.json'));
const policyPath = path.resolve(process.cwd(), args[1] || path.join(__dirname, '../policy/delegation-policy.v1.json'));

const scenarios = readJson(scenariosPath);
const policy = readJson(policyPath);

let passed = 0;
let failed = 0;

for (const testCase of scenarios.cases || []) {
  let ok = true;
  const errors = [];

  if (testCase.task) {
    const decision = routeTask(policy, testCase.task);
    for (const [key, expectedValue] of Object.entries(testCase.expected || {})) {
      const actualValue = decision[key];
      if (actualValue !== expectedValue) {
        ok = false;
        errors.push(`${key}: expected=${JSON.stringify(expectedValue)} actual=${JSON.stringify(actualValue)}`);
      }
    }
  }

  if (testCase.policy_assertion) {
    for (const [pointer, expectedValue] of Object.entries(testCase.policy_assertion)) {
      const actualValue = getByPath(policy, pointer);
      if (actualValue !== expectedValue) {
        ok = false;
        errors.push(`policy.${pointer}: expected=${JSON.stringify(expectedValue)} actual=${JSON.stringify(actualValue)}`);
      }
    }
  }

  if (ok) {
    passed += 1;
    console.log(`PASS ${testCase.id}: ${testCase.description}`);
  } else {
    failed += 1;
    console.log(`FAIL ${testCase.id}: ${testCase.description}`);
    for (const err of errors) console.log(`  - ${err}`);
  }
}

console.log(`\nSummary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
