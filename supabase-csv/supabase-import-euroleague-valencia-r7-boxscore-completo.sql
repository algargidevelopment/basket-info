-- Boxscore completo de Paris Basketball vs Valencia Basket, EuroLeague R7 2026-27.
-- Transcrito de la captura del usuario. PIR, tapones recibidos y faltas recibidas
-- no tienen columnas en public.game_player_stats y por eso no se almacenan.
-- Ejecutar el archivo completo: los datos fuente y el UPSERT van en una sola consulta,
-- sin tablas temporales ni UUID codificados a mano.

with raw(player_name, min_text, points, two_made, two_attempted, three_made, three_attempted, ft_made, ft_attempted, offensive_rebounds, defensive_rebounds, rebounds, assists, steals, turnovers, blocks, fouls, plus_minus) as (
  values
    ('TJ Shorts',          '24:14', 25, 7,11, 2,3, 5,5, 1,3,4, 9,0,1, 0,2, 6),
    ('Kameron Taylor',     '17:57',  5, 2, 4, 0,2, 1,2, 0,1,1, 1,0,1, 0,4, 3),
    ('Josep Puerto',       '17:34',  5, 1, 1, 1,3, 0,0, 0,2,2, 0,1,0, 1,0, 7),
    ('Nate Reuvers',       '15:40',  9, 3, 3, 0,1, 3,6, 0,2,2, 0,1,1, 0,3,14),
    ('Mario Saint-Supéry', '06:45',  3, 0, 0, 1,2, 0,0, 0,1,1, 0,0,1, 0,1, 2),
    ('Álvaro Cárdenas',    '15:46',  6, 1, 3, 1,2, 1,1, 0,1,1, 5,0,0, 0,1, 5),
    ('Dylan Osetkowski',   '20:10',  5, 1, 1, 1,4, 0,0, 1,0,1, 3,1,0, 0,1, 8),
    ('Armoni Brooks',      '19:30', 22, 3, 4, 4,7, 4,6, 2,5,7, 3,0,1, 0,0,21),
    ('Neal Sako',          '17:57', 10, 5, 6, 0,0, 0,3, 3,4,7, 0,1,1, 0,1, 1),
    ('Gonzalo Corbalán',   '18:14',  8, 1, 2, 2,5, 0,0, 2,0,2, 2,0,0, 0,3,-11),
    ('Nikola Mirotic',     '13:18',  4, 0, 2, 0,2, 4,4, 2,2,4, 1,0,2, 0,1,-3),
    ('Jasiel Rivero',      '12:55',  2, 1, 2, 0,2, 0,2, 2,1,3, 0,2,1, 0,3, 2)
), target_game as (
  select g.id as game_id
  from public.games g
  join public.competitions c on c.id = g.competition_id
  join public.teams v on v.id in (g.home_team_id, g.away_team_id)
  where c.name = 'EuroLeague'
    and g.season = '2026-27'
    and g.round = 'R7'
    and lower(v.name) = lower('Valencia Basket')
), player_matches as (
  select r.player_name, p.id as player_id
  from raw r
  left join public.players p on lower(p.name) = lower(r.player_name)
), resolved as (
  select g.game_id, p.player_id,
         (split_part(r.min_text, ':', 1)::integer * 60 + split_part(r.min_text, ':', 2)::integer) as seconds,
         r.*
  from raw r
  cross join target_game g
  join player_matches p on p.player_name = r.player_name and p.player_id is not null
), checks as materialized (
  select 1 / case
    when (select count(*) from target_game) = 1
      and (select count(player_id) from player_matches) = 12
      and (select count(distinct player_id) from player_matches) = 12
      and (select count(*) from resolved) = 12
    then 1 else 0 end as valid
)
insert into public.game_player_stats (
  game_id, player_id, minutes, minutes_seconds, plus_minus, points,
  two_points_made, two_points_attempted, three_points_made, three_points_attempted,
  free_throws_made, free_throws_attempted, offensive_rebounds, defensive_rebounds,
  rebounds, assists, steals, turnovers, blocks, fouls
)
select r.game_id, r.player_id, round(r.seconds::numeric / 60, 1), r.seconds, r.plus_minus, r.points,
       r.two_made, r.two_attempted, r.three_made, r.three_attempted, r.ft_made, r.ft_attempted,
       r.offensive_rebounds, r.defensive_rebounds, r.rebounds, r.assists, r.steals, r.turnovers, r.blocks, r.fouls
from resolved r
cross join checks
where checks.valid = 1
on conflict (game_id, player_id) do update set
  minutes = excluded.minutes,
  minutes_seconds = excluded.minutes_seconds,
  plus_minus = excluded.plus_minus,
  points = excluded.points,
  two_points_made = excluded.two_points_made,
  two_points_attempted = excluded.two_points_attempted,
  three_points_made = excluded.three_points_made,
  three_points_attempted = excluded.three_points_attempted,
  free_throws_made = excluded.free_throws_made,
  free_throws_attempted = excluded.free_throws_attempted,
  offensive_rebounds = excluded.offensive_rebounds,
  defensive_rebounds = excluded.defensive_rebounds,
  rebounds = excluded.rebounds,
  assists = excluded.assists,
  steals = excluded.steals,
  turnovers = excluded.turnovers,
  blocks = excluded.blocks,
  fouls = excluded.fouls;
