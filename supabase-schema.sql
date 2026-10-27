-- Esquema inicial para Valencia Basket (ACB y EuroLeague).
-- Ejecutar en Supabase: SQL Editor > New query > Run.
-- Crea tablas y relaciones, pero no inserta datos.

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_name text,
  logo_url text,
  location text
);

-- Esta tabla se usa únicamente para jugadores de Valencia Basket.
create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  shirt_number smallint,
  position text,
  birth_date date,
  height_cm smallint,
  photo_url text,
  active boolean not null default true,
  constraint players_shirt_number_nonnegative check (shirt_number is null or shirt_number >= 0),
  constraint players_height_positive check (height_cm is null or height_cm > 0)
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete restrict,
  season text not null,
  round text,
  game_date timestamptz not null,
  home_team_id uuid not null references public.teams(id) on delete restrict,
  away_team_id uuid not null references public.teams(id) on delete restrict,
  venue text,
  status text not null default 'scheduled',
  home_score smallint,
  away_score smallint,
  home_q1_score smallint,
  away_q1_score smallint,
  home_q2_score smallint,
  away_q2_score smallint,
  home_q3_score smallint,
  away_q3_score smallint,
  home_q4_score smallint,
  away_q4_score smallint,
  constraint games_different_teams check (home_team_id <> away_team_id),
  constraint games_status_valid check (status in ('scheduled', 'live', 'finished')),
  constraint games_scores_nonnegative check (
    (home_score is null or home_score >= 0) and
    (away_score is null or away_score >= 0)
  ),
  constraint games_quarter_scores_nonnegative check (
    (home_q1_score is null or home_q1_score >= 0) and (away_q1_score is null or away_q1_score >= 0) and
    (home_q2_score is null or home_q2_score >= 0) and (away_q2_score is null or away_q2_score >= 0) and
    (home_q3_score is null or home_q3_score >= 0) and (away_q3_score is null or away_q3_score >= 0) and
    (home_q4_score is null or home_q4_score >= 0) and (away_q4_score is null or away_q4_score >= 0)
  ),
  constraint games_finished_have_scores check (
    status <> 'finished' or (home_score is not null and away_score is not null)
  )
);

create index games_competition_season_date_idx
  on public.games (competition_id, season, game_date);
create index games_home_team_idx on public.games (home_team_id);
create index games_away_team_idx on public.games (away_team_id);

-- Una fila por partido en el que juega Valencia Basket.
create table public.game_team_stats (
  game_id uuid primary key references public.games(id) on delete cascade,
  two_points_made smallint not null default 0,
  two_points_attempted smallint not null default 0,
  three_points_made smallint not null default 0,
  three_points_attempted smallint not null default 0,
  free_throws_made smallint not null default 0,
  free_throws_attempted smallint not null default 0,
  offensive_rebounds smallint not null default 0,
  defensive_rebounds smallint not null default 0,
  assists smallint not null default 0,
  steals smallint not null default 0,
  blocks smallint not null default 0,
  turnovers smallint not null default 0,
  fouls smallint not null default 0,
  constraint game_team_stats_nonnegative check (
    two_points_made >= 0 and two_points_attempted >= 0 and two_points_made <= two_points_attempted and
    three_points_made >= 0 and three_points_attempted >= 0 and three_points_made <= three_points_attempted and
    free_throws_made >= 0 and free_throws_attempted >= 0 and free_throws_made <= free_throws_attempted and
    offensive_rebounds >= 0 and defensive_rebounds >= 0 and assists >= 0 and steals >= 0 and
    blocks >= 0 and turnovers >= 0 and fouls >= 0
  )
);

-- Una fila por jugador de Valencia y partido.
create table public.game_player_stats (
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  minutes numeric(4,1) not null default 0,
  points smallint not null default 0,
  two_points_made smallint not null default 0,
  two_points_attempted smallint not null default 0,
  three_points_made smallint not null default 0,
  three_points_attempted smallint not null default 0,
  free_throws_made smallint not null default 0,
  free_throws_attempted smallint not null default 0,
  offensive_rebounds smallint not null default 0,
  defensive_rebounds smallint not null default 0,
  rebounds smallint,
  assists smallint not null default 0,
  steals smallint not null default 0,
  blocks smallint not null default 0,
  turnovers smallint not null default 0,
  fouls smallint not null default 0,
  primary key (game_id, player_id),
  constraint game_player_stats_nonnegative check (
    minutes >= 0 and points >= 0 and
    two_points_made >= 0 and two_points_attempted >= 0 and two_points_made <= two_points_attempted and
    three_points_made >= 0 and three_points_attempted >= 0 and three_points_made <= three_points_attempted and
    free_throws_made >= 0 and free_throws_attempted >= 0 and free_throws_made <= free_throws_attempted and
    offensive_rebounds >= 0 and defensive_rebounds >= 0 and (rebounds is null or rebounds >= 0) and assists >= 0 and steals >= 0 and
    blocks >= 0 and turnovers >= 0 and fouls >= 0
  )
);

create index game_player_stats_player_idx on public.game_player_stats (player_id);
