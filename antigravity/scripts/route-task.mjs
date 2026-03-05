#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import { readJson, routeTask } from './policy-engine.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node antigravity/scripts/route-task.mjs <task-envelope.json> [policy.json]');
  process.exit(1);
}

const taskPath = path.resolve(process.cwd(), args[0]);
const policyPath = path.resolve(
  process.cwd(),
  args[1] || path.join(__dirname, '../policy/delegation-policy.v1.json')
);

const task = readJson(taskPath);
const policy = readJson(policyPath);
const decision = routeTask(policy, task);
console.log(JSON.stringify(decision, null, 2));
