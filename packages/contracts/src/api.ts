import { z } from 'zod';

export const RiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);

export const RegisterRequestSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(10).max(128),
  inviteCode: z.string().min(6).max(64)
});

export const LoginRequestSchema = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(10).max(128)
});

export const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(20)
});

export const AuthResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    username: z.string()
  }),
  accessToken: z.string(),
  refreshToken: z.string()
});

export const ChatSummarySchema = z.object({
  id: z.string(),
  type: z.enum(['dm', 'channel']),
  name: z.string(),
  updatedAt: z.string()
});

export const MessageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  senderId: z.string(),
  content: z.string(),
  createdAt: z.string(),
  clientMessageId: z.string().optional()
});

export const SendMessageRequestSchema = z.object({
  chatId: z.string(),
  content: z.string().min(1).max(4000),
  clientMessageId: z.string().min(8).max(128)
});

export const SendMessageResponseSchema = z.object({
  message: MessageSchema,
  deduped: z.boolean()
});

export const UploadResponseSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  url: z.string(),
  size: z.number().int().positive()
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type ChatSummary = z.infer<typeof ChatSummarySchema>;
export type Message = z.infer<typeof MessageSchema>;
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;
export type UploadResponse = z.infer<typeof UploadResponseSchema>;
