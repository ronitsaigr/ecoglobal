-- EcoGlobal marketplace v1. Apply once to a NEW personal Supabase project.
-- Buyer RFQs, supplier onboarding, moderation, matching, quotes, private documents, notifications.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  account_type text not null default 'buyer' check (account_type in ('buyer','supplier')),
  created_at timestamptz not null default now()
);
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 160),
  country text not null,
  website text not null default '',
  description text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.supplier_private (
  supplier_id uuid primary key references public.suppliers(id) on delete cascade,
  contact_name text not null default '',
  contact_email text not null default '',
  contact_phone text not null default ''
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 160),
  category text not null check (category in ('Paper & board','Fiber alternatives','Flexible formats','Circular systems','Packaging components')),
  description text not null default '',
  min_order_quantity numeric(12,2) check (min_order_quantity is null or min_order_quantity > 0),
  unit text not null default 'units',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.rfqs (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 5 and 180),
  category text not null check (category in ('Paper & board','Fiber alternatives','Flexible formats','Circular systems','Packaging components')),
  details text not null check (length(trim(details)) between 10 and 5000),
  quantity numeric(12,2) not null check (quantity > 0),
  unit text not null default 'units',
  destination_country text not null,
  needed_by date,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);
create table if not exists public.rfq_matches (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (rfq_id,supplier_id)
);
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  unit_price numeric(14,2) not null check (unit_price > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  lead_time_days integer not null check (lead_time_days between 1 and 365),
  message text not null default '',
  status text not null default 'submitted' check (status in ('submitted','accepted','declined')),
  created_at timestamptz not null default now(),
  unique (rfq_id,supplier_id)
);
create unique index if not exists only_one_accepted_quote_per_rfq on public.quotes(rfq_id) where status='accepted';
create table if not exists public.supplier_documents (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  object_path text not null unique,
  document_type text not null default 'Supporting evidence',
  created_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  related_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists suppliers_one_org_per_owner on public.suppliers(owner_id);
create index if not exists suppliers_owner_idx on public.suppliers(owner_id);
create index if not exists products_supplier_idx on public.products(supplier_id);
create index if not exists products_category_status_idx on public.products(category,status);
create index if not exists rfqs_buyer_idx on public.rfqs(buyer_id);
create index if not exists rfq_matches_supplier_idx on public.rfq_matches(supplier_id);
create index if not exists quotes_rfq_idx on public.quotes(rfq_id);
create index if not exists notifications_user_idx on public.notifications(user_id,created_at desc);

create or replace function public.on_signup_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,full_name,account_type)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name',''),160),
          case when new.raw_user_meta_data->>'account_type'='supplier' then 'supplier' else 'buyer' end);
  return new;
end $$;
drop trigger if exists trg_ecoglobal_signup on auth.users;
create trigger trg_ecoglobal_signup after insert on auth.users for each row execute function public.on_signup_profile();

create or replace function public.is_platform_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.platform_admins where user_id=(select auth.uid()))
$$;
create or replace function public.owns_supplier(sid uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.suppliers where id=sid and owner_id=(select auth.uid()))
$$;
create or replace function public.owns_rfq(rid uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.rfqs where id=rid and buyer_id=(select auth.uid()))
$$;
create or replace function public.reset_supplier_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (new.name,new.country,new.website,new.description) is distinct from (old.name,old.country,old.website,old.description) then
    new.status:='pending'; new.review_note:='';
    update public.products set status='pending',review_note='' where supplier_id=old.id;
  end if;
  return new;
end $$;
drop trigger if exists trg_supplier_review on public.suppliers;
create trigger trg_supplier_review before update on public.suppliers for each row execute function public.reset_supplier_review();

create or replace function public.reset_product_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (new.name,new.category,new.description,new.min_order_quantity,new.unit)
     is distinct from (old.name,old.category,old.description,old.min_order_quantity,old.unit) then
    new.status:='pending'; new.review_note:='';
  end if;
  return new;
end $$;
drop trigger if exists trg_product_review on public.products;
create trigger trg_product_review before update on public.products for each row execute function public.reset_product_review();

create or replace function public.review_supplier(sid uuid, decision text, note text default '') returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.is_platform_admin() then raise exception 'Admin access required'; end if;
  if decision not in ('approved','rejected','pending') then raise exception 'Invalid decision'; end if;
  update public.suppliers set status=decision,review_note=left(coalesce(note,''),1000) where id=sid;
  if not found then raise exception 'Supplier not found'; end if;
  if decision <> 'approved' then update public.products set status='pending',review_note='' where supplier_id=sid; end if;
