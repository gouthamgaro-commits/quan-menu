/**
 * Database tables. The app creates them by itself the first time it connects (see db.ts),
 * so there is nothing to paste into Supabase. Everything lives in its own `store` schema,
 * so it can share a database with other apps without clashing.
 *
 * Raise SCHEMA_VERSION whenever SCHEMA_SQL changes; every statement must be safe to re-run.
 */
export const SCHEMA_VERSION = 3;

export const SCHEMA_SQL = /* sql */ `
-- Checked first so the app can run as a login that may not create schemas (one that only owns \`store\`).
do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'store') then
    create schema store;
  end if;
end $$;

create table if not exists store.meta (
  key   text primary key,
  value text not null
);

create table if not exists store.projects (
  id            integer generated always as identity primary key,
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 90),
  title         text not null check (length(title) between 3 and 160),
  summary       text not null default '',
  description   text not null default '',
  features      text[] not null default '{}',
  branches      text[] not null default '{}',
  category      text not null default 'software',
  level         text not null default 'major' check (level in ('mini', 'major', 'portfolio')),
  difficulty    smallint not null default 2 check (difficulty between 1 and 4),
  price         integer not null default 0 check (price >= 0),
  tech          text[] not null default '{}',
  includes      text[] not null default '{}',
  delivery_days smallint not null default 7 check (delivery_days between 1 and 180),
  image_url     text not null default '',
  featured      boolean not null default false,
  active        boolean not null default true,
  orders_count  integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- v3: portfolio / bootcamp projects as a third level.
alter table store.projects drop constraint if exists projects_level_check;
alter table store.projects add constraint projects_level_check check (level in ('mini', 'major', 'portfolio'));
create index if not exists projects_list_idx on store.projects (active, featured desc, orders_count desc);

create table if not exists store.orders (
  id               integer generated always as identity primary key,
  code             text not null unique,            -- short code people read out: K7Q3MZ
  token            text not null unique,            -- secret in the student's order link
  kind             text not null check (kind in ('catalog', 'custom')),
  project_id       integer references store.projects(id) on delete set null,
  title            text not null,
  details          jsonb not null default '{}',     -- idea text, domain, difficulty, add-ons, budget, notes
  student_name     text not null,
  phone            text not null,                   -- digits with country code: 919876543210
  email            text not null default '',
  college          text not null default '',
  branch           text not null default '',
  year             text not null default '',
  status           text not null default 'requested'
                   check (status in ('requested', 'quoted', 'in_progress', 'ready', 'delivered', 'cancelled')),
  price            integer check (price >= 0),      -- empty until a custom idea is quoted
  estimate_low     integer,
  estimate_high    integer,
  advance_percent  smallint not null default 50 check (advance_percent between 0 and 100),
  deadline         date,
  note_for_student text not null default '',
  admin_notes      text not null default '',
  delivery_link    text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists orders_status_idx on store.orders (status, created_at desc);
create index if not exists orders_phone_idx on store.orders (phone, created_at desc);

create table if not exists store.payments (
  id         integer generated always as identity primary key,
  order_id   integer not null references store.orders(id) on delete cascade,
  amount     integer not null check (amount > 0),
  utr        text not null default '',              -- UPI transaction reference the student typed
  method     text not null default 'upi',
  status     text not null default 'submitted' check (status in ('submitted', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists payments_order_idx on store.payments (order_id, created_at);
create index if not exists payments_status_idx on store.payments (status);

create table if not exists store.settings (
  id         smallint primary key default 1 check (id = 1),
  data       jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
insert into store.settings (id) values (1) on conflict (id) do nothing;

-- The conversation on each order: messages and price offers from either side.
create table if not exists store.messages (
  id           integer generated always as identity primary key,
  order_id     integer not null references store.orders(id) on delete cascade,
  sender       text not null check (sender in ('student', 'owner')),
  body         text not null default '',
  offer        integer check (offer > 0),            -- a price proposal, if this message makes one
  offer_status text check (offer_status in ('open', 'accepted', 'declined', 'replaced')),
  created_at   timestamptz not null default now()
);
create index if not exists messages_order_idx on store.messages (order_id, id);
alter table store.orders add column if not exists owner_read_at timestamptz;  -- last time the owner opened the chat

-- Wrong owner passwords, per address, to slow down guessing.
create table if not exists store.login_failures (
  id integer generated always as identity primary key,
  ip text not null default '',
  at timestamptz not null default now()
);
create index if not exists login_failures_ip_idx on store.login_failures (ip, at desc);

-- On Supabase: keep these tables out of its public REST API. Only this app's server reads them.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on schema store from anon, authenticated;
    revoke all on all tables in schema store from anon, authenticated;
  end if;
end $$;
`;
