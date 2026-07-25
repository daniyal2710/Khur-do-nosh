# Khurd o Nosh — Order Management System

Full order-taking + reporting app for Khurd o Nosh, built with React + Vite + Tailwind + Supabase.

## Modules
- **POS** — category menu grid, cart, customer lookup/add, dine-in/takeaway/delivery, kitchen + customer slip (print + WhatsApp)
- **Dashboard** — today/week/month KPIs, live order queue (realtime, advance status), last 7 days, payment breakdown
- **Sales** — daily breakdown, deal performance
- **Products** — top products, revenue table
- **Area** — revenue by delivery area
- **Customers** — searchable list, tiers (Regular/Silver/New based on order count), WhatsApp

## Staff Login
- Simple Supabase Auth gate — no signup UI. Create staff accounts from **Supabase Dashboard → Authentication → Users → Add user** (set email + password).
- Every logged-in staff member has the same access (no roles/permissions yet — ask if you need RBAC like RS Apparels later).
- Note: RLS stays disabled on all tables (per project convention), so the login is a frontend session gate, not row-level enforcement. Fine for an internal single-location tool; revisit if this ever needs public/multi-tenant access.

## Setup

1. **Create a Supabase project** (or reuse an existing one).
2. Run `KHURDONOSH_SCHEMA.sql` in the Supabase SQL editor — this creates all tables, triggers, views, RLS disabled, and seeds the menu/categories/areas from the original design.
3. Copy `.env.example` to `.env` and fill in:
   ```
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   ```
4. Install & run:
   ```
   npm install
   npm run dev
   ```

## Deploy to Vercel
- Build command: `node node_modules/vite/bin/vite.js build` (avoids the standard `vite build` binary-permission issue on Vercel)
- Add the same `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as environment variables in Vercel project settings.
- Set up GitHub auto-deploy as usual.

## Notes
- RLS is disabled on all tables per project convention — this is a single-tenant internal tool, no per-row auth yet. Add SECURITY DEFINER RPCs later if you introduce staff logins/roles.
- Order numbers auto-generate from `#3001` via a Postgres sequence + trigger.
- Dashboard's live queue uses Supabase Realtime (`postgres_changes` on `orders`) — no manual refresh needed.
- Customer tier (Regular/Silver/New) is computed from `total_orders`, not stored — see `customer_tier()` SQL function for the thresholds if you want to tune them.
