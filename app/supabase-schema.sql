-- Supabase DDL for 小家账本
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  avatar_url text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ledgers
create table ledgers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('personal','couple','family','roommate','travel','project')),
  currency text not null default 'CNY',
  cover_icon text default 'home',
  owner_id uuid not null references profiles(id),
  default_account_id uuid,
  default_split_method text default 'equal',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ledger Members
create table ledger_members (
  id uuid primary key default uuid_generate_v4(),
  ledger_id uuid not null references ledgers(id) on delete cascade,
  user_id uuid not null references profiles(id),
  role text not null check (role in ('owner','admin','member','viewer')),
  display_name text not null,
  avatar_url text,
  joined_at timestamptz default now(),
  status text default 'active',
  unique(ledger_id, user_id)
);

-- Categories
create table categories (
  id uuid primary key default uuid_generate_v4(),
  ledger_id uuid not null references ledgers(id) on delete cascade,
  name text not null,
  parent_id uuid references categories(id),
  type text not null check (type in ('expense','income','transfer')),
  icon text default '📌',
  color text default '#9E9E9E',
  sort_order integer default 0,
  is_system boolean default false,
  created_at timestamptz default now()
);

-- Accounts
create table accounts (
  id uuid primary key default uuid_generate_v4(),
  ledger_id uuid not null references ledgers(id) on delete cascade,
  name text not null,
  type text not null check (type in ('asset','liability','credit')),
  sub_type text,
  balance numeric(12,2) default 0,
  currency text default 'CNY',
  owner_type text default 'personal' check (owner_type in ('personal','partner','shared')),
  owner_user_id uuid references profiles(id),
  is_included_in_net_worth boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Transactions
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  ledger_id uuid not null references ledgers(id) on delete cascade,
  type text not null check (type in ('expense','income','transfer','reimbursement','borrow_in','borrow_out')),
  amount numeric(12,2) not null,
  currency text default 'CNY',
  category_id uuid references categories(id),
  account_id uuid references accounts(id),
  creator_user_id uuid not null references profiles(id),
  payer_user_id uuid references profiles(id),
  scope text default 'personal' check (scope in ('personal','shared')),
  occurred_at timestamptz default now(),
  note text,
  tags text[] default '{}',
  image_urls text[] default '{}',
  is_private boolean default false,
  privacy_level text default 'public' check (privacy_level in ('public','partial','private')),
  is_included_in_budget boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Splits
create table splits (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  ledger_id uuid not null references ledgers(id) on delete cascade,
  method text not null check (method in ('equal','ratio','custom','single','none')),
  created_at timestamptz default now()
);

-- Split Items
create table split_items (
  id uuid primary key default uuid_generate_v4(),
  split_id uuid not null references splits(id) on delete cascade,
  user_id uuid not null references profiles(id),
  should_pay numeric(12,2) default 0,
  actual_paid numeric(12,2) default 0
);

-- Settlements
create table settlements (
  id uuid primary key default uuid_generate_v4(),
  ledger_id uuid not null references ledgers(id) on delete cascade,
  from_user_id uuid not null references profiles(id),
  to_user_id uuid not null references profiles(id),
  amount numeric(12,2) not null,
  status text default 'pending' check (status in ('pending','settled','cancelled')),
  related_transaction_ids uuid[] default '{}',
  created_at timestamptz default now(),
  settled_at timestamptz
);

-- Budgets
create table budgets (
  id uuid primary key default uuid_generate_v4(),
  ledger_id uuid not null references ledgers(id) on delete cascade,
  name text not null,
  period text default 'monthly',
  amount numeric(12,2) not null,
  category_id uuid references categories(id),
  member_user_id uuid references profiles(id),
  scope text default 'shared',
  start_date date not null,
  end_date date not null,
  alert_thresholds numeric[] default '{0.8, 1.0}',
  created_at timestamptz default now()
);

-- Goals
create table goals (
  id uuid primary key default uuid_generate_v4(),
  ledger_id uuid not null references ledgers(id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null,
  current_amount numeric(12,2) default 0,
  currency text default 'CNY',
  deadline date,
  participants uuid[] default '{}',
  status text default 'active',
  created_at timestamptz default now()
);

-- Tags
create table tags (
  id uuid primary key default uuid_generate_v4(),
  ledger_id uuid not null references ledgers(id) on delete cascade,
  name text not null,
  color text default '#999999',
  created_at timestamptz default now()
);

-- ============ Row Level Security ============

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table ledgers enable row level security;
alter table ledger_members enable row level security;
alter table categories enable row level security;
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table splits enable row level security;
alter table split_items enable row level security;
alter table settlements enable row level security;
alter table budgets enable row level security;
alter table goals enable row level security;
alter table tags enable row level security;

-- Profiles: users can read/update own profile
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Ledgers: members can view, owner can manage
create policy "Members can view ledger" on ledgers for select using (
  exists (select 1 from ledger_members where ledger_id = ledgers.id and user_id = auth.uid())
);
create policy "Owner can update ledger" on ledgers for update using (owner_id = auth.uid());
create policy "Authenticated users can create ledger" on ledgers for insert with check (auth.uid() = owner_id);

-- Ledger members: members can view, owner can manage
create policy "Members can view members" on ledger_members for select using (
  exists (select 1 from ledger_members lm where lm.ledger_id = ledger_members.ledger_id and lm.user_id = auth.uid())
);
create policy "Owner can manage members" on ledger_members for all using (
  exists (select 1 from ledgers where id = ledger_members.ledger_id and owner_id = auth.uid())
);

-- Categories, Accounts, Transactions: accessible to ledger members
create policy "Members can view categories" on categories for select using (
  exists (select 1 from ledger_members where ledger_id = categories.ledger_id and user_id = auth.uid())
);
create policy "Members can manage categories" on categories for all using (
  exists (select 1 from ledger_members where ledger_id = categories.ledger_id and user_id = auth.uid() and role in ('owner','admin','member'))
);

create policy "Members can view accounts" on accounts for select using (
  exists (select 1 from ledger_members where ledger_id = accounts.ledger_id and user_id = auth.uid())
);
create policy "Members can manage accounts" on accounts for all using (
  exists (select 1 from ledger_members where ledger_id = accounts.ledger_id and user_id = auth.uid() and role in ('owner','admin','member'))
);

create policy "Members can view transactions" on transactions for select using (
  exists (select 1 from ledger_members where ledger_id = transactions.ledger_id and user_id = auth.uid())
  and (not is_private or creator_user_id = auth.uid())
);
create policy "Members can create transactions" on transactions for insert with check (
  exists (select 1 from ledger_members where ledger_id = transactions.ledger_id and user_id = auth.uid() and role in ('owner','admin','member'))
);
create policy "Creator can update own transactions" on transactions for update using (
  creator_user_id = auth.uid() or exists (select 1 from ledger_members where ledger_id = transactions.ledger_id and user_id = auth.uid() and role = 'owner')
);

-- Splits: accessible via transaction access
create policy "Members can view splits" on splits for select using (
  exists (select 1 from ledger_members where ledger_id = splits.ledger_id and user_id = auth.uid())
);
create policy "Members can manage splits" on splits for all using (
  exists (select 1 from ledger_members where ledger_id = splits.ledger_id and user_id = auth.uid() and role in ('owner','admin','member'))
);

-- Split items
create policy "Members can view split items" on split_items for select using (
  exists (select 1 from splits s join ledger_members lm on lm.ledger_id = s.ledger_id where s.id = split_items.split_id and lm.user_id = auth.uid())
);
create policy "Members can manage split items" on split_items for all using (
  exists (select 1 from splits s join ledger_members lm on lm.ledger_id = s.ledger_id where s.id = split_items.split_id and lm.user_id = auth.uid() and lm.role in ('owner','admin','member'))
);

-- Settlements
create policy "Members can view settlements" on settlements for select using (
  exists (select 1 from ledger_members where ledger_id = settlements.ledger_id and user_id = auth.uid())
);
create policy "Members can manage settlements" on settlements for all using (
  exists (select 1 from ledger_members where ledger_id = settlements.ledger_id and user_id = auth.uid() and role in ('owner','admin','member'))
);

-- Budgets, Goals, Tags: same pattern
create policy "Members can view budgets" on budgets for select using (
  exists (select 1 from ledger_members where ledger_id = budgets.ledger_id and user_id = auth.uid())
);
create policy "Members can manage budgets" on budgets for all using (
  exists (select 1 from ledger_members where ledger_id = budgets.ledger_id and user_id = auth.uid() and role in ('owner','admin'))
);

create policy "Members can view goals" on goals for select using (
  exists (select 1 from ledger_members where ledger_id = goals.ledger_id and user_id = auth.uid())
);
create policy "Members can manage goals" on goals for all using (
  exists (select 1 from ledger_members where ledger_id = goals.ledger_id and user_id = auth.uid() and role in ('owner','admin','member'))
);

create policy "Members can view tags" on tags for select using (
  exists (select 1 from ledger_members where ledger_id = tags.ledger_id and user_id = auth.uid())
);
create policy "Members can manage tags" on tags for all using (
  exists (select 1 from ledger_members where ledger_id = tags.ledger_id and user_id = auth.uid() and role in ('owner','admin','member'))
);
