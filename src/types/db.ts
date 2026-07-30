export type TableStatus = 'available' | 'occupied' | 'reserved';
export type OrderStatus = 'received' | 'preparing' | 'served' | 'completed';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  plan: string;
  created_at: string;
  updated_at: string;
}

export interface RestaurantTable {
  id: string;
  table_number: number;
  qr_token: string;
  capacity: number;
  status: string;
  restaurant_id: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  is_available: boolean;
  restaurant_id: string;
  created_at: string;
}

export interface OrderItemSummary {
  dish_id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  order_id: string;
  table_number: number;
  restaurant_id: string;
  items: OrderItemSummary[];
  subtotal: number;
  service_charge: number;
  tax: number;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  dish_id: string | null;
  dish_name: string;
  quantity: number;
  price: number;
  notes: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string | null;
  table_number: number | null;
  payment_method: string;
  tip_amount: number;
  total_amount: number;
  payment_status: string;
  stripe_payment_intent_id: string | null;
  created_at: string;
}

export interface WaiterRequest {
  id: string;
  table_number: number;
  restaurant_id: string;
  request_type: string;
  note: string | null;
  status: string;
  created_at: string;
}

export interface CustomerFeedback {
  id: string;
  order_id: string | null;
  table_number: number | null;
  restaurant_id: string;
  rating: number | null;
  compliments: string | null;
  guest_email: string | null;
  created_at: string;
}

export const MENU_CATEGORIES = [
  'Small Plates',
  'Sushi & Sashimi',
  'Ramen & Noodles',
  'Robata Grill',
  'Fusion Mains',
  'Desserts',
  'Drinks',
] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export const ORDER_STATUSES: OrderStatus[] = ['received', 'preparing', 'served', 'completed'];
export const ORDER_STATUS_LABELS: Record<string, string> = {
  received: 'Received',
  preparing: 'Preparing',
  served: 'Served',
  completed: 'Completed',
};

export const SERVICE_CHARGE_RATE = 0.1;
export const TAX_RATE = 0.08;
