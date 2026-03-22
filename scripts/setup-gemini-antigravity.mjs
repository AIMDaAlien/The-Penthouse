#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const home = os.homedir();
const geminiRoot = process.env.GEMINI_ANTIGRAVITY_HOME ?? path.join(home, '.gemini', 'antigravity');
const skillsDir = path.join(geminiRoot, 'skills');
const mcpConfigPath = path.join(geminiRoot, 'mcp_config.json');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

const curatedSkills = [
  ['using-superpowers', path.join(repoRoot, '.agents', 'skills', 'using-superpowers')],
  ['brainstorming', path.join(repoRoot, '.agents', 'skills', 'brainstorming')],
  ['systematic-debugging', path.join(repoRoot, '.agents', 'skills', 'systematic-debugging')],
  ['writing-plans', path.join(repoRoot, '.agents', 'skills', 'writing-plans')],
  ['requesting-code-review', path.join(repoRoot, '.agents', 'skills', 'requesting-code-review')],
  ['receiving-code-review', path.join(repoRoot, '.agents', 'skills', 'receiving-code-review')],
  ['verification-before-completion', path.join(repoRoot, '.agents', 'skills', 'verification-before-completion')],
  ['find-docs', path.join(repoRoot, '.agents', 'skills', 'find-docs')],
  ['context7-mcp', path.join(repoRoot, '.agents', 'skills', 'context7-mcp')],
  ['ui-ux-pro-max', path.join(repoRoot, '.agents', 'skills', 'ui-ux-pro-max')],
  ['ckm-ui-styling', path.join(repoRoot, '.agents', 'skills', 'ckm-ui-styling')],
  ['accessibility', path.join(home, '.agents', 'skills', 'accessibility')],
  ['performance', path.join(home, '.agents', 'skills', 'performance')],
];

const requiredMcpServers = {
  'chrome-devtools': {
    command: 'npx',
    args: ['-y', 'chrome-devtools-mcp@latest'],
    env: {},
  },
  playwright: {
    command: 'npx',
    args: ['-y', '@playwright/mcp@latest'],
    env: {},
  },
};

async function pathExists(targetPath) {
  try {
    await fs.lstat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

async function ensureSkillLink(skillName, sourcePath) {
  if (!(await pathExists(sourcePath))) {
    throw new Error(`Missing skill source: ${sourcePath}`);
  }

  const targetPath = path.join(skillsDir, skillName);

  if (await pathExists(targetPath)) {
    const stat = await fs.lstat(targetPath);

    if (stat.isSymbolicLink()) {
      const linkedPath = await fs.realpath(targetPath);
      const sourceRealPath = await fs.realpath(sourcePath);

      if (linkedPath === sourceRealPath) {
        return { action: 'kept', targetPath, sourcePath };
      }

      await fs.rm(targetPath, { force: true });
    } else {
      const backupPath = `${targetPath}.backup-${timestamp}`;
      await fs.rename(targetPath, backupPath);
      return ensureSkillLink(skillName, sourcePath).then((result) => ({
        ...result,
        backupPath,
      }));
    }
  }

  await fs.symlink(sourcePath, targetPath, 'dir');
  return { action: 'linked', targetPath, sourcePath };
}

async function loadMcpConfig() {
  if (!(await pathExists(mcpConfigPath))) {
    return { mcpServers: {} };
  }

  const raw = await fs.readFile(mcpConfigPath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!parsed.mcpServers || typeof parsed.mcpServers !== 'object') {
    parsed.mcpServers = {};
  }

  return parsed;
}

function sanitizeGitHubServer(server) {
  if (!server || typeof server !== 'object') {
    return server;
  }

  const next = { ...server };

  if (next.env && typeof next.env === 'object') {
    delete next.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    if (Object.keys(next.env).length === 0) {
      delete next.env;
    }
  }

  return next;
}

async function writeJson(targetPath, data) {
  await fs.writeFile(targetPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function main() {
  await ensureDir(skillsDir);

  const skillResults = [];
  for (const [skillName, sourcePath] of curatedSkills) {
    skillResults.push(await ensureSkillLink(skillName, sourcePath));
  }

  const mcpConfig = await loadMcpConfig();

  if (mcpConfig.mcpServers['github-mcp-server']) {
    mcpConfig.mcpServers['github-mcp-server'] = sanitizeGitHubServer(
      mcpConfig.mcpServers['github-mcp-server'],
    );
  }

  for (const [serverName, serverConfig] of Object.entries(requiredMcpServers)) {
    mcpConfig.mcpServers[serverName] = serverConfig;
  }

  await writeJson(mcpConfigPath, mcpConfig);

  const backups = skillResults
    .filter((result) => result.backupPath)
    .map((result) => result.backupPath);

  console.log(`Gemini Antigravity root: ${geminiRoot}`);
  console.log('Skills ensured:');
  for (const result of skillResults) {
    console.log(`- ${result.action}: ${result.targetPath}`);
  }

  if (backups.length > 0) {
    console.log('Backups created:');
    for (const backupPath of backups) {
      console.log(`- ${backupPath}`);
    }
  }

  console.log(`MCP config updated: ${mcpConfigPath}`);
  console.log('Required MCP servers present:');
  for (const serverName of Object.keys(requiredMcpServers)) {
    console.log(`- ${serverName}`);
  }
  console.log('- github-mcp-server sanitized for environment-based auth');

  if (!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
    console.log(
      'Warning: GITHUB_PERSONAL_ACCESS_TOKEN is not set in this shell. GitHub MCP is configured but will stay unauthenticated until the launch environment exports that variable.',
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
