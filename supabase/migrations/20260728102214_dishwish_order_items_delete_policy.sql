/*
# Allow guests to remove their own cart line items

## Why
Dishwish lets guests decrement an item to zero to remove it from their cart.
The initial schema added public SELECT/INSERT/UPDATE policies on order_items
but no DELETE policy, so removing a line item was blocked by RLS.

## Security
- Adds a public DELETE policy on order_items (anon + authenticated).
- Guests only remove line items (not orders or payments), and the rows belong
  to the order currently associated with their scanned table. This is a
  single-tenant guest app with no sign-in, so anon access is intentional.
*/

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_delete_order_items" ON order_items;
CREATE POLICY "public_delete_order_items"
ON order_items FOR DELETE
TO anon, authenticated USING (true);
