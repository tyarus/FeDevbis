// User types
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "buyer" | "seller";
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Product types
export interface Product {
  id: string;
  seller_id: string;
  seller?: User;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url?: string;
  status: "active" | "inactive";
  game_category?: GameCategory;
  login_method?: LoginMethod;
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url?: string;
  status: "active" | "inactive";
  game_category?: GameCategory;
  login_method?: LoginMethod;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  image_url?: string;
  status?: "active" | "inactive";
  game_category?: GameCategory;
  login_method?: LoginMethod;
}

// Order types
export type OrderStatus = 
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refunded";

export type TransactionStatus =
  | "chat_open"
  | "account_verification"
  | "account_secured"
  | "device_cleanup"
  | "awaiting_completion_code"
  | "completed"
  | "disputed";

export type TransactionParticipantRole = "buyer" | "seller" | "admin" | "system";

export type TransactionMessageType =
  | "text"
  | "system"
  | "checklist_update"
  | "status_update"
  | "completion_code";

export interface TransactionChecklist {
  account_match: boolean;
  account_secured: boolean;
  seller_device_removed: boolean;
  completion_code_verified: boolean;
}

export interface TransactionChatMessage {
  id: string;
  order_id: string;
  sender_id: string;
  sender_role: TransactionParticipantRole;
  message: string;
  message_type: TransactionMessageType;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
  sender?: User;
}

export interface TransactionActivity {
  id: string;
  order_id: string;
  actor_id?: string;
  actor_role: TransactionParticipantRole;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface TransactionChatData {
  order_id: string;
  status: TransactionStatus;
  checklist: TransactionChecklist;
  completion_code?: string | null;
  completion_code_expires_at?: string | null;
  completion_code_verified_at?: string | null;
  participants?: User[];
  messages: TransactionChatMessage[];
  activities: TransactionActivity[];
  updated_at?: string;
}

export interface TransactionChatMessageInput {
  message: string;
  message_type?: TransactionMessageType;
}

export interface TransactionChecklistUpdateInput {
  account_match?: boolean;
  account_secured?: boolean;
  seller_device_removed?: boolean;
}

export interface TransactionCompletionCodeResponse {
  completion_code: string;
  expires_at?: string | null;
}

export interface TransactionCompletionCodeVerifyResponse {
  verified: boolean;
  status?: TransactionStatus;
  verified_at?: string | null;
}

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  buyer?: User;
  seller?: User;
  product?: Product;
  quantity: number;
  total_price: number;
  status: OrderStatus;
  transaction_status?: TransactionStatus;
  tracking_number?: string;
  payment_method?: string;
  payment_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderInput {
  product_id: string;
  quantity: number;
}

// Payment types
export type PaymentMethod = "bank_transfer" | "virtual_account" | "ewallet";

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  method: PaymentMethod;
  status: "pending" | "completed" | "failed" | "cancelled";
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentInput {
  order_id: string;
  payment_method: PaymentMethod;
}

// Auth types
export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: "buyer" | "seller";
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    total: number;
    per_page: number;
    last_page: number;
  };
}

// API Error
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// Game Category types
export type GameCategory = 
  | "mobile_legends"
  | "pubg_mobile"
  | "free_fire"
  | "efootball"
  | "fifa_26";

export interface GameCategoryOption {
  id: GameCategory;
  name: string;
  icon: string;
  image: string;
  description: string;
  color: string;
}

// Login Method types
export type LoginMethod = 
  | "facebook"
  | "google"
  | "x"
  | "konami_id"
  | "ea";

export interface LoginMethodOption {
  id: LoginMethod;
  name: string;
  icon: string;
  color: string;
}

export interface SecurityGuide {
  title: string;
  tips: string[];
  warnings: string[];
  resources: {
    label: string;
    url: string;
  }[];
}
