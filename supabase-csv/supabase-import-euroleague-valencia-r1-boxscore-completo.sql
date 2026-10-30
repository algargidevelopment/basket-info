-- Boxscore completo de Valencia Basket vs Besiktas, EuroLeague R1 2026-27.
-- Datos transcritos del acta compartida por el usuario y asociados por dorsal.
-- PIR y faltas recibidas no existen en public.game_player_stats y no se importan.
-- +/- no indicado para los dorsales 7 y 41: en esas dos filas no se sobrescribe.

begin;

with raw(shirt_number, min_text, points, two_made, two_attempted, three_made, three_attempted, ft_made, ft_attempted, offensive_rebounds, defensive_rebounds, rebounds, assists, steals, turnovers, blocks, fouls, plus_minus) as (
  values
    (0,'23:33',26,9,17,2,3,2,2,0,1,1,2,1,2,0,3,8),
    (1,'23:37',12,3,5,1,1,3,5,1,6,7,2,0,1,0,3,10),
    (2,'11:19',0,0,0,0,0,0,0,0,1,1,1,0,1,0,0,-10),
    (3,'21:05',5,1,3,1,2,0,0,3,0,3,0,1,2,0,2,-11),
    (5,'16:26',7,1,2,1,2,2,2,0,1,1,3,2,3,0,2,9),
    (7,'09:39',0,0,0,0,1,0,0,0,0,0,3,0,1,0,1,null),
    (8,'17:44',1,0,1,0,1,1,1,1,4,5,0,1,0,0,3,13),
    (10,'12:50',2,1,5,0,1,0,0,3,2,5,2,0,0,0,1,-9),
    (12,'23:22',10,2,5,2,6,0,0,1,4,5,3,0,2,0,1,-8),
    (13,'11:23',10,4,4,0,0,2,2,0,2,2,2,0,0,0,4,2),
    (33,'13:45',13,2,3,1,3,6,6,1,2,3,0,1,0,0,2,2),
    (41,'15:17',10,2,4,1,1,3,3,2,1,3,0,0,1,0,2,null)
), resolved as (
  select g.id as game_id, p.id as player_id,
         (split_part(r.min_text, ':', 1)::int * 60 + split_part(r.min_text, ':', 2)::int) as seconds,
         r.*
  from raw r
  join public.competitions c on c.name = 'EuroLeague'
  join public.teams v on lower(v.name) = lower('Valencia Basket')
  join public.games g on g.competition_id = c.id and g.season = '2026-27' and g.round = 'R1'
    and (g.home_team_id = v.id or g.away_team_id = v.id)
  join public.players p on p.shirt_number = r.shirt_number
)
insert into public.game_player_stats (
  game_id, player_id, minutes, minutes_seconds, plus_minus, points,
  two_points_made, two_points_attempted, three_points_made, three_points_attempted,
  free_throws_made, free_throws_attempted, offensive_rebounds, defensive_rebounds,
  rebounds, assists, steals, turnovers, blocks, fouls
)
select game_id, player_id, round(seconds::numeric / 60, 1), seconds, coalesce(plus_minus, 0), points,
       two_made, two_attempted, three_made, three_attempted, ft_made, ft_attempted,
       offensive_rebounds, defensive_rebounds, rebounds, assists, steals, turnovers, blocks, fouls
from resolved
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

-- Actualiza +/- solo en las filas donde el acta sí lo especifica.
with plus_minus_data(shirt_number, plus_minus) as (
  values (0,8),(1,10),(2,-10),(3,-11),(5,9),(8,13),(10,-9),(12,-8),(13,2),(33,2)
)
update public.game_player_stats gps
set plus_minus = d.plus_minus
from plus_minus_data d, public.games g, public.competitions c, public.teams v, public.players p
where c.name = 'EuroLeague'
  and lower(v.name) = lower('Valencia Basket')
  and g.competition_id = c.id and g.season = '2026-27' and g.round = 'R1'
  and (g.home_team_id = v.id or g.away_team_id = v.id)
  and p.shirt_number = d.shirt_number
  and gps.game_id = g.id and gps.player_id = p.id;

commit;
