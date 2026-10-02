
create type public.app_role as enum ('admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles readable" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  banned boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(14,4) not null default 0 check (balance >= 0),
  spent numeric(14,4) not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.wallets to authenticated;
grant all on public.wallets to service_role;
alter table public.wallets enable row level security;
create policy "wallet read" on public.wallets for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.categories (
  id serial primary key,
  name text not null,
  sort int not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.categories to authenticated;
grant all on public.categories to service_role;
grant usage on sequence public.categories_id_seq to service_role;
alter table public.categories enable row level security;
create policy "categories read" on public.categories for select to authenticated using (enabled or public.has_role(auth.uid(),'admin'));

create table public.providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  api_url text not null,
  api_key text not null,
  currency text not null default 'USD',
  enabled boolean not null default true,
  last_balance numeric(14,4),
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);
grant all on public.providers to service_role;
alter table public.providers enable row level security;

create table public.services (
  id serial primary key,
  name text not null,
  description text not null default '',
  category_id int references public.categories(id) on delete set null,
  provider_id uuid references public.providers(id) on delete set null,
  provider_service_id text,
  provider_rate numeric(14,4) not null default 0,
  rate numeric(14,4) not null default 0,
  min_qty int not null default 10,
  max_qty int not null default 10000,
  refill boolean not null default false,
  cancel boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
grant all on public.services to service_role;
grant usage on sequence public.services_id_seq to service_role;
alter table public.services enable row level security;

create table public.orders (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  service_id int references public.services(id) on delete set null,
  service_name text not null,
  link text not null,
  quantity int not null,
  charge numeric(14,4) not null,
  provider_cost numeric(14,4) not null default 0,
  provider_id uuid references public.providers(id) on delete set null,
  provider_order_id text,
  status text not null default 'pending',
  start_count int,
  remains int,
  error text,
  refunded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter sequence public.orders_id_seq restart with 10001;
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
grant usage on sequence public.orders_id_seq to service_role;
alter table public.orders enable row level security;
create policy "orders read own" on public.orders for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create index on public.orders(user_id, created_at desc);

create table public.transactions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,4) not null,
  balance_after numeric(14,4) not null,
  type text not null,
  description text not null default '',
  order_id bigint,
  created_at timestamptz not null default now()
);
grant select on public.transactions to authenticated;
grant all on public.transactions to service_role;
grant usage on sequence public.transactions_id_seq to service_role;
alter table public.transactions enable row level security;
create policy "tx read own" on public.transactions for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.payments (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,4) not null check (amount > 0),
  method text not null,
  reference text not null default '',
  status text not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
grant usage on sequence public.payments_id_seq to service_role;
alter table public.payments enable row level security;
create policy "payments read own" on public.payments for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.tickets (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.tickets to authenticated;
grant all on public.tickets to service_role;
grant usage on sequence public.tickets_id_seq to service_role;
alter table public.tickets enable row level security;
create policy "tickets read own" on public.tickets for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.ticket_messages (
  id bigserial primary key,
  ticket_id bigint not null references public.tickets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  body text not null,
  created_at timestamptz not null default now()
);
grant select on public.ticket_messages to authenticated;
grant all on public.ticket_messages to service_role;
grant usage on sequence public.ticket_messages_id_seq to service_role;
alter table public.ticket_messages enable row level security;
create policy "msgs read own" on public.ticket_messages for select to authenticated
  using (public.has_role(auth.uid(),'admin') or exists (select 1 from public.tickets t where t.id = ticket_id and t.user_id = auth.uid()));

create table public.api_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  key text not null unique,
  created_at timestamptz not null default now()
);
grant select on public.api_keys to authenticated;
grant all on public.api_keys to service_role;
alter table public.api_keys enable row level security;
create policy "api key read own" on public.api_keys for select to authenticated using (user_id = auth.uid());

create table public.admin_logs (
  id bigserial primary key,
  admin_id uuid,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
grant all on public.admin_logs to service_role;
grant usage on sequence public.admin_logs_id_seq to service_role;
alter table public.admin_logs enable row level security;

create table public.settings (
  key text primary key,
  value text not null default ''
);
grant select on public.settings to authenticated, anon;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "settings public read" on public.settings for select to anon, authenticated using (key not like 'secret_%');
insert into public.settings(key,value) values
 ('site_name','LOBEX SMM'),('currency','USD'),('min_deposit','1'),
 ('payment_instructions','Send your payment and submit the reference below. An admin will verify and credit your balance.'),
 ('api_enabled','true'),('announcement','');

-- New user bootstrap: profile, wallet, role, api key. First user = admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,email,display_name) values (new.id,new.email,coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  insert into public.wallets(user_id) values (new.id);
  insert into public.user_roles(user_id,role) values (new.id,'user');
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id,role) values (new.id,'admin');
  end if;
  insert into public.api_keys(user_id,key) values (new.id, encode(extensions.gen_random_bytes(24),'hex'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Atomic order debit
create or replace function public.place_order_debit(_user uuid, _service int, _link text, _qty int)
returns bigint language plpgsql security definer set search_path = public as $$
declare s public.services; w public.wallets; total numeric; cost numeric; oid bigint;
begin
  select * into s from public.services where id=_service and enabled for share;
  if not found then raise exception 'Service not available'; end if;
  if _qty < s.min_qty or _qty > s.max_qty then raise exception 'Quantity must be between % and %', s.min_qty, s.max_qty; end if;
  if s.provider_id is null or s.provider_service_id is null then raise exception 'Service is not connected to a provider'; end if;
  total := round(s.rate * _qty / 1000, 4);
  cost := round(s.provider_rate * _qty / 1000, 4);
  select * into w from public.wallets where user_id=_user for update;
  if w.balance < total then raise exception 'Insufficient balance'; end if;
  update public.wallets set balance = balance - total, spent = spent + total, updated_at=now() where user_id=_user;
  insert into public.orders(user_id,service_id,service_name,link,quantity,charge,provider_cost,provider_id,status)
    values (_user,s.id,s.name,_link,_qty,total,cost,s.provider_id,'processing') returning id into oid;
  insert into public.transactions(user_id,amount,balance_after,type,description,order_id)
    values (_user,-total,w.balance-total,'order','Order #'||oid||' - '||s.name,oid);
  return oid;
end $$;

create or replace function public.refund_order(_order bigint, _amount numeric, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders; nb numeric;
begin
  select * into o from public.orders where id=_order for update;
  if not found or o.refunded then return; end if;
  if _amount is null or _amount > o.charge then _amount := o.charge; end if;
  update public.wallets set balance = balance + _amount, spent = greatest(spent - _amount,0), updated_at=now() where user_id=o.user_id returning balance into nb;
  update public.orders set refunded = true, updated_at=now() where id=_order;
  insert into public.transactions(user_id,amount,balance_after,type,description,order_id)
    values (o.user_id,_amount,nb,'refund','Refund order #'||_order||coalesce(' - '||_reason,''),_order);
end $$;

create or replace function public.adjust_balance(_user uuid, _amount numeric, _type text, _desc text)
returns numeric language plpgsql security definer set search_path = public as $$
declare nb numeric;
begin
  update public.wallets set balance = balance + _amount, updated_at=now() where user_id=_user returning balance into nb;
  if nb is null then raise exception 'Wallet not found'; end if;
  if nb < 0 then raise exception 'Balance cannot go negative'; end if;
  insert into public.transactions(user_id,amount,balance_after,type,description) values (_user,_amount,nb,_type,_desc);
  return nb;
end $$;

create or replace function public.approve_payment(_payment bigint, _note text)
returns void language plpgsql security definer set search_path = public as $$
declare p public.payments;
begin
  select * into p from public.payments where id=_payment for update;
  if not found or p.status <> 'pending' then raise exception 'Payment is not pending'; end if;
  update public.payments set status='approved', admin_note=_note, processed_at=now() where id=_payment;
  perform public.adjust_balance(p.user_id, p.amount, 'deposit', 'Deposit #'||_payment||' via '||p.method);
end $$;

revoke execute on function public.place_order_debit(uuid,int,text,int) from public, anon, authenticated;
revoke execute on function public.refund_order(bigint,numeric,text) from public, anon, authenticated;
revoke execute on function public.adjust_balance(uuid,numeric,text,text) from public, anon, authenticated;
revoke execute on function public.approve_payment(bigint,text) from public, anon, authenticated;
grant execute on function public.place_order_debit(uuid,int,text,int) to service_role;
grant execute on function public.refund_order(bigint,numeric,text) to service_role;
grant execute on function public.adjust_balance(uuid,numeric,text,text) to service_role;
grant execute on function public.approve_payment(bigint,text) to service_role;
grant execute on function public.has_role(uuid,app_role) to authenticated;
