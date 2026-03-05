import { z } from 'zod';

export const TaskEnvelopeSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum([
    'frontend_ui',
    'frontend_arch',
    'backend_api',
    'realtime',
    'data',
    'infra',
    'security',
    'migration_flutter',
    'qa',
    'docs'
  ]),
  risk: z.enum(['low', 'medium', 'high', 'critical']),
  ambiguity: z.enum(['low', 'medium', 'high']),
  recency_risk: z.boolean(),
  requires_native_debug: z.boolean(),
  artifacts: z.array(z.string()),
  acceptance_criteria: z.array(z.string())
});

export const RoutingDecisionSchema = z.object({
  task_id: z.string(),
  primary_model: z.enum(['codex', 'opus', 'gemini']),
  reviewer_model: z.enum(['codex', 'opus', 'gemini']),
  arbiter_model: z.literal('codex'),
  justification: z.string(),
  evidence_required: z.boolean()
});

export type TaskEnvelope = z.infer<typeof TaskEnvelopeSchema>;
export type RoutingDecision = z.infer<typeof RoutingDecisionSchema>;
