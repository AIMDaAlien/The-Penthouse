import { z } from 'zod';

export const RiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);

export const AUTH_CONSTRAINTS = {
  usernameMin: 3,
  usernameMax: 32,
  displayNameMin: 1,
  displayNameMax: 40,
  bioMax: 160,
  passwordMin: 10,
  passwordMax: 128,
  inviteCodeMin: 6,
  inviteCodeMax: 64,
  recoveryCodeLength: 16
} as const;

const USERNAME_PATTERN = /^[a-z0-9._-]+$/;
const RECOVERY_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeInviteCode(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeRecoveryCode(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, '');
}

export function formatRecoveryCode(value: string): string {
  const normalized = normalizeRecoveryCode(value);
  return normalized.match(/.{1,4}/g)?.join('-') ?? normalized;
}

const UsernameSchema = z
  .string()
  .trim()
  .min(AUTH_CONSTRAINTS.usernameMin)
  .max(AUTH_CONSTRAINTS.usernameMax)
  .transform(normalizeUsername)
  .refine((value) => USERNAME_PATTERN.test(value), {
    message: 'Username may only use letters, numbers, ".", "_" and "-"'
  });

const PasswordEntrySchema = z.string().min(AUTH_CONSTRAINTS.passwordMin).max(AUTH_CONSTRAINTS.passwordMax);

const PasswordCreationSchema = PasswordEntrySchema.refine((value) => value === value.trim(), {
  message: 'Password cannot start or end with spaces'
});

const InviteCodeSchema = z
  .string()
  .trim()
  .min(AUTH_CONSTRAINTS.inviteCodeMin)
  .max(AUTH_CONSTRAINTS.inviteCodeMax)
  .transform(normalizeInviteCode);

const DisplayNameSchema = z
  .string()
  .trim()
  .min(AUTH_CONSTRAINTS.displayNameMin)
  .max(AUTH_CONSTRAINTS.displayNameMax);

const BioSchema = z
  .string()
  .trim()
  .max(AUTH_CONSTRAINTS.bioMax);

const RecoveryCodeSchema = z
  .string()
  .trim()
  .min(AUTH_CONSTRAINTS.recoveryCodeLength)
  .max(AUTH_CONSTRAINTS.recoveryCodeLength + 8)
  .transform(normalizeRecoveryCode)
  .refine(
    (value) => value.length === AUTH_CONSTRAINTS.recoveryCodeLength && RECOVERY_CODE_PATTERN.test(value),
    {
      message: 'Recovery code must be 16 characters using letters and numbers'
    }
  );

export const RegisterRequestSchema = z.object({
  username: UsernameSchema,
  password: PasswordCreationSchema,
  inviteCode: InviteCodeSchema
});

export const LoginRequestSchema = z.object({
  username: UsernameSchema,
  password: PasswordEntrySchema
});

export const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(20)
});

export const PasswordResetRequestSchema = z.object({
  username: UsernameSchema,
  recoveryCode: RecoveryCodeSchema,
  newPassword: PasswordCreationSchema
});

export const UserRoleSchema = z.enum(['admin', 'member']);
export const UserStatusSchema = z.enum(['active', 'removed', 'banned']);
export const MessageTypeSchema = z.enum(['text', 'image', 'video', 'gif', 'file']);
export const MediaKindSchema = z.enum(['image', 'video', 'file']);
export const GifProviderSchema = z.enum(['giphy', 'klipy']);
export const MessageMetadataSchema = z.record(z.string(), z.unknown());

export const AuthUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  role: UserRoleSchema,
  mustChangePassword: z.boolean()
});

export const AuthResponseSchema = z.object({
  user: AuthUserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  recoveryCode: z.string().optional()
});

export const MeResponseSchema = AuthUserSchema.extend({
  bio: z.string().nullable(),
  avatarMediaId: z.string().uuid().nullable()
});

export const UpdateProfileRequestSchema = z
  .object({
    displayName: DisplayNameSchema.optional(),
    bio: BioSchema.nullable().optional(),
    avatarUploadId: z.string().uuid().nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one profile field must be provided'
  });

export const ChangePasswordRequestSchema = z.object({
  currentPassword: PasswordEntrySchema,
  newPassword: PasswordCreationSchema
});

