-- Seguridad para /gestion.
-- Ejecutar después de crear las tablas. No concede permisos de escritura públicos.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.competitions enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.games enable row level security;
alter table public.game_team_stats enable row level security;
alter table public.game_player_stats enable row level security;
alter table public.game_player_stats add column if not exists rebounds smallint;

grant usage on schema public to anon, authenticated;
grant select on public.competitions, public.teams, public.players, public.games,
  public.game_team_stats, public.game_player_stats to anon, authenticated;
grant insert, update, delete on public.games, public.game_player_stats to authenticated;
grant select on public.admin_users to authenticated;

-- Lectura pública para las pantallas públicas de la web y para cargar los formularios.
drop policy if exists competitions_public_read on public.competitions;
create policy competitions_public_read on public.competitions
  for select to anon, authenticated using (true);

drop policy if exists teams_public_read on public.teams;
create policy teams_public_read on public.teams
  for select to anon, authenticated using (true);

drop policy if exists players_public_read on public.players;
create policy players_public_read on public.players
  for select to anon, authenticated using (true);

drop policy if exists games_public_read on public.games;
create policy games_public_read on public.games
  for select to anon, authenticated using (true);

drop policy if exists game_team_stats_public_read on public.game_team_stats;
create policy game_team_stats_public_read on public.game_team_stats
  for select to anon, authenticated using (true);

drop policy if exists game_player_stats_public_read on public.game_player_stats;
create policy game_player_stats_public_read on public.game_player_stats
  for select to anon, authenticated using (true);

-- Cada usuario autenticado solo puede consultar su propia fila de administración.
drop policy if exists admin_users_read_self on public.admin_users;
create policy admin_users_read_self on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

-- Solo los usuarios añadidos manualmente a admin_users pueden modificar partidos.
drop policy if exists games_admin_insert on public.games;
create policy games_admin_insert on public.games
  for insert to authenticated
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists games_admin_update on public.games;
create policy games_admin_update on public.games
  for update to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists games_admin_delete on public.games;
create policy games_admin_delete on public.games
  for delete to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

-- Solo los administradores pueden añadir, corregir o borrar estadísticas individuales.
drop policy if exists player_stats_admin_insert on public.game_player_stats;
create policy player_stats_admin_insert on public.game_player_stats
  for insert to authenticated
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists player_stats_admin_update on public.game_player_stats;
create policy player_stats_admin_update on public.game_player_stats
  for update to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists player_stats_admin_delete on public.game_player_stats;
create policy player_stats_admin_delete on public.game_player_stats
  for delete to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

-- Tras crear tu usuario en Authentication > Users, autorízalo con:
-- insert into public.admin_users (user_id) values ('UUID_DEL_USUARIO_AUTH');
