-- Client decisions are accepted only through clientRespondChangeOrder(), which
-- authenticates the portal role, verifies project access with RLS, and then
-- updates both the order and contract total with the server client. Removing
-- direct Data API UPDATE access also prevents commercial fields such as
-- cost_impact or project_id from being changed alongside a status response.
drop policy if exists "Client signs change orders" on public.change_orders;
