set search_path = public, extensions;

-- =====================================================================
-- COST CODE TEMPLATES, TAKEOFF & THE PER-JOB BUDGET GRID
-- (Phase A of COST_PLAN_SPEC.md)
--
-- Robby's workbook already works as a template: five job tabs (Augusta,
-- Riverwalk, Broad Street, Savannah, 608 Macon) carry an identical 69-line
-- code list, and 56 of those lines carry identical formulas. He templates by
-- duplicating a tab. This formalizes that.
--
-- His Code column (1.1, 4.2, 23.7, 36) is the chart of accounts and is what
-- bills against numbered city budget lines, so codes are first-class here and
-- CSI divisions stay as a reporting rollup.
--
-- Most budget lines are NOT typed numbers — they are formulas driven off the
-- takeoff block at the top of the sheet (roofing_sq * 150, heated_sqft * 3,
-- cabinet_lnft * cabinet_unit_cost). The takeoff is therefore modelled as
-- first-class named variables, not decoration.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Templates
-- ---------------------------------------------------------------------

create table if not exists cost_code_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cost_code_templates_name_idx
  on cost_code_templates (lower(name));

create unique index if not exists cost_code_templates_single_default_idx
  on cost_code_templates (is_default) where is_default;

-- Named takeoff variables the template starts every job with.
-- `formula` lets a takeoff value derive from other takeoff values, exactly as
-- the sheet does (heated_sqft = first_floor + second_floor).
create table if not exists cost_code_template_takeoff (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references cost_code_templates(id) on delete cascade,
  key text not null,                        -- 'heated_sqft' — referenced by formulas
  label text not null,                      -- 'Total Heated Sqft'
  unit text,
  default_value numeric(14, 4),
  formula text,                             -- 'first_floor + second_floor'
  section text not null default 'Areas',    -- Areas | Quantities | Fixture Counts
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, key)
);

create table if not exists cost_code_template_lines (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references cost_code_templates(id) on delete cascade,
  code text not null,                       -- Robby's number: "4.2", "23.7"
  label text not null,                      -- becomes project_estimate_lines.trade_label
  section text not null,                    -- collapsible group in the grid
  division_code text,                       -- CSI rollup: "DIV-03"
  line_type text not null default 'cost'
    check (line_type in ('cost', 'markup', 'contingency')),
  unit text,
  formula text,                             -- 'roofing_sq * 150'; null = typed amount
  default_amount numeric(12, 2),            -- used when formula is null
  is_allowance boolean not null default false,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, code)
);

create index if not exists cost_code_template_lines_template_idx
  on cost_code_template_lines(template_id, display_order);

comment on column cost_code_template_lines.formula is
  'Expression over takeoff keys plus the reserved name `subtotal` (cost lines
   only sum into subtotal). Carried straight over from the workbook so the
   grid keeps the automatic recalculation Robby already has.';

-- ---------------------------------------------------------------------
-- Per-job takeoff
-- ---------------------------------------------------------------------

create table if not exists project_takeoff_values (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  key text not null,
  label text not null,
  unit text,
  value numeric(14, 4),
  formula text,
  section text not null default 'Areas',
  display_order int not null default 0,
  template_takeoff_id uuid references cost_code_template_takeoff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, key)
);

create index if not exists project_takeoff_values_project_idx
  on project_takeoff_values(project_id, display_order);

-- ---------------------------------------------------------------------
-- Per-job lines — extend the existing table rather than forking it.
-- bid_requests.estimate_line_id, purchase_orders, CostComparisonPanel,
-- ai-estimate and company-dashboard all already point here.
-- ---------------------------------------------------------------------

alter table project_estimate_lines
  add column if not exists code text,
  add column if not exists section text,
  add column if not exists line_type text not null default 'cost',
  add column if not exists unit text,
  add column if not exists formula text,
  add column if not exists is_allowance boolean not null default false,
  add column if not exists template_line_id uuid
    references cost_code_template_lines(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'project_estimate_lines_line_type_check'
  ) then
    alter table project_estimate_lines
      add constraint project_estimate_lines_line_type_check
      check (line_type in ('cost', 'markup', 'contingency'));
  end if;
end $$;

create unique index if not exists project_estimate_lines_code_idx
  on project_estimate_lines(project_id, code) where code is not null;

