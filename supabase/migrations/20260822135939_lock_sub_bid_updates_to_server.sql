-- Subcontractors submit through the authenticated server action, which
-- verifies ownership, RFQ state, deadline, amount, and document type before
-- using the server client. Direct Data API UPDATE access would also allow
-- immutable ownership and award fields to be changed.
drop policy if exists "Sub updates own bids" on public.bids;
