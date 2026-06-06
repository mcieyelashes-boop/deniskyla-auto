-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (synced from Clerk)
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  clerk_id text unique not null,
  email text,
  name text,
  plan text default 'free', -- free | pro | enterprise
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User settings (API keys, preferences)
create table if not exists public.user_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  key text not null,
  value text,
  updated_at timestamptz default now(),
  unique(user_id, key)
);

-- Custom agents per user
create table if not exists public.user_agents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  agent_data jsonb not null,
  created_at timestamptz default now()
);

-- Flow history per user
create table if not exists public.flow_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  flow_name text,
  agents jsonb,
  results jsonb,
  duration_ms integer,
  ran_at timestamptz default now()
);

-- Analytics per user
create table if not exists public.user_analytics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  stats jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- Row Level Security
alter table public.users enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_agents enable row level security;
alter table public.flow_history enable row level security;
alter table public.user_analytics enable row level security;

-- RLS Policies (users can only access their own data)
create policy "Users can view own data" on public.users for select using (clerk_id = current_setting('app.clerk_user_id', true));
create policy "Users can update own data" on public.users for update using (clerk_id = current_setting('app.clerk_user_id', true));
create policy "User settings access" on public.user_settings for all using (user_id in (select id from public.users where clerk_id = current_setting('app.clerk_user_id', true)));
create policy "User agents access" on public.user_agents for all using (user_id in (select id from public.users where clerk_id = current_setting('app.clerk_user_id', true)));
create policy "Flow history access" on public.flow_history for all using (user_id in (select id from public.users where clerk_id = current_setting('app.clerk_user_id', true)));
create policy "Analytics access" on public.user_analytics for all using (user_id in (select id from public.users where clerk_id = current_setting('app.clerk_user_id', true)));
