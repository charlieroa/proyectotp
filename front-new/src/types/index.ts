// =============================
// Auth / User
// =============================
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role_id: number;
  tenant_id: string;
  avatar?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface AuthUser {
  token: string;
  user: User;
  setup_complete: boolean;
}

// =============================
// Tenant
// =============================
export interface Tenant {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  currency?: string;
  timezone?: string;
  opening_time?: string;
  closing_time?: string;
  slot_duration?: number;
  allow_past_appointments?: boolean;
  setup_complete?: boolean;
  plan_id?: number;
  is_active?: boolean;
  created_at?: string;
}

// =============================
// Service
// =============================
export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  category_id?: string;
  tenant_id: string;
  is_active?: boolean;
  image?: string;
  category?: Category;
}

// =============================
// Category
// =============================
export interface Category {
  id: string;
  name: string;
  tenant_id: string;
  type?: string;
}

// =============================
// Appointment
// =============================
export interface Appointment {
  id: string;
  client_id: string;
  stylist_id: string;
  service_id: string;
  tenant_id: string;
  date: string;
  start_time: string;
  end_time?: string;
  status: string;
  notes?: string;
  check_in_time?: string;
  check_out_time?: string;
  created_at?: string;
  client?: User;
  stylist?: User;
  service?: Service;
}

// =============================
// Product
// =============================
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  stock: number;
  sku?: string;
  category_id?: string;
  tenant_id: string;
  image?: string;
  is_active?: boolean;
  category?: Category;
}

// =============================
// Payment
// =============================
export interface Payment {
  id: string;
  tenant_id: string;
  client_id?: string;
  total: number;
  subtotal: number;
  tax?: number;
  tip?: number;
  payment_method: string;
  cash_amount?: number;
  card_amount?: number;
  status: string;
  items: PaymentItem[];
  created_at?: string;
  client?: User;
}

export interface PaymentItem {
  id?: string;
  type: 'service' | 'product';
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  stylist_id?: string;
}

// =============================
// Payroll
// =============================
export interface Payroll {
  id: string;
  tenant_id: string;
  stylist_id: string;
  period_start: string;
  period_end: string;
  base_salary: number;
  commissions: number;
  deductions: number;
  total: number;
  status: string;
  stylist?: User;
}

// =============================
// Cash
// =============================
export interface CashSession {
  id: string;
  tenant_id: string;
  opened_by: string;
  opening_amount: number;
  closing_amount?: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
}

// =============================
// Stylist (extended user)
// =============================
export interface Stylist extends User {
  services?: Service[];
  schedule?: StylistSchedule[];
  commission_rate?: number;
}

export interface StylistSchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

// =============================
// Chat / AI
// =============================
export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

// =============================
// API Response
// =============================
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
