// src/schemas/auth.schema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
  .email('Invalid_email_format')
    .min(1, 'Email_required'),
  password: z
    .string()
    .min(6, 'Password_too_short'),
});



export type LoginInput = z.infer<typeof loginSchema>;
