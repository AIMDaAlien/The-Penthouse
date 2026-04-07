import { z } from 'zod';

export const AUTH_CONSTRAINTS = {
  usernameMin: 3,
  usernameMax: 32,
  displayNameMin: 1,
  displayNameMax: 40,
  bioMax: 160,
  timezoneMax: 50,
  passwordMin: 10,
  passwordMax: 128,
  captchaTokenMin: 1,
  captchaTokenMax: 2048,
  inviteCodeMin: 6,
  inviteCodeMax: 64,
  recoveryCodeLength: 16,
  testNoticeVersionMin: 1,
  testNoticeVersionMax: 64,
  userSearchQueryMax: 100
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

const CaptchaTokenSchema = z
  .string()
  .min(AUTH_CONSTRAINTS.captchaTokenMin)
  .max(AUTH_CONSTRAINTS.captchaTokenMax);

const TestNoticeVersionSchema = z
  .string()
  .trim()
  .min(AUTH_CONSTRAINTS.testNoticeVersionMin)
  .max(AUTH_CONSTRAINTS.testNoticeVersionMax);

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
  displayName: DisplayNameSchema.optional(),
  password: PasswordCreationSchema,
  inviteCode: InviteCodeSchema,
  captchaToken: CaptchaTokenSchema,
  acceptTestNotice: z.literal(true),
  testNoticeVersion: TestNoticeVersionSchema
});

export const AltchaChallengeSchema = z.object({
  algorithm: z.enum(['SHA-1', 'SHA-256', 'SHA-512']),
  challenge: z.string().min(1),
  maxnumber: z.number().int().positive().optional(),
  salt: z.string().min(1),
  signature: z.string().min(1)
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
export const ModerationActionSchema = z.enum(['hide', 'unhide']);
export const RegistrationModeSchema = z.enum(['invite_only', 'closed']);
export const MediaKindSchema = z.enum(['image', 'video', 'file']);
export const GifProviderSchema = z.enum(['giphy', 'klipy']);
export const GifRenderModeSchema = z.enum(['image', 'video']);
export const MessageMetadataSchema = z.record(z.string(), z.unknown());

export const AuthUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  timezone: z.string().max(AUTH_CONSTRAINTS.timezoneMax).nullable().optional(),
  role: UserRoleSchema,
  mustChangePassword: z.boolean(),
  mustAcceptTestNotice: z.boolean(),
  requiredTestNoticeVersion: z.string(),
  acceptedTestNoticeVersion: z.string().nullable()
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
    timezone: z.string().max(AUTH_CONSTRAINTS.timezoneMax).nullable().optional(),
    avatarUploadId: z.string().uuid().nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one profile field must be provided'
  });

export const ChangePasswordRequestSchema = z.object({
  currentPassword: PasswordEntrySchema,
  newPassword: PasswordCreationSchema
});

export const TestNoticeAckRequestSchema = z.object({
  version: TestNoticeVersionSchema
});

export const TestNoticeAckResponseSchema = z.object({
  user: AuthUserSchema,
  acceptedAt: z.string()
});

export const RegisterDeviceTokenRequestSchema = z.object({
  platform: z.enum(['android', 'ios']),
  token: z.string().min(1).max(4096),
  previousToken: z.string().min(1).max(4096).optional()
});

export const RegisterDeviceTokenResponseSchema = z.object({
  id: z.string().uuid()
});

export const UnregisterDeviceTokenRequestSchema = z.object({
  token: z.string().min(1).max(4096)
});

const QuietHoursMinuteSchema = z.number().int().min(0).max(1439);

export const DeviceNotificationSettingsSchema = z.object({
  token: z.string().min(1).max(4096),
  notificationsEnabled: z.boolean(),
  previewsEnabled: z.boolean(),
  quietHoursEnabled: z.boolean(),
  quietHoursStartMinute: QuietHoursMinuteSchema.nullable(),
  quietHoursEndMinute: QuietHoursMinuteSchema.nullable(),
  timezone: z.string().trim().min(1).max(128).nullable()
});

