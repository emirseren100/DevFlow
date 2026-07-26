import { z } from 'zod';

// Email is trimmed and lowercased so "  Ada@Example.com " and "ada@example.com"
// are the same account. The password is never modified: what the user typed is
// exactly what gets hashed.
const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required.')
  .max(254, 'Email is too long.')
  .email('Enter a valid email address.');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be at most 128 characters.');

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(80, 'Name is too long.'),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
