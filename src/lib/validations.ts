import { z } from 'zod';

// Signup validation
export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(['user', 'ship_owner', 'worker', 'taxi'] as const),
  vehicle_type: z.enum(['auto', 'pickup', 'mini_truck', 'truck', 'trailer'] as const).optional(),
  capacity_t: z.number().positive('Capacity must be positive').optional(),
}).refine(
  (data) => {
    if (data.role === 'taxi') {
      return data.vehicle_type !== undefined && data.capacity_t !== undefined;
    }
    return true;
  },
  { message: 'Taxi role requires vehicle type and capacity', path: ['vehicle_type'] }
);

// Login validation
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Forgot password
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// OTP verification
export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must contain only digits'),
});

// Reset password
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

// Profile update
export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  theme: z.enum(['light', 'dark', 'system'] as const).optional(),
  vehicle_type: z.enum(['auto', 'pickup', 'mini_truck', 'truck', 'trailer'] as const).optional(),
  capacity_t: z.number().positive().optional(),
  is_online: z.boolean().optional(),
});

// Contact message
export const contactMessageSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100),
  email: z.string().email('Invalid email'),
  subject: z.string().max(200).optional(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
