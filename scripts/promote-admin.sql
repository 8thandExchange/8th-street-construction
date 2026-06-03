-- Run after your first magic-link sign-in at /login
-- Replace the email below with yours.

insert into public.profiles (id, email, role, first_name, last_name)
select id, email, 'client', '', ''
from auth.users
where email = 'your-email@example.com'
on conflict (id) do nothing;

update public.profiles
set role = 'admin'
where email = 'your-email@example.com';