export const UpdateDeviceNotificationSettingsRequestSchema = DeviceNotificationSettingsSchema.superRefine((value, ctx) => {
  if (!value.quietHoursEnabled) return;

  if (value.quietHoursStartMinute === null || value.quietHoursEndMinute === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Quiet hours start and end are required when quiet hours are enabled'
    });
    return;
  }

  if (value.quietHoursStartMinute === value.quietHoursEndMinute) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Quiet hours start and end must not be equal'
    });
  }

  if (!value.timezone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Timezone is required when quiet hours are enabled'
    });
  }
});

export const GetDeviceNotificationSettingsQuerySchema = z.object({
  token: z.string().min(1).max(4096)
});

export const RotateRecoveryCodeResponseSchema = z.object({
  recoveryCode: z.string()
});

export const SessionSummarySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
  lastUsedAt: z.string(),
  deviceLabel: z.string(),
  appContext: z.string().nullable(),
  hasPushToken: z.boolean(),
  current: z.boolean()
});

export const RevokeOtherSessionsResponseSchema = z.object({
  revokedCount: z.number().int().nonnegative()
});

export const ChatSummarySchema = z.object({
  id: z.string(),
  type: z.enum(['dm', 'channel']),
  name: z.string(),
  updatedAt: z.string(),
  unreadCount: z.number().int().nonnegative().default(0),
  counterpartMemberId: z.string().optional(),
  counterpartAvatarUrl: z.string().nullable().optional(),
  notificationsMuted: z.boolean().optional()
});

export const CreateDirectChatRequestSchema = z.object({
  memberId: z.string().uuid()
});

export const ChatPreferencesRequestSchema = z.object({
  notificationsMuted: z.boolean()
});

export const ChatPreferencesResponseSchema = z.object({
  chatId: z.string(),
  notificationsMuted: z.boolean(),
  updatedAt: z.string()
});

export const MemberSummarySchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable()
});

export const MemberDetailSchema = MemberSummarySchema.extend({
  bio: z.string().nullable(),
  timezone: z.string().max(AUTH_CONSTRAINTS.timezoneMax).nullable().optional(),
  lastSeenAt: z.string().nullable().optional()
});

// Tier 1: User search and directory schemas
export const UserSearchRequestSchema = z.object({
  q: z.string().min(1).max(AUTH_CONSTRAINTS.userSearchQueryMax),
  limit: z.number().int().min(1).max(50).default(20).optional()
});

export const UserSearchResponseSchema = z.object({
  results: z.array(MemberDetailSchema)
});

export const ListUsersRequestSchema = z.object({
  offset: z.number().int().nonnegative().default(0).optional(),
  limit: z.number().int().min(1).max(50).default(20).optional()
});

export const ListUsersResponseSchema = z.object({
  users: z.array(MemberDetailSchema),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative()
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
  seenAt: z.string().nullable().optional(),
  hidden: z.boolean().optional()
});

export const AdminMessageModerationSchema = z.object({
  hiddenByModeration: z.boolean(),
  latestAction: ModerationActionSchema.nullable(),
  latestReason: z.string().nullable(),
  latestCreatedAt: z.string().nullable(),
  latestActorUserId: z.string().nullable(),
  latestActorUsername: z.string().nullable().optional(),
  latestActorDisplayName: z.string().nullable().optional()
});

export const AdminMessageSchema = MessageSchema.extend({
  senderStatus: UserStatusSchema,
  moderation: AdminMessageModerationSchema
});

export const AdminModerateMessageRequestSchema = z.object({
  reason: z.string().trim().min(1).max(500)
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
  renderMode: GifRenderModeSchema,
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

export const AdminInviteDetailSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  label: z.string(),
  uses: z.number().int().nonnegative(),
  maxUses: z.number().int().positive(),
  expiresAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  createdAt: z.string()
});