end $$;
create or replace function public.review_product(pid uuid, decision text, note text default '') returns void
language plpgsql security definer set search_path='' as $$
declare sid uuid;
begin
  if not public.is_platform_admin() then raise exception 'Admin access required'; end if;
  if decision not in ('approved','rejected','pending') then raise exception 'Invalid decision'; end if;
  select supplier_id into sid from public.products where id=pid;
  if sid is null then raise exception 'Product not found'; end if;
  if decision='approved' and not exists(select 1 from public.suppliers where id=sid and status='approved') then
    raise exception 'Approve the supplier first';
  end if;
  update public.products set status=decision,review_note=left(coalesce(note,''),1000) where id=pid;
  -- When a listing is approved, also match open requests submitted earlier.
  if decision='approved' then
    insert into public.rfq_matches(rfq_id,supplier_id)
    select r.id,p.supplier_id from public.products p
    join public.rfqs r on r.category=p.category and r.status='open'
    where p.id=pid and p.status='approved'
    order by r.created_at desc limit 200 on conflict do nothing;
  end if;
end $;
create or replace function public.invite_supplier(rid uuid, sid uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.is_platform_admin() then raise exception 'Admin access required'; end if;
  if not exists(select 1 from public.rfqs where id=rid and status='open') then raise exception 'Open RFQ required'; end if;
  if not exists(select 1 from public.suppliers where id=sid and status='approved') then raise exception 'Approved supplier required'; end if;
  insert into public.rfq_matches(rfq_id,supplier_id) values(rid,sid) on conflict do nothing;
end $$;
create or replace function public.auto_match_rfq() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.rfq_matches(rfq_id,supplier_id)
  select new.id,s.id from public.suppliers s
  where s.status='approved'
    and exists(select 1 from public.products p where p.supplier_id=s.id and p.status='approved' and p.category=new.category)
  order by s.created_at asc limit 25
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists trg_match_new_rfq on public.rfqs;
create trigger trg_match_new_rfq after insert on public.rfqs for each row execute function public.auto_match_rfq();

create or replace function public.notify_match() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.notifications(user_id,message,related_id)
  select owner_id,'New sourcing request matched to your company',new.rfq_id
  from public.suppliers where id=new.supplier_id;
  return new;
end $$;
drop trigger if exists trg_notify_match on public.rfq_matches;
create trigger trg_notify_match after insert on public.rfq_matches for each row execute function public.notify_match();

create or replace function public.notify_quote() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.notifications(user_id,message,related_id)
  select buyer_id,'A supplier submitted a quotation for your request',new.rfq_id
  from public.rfqs where id=new.rfq_id;
  return new;
end $$;
drop trigger if exists trg_notify_quote on public.quotes;
create trigger trg_notify_quote after insert on public.quotes for each row execute function public.notify_quote();

create or replace function public.validate_quote_decision() returns trigger language plpgsql set search_path='' as $$
begin
  if old.status <> 'submitted' or new.status not in ('accepted','declined') then
    raise exception 'Quotation decision cannot be changed again';
  end if;
  return new;
end $$;
drop trigger if exists trg_quote_decision on public.quotes;
create trigger trg_quote_decision before update on public.quotes for each row execute function public.validate_quote_decision();

-- Public access is limited to approved company/product descriptions.
alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.suppliers enable row level security;
alter table public.supplier_private enable row level security;
alter table public.products enable row level security;
alter table public.rfqs enable row level security;
alter table public.rfq_matches enable row level security;
alter table public.quotes enable row level security;
alter table public.supplier_documents enable row level security;
alter table public.notifications enable row level security;

create policy "profile owner read" on public.profiles for select to authenticated using(id=(select auth.uid()) or (select public.is_platform_admin()));
create policy "profile owner edit" on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy "admin membership read" on public.platform_admins for select to authenticated using(user_id=(select auth.uid()));
create policy "approved suppliers public read" on public.suppliers for select to anon,authenticated using(status='approved');
create policy "owner or admin supplier read" on public.suppliers for select to authenticated using(owner_id=(select auth.uid()) or (select public.is_platform_admin()));
create policy "supplier create" on public.suppliers for insert to authenticated with check(owner_id=(select auth.uid()));
create policy "supplier owner edit" on public.suppliers for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy "supplier private read" on public.supplier_private for select to authenticated using((select public.owns_supplier(supplier_id)) or (select public.is_platform_admin()));
create policy "supplier private create" on public.supplier_private for insert to authenticated with check((select public.owns_supplier(supplier_id)));
create policy "supplier private edit" on public.supplier_private for update to authenticated using((select public.owns_supplier(supplier_id))) with check((select public.owns_supplier(supplier_id)));
create policy "approved products public read" on public.products for select to anon,authenticated using(status='approved' and exists(select 1 from public.suppliers s where s.id=supplier_id and s.status='approved'));
create policy "owner or admin product read" on public.products for select to authenticated using((select public.owns_supplier(supplier_id)) or (select public.is_platform_admin()));
create policy "product owner create" on public.products for insert to authenticated with check((select public.owns_supplier(supplier_id)));
create policy "product owner edit" on public.products for update to authenticated using((select public.owns_supplier(supplier_id))) with check((select public.owns_supplier(supplier_id)));
create policy "rfq parties read" on public.rfqs for select to authenticated
using (buyer_id=(select auth.uid()) or (select public.is_platform_admin()) or exists(
  select 1 from public.rfq_matches m join public.suppliers s on s.id=m.supplier_id
  where m.rfq_id=rfqs.id and s.owner_id=(select auth.uid()) and s.status='approved'
));
create policy "buyer create rfq" on public.rfqs for insert to authenticated with check(buyer_id=(select auth.uid()));
create policy "buyer close rfq" on public.rfqs for update to authenticated using(buyer_id=(select auth.uid())) with check(buyer_id=(select auth.uid()));
create policy "rfq match parties read" on public.rfq_matches for select to authenticated using(
  (select public.owns_rfq(rfq_id)) or (select public.owns_supplier(supplier_id)) or (select public.is_platform_admin())
);
create policy "quote parties read" on public.quotes for select to authenticated using(
  (select public.owns_rfq(rfq_id)) or (select public.owns_supplier(supplier_id)) or (select public.is_platform_admin())
);
create policy "matched supplier creates quote" on public.quotes for insert to authenticated with check(
  (select public.owns_supplier(supplier_id))
  and exists(select 1 from public.suppliers s where s.id=supplier_id and s.status='approved')
  and exists(select 1 from public.rfq_matches m where m.rfq_id=quotes.rfq_id and m.supplier_id=quotes.supplier_id)
  and exists(select 1 from public.rfqs r where r.id=rfq_id and r.status='open')
);
create policy "buyer makes quote decision" on public.quotes for update to authenticated
using((select public.owns_rfq(rfq_id))) with check((select public.owns_rfq(rfq_id)));
create policy "documents owner or admin read" on public.supplier_documents for select to authenticated using(
  (select public.owns_supplier(supplier_id)) or (select public.is_platform_admin())
);
create policy "documents supplier add" on public.supplier_documents for insert to authenticated with check(
  (select public.owns_supplier(supplier_id)) and split_part(object_path,'/',1)=(select auth.uid())::text
);
create policy "notification recipient read" on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy "notification recipient mark read" on public.notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

-- Grants are intentionally column-scoped: a supplier cannot write review status,
-- a buyer cannot edit quotation prices, and a visitor cannot set admin membership.
revoke all on public.platform_admins,public.profiles,public.suppliers,public.supplier_private,public.products,public.rfqs,public.rfq_matches,public.quotes,public.supplier_documents,public.notifications from anon,authenticated;
grant select on public.suppliers,public.products to anon;
grant select on public.profiles,public.platform_admins,public.suppliers,public.supplier_private,public.products,public.rfqs,public.rfq_matches,public.quotes,public.supplier_documents,public.notifications to authenticated;
grant update(full_name) on public.profiles to authenticated;
grant insert(owner_id,name,country,website,description) on public.suppliers to authenticated;
grant update(name,country,website,description) on public.suppliers to authenticated;
grant insert(supplier_id,contact_name,contact_email,contact_phone) on public.supplier_private to authenticated;
grant update(contact_name,contact_email,contact_phone) on public.supplier_private to authenticated;
grant insert(supplier_id,name,category,description,min_order_quantity,unit) on public.products to authenticated;
grant update(name,category,description,min_order_quantity,unit) on public.products to authenticated;
grant insert(buyer_id,title,category,details,quantity,unit,destination_country,needed_by) on public.rfqs to authenticated;
grant update(status) on public.rfqs to authenticated;
grant insert(rfq_id,supplier_id,unit_price,currency,lead_time_days,message) on public.quotes to authenticated;
grant update(status) on public.quotes to authenticated;
grant insert(supplier_id,object_path,document_type) on public.supplier_documents to authenticated;
grant update(is_read) on public.notifications to authenticated;
revoke execute on function public.review_supplier(uuid,text,text),public.review_product(uuid,text,text),public.invite_supplier(uuid,uuid) from public,anon;
grant execute on function public.review_supplier(uuid,text,text),public.review_product(uuid,text,text),public.invite_supplier(uuid,uuid) to authenticated;
revoke execute on function public.is_platform_admin(),public.owns_supplier(uuid),public.owns_rfq(uuid) from public,anon;
grant execute on function public.is_platform_admin(),public.owns_supplier(uuid),public.owns_rfq(uuid) to authenticated;
revoke execute on function public.on_signup_profile(),public.reset_supplier_review(),public.reset_product_review(),public.auto_match_rfq(),public.notify_match(),public.notify_quote(),public.validate_quote_decision() from public,anon,authenticated;

-- Private supplier evidence; uploaded paths must start with the uploader UUID.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('supplier-evidence','supplier-evidence',false,5242880,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do nothing;
create policy "supplier evidence upload" on storage.objects for insert to authenticated with check(
  bucket_id='supplier-evidence' and split_part(name,'/',1)=(select auth.uid())::text
);
create policy "supplier evidence read" on storage.objects for select to authenticated using(
  bucket_id='supplier-evidence' and (split_part(name,'/',1)=(select auth.uid())::text or (select public.is_platform_admin()))
);
-- To make the FIRST admin (never put a service-role key in the browser):
-- 1. Register normally using /portal.html
-- 2. In Supabase SQL editor, run:
-- insert into public.platform_admins(user_id) select id from auth.users where email='YOUR_VERIFIED_EMAIL';
-- Verify exactly one row matches before granting access.
