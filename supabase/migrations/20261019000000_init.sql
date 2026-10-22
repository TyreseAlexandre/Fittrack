-- FitTrack initial schema.
-- Run this in the Supabase dashboard (SQL Editor -> New query -> paste -> Run),
-- or with the Supabase CLI: `supabase db push`.
--
-- Every table is protected by row level security: a signed-in user can only
-- read and write their own rows. Built-in exercises (user_id is null) are
-- readable by everyone and writable by no one.

-- ---------------------------------------------------------------------------
-- Exercises
-- ---------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  muscle_group text not null check (muscle_group in ('Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Other')),
  created_at timestamptz not null default now()
);
create unique index exercises_user_name_idx on public.exercises (user_id, lower(name));

-- ---------------------------------------------------------------------------
-- Workouts and sets
-- ---------------------------------------------------------------------------
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'Workout' check (char_length(name) between 1 and 80),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  notes text
);
create index workouts_user_started_idx on public.workouts (user_id, started_at desc);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  reps integer not null check (reps between 1 and 1000),
  weight_kg numeric(6, 2) not null default 0 check (weight_kg >= 0),
  created_at timestamptz not null default now()
);
create index workout_sets_workout_idx on public.workout_sets (workout_id);
create index workout_sets_user_exercise_idx on public.workout_sets (user_id, exercise_id, created_at);

-- ---------------------------------------------------------------------------
-- Body weight
-- ---------------------------------------------------------------------------
create table public.body_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(5, 2) not null check (weight_kg > 0 and weight_kg < 700),
  created_at timestamptz not null default now(),
  unique (user_id, measured_on)
);

-- ---------------------------------------------------------------------------
-- Goals
--   weight:      target body weight in kg (works for losing and gaining)
--   lift:        target estimated 1-rep max in kg for one exercise
--   consistency: target number of workouts per week
-- ---------------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('weight', 'lift', 'consistency')),
  title text not null check (char_length(title) between 1 and 120),
  exercise_id uuid references public.exercises (id) on delete cascade,
  start_value numeric(7, 2),
  target_value numeric(7, 2) not null check (target_value > 0),
  start_date date not null,
  target_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((type = 'lift') = (exercise_id is not null)),
  check (target_date is null or target_date > start_date)
);

-- ---------------------------------------------------------------------------
-- Habits
-- ---------------------------------------------------------------------------
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.habit_logs (
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  logged_on date not null,
  primary key (habit_id, logged_on)
);
create index habit_logs_user_date_idx on public.habit_logs (user_id, logged_on);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.body_weights enable row level security;
alter table public.goals enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

grant select, insert, update, delete on
  public.exercises, public.workouts, public.workout_sets, public.body_weights,
  public.goals, public.habits, public.habit_logs
to authenticated;

-- Exercises: built-ins are shared and read-only; custom ones are private.
create policy "Read built-in and own exercises" on public.exercises
  for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy "Insert own exercises" on public.exercises
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Update own exercises" on public.exercises
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Delete own exercises" on public.exercises
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Own workouts" on public.workouts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A set must belong to one of your workouts and use an exercise you can see.
create policy "Own sets" on public.workout_sets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e where e.id = exercise_id and (e.user_id is null or e.user_id = (select auth.uid())))
  );

create policy "Own body weights" on public.body_weights
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Own goals" on public.goals
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (exercise_id is null or exists (
      select 1 from public.exercises e
      where e.id = exercise_id and (e.user_id is null or e.user_id = (select auth.uid()))
    ))
  );

create policy "Own habits" on public.habits
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Own habit logs" on public.habit_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Built-in exercise library
-- ---------------------------------------------------------------------------
insert into public.exercises (user_id, name, muscle_group) values
  (null, 'Bench Press', 'Chest'),
  (null, 'Incline Dumbbell Press', 'Chest'),
  (null, 'Chest Fly', 'Chest'),
  (null, 'Push-Up', 'Chest'),
  (null, 'Deadlift', 'Back'),
  (null, 'Pull-Up', 'Back'),
  (null, 'Barbell Row', 'Back'),
  (null, 'Lat Pulldown', 'Back'),
  (null, 'Seated Cable Row', 'Back'),
  (null, 'Back Squat', 'Legs'),
  (null, 'Front Squat', 'Legs'),
  (null, 'Romanian Deadlift', 'Legs'),
  (null, 'Leg Press', 'Legs'),
  (null, 'Walking Lunge', 'Legs'),
  (null, 'Leg Curl', 'Legs'),
  (null, 'Leg Extension', 'Legs'),
  (null, 'Hip Thrust', 'Legs'),
  (null, 'Calf Raise', 'Legs'),
  (null, 'Overhead Press', 'Shoulders'),
  (null, 'Dumbbell Shoulder Press', 'Shoulders'),
  (null, 'Lateral Raise', 'Shoulders'),
  (null, 'Face Pull', 'Shoulders'),
  (null, 'Rear Delt Fly', 'Shoulders'),
  (null, 'Barbell Curl', 'Arms'),
  (null, 'Dumbbell Curl', 'Arms'),
  (null, 'Hammer Curl', 'Arms'),
  (null, 'Tricep Pushdown', 'Arms'),
  (null, 'Skull Crusher', 'Arms'),
  (null, 'Dip', 'Arms'),
  (null, 'Hanging Leg Raise', 'Core'),
  (null, 'Cable Crunch', 'Core'),
  (null, 'Ab Wheel Rollout', 'Core');
