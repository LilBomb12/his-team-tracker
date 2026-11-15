# HIS Team Tracker

Internal hospital HIS team tracking system.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill Supabase credentials.

3. Create a Supabase project. Run migration `supabase/migrations/0001_init.sql` in SQL editor. Then run `supabase/seed.sql`.

4. Create an admin user in Supabase Auth, then update their profile role to `admin`.

5. Run dev:
   ```bash
   npm run dev
   ```

6. Build:
   ```bash
   npm run build
   ```

## Deployment (Vercel)

- Connect repo to Vercel.
- Set env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.
- Deploy.

## Security

- Never expose service role key in browser.
- RLS enabled on all tables.
- Synthetic demo data only during development.
