Putry Agency - React + Supabase Starter
-------------------------------------

What's included:
- React (Vite) starter app
- Tailwind CSS (setup ready)
- Pages: Login, Register, Feed, Profile, EditProfile, Admin Dashboard
- Supabase service client (src/services/supabase.js)
- SQL schema (supabase_schema.sql) to create tables and indexes
- .env.example with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

Quickstart:
1. Sign up at https://supabase.com and create a project.
2. In Supabase SQL Editor, run supabase_schema.sql to create tables.
3. Create a Storage bucket named 'avatars' (public or with proper policies).
4. Copy .env.example to .env.local and fill values.
5. Install dependencies: npm install
6. Run: npm run dev
7. Deploy frontend to Vercel (connect repo or deploy via CLI). Set environment variables in Vercel dashboard.

Security notes:
- For admin-only actions (changing roles, banning, bulk operations) use server-side functions or Edge Functions with Supabase service_role key. Do NOT expose service_role key in the browser.
- Enable Row Level Security (RLS) and create policies for tables (profiles, posts, dm_messages, notifications, etc.) as needed.
