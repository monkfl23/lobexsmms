create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,email,display_name) values (new.id,new.email,coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  insert into public.wallets(user_id) values (new.id);
  insert into public.user_roles(user_id,role) values (new.id,'user');
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id,role) values (new.id,'admin');
  end if;
  insert into public.api_keys(user_id,key) values (new.id, 'lbx_' || encode(extensions.gen_random_bytes(16),'hex'));
  return new;
end $$;

update public.api_keys set key = 'lbx_' || substr(key, 1, 32) where key not like 'lbx\_%';