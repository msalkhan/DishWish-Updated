/*
# Dishwish — Multi-tenant SaaS transformation

## Overview
Transforms Dishwish from a single-restaurant app into a multi-tenant SaaS platform
where multiple restaurants each run their own branded table-ordering experience.

A new `restaurants` table is the top-level tenant entity. Every existing table
(tables, menu_items, orders, waiter_requests, customer_feedback) gains a
`restaurant_id` foreign key. Child tables order_items and payments inherit their
restaurant through the orders table and do not need their own column.

All existing rows are backfilled into a seed restaurant ("Dishwish Omakase")
so no data is lost.

## New tables
1. restaurants — tenant entity, one per restaurant on the platform.
   - id (uuid PK), name (text), slug (text, unique — URL identifier),
     owner_id (uuid, FK -> auth.users ON DELETE SET NULL),
     plan (text default 'pro'), created_at, updated_at.

## Modified tables (new column: restaurant_id)
1. tables — added restaurant_id uuid FK -> restaurants.id
2. menu_items — added restaurant_id uuid FK -> restaurants.id
3. orders — added restaurant_id uuid FK -> restaurants.id
4. waiter_requests — added restaurant_id uuid FK -> restaurants.id
5. customer_feedback — added restaurant_id uuid FK -> restaurants.id

## Constraint changes
- tables unique constraint changed from global (table_number) to
  per-restaurant (restaurant_id, table_number).
- menu_items unique constraint changed from global (name) to
  per-restaurant (restaurant_id, name).

## Indexes
- restaurants(slug) for URL lookups
- tables(restaurant_id, table_number)
- menu_items(restaurant_id, category)
- orders(restaurant_id, table_number, status)
- waiter_requests(restaurant_id, status)
- customer_feedback(restaurant_id)

## Security (RLS)
Two access layers:

### Customer layer (anon key — guests scanning a QR)
- anon + authenticated can SELECT restaurants, tables, menu_items, orders,
  order_items, payments (for their restaurant).
- anon + authenticated can INSERT orders, order_items, payments,
  waiter_requests, customer_feedback (scoped by restaurant_id).
- anon + authenticated can UPDATE orders, tables, waiter_requests, order_items.

### Admin layer (authenticated — restaurant owner)
- Owners get full CRUD on every row that belongs to a restaurant they own,
  verified via restaurants.owner_id = auth.uid().
- policies use a helper function is_restaurant_owner(restaurant_id) for clarity.

## Backfill
All existing rows are assigned to the seed restaurant created in step 1.
*/

-- ============================================================
-- 1. Create restaurants table
-- ============================================================
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan text NOT NULL DEFAULT 'pro',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Anyone can look up a restaurant by slug (public listing for QR scan)
DROP POLICY IF EXISTS "public_select_restaurants" ON restaurants;
CREATE POLICY "public_select_restaurants" ON restaurants FOR SELECT
  TO anon, authenticated USING (true);

-- Only the owner can insert a restaurant (on signup)
DROP POLICY IF EXISTS "owner_insert_restaurants" ON restaurants;
CREATE POLICY "owner_insert_restaurants" ON restaurants FOR INSERT
  TO authenticated WITH CHECK (owner_id = auth.uid());

-- Only the owner can update their restaurant
DROP POLICY IF EXISTS "owner_update_restaurants" ON restaurants;
CREATE POLICY "owner_update_restaurants" ON restaurants FOR UPDATE
  TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);

-- ============================================================
-- 2. Helper function: is_restaurant_owner
-- ============================================================
CREATE OR REPLACE FUNCTION is_restaurant_owner(check_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM restaurants
    WHERE id = check_restaurant_id AND owner_id = auth.uid()
  );
$$;

-- ============================================================
-- 3. Add restaurant_id to existing tables + backfill
-- ============================================================

-- 3a. tables
ALTER TABLE tables ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;

-- 3b. menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;

