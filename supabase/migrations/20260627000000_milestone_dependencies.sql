-- Phase dependencies for Gantt predecessor links
alter table project_milestones
  add column if not exists predecessor_id uuid references project_milestones(id) on delete set null;

create index if not exists project_milestones_predecessor_idx
  on project_milestones(predecessor_id)
  where predecessor_id is not null;

comment on column project_milestones.predecessor_id is 'Finish-to-start predecessor phase for schedule dependencies';
