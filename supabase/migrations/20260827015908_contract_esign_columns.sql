-- BoldSign e-sign integration: track the envelope a contract went out on.
-- esign_provider is 'boldsign' for now but named for the day another
-- provider shows up; esign_status mirrors the provider's lifecycle
-- (sent -> completed, or declined/revoked/expired) and is written only by
-- the send action and the webhook.
alter table public.project_contracts
  add column esign_provider text,
  add column esign_envelope_id text,
  add column esign_sent_at timestamptz,
  add column esign_status text;

-- The webhook looks contracts up by envelope id.
create unique index idx_project_contracts_esign_envelope
  on public.project_contracts (esign_envelope_id)
  where esign_envelope_id is not null;