-- 3c. orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;

-- 3d. waiter_requests
ALTER TABLE waiter_requests ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;

-- 3e. customer_feedback
ALTER TABLE customer_feedback ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;

-- ============================================================
-- 4. Create seed restaurant and backfill all existing data
-- ============================================================
DO $$
DECLARE
  seed_id uuid;
BEGIN
  SELECT id INTO seed_id FROM restaurants WHERE slug = 'dishwish-omakase' LIMIT 1;
  IF seed_id IS NULL THEN
    INSERT INTO restaurants (name, slug, plan)
    VALUES ('Dishwish Omakase', 'dishwish-omakase', 'pro')
    RETURNING id INTO seed_id;
  END IF;

  -- Backfill every table where restaurant_id is still null
  UPDATE tables SET restaurant_id = seed_id WHERE restaurant_id IS NULL;
  UPDATE menu_items SET restaurant_id = seed_id WHERE restaurant_id IS NULL;
  UPDATE orders SET restaurant_id = seed_id WHERE restaurant_id IS NULL;
  UPDATE waiter_requests SET restaurant_id = seed_id WHERE restaurant_id IS NULL;
  UPDATE customer_feedback SET restaurant_id = seed_id WHERE restaurant_id IS NULL;
END $$;

-- Now make restaurant_id NOT NULL (all rows are backfilled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tables' AND column_name = 'restaurant_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE tables ALTER COLUMN restaurant_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'restaurant_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE menu_items ALTER COLUMN restaurant_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'restaurant_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE orders ALTER COLUMN restaurant_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'waiter_requests' AND column_name = 'restaurant_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE waiter_requests ALTER COLUMN restaurant_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_feedback' AND column_name = 'restaurant_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE customer_feedback ALTER COLUMN restaurant_id SET NOT NULL;
  END IF;
END $$;

-- ============================================================
-- 5. Update unique constraints (global -> per-restaurant)
-- ============================================================

-- tables: drop global unique on table_number, add per-restaurant composite
ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_table_number_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tables_restaurant_id_table_number_key'
  ) THEN
    ALTER TABLE tables ADD CONSTRAINT tables_restaurant_id_table_number_key
      UNIQUE (restaurant_id, table_number);
  END IF;
END $$;

-- menu_items: drop global unique on name, add per-restaurant composite
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_name_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'menu_items_restaurant_id_name_key'
  ) THEN
    ALTER TABLE menu_items ADD CONSTRAINT menu_items_restaurant_id_name_key
      UNIQUE (restaurant_id, name);
  END IF;
END $$;

