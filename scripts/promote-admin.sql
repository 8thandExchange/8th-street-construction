-- Run after your first magic-link sign-in at /login
-- Replace the email below with yours.

insert into public.profiles (id, email, role, first_name, last_name)
select id, email, 'client', '', ''
from auth.users
where email = 'troy@8thstreetconstruction.com'
on conflict (id) do nothing;

update public.profiles
set role = 'admin', email = 'troy@8thstreetconstruction.com', first_name = 'Troy'
where email = 'troy@8thstreetconstruction.com'
   or id = (select id from auth.users where email = 'troy@8thstreetconstruction.com' limit 1);