comment on column project_estimate_lines.code is
  'Robby''s cost code — the chart of accounts, and what city budget lines bill against';
comment on column project_estimate_lines.formula is
  'Expression over this job''s takeoff keys. When set, estimated_amount is its
   evaluated result and the Budget cell is read-only in the grid.';
comment on column project_estimate_lines.line_type is
  'cost = a real trade line; markup = computed off the cost subtotal (Supervision, P/O); contingency = held back';

-- $/heated sqft on the grid footer needs its own number (square_footage is total)
alter table projects
  add column if not exists heated_square_footage int;

comment on column projects.heated_square_footage is
  'Heated/conditioned area — the denominator for $/heated sqft on the cost plan';

-- ---------------------------------------------------------------------
-- RLS — admin only, matching the existing cost tables
-- ---------------------------------------------------------------------

alter table cost_code_templates enable row level security;
alter table cost_code_template_takeoff enable row level security;
alter table cost_code_template_lines enable row level security;
alter table project_takeoff_values enable row level security;

drop policy if exists "Admin manages cost code templates" on cost_code_templates;
create policy "Admin manages cost code templates" on cost_code_templates
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin manages template takeoff" on cost_code_template_takeoff;
create policy "Admin manages template takeoff" on cost_code_template_takeoff
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin manages cost code template lines" on cost_code_template_lines;
create policy "Admin manages cost code template lines" on cost_code_template_lines
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin manages project takeoff" on project_takeoff_values;
create policy "Admin manages project takeoff" on project_takeoff_values
  for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists cost_code_templates_updated_at on cost_code_templates;
create trigger cost_code_templates_updated_at
  before update on cost_code_templates
  for each row execute function public.set_updated_at();

drop trigger if exists cost_code_template_takeoff_updated_at on cost_code_template_takeoff;
create trigger cost_code_template_takeoff_updated_at
  before update on cost_code_template_takeoff
  for each row execute function public.set_updated_at();

drop trigger if exists cost_code_template_lines_updated_at on cost_code_template_lines;
create trigger cost_code_template_lines_updated_at
  before update on cost_code_template_lines
  for each row execute function public.set_updated_at();

drop trigger if exists project_takeoff_values_updated_at on project_takeoff_values;
create trigger project_takeoff_values_updated_at
  before update on project_takeoff_values
  for each row execute function public.set_updated_at();

-- =====================================================================
-- SEED — the workbook's shared 69-line sheet as the standing template.
--
-- Codes preserved exactly as Robby writes them, including the gaps (no 6,
-- 13, 19-20, 27-31, 33-34) and the missing 23.3. Formulas carried over
-- verbatim, with these fixes — all flagged in COST_PLAN_SPEC.md section 3:
--
--   * "pump truck" and "Footers" had no code at all -> 4.4 and 4.5
--   * 8.3 Interior Doors used a hardcoded 20 doors on the Augusta and
--     608 Macon tabs while the takeoff says 14. The other three tabs use
--     `interior_doors * 200 * 1.08`; that version is the seed.
--   * 35 Contingency was blank on every tab and now carries a rate.
--   * Rows are grouped into sections in construction sequence.
-- =====================================================================

insert into cost_code_templates (name, description, is_default)
values (
  '8th Street Standard — Single Family',
  'Seeded from the shared sheet behind Augusta, Riverwalk, Broad Street, Savannah and 608 Macon.',
  true
)
on conflict (lower(name)) do nothing;

-- --- takeoff variables ------------------------------------------------

insert into cost_code_template_takeoff
  (template_id, key, label, unit, default_value, formula, section, display_order)