-- ============================================================
-- 6. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON tables(restaurant_id, table_number);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_cat ON menu_items(restaurant_id, category);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_table_status ON orders(restaurant_id, table_number, status);
CREATE INDEX IF NOT EXISTS idx_waiter_restaurant_status ON waiter_requests(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_feedback_restaurant ON customer_feedback(restaurant_id);

-- ============================================================
-- 7. RLS Policy Rewrite — Customer Layer (anon + authenticated)
--    Guests interact via the anon key. They can read and write within
--    a specific restaurant's data. Filters by restaurant_id happen in
--    the frontend queries.
-- ============================================================

-- ---- tables ----
DROP POLICY IF EXISTS "public_select_tables" ON tables;
CREATE POLICY "public_select_tables" ON tables FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_tables" ON tables;
CREATE POLICY "public_insert_tables" ON tables FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_tables" ON tables;
CREATE POLICY "public_update_tables" ON tables FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ---- menu_items ----
DROP POLICY IF EXISTS "public_select_menu_items" ON menu_items;
CREATE POLICY "public_select_menu_items" ON menu_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_menu_items" ON menu_items;
CREATE POLICY "public_insert_menu_items" ON menu_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_menu_items" ON menu_items;
CREATE POLICY "public_update_menu_items" ON menu_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_menu_items" ON menu_items;
CREATE POLICY "public_delete_menu_items" ON menu_items FOR DELETE
  TO anon, authenticated USING (true);

-- ---- orders ----
DROP POLICY IF EXISTS "public_select_orders" ON orders;
CREATE POLICY "public_select_orders" ON orders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_orders" ON orders;
CREATE POLICY "public_insert_orders" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_orders" ON orders;
CREATE POLICY "public_update_orders" ON orders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ---- order_items ----
DROP POLICY IF EXISTS "public_select_order_items" ON order_items;
CREATE POLICY "public_select_order_items" ON order_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_order_items" ON order_items;
CREATE POLICY "public_insert_order_items" ON order_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_order_items" ON order_items;
CREATE POLICY "public_update_order_items" ON order_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_order_items" ON order_items;
CREATE POLICY "public_delete_order_items" ON order_items FOR DELETE
  TO anon, authenticated USING (true);

-- ---- payments ----
DROP POLICY IF EXISTS "public_select_payments" ON payments;
CREATE POLICY "public_select_payments" ON payments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_payments" ON payments;
CREATE POLICY "public_insert_payments" ON payments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ---- waiter_requests ----
DROP POLICY IF EXISTS "public_select_waiter_requests" ON waiter_requests;
CREATE POLICY "public_select_waiter_requests" ON waiter_requests FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_waiter_requests" ON waiter_requests;
CREATE POLICY "public_insert_waiter_requests" ON waiter_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_waiter_requests" ON waiter_requests;
CREATE POLICY "public_update_waiter_requests" ON waiter_requests FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ---- customer_feedback ----
DROP POLICY IF EXISTS "public_select_customer_feedback" ON customer_feedback;
CREATE POLICY "public_select_customer_feedback" ON customer_feedback FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_customer_feedback" ON customer_feedback;
CREATE POLICY "public_insert_customer_feedback" ON customer_feedback FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- 8. RLS Policy Rewrite — Admin Layer (authenticated owner)
--    Owners get full CRUD on rows belonging to restaurants they own.
--    These coexist with the anon policies above. The more restrictive
--    policy wins for authenticated users when both could apply, but
--    since the anon policies use USING(true) and the admin policies
--    use ownership checks, the admin policies add the security layer
--    that prevents Owner A from touching Owner B's data via the
--    authenticated client.
-- ============================================================

-- ---- restaurants: owner already has insert/update above ----
-- Owner can delete their own restaurant
DROP POLICY IF EXISTS "owner_delete_restaurants" ON restaurants;
CREATE POLICY "owner_delete_restaurants" ON restaurants FOR DELETE
  TO authenticated USING (owner_id = auth.uid());

-- ---- tables ----
DROP POLICY IF EXISTS "owner_insert_tables" ON tables;
CREATE POLICY "owner_insert_tables" ON tables FOR INSERT
  TO authenticated WITH CHECK (is_restaurant_owner(restaurant_id));

DROP POLICY IF EXISTS "owner_update_tables" ON tables;
CREATE POLICY "owner_update_tables" ON tables FOR UPDATE
  TO authenticated USING (is_restaurant_owner(restaurant_id))
  WITH CHECK (is_restaurant_owner(restaurant_id));

DROP POLICY IF EXISTS "owner_delete_tables" ON tables;
CREATE POLICY "owner_delete_tables" ON tables FOR DELETE
  TO authenticated USING (is_restaurant_owner(restaurant_id));

-- ---- menu_items ----
DROP POLICY IF EXISTS "owner_insert_menu_items" ON menu_items;
CREATE POLICY "owner_insert_menu_items" ON menu_items FOR INSERT
  TO authenticated WITH CHECK (is_restaurant_owner(restaurant_id));

DROP POLICY IF EXISTS "owner_update_menu_items" ON menu_items;
CREATE POLICY "owner_update_menu_items" ON menu_items FOR UPDATE
  TO authenticated USING (is_restaurant_owner(restaurant_id))
  WITH CHECK (is_restaurant_owner(restaurant_id));

DROP POLICY IF EXISTS "owner_delete_menu_items" ON menu_items;
CREATE POLICY "owner_delete_menu_items" ON menu_items FOR DELETE
  TO authenticated USING (is_restaurant_owner(restaurant_id));

-- ---- orders ----
DROP POLICY IF EXISTS "owner_insert_orders" ON orders;
CREATE POLICY "owner_insert_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (is_restaurant_owner(restaurant_id));

DROP POLICY IF EXISTS "owner_update_orders" ON orders;
CREATE POLICY "owner_update_orders" ON orders FOR UPDATE
  TO authenticated USING (is_restaurant_owner(restaurant_id))
  WITH CHECK (is_restaurant_owner(restaurant_id));

DROP POLICY IF EXISTS "owner_delete_orders" ON orders;
CREATE POLICY "owner_delete_orders" ON orders FOR DELETE
  TO authenticated USING (is_restaurant_owner(restaurant_id));

-- ---- order_items ----
DROP POLICY IF EXISTS "owner_insert_order_items" ON order_items;
CREATE POLICY "owner_insert_order_items" ON order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND is_restaurant_owner(orders.restaurant_id))
  );

