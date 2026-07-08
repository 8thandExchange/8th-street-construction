-- Volunteer stages: Habitat (and future partner) builds flag phases where
-- volunteer crews participate. Shown as a chip + note on the client timeline.
alter table project_milestones
  add column if not exists volunteer_friendly boolean not null default false,
  add column if not exists volunteer_notes text;

comment on column project_milestones.volunteer_friendly is 'Phase welcomes volunteer crews (Habitat builds) — surfaced on the client schedule';
comment on column project_milestones.volunteer_notes is 'Client-visible note: volunteer day dates, what to bring, who to contact';
