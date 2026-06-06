import { z } from 'zod';
import { config } from '../config.js';
import { ACCESS_LEVELS, JABATAN_LEVELS } from '../rbac/types.js';

export const CriterionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('observation_matches'),
    field: z.string(),
    predicate: z.string(),
  }),
  z.object({
    kind: z.literal('tool_output_contains'),
    tool: z.string(),
    pattern: z.string(),
  }),
  z.object({
    kind: z.literal('operator_approves'),
    role: z.string(),
  }),
  z.object({
    kind: z.literal('llm_judge'),
    rubric: z.string(),
  }),
]);

export const GoalSpecSchema = z.object({
  objective: z.string().min(3),
  successCriteria: z.array(CriterionSchema).min(1),
  failureCriteria: z.array(CriterionSchema).optional(),
  context: z.record(z.unknown()).optional(),
  language: z.enum(['id-ID', 'en-US']).optional(),
});

export const GoalBudgetSchema = z.object({
  maxSteps: z.number().int().positive().default(config.defaults.maxSteps),
  maxTokens: z.number().int().positive().default(config.defaults.maxTokens),
  maxCostUsd: z.number().nonnegative().optional(),
  maxWallClockSeconds: z.number().int().positive().default(config.defaults.maxWallClockSeconds),
});

export const GoalPolicySchema = z.object({
  allowedTools: z.array(z.string()).default(['noop']),
  deniedDomains: z.array(z.string()).optional(),
  requireApprovalFor: z.array(z.string()).optional(),
});

export const CreateGoalSchema = z.object({
  title: z.string().min(1).max(200),
  spec: GoalSpecSchema,
  budget: GoalBudgetSchema.optional(),
  policy: GoalPolicySchema.optional(),
});

export const DecideApprovalSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  comment: z.string().optional(),
});

// ---------- RBAC ----------

const WA_REGEX = /^\+?\d[\d\s().-]{6,24}\d$/;

export const CreateDepartmentSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
});

export const UpdateDepartmentSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional().nullable(),
});

export const CreateUserSchema = z.object({
  waNumber: z.string().regex(WA_REGEX, 'invalid WA number'),
  name: z.string().min(1).max(120),
  departmentId: z.string().min(1),
  jabatan: z.enum(JABATAN_LEVELS),
  isActive: z.boolean().optional(),
});

export const UpdateUserSchema = z.object({
  waNumber: z.string().regex(WA_REGEX).optional(),
  name: z.string().min(1).max(120).optional(),
  departmentId: z.string().min(1).optional(),
  jabatan: z.enum(JABATAN_LEVELS).optional(),
  isActive: z.boolean().optional(),
});

export const GrantFolderSchema = z.object({
  departmentId: z.string().min(1),
  folderPath: z.string().min(1).max(512),
  accessLevel: z.enum(ACCESS_LEVELS),
});

export const LoginSchema = z.object({
  waNumber: z.string().regex(WA_REGEX),
});

export const ResignSchema = z.object({
  waNumber: z.string().regex(WA_REGEX),
  reason: z.string().max(500).optional(),
});

export const AdminRemoveUserSchema = z.object({
  waNumber: z.string().regex(WA_REGEX),
  removedByWa: z.string().regex(WA_REGEX),
});

export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;
export type DecideApprovalInput = z.infer<typeof DecideApprovalSchema>;
export type CreateDepartmentInput = z.infer<typeof CreateDepartmentSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type GrantFolderInput = z.infer<typeof GrantFolderSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ResignInput = z.infer<typeof ResignSchema>;
export type AdminRemoveUserInput = z.infer<typeof AdminRemoveUserSchema>;