export const CreateInviteRequestSchema = z.object({
  label: z.string().trim().min(1).max(100),
  maxUses: z.number().int().min(1).max(999999).default(999999),
  expiresAt: z.string().datetime({ message: 'expiresAt must be a valid ISO 8601 datetime' }).nullable().optional()
});

export const RegistrationModeResponseSchema = z.object({
  registrationMode: RegistrationModeSchema
});

export const UpdateRegistrationModeRequestSchema = z.object({
  registrationMode: RegistrationModeSchema
});

export const AuthConfigResponseSchema = z.object({
  registrationMode: RegistrationModeSchema
});

const DiagnosticsAvailabilitySchema = z.enum(['available', 'unavailable', 'unconfigured']);

export const AdminRouteErrorSummarySchema = z.object({
  group: z.string(),
  count: z.number().int().nonnegative()
});

export const AdminOperatorSummarySchema = z.object({
  app: z.object({
    name: z.string(),
    checkedAt: z.string(),
    databaseReachable: z.boolean(),
    startedAt: z.string().nullable(),
    uptimeSeconds: z.number().int().nonnegative().nullable(),
    version: z.string().nullable(),
    buildId: z.string().nullable(),
    deployedAt: z.string().nullable()
  }),
  members: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    banned: z.number().int().nonnegative(),
    removed: z.number().int().nonnegative(),
    admins: z.number().int().nonnegative()
  }),
  content: z.object({
    chats: z.number().int().nonnegative(),
    messages: z.number().int().nonnegative(),
    uploads: z.number().int().nonnegative(),
    uploadBytesTotal: z.number().int().nonnegative()
  }),
  realtime: z.object({
    sockets: z.number().int().nonnegative(),
    connectedUsers: z.number().int().nonnegative(),
    activeChatRooms: z.number().int().nonnegative()
  }),
  moderation: z.object({
    hiddenMessages: z.number().int().nonnegative(),
    recentActions24h: z.number().int().nonnegative()
  }),
  invite: AdminInviteResponseSchema,
  push: z.object({
    configured: z.boolean(),
    androidTokens: z.number().int().nonnegative(),
    iosTokens: z.number().int().nonnegative(),
    notificationsDisabled: z.number().int().nonnegative(),
    quietHoursEnabled: z.number().int().nonnegative(),
    previewsDisabled: z.number().int().nonnegative(),
    sinceStart: z.object({
      successfulSends: z.number().int().nonnegative(),
      failedSends: z.number().int().nonnegative(),
      staleTokensRemoved: z.number().int().nonnegative(),
      lastFailureAt: z.string().nullable()
    })
  }),
  uploads: z.object({
    status: DiagnosticsAvailabilitySchema,
    directoryBytes: z.number().int().nonnegative().nullable(),
    fileCount: z.number().int().nonnegative().nullable(),
    latestUploadAt: z.string().nullable(),
    scanLimited: z.boolean()
  }),
  errors: z.object({
    sinceStart: z.object({
      serverErrorCount: z.number().int().nonnegative(),
      lastServerErrorAt: z.string().nullable(),
      routeGroups: z.array(AdminRouteErrorSummarySchema)
    })
  }),
  backup: z.object({
    status: z.string(),
    target: z.string().nullable(),
    lastSuccessfulBackupAt: z.string().nullable()
  })
});

