-- Corrige "Database error saving new user" ao criar conta.
-- Roda só isto no SQL Editor do Supabase (seguro rodar de novo).

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, profession)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email, coalesce(new.raw_user_meta_data->>'profession', ''))
  on conflict (id) do nothing;
  return new;
exception when others then
  raise warning 'handle_new_user falhou pra %: %', new.id, sqlerrm;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
