import { z } from 'zod';

const TimeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/, 'Time must be HH:mm or HH:mm:ss');

export const NotificationScopeDefaultSchema = z.enum(['off', 'dm_only', 'dm_and_mention', 'all']);
export const ChatNotificationOverrideScopeSchema = z.enum(['off', 'mentions_only', 'all']);
export const PushPayloadPrivacySchema = z.enum(['private', 'metadata', 'full']);

export const PushSubscriptionSchema = z.object({
  id: z.string().uuid(),
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  }),
  userAgent: z.string().nullable(),
  createdAt: z.string().datetime(),
  lastSeenAt: z.string().datetime()
});

export const PushSubscribeRequestSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  }),
  userAgent: z.string().trim().max(512).optional()
});

export const PushUnsubscribeRequestSchema = z.object({
  endpoint: z.string().url()
});

export const NotificationPrefsSchema = z.object({
  enabled: z.boolean(),
  scopeDefault: NotificationScopeDefaultSchema,
  payloadPrivacy: PushPayloadPrivacySchema,
  quietHoursEnabled: z.boolean(),
  quietHoursStart: TimeStringSchema.nullable(),
  quietHoursEnd: TimeStringSchema.nullable(),
  quietHoursTz: z.string().trim().min(1).max(128).nullable(),
  updatedAt: z.string().datetime()
});

export const PatchNotificationPrefsRequestSchema = z
  .object({
    enabled: z.boolean().optional(),
    scopeDefault: NotificationScopeDefaultSchema.optional(),
    payloadPrivacy: PushPayloadPrivacySchema.optional(),
    quietHoursEnabled: z.boolean().optional(),
    quietHoursStart: TimeStringSchema.nullable().optional(),
    quietHoursEnd: TimeStringSchema.nullable().optional(),
    quietHoursTz: z.string().trim().min(1).max(128).nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one notification preference must be provided'
  });

export const ChatNotificationOverrideSchema = z.object({
  chatId: z.string().uuid(),
  scope: ChatNotificationOverrideScopeSchema.nullable(),
  dndOverride: z.boolean(),
  updatedAt: z.string().datetime().nullable()
});

export const WebPushMessagePayloadSchema = z.object({
  v: z.literal(1),
  type: z.literal('message'),
  chatId: z.string().uuid(),
  messageId: z.string().uuid(),
  senderName: z.string().min(1),
  chatName: z.string().min(1),
  body: z.string().optional(),
  senderAvatar: z.string().nullable().optional()
});

export const PatchChatNotificationOverrideRequestSchema = z
  .object({
    scope: ChatNotificationOverrideScopeSchema.optional(),
    dndOverride: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one chat notification override must be provided'
  });

export type NotificationScopeDefault = z.infer<typeof NotificationScopeDefaultSchema>;
export type ChatNotificationOverrideScope = z.infer<typeof ChatNotificationOverrideScopeSchema>;
export type PushPayloadPrivacy = z.infer<typeof PushPayloadPrivacySchema>;
export type PushSubscription = z.infer<typeof PushSubscriptionSchema>;
export type PushSubscribeRequest = z.infer<typeof PushSubscribeRequestSchema>;
export type PushUnsubscribeRequest = z.infer<typeof PushUnsubscribeRequestSchema>;
export type NotificationPrefs = z.infer<typeof NotificationPrefsSchema>;
export type PatchNotificationPrefsRequest = z.infer<typeof PatchNotificationPrefsRequestSchema>;
export type ChatNotificationOverride = z.infer<typeof ChatNotificationOverrideSchema>;
export type PatchChatNotificationOverrideRequest = z.infer<typeof PatchChatNotificationOverrideRequestSchema>;
export type WebPushMessagePayload = z.infer<typeof WebPushMessagePayloadSchema>;
