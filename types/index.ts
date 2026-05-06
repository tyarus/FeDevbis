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
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  image_url?: string;
  status?: "active" | "inactive";
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
