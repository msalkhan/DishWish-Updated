/*
# Dishwish — initial schema, security, and indexes

## Overview
Creates the complete table-ordering schema for Dishwish, an upscale Japanese-fusion
restaurant guest app (no sign-in — guests order from a scanned table QR). All tables
allow anon + authenticated read and insert so the anon-key frontend can operate.
orders, tables, and waiter_requests additionally allow anon update (status changes,
table status, waiter request resolution). No delete policies — guests never delete.

## New tables
1. tables — physical restaurant tables guests "scan" via QR.
   - id (uuid PK), table_number (int, unique), qr_token (text, unique),
     capacity (int), status (text default 'available'), created_at.
2. menu_items — the restaurant menu.
   - id (uuid PK), name (text, unique), description (text), price (numeric(10,2)),
     category (text), image_url (text), is_available (bool default true), created_at.
3. orders — a table's placed/active order.
   - id (uuid PK, internal), order_id (text, unique — human-readable receipt no.),
     table_number (int), items (jsonb summary of line items),
     subtotal, service_charge, tax, total (numeric(10,2)),
     status (text default 'received': received|preparing|served|completed),
     payment_status (text default 'unpaid': unpaid|pending|paid),
     created_at, updated_at.
4. order_items — line items belonging to an order.
   - id (uuid PK), order_id (uuid FK -> orders.id ON DELETE CASCADE),
     dish_id (uuid), dish_name (text), quantity (int), price (numeric(10,2)),
     notes (text), created_at.
5. payments — a payment record for an order.
   - id (uuid PK), order_id (uuid FK -> orders.id ON DELETE CASCADE),
     table_number (int), payment_method (text), tip_amount (numeric(10,2)),
     total_amount (numeric(10,2)), payment_status (text),
     stripe_payment_intent_id (text), created_at.
6. waiter_requests — guest calls for a waiter.
   - id (uuid PK), table_number (int), request_type (text), note (text),
     status (text default 'open'), created_at.
7. customer_feedback — post-meal ratings / receipt capture.
   - id (uuid PK), order_id (uuid), table_number (int), rating (int),
     compliments (text), guest_email (text), created_at.

## Indexes
- orders(table_number, status) — finding a table's active order.
- order_items(order_id) — loading an order's line items.
- menu_items(category) — category filtering.
- waiter_requests(table_number, status) — open requests per table.

## Security (RLS)
- RLS enabled on every table.
- Public (anon, authenticated) SELECT + INSERT on all tables.
- Public UPDATE on orders, tables, waiter_requests.
- No DELETE policy (guests do not delete).
*/

-- 1. tables
CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number int NOT NULL UNIQUE,
  qr_token text NOT NULL UNIQUE,
  capacity int NOT NULL DEFAULT 4,
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_tables" ON tables;
CREATE POLICY "public_select_tables" ON tables FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_tables" ON tables;
CREATE POLICY "public_insert_tables" ON tables FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_tables" ON tables;
CREATE POLICY "public_update_tables" ON tables FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. menu_items
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  category text NOT NULL,
  image_url text,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_menu_items" ON menu_items;
CREATE POLICY "public_select_menu_items" ON menu_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_menu_items" ON menu_items;
CREATE POLICY "public_insert_menu_items" ON menu_items FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 3. orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL UNIQUE,
  table_number int NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  service_charge numeric(10,2) NOT NULL DEFAULT 0,
  tax numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'received',
  payment_status text NOT NULL DEFAULT 'unpaid',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_orders" ON orders;
CREATE POLICY "public_select_orders" ON orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_orders" ON orders;
CREATE POLICY "public_insert_orders" ON orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_orders" ON orders;
CREATE POLICY "public_update_orders" ON orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_orders_table_status ON orders(table_number, status);

-- 4. order_items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  dish_id uuid,
  dish_name text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  price numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_order_items" ON order_items;
CREATE POLICY "public_select_order_items" ON order_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_order_items" ON order_items;
CREATE POLICY "public_insert_order_items" ON order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_order_items" ON order_items;
CREATE POLICY "public_update_order_items" ON order_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- 5. payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  table_number int,
  payment_method text NOT NULL,
  tip_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_payments" ON payments;
CREATE POLICY "public_select_payments" ON payments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_payments" ON payments;
CREATE POLICY "public_insert_payments" ON payments FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 6. waiter_requests
CREATE TABLE IF NOT EXISTS waiter_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number int NOT NULL,
  request_type text NOT NULL DEFAULT 'call',
  note text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE waiter_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_waiter_requests" ON waiter_requests;
CREATE POLICY "public_select_waiter_requests" ON waiter_requests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_waiter_requests" ON waiter_requests;
CREATE POLICY "public_insert_waiter_requests" ON waiter_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_waiter_requests" ON waiter_requests;
CREATE POLICY "public_update_waiter_requests" ON waiter_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_waiter_table_status ON waiter_requests(table_number, status);

-- 7. customer_feedback
CREATE TABLE IF NOT EXISTS customer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  table_number int,
  rating int,
  compliments text,
  guest_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_customer_feedback" ON customer_feedback;
CREATE POLICY "public_select_customer_feedback" ON customer_feedback FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_customer_feedback" ON customer_feedback;
CREATE POLICY "public_insert_customer_feedback" ON customer_feedback FOR INSERT TO anon, authenticated WITH CHECK (true);

-- index menu by category
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