select t.id, v.key, v.label, v.unit, v.default_value, v.formula, v.section, v.display_order
from cost_code_templates t
cross join (values
  -- Areas
  ('total_sqft',         'Total SQFT',            'sqft', null, 'heated_sqft + front_porch',                  'Areas',  10),
  ('heated_sqft',        'Total Heated Sqft',     'sqft', null, 'first_floor + second_floor',                  'Areas',  20),
  ('second_floor',       '2nd floor',             'sqft', 0,    null,                                          'Areas',  30),
  ('first_floor',        '1st floor',             'sqft', 0,    null,                                          'Areas',  40),
  ('front_porch',        'Front porch',           'sqft', 0,    null,                                          'Areas',  50),
  ('back_patio',         'Back patio',            'sqft', 0,    null,                                          'Areas',  60),
  ('front_deck',         'Front deck',            'sqft', 0,    null,                                          'Areas',  70),
  ('garage',             'Garage',                'sqft', 0,    null,                                          'Areas',  80),
  ('concrete_sqft',      'Total concrete sqft',   'sqft', null, 'first_floor + front_porch + front_deck',      'Areas',  90),
  ('bedrooms',           'Bedrooms',              'ea',   0,    null,                                          'Areas', 100),
  ('bathrooms',          'Bathrooms',             'ea',   0,    null,                                          'Areas', 110),
  ('tile_floor',         'Tile floor',            'sqft', 0,    null,                                          'Areas', 120),
  ('tile_walls',         'Tile walls',            'sqft', 0,    null,                                          'Areas', 130),
  ('kitchen_backsplash', 'Kitchen backsplash',    'sqft', 0,    null,                                          'Areas', 140),
  ('lvt_hardwood',       'LVT/hardwood',          'sqft', 0,    null,                                          'Areas', 150),
  ('carpet_yd',          'Carpet',                'yd',   0,    null,                                          'Areas', 160),
  ('cabinet_lnft',       'Cabinets & vanity',     'lnft', 0,    null,                                          'Areas', 170),

  -- Quantities
  ('footer_lnft',        'Footers',               'lnft', 0,    null,                                          'Quantities', 210),
  ('footer_yd',          'Footer YD',             'yd',   null, 'footer_lnft * 2 / 27',                        'Quantities', 220),
  ('house_slab_sqft',    'House slab sqft',       'sqft', null, 'first_floor + patio_sqft + porch_slab_sqft',  'Quantities', 230),
  ('slab_yd',            'Slab YD',               'yd',   null, 'house_slab_sqft / 72',                        'Quantities', 240),
  ('patio_sqft',         'Patio sqft',            'sqft', null, 'back_patio',                                  'Quantities', 250),
  ('porch_slab_sqft',    'Porch slab sqft',       'sqft', null, 'front_porch',                                 'Quantities', 260),
  ('brick',              'Brick',                 'sqft', 0,    null,                                          'Quantities', 270),
  ('bb_siding',          'B&B siding',            'SQ',   0,    null,                                          'Quantities', 280),
  ('siding_sq',          'Siding SQ',             'SQ',   0,    null,                                          'Quantities', 290),
  ('roofing_sq',         'Roofing SQ',            'SQ',   null, 'first_floor * 1.3 / 100',                     'Quantities', 300),
  ('windows',            'Windows',               'ea',   0,    null,                                          'Quantities', 310),
  ('exterior_doors',     'Exterior doors',        'ea',   0,    null,                                          'Quantities', 320),
  ('interior_doors',     'Interior doors',        'ea',   0,    null,                                          'Quantities', 330),
  ('sliders',            'Sliders',               'ea',   0,    null,                                          'Quantities', 340),
  ('r13',                'R-13',                  'sqft', 0,    null,                                          'Quantities', 350),
  ('r38',                'R-38',                  'sqft', 0,    null,                                          'Quantities', 360),
  ('cabinet_unit_cost',  'Cabinet $/lnft',        '$',    225,  null,                                          'Quantities', 370),

  -- Fixture counts
  ('can_lights',         'Can lights',            'ea',   0,    null,                                          'Fixture Counts', 410),
  ('flush_led',          'Flush LED',             'ea',   0,    null,                                          'Fixture Counts', 420),
  ('interior_fans',      'Interior fans',         'ea',   0,    null,                                          'Fixture Counts', 430),
  ('bath_fans',          'Bath exhaust fans',     'ea',   0,    null,                                          'Fixture Counts', 440),
  ('exterior_fans',      'Exterior fans',         'ea',   0,    null,                                          'Fixture Counts', 450),
  ('exterior_lights',    'Exterior lights',       'ea',   0,    null,                                          'Fixture Counts', 460),
  ('floods',             'Floods',                'ea',   0,    null,                                          'Fixture Counts', 470),
  ('garage_doors',       'Garage doors',          'ea',   0,    null,                                          'Fixture Counts', 480),
  ('granite_main',       'Granite main',          'sqft', 0,    null,                                          'Fixture Counts', 490),
  ('hvac_units',         'HVAC units',            'ton',  0,    null,                                          'Fixture Counts', 500),
  ('gas_drops',          'Gas drops',             'ea',   0,    null,                                          'Fixture Counts', 510),
  ('plumbing_drops',     'Plumbing drops',        'ea',   0,    null,                                          'Fixture Counts', 520),
  ('r19',                'R-19',                  'sqft', 0,    null,                                          'Fixture Counts', 530),
  ('sheetrock',          'Sheetrock',             'sqft', 0,    null,                                          'Fixture Counts', 540)
) as v(key, label, unit, default_value, formula, section, display_order)
where t.name = '8th Street Standard — Single Family'
on conflict (template_id, key) do nothing;

