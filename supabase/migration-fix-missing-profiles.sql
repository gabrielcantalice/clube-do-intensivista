-- 1) Mostra quem se cadastrou (auth.users) e não tem perfil (public.profiles)
-- correspondente. Rode esta consulta primeiro só para conferir.
select u.id, u.email, u.created_at
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
order by u.created_at desc;

-- 2) Cria o perfil que faltou para todo mundo que caiu nesse caso (inclusive
-- o membro que você acabou de cadastrar). Seguro rodar de novo.
insert into public.profiles (id, full_name, email, profession)
select u.id,
       coalesce(u.raw_user_meta_data->>'full_name', ''),
       u.email,
       coalesce(u.raw_user_meta_data->>'profession', '')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
