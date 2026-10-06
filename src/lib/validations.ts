import { z } from 'zod';

// Vehicle types for taxis
export const vehicleTypeEnum = z.enum(['auto', 'pickup', 'mini_truck', 'truck', 'trailer'] as const);

// Ship types for inland waterways
export const shipTypeEnum = z.enum([
  'country_craft',
  'bulk_cargo_barge',
  'deck_barge',
  'motor_cargo_boat',
  'kettuvallam_cargo',
] as const);

export const SHIP_TYPE_LABELS: Record<string, string> = {
  country_craft: 'Traditional Country Craft (up to 5t)',
  bulk_cargo_barge: 'Bulk Cargo Barge (Sand/Cement, 15t)',
  deck_barge: 'Heavy Deck Cargo Barge (up to 50t)',
  motor_cargo_boat: 'Motorized Inland Cargo Vessel',
  kettuvallam_cargo: 'Modified Kettuvallam Freight Carrier',
};

// Signup validation
export const signupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    role: z.enum(['user', 'ship_owner', 'worker', 'taxi'] as const),
    vehicle_type: vehicleTypeEnum.optional(),
    capacity_t: z.number().positive('Capacity must be positive').optional(),
    ship_type: z.string().optional(),
    capacity_kg: z.number().positive('Ship capacity in kg must be positive').optional(),
  })
  .refine(
    (data) => {
      if (data.role === 'taxi') {
        return data.vehicle_type !== undefined && data.capacity_t !== undefined;
      }
      return true;
    },
    { message: 'Taxi role requires vehicle type and capacity', path: ['vehicle_type'] }
  )
  .refine(
    (data) => {
      if (data.role === 'ship_owner') {
        return Boolean(data.ship_type) && data.capacity_kg !== undefined && data.capacity_kg > 0;
      }
      return true;
    },
    { message: 'Ship owner requires ship type and max capacity in kg', path: ['ship_type'] }
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
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

// Profile update
export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  theme: z.enum(['light', 'dark', 'system'] as const).optional(),
  vehicle_type: vehicleTypeEnum.optional(),
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