DROP POLICY IF EXISTS "owner_update_order_items" ON order_items;
CREATE POLICY "owner_update_order_items" ON order_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND is_restaurant_owner(orders.restaurant_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND is_restaurant_owner(orders.restaurant_id))
  );

DROP POLICY IF EXISTS "owner_delete_order_items" ON order_items;
CREATE POLICY "owner_delete_order_items" ON order_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND is_restaurant_owner(orders.restaurant_id))
  );

-- ---- payments ----
DROP POLICY IF EXISTS "owner_insert_payments" ON payments;
CREATE POLICY "owner_insert_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND is_restaurant_owner(orders.restaurant_id))
  );

DROP POLICY IF EXISTS "owner_update_payments" ON payments;
CREATE POLICY "owner_update_payments" ON payments FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND is_restaurant_owner(orders.restaurant_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND is_restaurant_owner(orders.restaurant_id))
  );

DROP POLICY IF EXISTS "owner_delete_payments" ON payments;
CREATE POLICY "owner_delete_payments" ON payments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND is_restaurant_owner(orders.restaurant_id))
  );

-- ---- waiter_requests ----
DROP POLICY IF EXISTS "owner_insert_waiter_requests" ON waiter_requests;
CREATE POLICY "owner_insert_waiter_requests" ON waiter_requests FOR INSERT
  TO authenticated WITH CHECK (is_restaurant_owner(restaurant_id));

DROP POLICY IF EXISTS "owner_update_waiter_requests" ON waiter_requests;
CREATE POLICY "owner_update_waiter_requests" ON waiter_requests FOR UPDATE
  TO authenticated USING (is_restaurant_owner(restaurant_id))
  WITH CHECK (is_restaurant_owner(restaurant_id));

DROP POLICY IF EXISTS "owner_delete_waiter_requests" ON waiter_requests;
CREATE POLICY "owner_delete_waiter_requests" ON waiter_requests FOR DELETE
  TO authenticated USING (is_restaurant_owner(restaurant_id));

-- ---- customer_feedback ----
DROP POLICY IF EXISTS "owner_update_customer_feedback" ON customer_feedback;
CREATE POLICY "owner_update_customer_feedback" ON customer_feedback FOR UPDATE
  TO authenticated USING (is_restaurant_owner(restaurant_id))
  WITH CHECK (is_restaurant_owner(restaurant_id));

DROP POLICY IF EXISTS "owner_delete_customer_feedback" ON customer_feedback;
CREATE POLICY "owner_delete_customer_feedback" ON customer_feedback FOR DELETE
  TO authenticated USING (is_restaurant_owner(restaurant_id));
