alter table tasks
  add column assignment_mode text not null default 'rotating' check (assignment_mode in ('rotating', 'fixed')),
  add column due_at timestamptz;
