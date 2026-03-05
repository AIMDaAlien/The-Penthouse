import fs from 'fs';

export const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const normalizeTags = (tags) => Array.isArray(tags) ? tags.map((t) => String(t).toLowerCase()) : [];

const urlHost = (url) => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const includesAny = (values, set) => values.some((v) => set.includes(v));

const matches = (rule, currentTask, taskTags) => {
  const cond = rule.if || {};

  if (cond.category_in && !cond.category_in.includes(currentTask.category)) return false;
  if (cond.ambiguity_equals && cond.ambiguity_equals !== currentTask.ambiguity) return false;
  if (cond.ambiguity_in && !cond.ambiguity_in.includes(currentTask.ambiguity)) return false;
  if (cond.risk_in && !cond.risk_in.includes(currentTask.risk)) return false;
  if (Object.prototype.hasOwnProperty.call(cond, 'recency_risk_equals') && cond.recency_risk_equals !== currentTask.recency_risk) return false;
  if (cond.tags_intersect && !includesAny(cond.tags_intersect, taskTags)) return false;

  return true;
};

export const routeTask = (policy, task) => {
  const tags = normalizeTags(task.tags);

  const primaryHosts = new Set(
    (policy.source_registry || [])
      .map((s) => urlHost(s.url))
      .filter(Boolean)
  );

  const hasPrimaryDoc = (task.artifacts || []).some((artifact) => {
    const host = urlHost(artifact);
    if (!host) return false;
    return primaryHosts.has(host) || Array.from(primaryHosts).some((known) => host.endsWith(`.${known}`));
  });

  const decision = {
    task_id: task.id,
    primary_model: 'codex',
    reviewer_model: 'opus',
    arbiter_model: 'codex',
    justification: 'Default routing for stability-first policy.',
    evidence_required: false,
    blocked: false,
    block_reason: null,
    requires_human_signoff: false,
    requires_human_in_loop: false,
    solo_owner_allowed: true,
    matched_rules: []
  };

  for (const rule of policy.routing_rules || []) {
    if (!matches(rule, task, tags)) continue;
    Object.assign(decision, rule.set || {});
    decision.matched_rules.push(rule.id);
  }

  for (const guard of policy.global_guards || []) {
    if (!matches(guard, task, tags)) continue;
    const set = guard.set || {};
    Object.assign(decision, set);
    decision.matched_rules.push(guard.id);

    if (set.block_if_no_primary_docs && !hasPrimaryDoc) {
      decision.blocked = true;
      decision.block_reason = 'recency_risk=true but no primary-source docs found in artifacts';
    }
  }

  if (tags.includes('custom_crypto') || tags.includes('novel_crypto') || tags.includes('security_primitive')) {
    decision.solo_owner_allowed = false;
    decision.requires_human_signoff = true;
    decision.blocked = true;
    decision.block_reason = 'Novel/custom crypto task cannot be owned by a model alone.';
  }

  if (task.risk === 'high' || task.risk === 'critical') {
    decision.evidence_required = true;
    decision.arbiter_model = 'codex';
  }

  if (tags.some((t) => ['security', 'auth', 'crypto', 'permissions'].includes(t))) {
    decision.requires_human_signoff = true;
  }

  if (tags.some((t) => ['destructive', 'prod_ops'].includes(t))) {
    decision.requires_human_in_loop = true;
  }

  if (task.recency_risk && !hasPrimaryDoc) {
    decision.evidence_required = true;
    decision.blocked = true;
    decision.block_reason = decision.block_reason || 'Recency-risk task missing primary docs.';
  }

  if (decision.plan_phase_owner || decision.implementation_phase_owner) {
    decision.justification =
      'High-ambiguity frontend architecture/migration: Opus plans first, then Gemini implements, Codex reviews/arbitrates.';
  } else if (decision.matched_rules.length > 0) {
    decision.justification = `Matched rules: ${decision.matched_rules.join(', ')}`;
  }

  return decision;
};

export const getByPath = (obj, pointer) => {
  const parts = pointer.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (/^\d+$/.test(part)) {
      current = current[Number(part)];
    } else {
      current = current[part];
    }
  }
  return current;
};
