export type UserRole = 'user' | 'ship_owner' | 'worker' | 'taxi' | 'admin';
export type VehicleType = 'auto' | 'pickup' | 'mini_truck' | 'truck' | 'trailer';
export type OrderStatus = 'draft' | 'posted' | 'matched' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'queued';
export type LegType = 'road_origin' | 'water' | 'road_destination';
export type JobType = 'ship' | 'taxi' | 'load' | 'unload';
export type JobStatus = 'open' | 'assigned' | 'active' | 'done' | 'cancelled';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  theme: ThemeMode;
  vehicle_type: VehicleType | null;
  capacity_t: number | null;
  is_online: boolean;
  suspended: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Jetty {
  id: string;
  name: string;
  geog: unknown; // PostGIS geography
  lat?: number;
  lng?: number;
  district: string | null;
  is_active: boolean;
  is_approximate: boolean;
  has_loading_facility: boolean;
  created_at: string;
  updated_at: string;
}

export interface WaterEdge {
  id: string;
  from_jetty_id: string;
  to_jetty_id: string;
  distance_km: number;
  avg_speed_kmph: number;
  is_active: boolean;
  waterway_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Boat {
  id: string;
  owner_id: string;
  name: string;
  capacity_t: number;
  cargo_types: string[];
  home_jetty_id: string | null;
  is_active: boolean;
  registration_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  cargo_name: string;
  cargo_description: string | null;
  weight_tonnes: number;
  needs_loading_unloading: boolean;
  pickup_time: string;
  is_immediate: boolean;
  origin_address: string;
  origin_geog: unknown;
  origin_jetty_id: string | null;
  destination_address: string;
  destination_geog: unknown;
  destination_jetty_id: string | null;
  road_distance_km: number | null;
  road_duration_min: number | null;
  road_cost: number | null;
  road_co2_kg: number | null;
  water_distance_km: number | null;
  water_duration_min: number | null;
  water_cost: number | null;
  water_co2_kg: number | null;
  comparison_explanation: string | null;
  recommended_origin_vehicle: VehicleType | null;
  recommended_dest_vehicle: VehicleType | null;
  recommended_boat_type: string | null;
  chat_history: ChatMessage[];
  matched_at: string | null;
  picked_up_at: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderLeg {
  id: string;
  order_id: string;
  leg_type: LegType;
  sequence_num: number;
  from_address: string | null;
  from_geog: unknown;
  from_jetty_id: string | null;
  to_address: string | null;
  to_geog: unknown;
  to_jetty_id: string | null;
  distance_km: number | null;
  duration_min: number | null;
  cost: number | null;
  co2_kg: number | null;
  route_geometry: unknown;
  created_at: string;
}

export interface Job {
  id: string;
  order_id: string;
  leg_id: string | null;
  type: JobType;
  status: JobStatus;
  assigned_to: string | null;
  boat_id: string | null;
  offered_to: string[];
  radius_km: number;
  expires_at: string | null;
  notify_at: string | null;
  location_geog: unknown;
  jetty_id: string | null;
  estimated_payout: number | null;
  status_history: StatusChange[];
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface LiveLocation {
  id: string;
  user_id: string;
  geog: unknown;
  job_id: string | null;
  heading: number | null;
  speed: number | null;
  updated_at: string;
}

export interface Rating {
  id: string;
  order_id: string;
  from_user_id: string;
  to_user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Rate {
  id: string;
  category: string;
  key: string;
  value: number;
  unit: string;
  description: string | null;
  updated_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface PreferredLocation {
  id: string;
  user_id: string;
  name: string;
  geog: unknown;
  radius_km: number;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggested_chips?: string[];
  is_booking_summary?: boolean;
}

export interface StatusChange {
  status: string;
  at: string;
  by: string;
}

export interface PasswordResetOtp {
  id: string;
  email: string;
  otp_hash: string;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  used: boolean;
  created_at: string;
}

// Supabase Database type (simplified - enough for type safety)
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string; name: string; email: string }; Update: Partial<Profile>; Relationships: [] };
      preferred_locations: { Row: PreferredLocation; Insert: Omit<PreferredLocation, 'id' | 'created_at'>; Update: Partial<PreferredLocation>; Relationships: [] };
      jetties: { Row: Jetty; Insert: Omit<Jetty, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Jetty>; Relationships: [] };
      water_edges: { Row: WaterEdge; Insert: Omit<WaterEdge, 'id' | 'created_at' | 'updated_at'>; Update: Partial<WaterEdge>; Relationships: [] };
      boats: { Row: Boat; Insert: Omit<Boat, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Boat>; Relationships: [] };
      orders: { Row: Order; Insert: Partial<Order> & { user_id: string; cargo_name: string; weight_tonnes: number; origin_address: string; origin_geog: unknown; destination_address: string; destination_geog: unknown }; Update: Partial<Order>; Relationships: [] };
      order_legs: { Row: OrderLeg; Insert: Omit<OrderLeg, 'id' | 'created_at'>; Update: Partial<OrderLeg>; Relationships: [] };
      jobs: { Row: Job; Insert: Partial<Job> & { order_id: string; type: JobType }; Update: Partial<Job>; Relationships: [] };
      notifications: { Row: Notification; Insert: Omit<Notification, 'id' | 'created_at'>; Update: Partial<Notification>; Relationships: [] };
      live_locations: { Row: LiveLocation; Insert: Omit<LiveLocation, 'id'>; Update: Partial<LiveLocation>; Relationships: [] };
      ratings: { Row: Rating; Insert: Omit<Rating, 'id' | 'created_at'>; Update: Partial<Rating>; Relationships: [] };
      rates: { Row: Rate; Insert: Omit<Rate, 'id' | 'updated_at'>; Update: Partial<Rate>; Relationships: [] };
      contact_messages: { Row: ContactMessage; Insert: Omit<ContactMessage, 'id' | 'created_at'>; Update: Partial<ContactMessage>; Relationships: [] };
      audit_log: { Row: AuditLog; Insert: Omit<AuditLog, 'id' | 'created_at'>; Update: Partial<AuditLog>; Relationships: [] };
      password_reset_otps: { Row: PasswordResetOtp; Insert: Omit<PasswordResetOtp, 'id' | 'created_at' | 'attempts'>; Update: Partial<PasswordResetOtp>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      claim_job: { Args: { p_job_id: string }; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      get_my_role: { Args: Record<string, never>; Returns: UserRole };
    };
    Enums: {
      user_role: UserRole;
      vehicle_type: VehicleType;
      order_status: OrderStatus;
      leg_type: LegType;
      job_type: JobType;
      job_status: JobStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