-- --- cost lines -------------------------------------------------------

insert into cost_code_template_lines
  (template_id, code, label, section, division_code, line_type, unit, formula, default_amount, is_allowance, display_order)
select t.id, v.code, v.label, v.section, v.division_code, v.line_type, v.unit,
       v.formula, v.default_amount, v.is_allowance, v.display_order
from cost_code_templates t
cross join (values
  -- General Conditions
  ('1.1',  'Plans and Permits / builder risk','General Conditions','DIV-01','cost',null, null, 1500.00, false,  10),
  ('1.2',  'Permits',                       'General Conditions',  'DIV-01','cost',null, null, 1500.00, false,  20),
  ('1.3',  'City Fee',                      'General Conditions',  'DIV-01','cost',null, null, 1000.00, false,  30),
  ('1.4',  'Blower & Duct Test',            'General Conditions',  'DIV-23','cost',null, null,  450.00, false,  40),
  ('1.5',  'Utilities',                     'General Conditions',  'DIV-33','cost',null, null, 1200.00, false,  50),
  ('3',    'Dumpster',                      'General Conditions',  'DIV-01','cost',null, null, 2500.00, false,  60),
  ('22',   'Equipment rentals',             'General Conditions',  'DIV-01','cost',null, null, 2500.00, false,  70),

  -- Site Work
  ('2',    'Layout Package',                'Site Work',           'DIV-01','cost',null, null, 1595.00, false, 110),
  ('2.1',  'Demo/Pad Grading & Clearing',   'Site Work',           'DIV-31','cost',null, null, 6500.00, false, 120),
  ('2.2',  'Erosion Control/Gravel',        'Site Work',           'DIV-31','cost',null, null, 1500.00, false, 130),
  ('2.3',  'Survey Stake Lot',              'Site Work',           'DIV-31','cost',null, null, 2500.00, false, 140),
  ('2.4',  'Septic',                        'Site Work',           'DIV-33','cost',null, null,    0.00, false, 150),
  ('2.5',  'Compaction/Concrete testing',   'Site Work',           'DIV-31','cost',null, null,  500.00, false, 160),
  ('2.6',  'Well Water',                    'Site Work',           'DIV-33','cost',null, null,    null, false, 170),

  -- Foundation & Concrete
  ('4',    'Concrete',                      'Foundation & Concrete','DIV-03','cost','yd', 'concrete_sqft / 72 * 175 * 1.08 * 1.2', null, true,  210),
  ('4.1',  'Slab/Foundation Labor',         'Foundation & Concrete','DIV-03','cost','sqft','(concrete_sqft * 1.5 + 500) + (footer_lnft * 15)', null, false, 220),
  ('4.2',  'Driveway Materials',            'Foundation & Concrete','DIV-32','cost',null, '10 * 205', null, true,  230),
  ('4.3',  'Driveway Labor',                'Foundation & Concrete','DIV-32','cost',null, null, 1200.00, true,  240),
  ('4.4',  'Pump truck',                    'Foundation & Concrete','DIV-03','cost',null, null, 2400.00, false, 250),
  ('4.5',  'Footers (concrete)',            'Foundation & Concrete','DIV-03','cost','lnft','16.5 * footer_lnft', null, false, 260),

  -- Masonry (zeroed on most jobs, kept so the code list stays stable)
  ('5.1',  'Block Labor',                   'Masonry',             'DIV-03','cost',null, null,    0.00, true,  310),
  ('5.15', 'Block Materials',               'Masonry',             'DIV-03','cost',null, null,    0.00, true,  320),
  ('5.2',  'Brick',                         'Masonry',             'DIV-03','cost',null, null,    0.00, true,  330),
  ('5.3',  'Brick Labor',                   'Masonry',             'DIV-03','cost',null, null,    0.00, true,  340),
  ('5.4',  'Stone Materials',               'Masonry',             'DIV-03','cost',null, null,    0.00, false, 350),
  ('5.5',  'Stone Labor',                   'Masonry',             'DIV-03','cost',null, null,    0.00, false, 360),

  -- Framing
  ('7.1',  'Framing Materials/decks',       'Framing',             'DIV-06','cost','sqft','total_sqft * 12.5', null, true,  410),
  ('7.2',  'Framing Labor/deck',            'Framing',             'DIV-06','cost','sqft','total_sqft * 5',    null, false, 420),
  ('7.3',  'Trusses/TJI',                   'Framing',             'DIV-06','cost',null, null, 5000.00, true,  430),

  -- Roofing
  ('9.1',  'Roofing Materials',             'Roofing',             'DIV-07','cost','SQ', 'roofing_sq * 150', null, true,  510),
  ('9.2',  'Roofing Labor',                 'Roofing',             'DIV-07','cost','SQ', 'roofing_sq * 75',  null, false, 520),
  ('9.3',  'Waterproofing/foundation',      'Roofing',             'DIV-07','cost',null, null,    null, false, 530),
  ('9.4',  'Metal roof turn key',           'Roofing',             'DIV-07','cost',null, null,    0.00, false, 540),

  -- Exterior Envelope
  ('10',   'Exterior Trim & Screen porch',  'Exterior Envelope',   'DIV-07','cost',null, null,    0.00, false, 610),
  ('10.1', 'Gutters',                       'Exterior Envelope',   'DIV-07','cost','lnft',null,   0.00, false, 620),
  ('11',   'Siding Materials',              'Exterior Envelope',   'DIV-07','cost','SQ', null, 4171.06, false, 630),
  ('11.1', 'Siding Labor',                  'Exterior Envelope',   'DIV-07','cost','SQ', '165 * siding_sq', null, false, 640),
  ('12.1', 'Windows',                       'Exterior Envelope',   'DIV-08','cost','ea', 'windows * 225',   null, false, 650),
  ('12.3', 'Door Hardware',                 'Exterior Envelope',   'DIV-08','cost',null, 'interior_doors * 18 * 1.08 + 100', null, false, 660),
  ('12.4', 'Exterior Doors',                'Exterior Envelope',   'DIV-08','cost','ea', 'exterior_doors * 750', null, false, 670),
  ('12.5', 'Garage Door',                   'Exterior Envelope',   'DIV-08','cost','ea', null,    null, false, 680),
  ('12.6', 'Fireplaces',                    'Exterior Envelope',   'DIV-09','cost','ea', null,    0.00, false, 690),

  -- Plumbing, HVAC & Electrical
  ('14.1', 'Plumbing Fixtures',             'Plumbing, HVAC & Electrical','DIV-22','cost',null,'plumbing_drops * 200', null, false, 710),
  -- 608 Macon derives this from drop count; the other four tabs type 12500. Majority wins for a template.
  ('14.2', 'Plumbing Contractor',           'Plumbing, HVAC & Electrical','DIV-22','cost','ea',null, 12500.00, false, 720),
  ('15',   'HVAC',                          'Plumbing, HVAC & Electrical','DIV-23','cost','ton',null, 13810.00, false, 730),
  ('15.1', 'Gas Lines',                     'Plumbing, HVAC & Electrical','DIV-22','cost','ea', null,    0.00, false, 740),
  ('16.1', 'Lighting Fixtures',             'Plumbing, HVAC & Electrical','DIV-26','cost',null, null, 1500.00, true,  750),
  ('16.2', 'Electrician',                   'Plumbing, HVAC & Electrical','DIV-26','cost','sqft','(heated_sqft * 3.75) + (can_lights + flush_led + interior_fans + bath_fans + exterior_fans + exterior_lights + floods) * 25 + 650', null, false, 760),

  -- Insulation & Drywall
  ('17',   'Insulation',                    'Insulation & Drywall','DIV-07','cost',null, '(r13 * 0.95) + (r19 * 1.05) + (r38 * 0.9) * 1.25', null, false, 810),
  ('18',   'Drywall',                       'Insulation & Drywall','DIV-09','cost','sqft','sheetrock * 1.95', null, false, 820),

  -- Interior Trim & Doors
  ('8',    'Interior Trim Materials',       'Interior Trim & Doors','DIV-09','cost',null,'heated_sqft * 2.5', null, false, 910),
  ('8.1',  'Closets, Shelving, Mirrors & Glass','Interior Trim & Doors','DIV-10','cost',null,null, 2500.00, true,  920),
  ('8.2',  'Interior trim labor',           'Interior Trim & Doors','DIV-09','cost',null,'heated_sqft * 2', null, false, 930),
  ('8.3',  'Interior Doors',                'Interior Trim & Doors','DIV-08','cost','ea','interior_doors * 200 * 1.08', null, false, 940),

  -- Cabinets & Counters
  ('21',   'Cabinets & Vanity',             'Cabinets & Counters', 'DIV-12','cost','lnft','cabinet_lnft * cabinet_unit_cost', null, false, 1010),
  ('21.1', 'Counter tops & Granite',        'Cabinets & Counters', 'DIV-12','cost','sqft','granite_main * 65 + 1500', null, true, 1020),

  -- Flooring & Tile
  ('23.1', 'LVT & Hardwood',                'Flooring & Tile',     'DIV-09','cost','sqft','lvt_hardwood * 3.5', null, false, 1110),
  ('23.2', 'Carpet',                        'Flooring & Tile',     'DIV-09','cost','yd', 'carpet_yd * 13.5',   null, false, 1120),
  ('23.4', 'Flooring Labor',                'Flooring & Tile',     'DIV-09','cost','sqft','(lvt_hardwood * 1.1 * 2.25) + (carpet_yd * 6)', null, false, 1130),
  ('23.5', 'Tile Materials',                'Flooring & Tile',     'DIV-09','cost','sqft','kitchen_backsplash * 8', null, true, 1140),
  ('23.6', 'Tile Labor',                    'Flooring & Tile',     'DIV-09','cost','sqft',null,   null, true, 1150),
  ('23.7', 'Kitchen Backsplash',            'Flooring & Tile',     'DIV-09','cost','sqft',null, 1000.00, false,1160),

  -- Paint & Clean
  ('24',   'Paint',                         'Paint & Clean',       'DIV-09','cost','sqft','heated_sqft * 3',   null, false, 1210),
  ('25',   'Clean',                         'Paint & Clean',       'DIV-09','cost','sqft','heated_sqft * 0.8', null, false, 1220),
  ('25.1', 'Pressure washing',              'Paint & Clean',       'DIV-09','cost',null, null,  750.00, false, 1230),

  -- Site Finishes & Appliances
  ('26',   'Landscaping',                   'Site Finishes & Appliances','DIV-32','cost',null,null,10000.00, true, 1310),
  ('26.1', 'Irrigation',                    'Site Finishes & Appliances','DIV-32','cost','zone',null,  null, false,1320),
  ('32',   'Appliances',                    'Site Finishes & Appliances','DIV-11','cost',null,null, 3500.00, true, 1330),

  -- Markup & contingency.
  -- The workbook's Supervision cell is `subtotal * 0.2 - 15000`: a flat 20%
  -- total markup with the fixed P/O carved out of it. Modelled literally so
  -- Total Build Cost stays exactly subtotal * 1.20.
  ('P/O',  'Profit & Overhead',             'Markup & Contingency','DIV-01','markup',     null, null, 15000.00, false, 1410),
  ('36',   'Supervision',                   'Markup & Contingency','DIV-01','markup',     null, 'subtotal * 0.20 - 15000', null, false, 1420),
  ('35',   'Contingency',                   'Markup & Contingency','DIV-01','contingency',null, 'subtotal * 0.05', null, false, 1430)
) as v(code, label, section, division_code, line_type, unit, formula, default_amount, is_allowance, display_order)
where t.name = '8th Street Standard — Single Family'
on conflict (template_id, code) do nothing;
