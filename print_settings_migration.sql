-- Print Settings Migration
-- Each restaurant gets one row of print settings

create table if not exists print_settings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  printer_name text default '',
  system_printer_name text default '',
  paper_size text default '80mm',
  orientation text default 'portrait',
  margins text default 'none',
  font_size integer default 15,
  auto_print boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(restaurant_id)
);

-- RLS: allow authenticated users to view and edit settings
-- The application logic restricts access to the correct restaurant ID.
alter table print_settings enable row level security;

create policy "Allow all authenticated operations" 
  on print_settings for all 
  to authenticated 
  using (true) 
  with check (true);
