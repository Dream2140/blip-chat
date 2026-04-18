import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  nickname: z
    .string()
    .min(2, "Nickname must be at least 2 characters")
    .max(30, "Nickname must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Nickname can only contain letters, numbers, hyphens and underscores"
    ),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const createConversationSchema = z.object({
  type: z.enum(["DIRECT", "GROUP"]),
  participantIds: z.array(z.string()).min(1, "At least one participant required"),
  name: z.string().max(100).optional(),
});

export const sendMessageSchema = z.object({
  text: z.string().min(1, "Message cannot be empty").max(10000),
  replyToId: z.string().optional(),
});

export const editMessageSchema = z.object({
  text: z.string().min(1, "Message cannot be empty").max(10000),
});

export const updateProfileSchema = z.object({
  nickname: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, hyphens and underscores")
    .optional(),
  bio: z.string().max(200).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const searchUsersSchema = z.object({
  q: z.string().min(2, "Search query must be at least 2 characters"),
});