export const AdminTempPasswordResponseSchema = z.object({
  userId: z.string(),
  username: z.string(),
  temporaryPassword: z.string()
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type AltchaChallenge = z.infer<typeof AltchaChallengeSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type UserStatus = z.infer<typeof UserStatusSchema>;
export type MessageType = z.infer<typeof MessageTypeSchema>;
export type ModerationAction = z.infer<typeof ModerationActionSchema>;
export type MediaKind = z.infer<typeof MediaKindSchema>;
export type GifProvider = z.infer<typeof GifProviderSchema>;
export type GifRenderMode = z.infer<typeof GifRenderModeSchema>;
export type MessageMetadata = z.infer<typeof MessageMetadataSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;
export type TestNoticeAckRequest = z.infer<typeof TestNoticeAckRequestSchema>;
export type TestNoticeAckResponse = z.infer<typeof TestNoticeAckResponseSchema>;
export type RegisterDeviceTokenRequest = z.infer<typeof RegisterDeviceTokenRequestSchema>;
export type RegisterDeviceTokenResponse = z.infer<typeof RegisterDeviceTokenResponseSchema>;
export type UnregisterDeviceTokenRequest = z.infer<typeof UnregisterDeviceTokenRequestSchema>;
export type DeviceNotificationSettings = z.infer<typeof DeviceNotificationSettingsSchema>;
export type UpdateDeviceNotificationSettingsRequest = z.infer<typeof UpdateDeviceNotificationSettingsRequestSchema>;
export type GetDeviceNotificationSettingsQuery = z.infer<typeof GetDeviceNotificationSettingsQuerySchema>;
export type RotateRecoveryCodeResponse = z.infer<typeof RotateRecoveryCodeResponseSchema>;
export type SessionSummary = z.infer<typeof SessionSummarySchema>;
export type RevokeOtherSessionsResponse = z.infer<typeof RevokeOtherSessionsResponseSchema>;
export type ChatSummary = z.infer<typeof ChatSummarySchema>;
export type CreateDirectChatRequest = z.infer<typeof CreateDirectChatRequestSchema>;
export type ChatPreferencesRequest = z.infer<typeof ChatPreferencesRequestSchema>;
export type ChatPreferencesResponse = z.infer<typeof ChatPreferencesResponseSchema>;
export type MemberSummary = z.infer<typeof MemberSummarySchema>;
export type MemberDetail = z.infer<typeof MemberDetailSchema>;
export type AdminMemberSummary = z.infer<typeof AdminMemberSummarySchema>;
export type Message = z.infer<typeof MessageSchema>;
export type AdminMessageModeration = z.infer<typeof AdminMessageModerationSchema>;
export type AdminMessage = z.infer<typeof AdminMessageSchema>;
export type AdminModerateMessageRequest = z.infer<typeof AdminModerateMessageRequestSchema>;
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;
export type MarkChatReadResponse = z.infer<typeof MarkChatReadResponseSchema>;
export type UploadResponse = z.infer<typeof UploadResponseSchema>;
export type GifResult = z.infer<typeof GifResultSchema>;
export type GifSearchResponse = z.infer<typeof GifSearchResponseSchema>;
export type AdminInviteResponse = z.infer<typeof AdminInviteResponseSchema>;
export type AdminOperatorSummary = z.infer<typeof AdminOperatorSummarySchema>;
export type AdminTempPasswordResponse = z.infer<typeof AdminTempPasswordResponseSchema>;
export type RegistrationMode = z.infer<typeof RegistrationModeSchema>;
export type AdminInviteDetail = z.infer<typeof AdminInviteDetailSchema>;
export type CreateInviteRequest = z.infer<typeof CreateInviteRequestSchema>;
export type RegistrationModeResponse = z.infer<typeof RegistrationModeResponseSchema>;
export type UpdateRegistrationModeRequest = z.infer<typeof UpdateRegistrationModeRequestSchema>;
export type AuthConfigResponse = z.infer<typeof AuthConfigResponseSchema>;

// Tier 1: User search and directory types
export type UserSearchRequest = z.infer<typeof UserSearchRequestSchema>;
export type UserSearchResponse = z.infer<typeof UserSearchResponseSchema>;
export type ListUsersRequest = z.infer<typeof ListUsersRequestSchema>;
export type ListUsersResponse = z.infer<typeof ListUsersResponseSchema>;
