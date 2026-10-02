-- Quán — database schema. Paste into Supabase → SQL Editor → Run.

create table if not exists public.stalls (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null unique references auth.users(id) on delete cascade,
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 60),
  name        text not null check (length(name) between 1 and 120),
  area        text not null default '',
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.dishes (
  id         uuid primary key default gen_random_uuid(),
  stall_id   uuid not null references public.stalls(id) on delete cascade,
  position   int  not null default 0,
  vi         text not null check (length(vi) between 1 and 200),
  price      int  not null default 0 check (price >= 0),
  spice      smallint not null default 0 check (spice between 0 and 3),
  allergens  text[] not null default '{}',
  pron       text not null default '',
  name       jsonb,          -- {"en","ko","zh","ja"}
  descr      jsonb           -- {"en","ko","zh","ja"}
);
create index if not exists dishes_stall_idx on public.dishes(stall_id, position);

alter table public.stalls enable row level security;
alter table public.dishes enable row level security;

-- Anyone can read a published stall; owners can always read their own.
drop policy if exists stalls_read on public.stalls;
create policy stalls_read on public.stalls for select
  using (published or owner_id = auth.uid());
drop policy if exists stalls_write on public.stalls;
create policy stalls_write on public.stalls for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists dishes_read on public.dishes;
create policy dishes_read on public.dishes for select
  using (exists (select 1 from public.stalls s where s.id = stall_id and (s.published or s.owner_id = auth.uid())));
drop policy if exists dishes_write on public.dishes;
create policy dishes_write on public.dishes for all
  using (exists (select 1 from public.stalls s where s.id = stall_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stalls s where s.id = stall_id and s.owner_id = auth.uid()));

-- Saves the stall and replaces its dishes in one transaction.
create or replace function public.save_menu(
  p_name text, p_area text, p_slug text, p_published boolean, p_dishes jsonb
) returns public.stalls
language plpgsql security invoker as $$
declare s public.stalls;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;

  insert into public.stalls (owner_id, slug, name, area, published)
  values (auth.uid(), p_slug, p_name, coalesce(p_area, ''), p_published)
  on conflict (owner_id) do update
    set slug = excluded.slug, name = excluded.name, area = excluded.area,
        published = excluded.published, updated_at = now()
  returning * into s;

  delete from public.dishes where stall_id = s.id;

  insert into public.dishes (stall_id, position, vi, price, spice, allergens, pron, name, descr)
  select s.id, (d.ord - 1)::int,
         d.v->>'vi',
         greatest(0, coalesce((d.v->>'price')::int, 0)),
         least(3, greatest(0, coalesce((d.v->>'spice')::int, 0)))::smallint,
         coalesce(array(select jsonb_array_elements_text(coalesce(d.v->'alg', '[]'::jsonb))), '{}'),
         coalesce(d.v->>'pron', ''),
         d.v->'name',
         d.v->'desc'
  from jsonb_array_elements(p_dishes) with ordinality as d(v, ord)
  where coalesce(trim(d.v->>'vi'), '') <> '';

  return s;
end $$;
