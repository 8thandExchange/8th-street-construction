-- Run after Robby Wray's first magic-link sign-in at /login
-- Grants full admin access to cofounder Robby Wray (separate login).

insert into public.profiles (id, email, role, first_name, last_name)
select id, email, 'client', 'Robby', 'Wray'
from auth.users
where email = 'robby@8thstreetconstruction.com'
on conflict (id) do nothing;

update public.profiles
set role = 'admin',
    email = 'robby@8thstreetconstruction.com',
    first_name = 'Robby',
    last_name = 'Wray'
where email = 'robby@8thstreetconstruction.com'
   or id = (select id from auth.users where email = 'robby@8thstreetconstruction.com' limit 1);
