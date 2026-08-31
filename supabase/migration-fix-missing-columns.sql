-- Achamos a causa raiz: "create table if not exists" não adiciona coluna
-- numa tabela que já existia antes dela ser incluída no schema.sql. Como
-- suas tabelas foram criadas há um tempo, várias colunas adicionadas depois
-- (email, hotmart_watch_url, image_url etc.) nunca chegaram a existir de
-- verdade no banco. Rode isto uma vez — resolve pra sempre (seguro rodar de novo).

alter table public.profiles add column if not exists email text default '';

alter table public.courses add column if not exists external_price text default '';
alter table public.courses add column if not exists external_link text default '';
alter table public.courses add column if not exists hotmart_product_id text default '';
alter table public.courses add column if not exists hotmart_watch_url text default '';
alter table public.courses add column if not exists image_url text default '';

alter table public.events add column if not exists external_price text default '';
alter table public.events add column if not exists image_url text default '';
