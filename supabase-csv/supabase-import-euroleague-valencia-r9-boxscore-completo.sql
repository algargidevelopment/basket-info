-- Boxscore completo de FC Barcelona vs Valencia Basket, EuroLeague R9 2026-27.
-- Transcrito de la captura del usuario. PIR, tapones recibidos y faltas recibidas
-- no tienen columnas en public.game_player_stats y por eso no se almacenan.
-- El +/- de Mario Saint-Supéry no aparece en la captura y se conserva sin modificar.
-- No crea tablas ni usa UUID codificados: resuelve partido y jugadores por sus datos.

with raw(player_name, min_text, points, two_made, two_attempted, three_made, three_attempted, ft_made, ft_attempted, offensive_rebounds, defensive_rebounds, rebounds, assists, steals, turnovers, blocks, fouls) as (
  values
    ('TJ Shorts',          '23:55', 11, 5,8, 0,0, 1,4, 1,0,1, 5,2,1, 0,1),
    ('Kameron Taylor',     '24:44', 10, 1,3, 2,5, 2,2, 1,2,3, 3,0,2, 0,4),
    ('Josep Puerto',       '08:03',  0, 0,0, 0,0, 0,0, 0,0,0, 0,0,0, 0,1),
    ('Mario Saint-Supéry', '11:21',  4, 2,2, 0,1, 0,0, 0,0,0, 2,0,0, 0,2),
    ('Álvaro Cárdenas',    '13:06',  2, 1,2, 0,0, 0,0, 0,4,4, 3,0,1, 0,2),
    ('Dylan Osetkowski',   '23:55', 11, 1,3, 3,6, 0,0, 1,0,1, 2,0,0, 0,2),
    ('Omari Moore',        '09:49',  2, 0,0, 0,1, 2,2, 0,1,1, 3,0,0, 0,1),
    ('Armoni Brooks',      '21:49', 26, 5,8, 5,9, 1,1, 0,1,1, 0,0,0, 0,3),
    ('Neal Sako',          '17:32',  6, 1,4, 0,0, 4,6, 4,6,10,0,0,0, 0,1),
    ('Mouhamadou Gueye',   '10:34',  7, 2,5, 1,1, 0,1, 2,2,4, 0,0,0, 2,2),
    ('Gonzalo Corbalán',   '15:16',  3, 0,3, 1,2, 0,0, 1,1,2, 1,0,1, 0,0),
    ('Jasiel Rivero',      '19:56', 12, 5,9, 0,0, 2,2, 3,4,7, 0,0,0, 1,1)
), target_game as (
  select g.id as game_id
  from public.games g
  join public.competitions c on c.id = g.competition_id
  join public.teams home on home.id = g.home_team_id
  join public.teams away on away.id = g.away_team_id
  join public.teams v on v.id in (g.home_team_id, g.away_team_id)
  where c.name = 'EuroLeague'
    and g.season = '2026-27'
    and g.round = 'R9'
    and lower(v.name) = lower('Valencia Basket')
    and lower(home.name) = lower('FC Barcelona')
    and lower(away.name) = lower('Valencia Basket')
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
  game_id, player_id, minutes, minutes_seconds, points,
  two_points_made, two_points_attempted, three_points_made, three_points_attempted,
  free_throws_made, free_throws_attempted, offensive_rebounds, defensive_rebounds,
  rebounds, assists, steals, turnovers, blocks, fouls
)
select r.game_id, r.player_id, round(r.seconds::numeric / 60, 1), r.seconds, r.points,
       r.two_made, r.two_attempted, r.three_made, r.three_attempted, r.ft_made, r.ft_attempted,
       r.offensive_rebounds, r.defensive_rebounds, r.rebounds, r.assists, r.steals, r.turnovers, r.blocks, r.fouls
from resolved r
cross join checks
where checks.valid = 1
on conflict (game_id, player_id) do update set
  minutes = excluded.minutes,
  minutes_seconds = excluded.minutes_seconds,
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

with plus_minus_data(player_name, plus_minus) as (
  values
    ('TJ Shorts', 3), ('Kameron Taylor', -5), ('Josep Puerto', 1),
    ('Álvaro Cárdenas', -2), ('Dylan Osetkowski', -10), ('Omari Moore', 2),
    ('Armoni Brooks', -11), ('Neal Sako', 2), ('Mouhamadou Gueye', 2),
    ('Gonzalo Corbalán', 1), ('Jasiel Rivero', -3)
)
update public.game_player_stats gps
set plus_minus = d.plus_minus
from plus_minus_data d
join public.players p on lower(p.name) = lower(d.player_name)
join public.games g on g.season = '2026-27' and g.round = 'R9'
join public.competitions c on c.id = g.competition_id and c.name = 'EuroLeague'
join public.teams home on home.id = g.home_team_id and lower(home.name) = lower('FC Barcelona')
join public.teams v on v.id = g.away_team_id and lower(v.name) = lower('Valencia Basket')
where gps.game_id = g.id
  and gps.player_id = p.id;