export const RotateRecoveryCodeResponseSchema = z.object({
  recoveryCode: z.string()
});

export const ChatSummarySchema = z.object({
  id: z.string(),
  type: z.enum(['dm', 'channel']),
  name: z.string(),
  updatedAt: z.string(),
  unreadCount: z.number().int().nonnegative().default(0)
});

export const MemberSummarySchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable()
});

export const MemberDetailSchema = MemberSummarySchema.extend({
  bio: z.string().nullable()
});

export const AdminMemberSummarySchema = MemberDetailSchema.extend({
  role: UserRoleSchema,
  status: UserStatusSchema,
  mustChangePassword: z.boolean(),
  createdAt: z.string()
});

export const MessageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  senderId: z.string(),
  senderUsername: z.string().optional(),
  senderDisplayName: z.string().optional(),
  senderAvatarUrl: z.string().nullable().optional(),
  content: z.string(),
  type: MessageTypeSchema.default('text'),
  metadata: MessageMetadataSchema.nullable().optional(),
  createdAt: z.string(),
  clientMessageId: z.string().optional(),
  seenAt: z.string().nullable().optional()
});

export const AdminMessageSchema = MessageSchema.extend({
  senderStatus: UserStatusSchema,
  hidden: z.boolean()
});

export const SendMessageRequestSchema = z.object({
  chatId: z.string(),
  content: z.string().min(1).max(4000),
  type: MessageTypeSchema.optional().default('text'),
  metadata: MessageMetadataSchema.nullable().optional(),
  clientMessageId: z.string().min(8).max(128)
});

export const SendMessageResponseSchema = z.object({
  message: MessageSchema,
  deduped: z.boolean()
});

export const MarkChatReadResponseSchema = z.object({
  chatId: z.string(),
  unreadCount: z.number().int().nonnegative(),
  lastReadAt: z.string().nullable(),
  seenThroughMessageId: z.string().nullable().optional()
});

export const UploadResponseSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  originalFileName: z.string(),
  url: z.string(),
  size: z.number().int().positive(),
  contentType: z.string().optional(),
  mediaKind: MediaKindSchema
});

export const GifResultSchema = z.object({
  id: z.string(),
  url: z.string(),
  previewUrl: z.string(),
  title: z.string().nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  provider: GifProviderSchema
});

export const GifSearchResponseSchema = z.object({
  provider: GifProviderSchema,
  results: z.array(GifResultSchema)
});

export const AdminInviteResponseSchema = z.object({
  code: z.string(),
  uses: z.number().int().nonnegative(),
  maxUses: z.number().int().positive(),
  createdAt: z.string()
});

export const AdminTempPasswordResponseSchema = z.object({
  userId: z.string(),
  username: z.string(),
  temporaryPassword: z.string()
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type UserStatus = z.infer<typeof UserStatusSchema>;
export type MessageType = z.infer<typeof MessageTypeSchema>;
export type MediaKind = z.infer<typeof MediaKindSchema>;
export type GifProvider = z.infer<typeof GifProviderSchema>;
export type MessageMetadata = z.infer<typeof MessageMetadataSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;
export type RotateRecoveryCodeResponse = z.infer<typeof RotateRecoveryCodeResponseSchema>;
export type ChatSummary = z.infer<typeof ChatSummarySchema>;
export type MemberSummary = z.infer<typeof MemberSummarySchema>;
export type MemberDetail = z.infer<typeof MemberDetailSchema>;
export type AdminMemberSummary = z.infer<typeof AdminMemberSummarySchema>;
export type Message = z.infer<typeof MessageSchema>;
export type AdminMessage = z.infer<typeof AdminMessageSchema>;
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;
export type MarkChatReadResponse = z.infer<typeof MarkChatReadResponseSchema>;
export type UploadResponse = z.infer<typeof UploadResponseSchema>;
export type GifResult = z.infer<typeof GifResultSchema>;
export type GifSearchResponse = z.infer<typeof GifSearchResponseSchema>;
export type AdminInviteResponse = z.infer<typeof AdminInviteResponseSchema>;
export type AdminTempPasswordResponse = z.infer<typeof AdminTempPasswordResponseSchema>;
