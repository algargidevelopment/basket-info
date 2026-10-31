-- Boxscore completo de Valencia Basket vs Fenerbahce, EuroLeague R8 2026-27.
-- Transcrito de la captura del usuario. PIR, tapones recibidos y faltas recibidas
-- no tienen columnas en public.game_player_stats y por eso no se almacenan.
-- Ejecutar el archivo completo: los datos fuente y el UPSERT van en una sola consulta,
-- sin tablas temporales ni UUID codificados a mano.

with raw(player_name, min_text, points, two_made, two_attempted, three_made, three_attempted, ft_made, ft_attempted, offensive_rebounds, defensive_rebounds, rebounds, assists, steals, turnovers, blocks, fouls, plus_minus) as (
  values
    ('TJ Shorts',          '23:27', 23, 7,12, 0,1, 9,10, 0,2, 2, 3,0,2, 0,3,17),
    ('Kameron Taylor',     '26:26', 16, 5, 9, 2,2, 0, 0, 0,6, 6, 2,0,3, 0,2, 7),
    ('Josep Puerto',       '12:23',  0, 0, 0, 0,2, 0, 0, 1,1, 2, 0,1,0, 0,4,-1),
    ('Álvaro Cárdenas',    '10:06',  0, 0, 1, 0,2, 0, 0, 0,1, 1, 1,0,0, 0,1,-2),
    ('Dylan Osetkowski',   '22:13',  4, 0, 2, 1,2, 1, 1, 2,0, 2, 0,1,1, 0,1,-7),
    ('Omari Moore',        '12:04',  0, 0, 4, 0,1, 0, 0, 3,0, 3, 1,0,3, 0,0,-9),
    ('Armoni Brooks',      '23:11', 16, 2, 5, 3,8, 3, 3, 0,7, 7, 0,0,1, 0,2,14),
    ('Neal Sako',          '19:26',  9, 4, 8, 0,1, 1, 2, 5,5,10, 0,2,0, 0,0,-3),
    ('Mouhamadou Gueye',   '05:31',  0, 0, 0, 0,0, 0, 0, 0,0, 0, 0,0,0, 0,1,-2),
    ('Gonzalo Corbalán',   '12:23',  2, 1, 4, 0,2, 0, 0, 0,1, 1, 0,0,0, 0,1,-2),
    ('Nikola Mirotic',     '16:22', 12, 6, 6, 0,2, 0, 0, 3,2, 5, 1,0,0, 1,1,17),
    ('Jasiel Rivero',      '16:28',  4, 1, 1, 0,0, 2, 2, 2,2, 4, 0,0,0, 0,3,11)
), target_game as (
  select g.id as game_id
  from public.games g
  join public.competitions c on c.id = g.competition_id
  join public.teams v on v.id in (g.home_team_id, g.away_team_id)
  where c.name = 'EuroLeague'
    and g.season = '2026-27'
    and g.round = 'R8'
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
