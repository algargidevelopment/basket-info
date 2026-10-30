-- Estadisticas oficiales resumidas de Valencia Basket, EuroLeague 2026-27 R1-R8.
-- Fuente de MIN, PTS, REB y AST: actas oficiales EuroLeague Media Game Center.
-- Solo carga esas cuatro estadisticas; no inventa tiros, robos, tapones, perdidas, faltas ni +/-.
-- Para jugadores nuevos, esas columnas no incluidas conservan sus defaults (cero).
-- Requiere que existan los partidos, equipos, competicion y jugadores correspondientes.

begin;

-- R8 puede no estar en las importaciones anteriores; crea el partido si falta.
insert into public.games (competition_id, season, round, game_date, home_team_id, away_team_id, status, home_score, away_score)
select c.id, '2026-27', 'R8', '2026-10-27 20:30:00+01'::timestamptz, v.id, f.id, 'finished', 86, 78
from public.competitions c
join public.teams v on lower(v.name) = lower('Valencia Basket')
join public.teams f on lower(f.name) = lower('Fenerbahce Tarfin Istanbul')
where c.name = 'EuroLeague'
  and not exists (
    select 1 from public.games g
    where g.competition_id = c.id and g.season = '2026-27' and g.round = 'R8'
      and g.home_team_id = v.id and g.away_team_id = f.id
  );

with raw(round, player_name, min_text, points, rebounds, assists) as (
  values
    ('R1','TJ Shorts','23:33',26,1,2),('R1','Kameron Taylor','23:37',12,7,2),('R1','Josep Puerto','11:19',0,1,1),('R1','Nate Reuvers','21:05',5,3,0),('R1','Mario Saint-Supéry','16:26',7,1,3),('R1','Álvaro Cárdenas','09:39',0,0,3),('R1','Dylan Osetkowski','17:44',1,5,0),('R1','Omari Moore','12:50',2,5,2),('R1','Armoni Brooks','23:22',10,5,3),('R1','Neal Sako','11:23',10,2,2),('R1','Nikola Mirotic','13:45',13,3,0),('R1','Jasiel Rivero','15:17',10,3,0),
    ('R2','TJ Shorts','18:52',12,0,10),('R2','Kameron Taylor','18:05',6,4,3),('R2','Josep Puerto','17:00',13,2,0),('R2','Nate Reuvers','10:57',7,2,1),('R2','Mario Saint-Supéry','16:27',3,2,0),('R2','Dylan Osetkowski','19:26',12,7,1),('R2','Omari Moore','19:50',10,3,6),('R2','Armoni Brooks','18:15',17,1,2),('R2','Neal Sako','17:13',4,5,2),('R2','Gonzalo Corbalán','11:41',4,1,0),('R2','Nikola Mirotic','16:09',13,4,1),('R2','Jasiel Rivero','16:05',10,3,1),
    ('R3','TJ Shorts','21:38',17,4,6),('R3','Kameron Taylor','24:57',14,5,2),('R3','Josep Puerto','15:03',9,2,0),('R3','Nate Reuvers','17:41',13,5,0),('R3','Mario Saint-Supéry','14:00',0,2,3),('R3','Dylan Osetkowski','18:03',9,4,1),('R3','Omari Moore','18:22',7,1,5),('R3','Armoni Brooks','21:22',5,6,1),('R3','Neal Sako','12:54',5,8,0),('R3','Gonzalo Corbalán','04:38',0,0,1),('R3','Nikola Mirotic','17:43',22,2,1),('R3','Jasiel Rivero','13:39',4,2,1),
    ('R4','TJ Shorts','23:19',15,0,7),('R4','Kameron Taylor','26:52',17,5,1),('R4','Josep Puerto','13:55',11,2,1),('R4','Nate Reuvers','14:42',6,3,1),('R4','Álvaro Cárdenas','04:29',0,1,1),('R4','Dylan Osetkowski','19:55',10,3,1),('R4','Omari Moore','17:51',4,4,2),('R4','Armoni Brooks','20:29',9,2,1),('R4','Neal Sako','14:09',2,6,0),('R4','Gonzalo Corbalán','13:05',0,2,1),('R4','Nikola Mirotic','18:28',9,5,1),('R4','Jasiel Rivero','12:46',10,2,0),
    ('R5','TJ Shorts','29:45',16,1,5),('R5','Kameron Taylor','28:39',15,4,2),('R5','Josep Puerto','16:21',6,0,2),('R5','Nate Reuvers','20:22',13,2,1),('R5','Mario Saint-Supéry','06:38',0,1,1),('R5','Álvaro Cárdenas','13:26',4,3,2),('R5','Dylan Osetkowski','23:05',3,4,2),('R5','Omari Moore','15:07',7,0,2),('R5','Armoni Brooks','25:04',14,2,2),('R5','Neal Sako','14:57',0,4,2),('R5','Nikola Mirotic','20:03',19,2,1),('R5','Jasiel Rivero','11:33',0,1,2),
    ('R6','TJ Shorts','21:27',9,3,4),('R6','Kameron Taylor','22:50',7,4,3),('R6','Josep Puerto','17:10',8,3,1),('R6','Nate Reuvers','12:31',6,3,0),('R6','Álvaro Cárdenas','13:10',5,0,4),('R6','Dylan Osetkowski','18:42',3,5,1),('R6','Omari Moore','05:27',0,0,2),('R6','Armoni Brooks','21:26',14,4,0),('R6','Neal Sako','17:46',4,2,0),('R6','Gonzalo Corbalán','18:34',14,4,2),('R6','Nikola Mirotic','15:53',12,0,1),('R6','Jasiel Rivero','15:04',6,1,1),
    ('R7','TJ Shorts','24:14',25,4,9),('R7','Kameron Taylor','17:57',5,1,1),('R7','Josep Puerto','17:34',5,2,0),('R7','Nate Reuvers','15:40',9,2,0),('R7','Mario Saint-Supéry','06:45',3,1,0),('R7','Álvaro Cárdenas','15:46',6,1,5),('R7','Dylan Osetkowski','20:10',5,1,3),('R7','Armoni Brooks','19:30',22,7,3),('R7','Neal Sako','17:57',10,7,0),('R7','Gonzalo Corbalán','18:14',8,2,2),('R7','Nikola Mirotic','13:18',4,4,1),('R7','Jasiel Rivero','12:55',2,3,0),
    ('R8','TJ Shorts','23:27',23,2,3),('R8','Kameron Taylor','26:26',16,6,2),('R8','Josep Puerto','12:23',0,2,0),('R8','Álvaro Cárdenas','10:06',0,1,1),('R8','Dylan Osetkowski','22:13',4,2,0),('R8','Omari Moore','12:04',0,3,1),('R8','Armoni Brooks','23:11',16,7,0),('R8','Neal Sako','19:26',9,10,0),('R8','Mouhamadou Gueye','05:31',0,0,0),('R8','Gonzalo Corbalán','12:23',2,1,0),('R8','Nikola Mirotic','16:22',12,5,1),('R8','Jasiel Rivero','16:28',4,4,0)
), stats as (
  select g.id as game_id, p.id as player_id,
         (split_part(r.min_text, ':', 1)::int * 60 + split_part(r.min_text, ':', 2)::int) as seconds,
         r.points, r.rebounds, r.assists
  from raw r
  join public.competitions c on c.name = 'EuroLeague'
  join public.teams v on lower(v.name) = lower('Valencia Basket')
  join public.games g on g.competition_id = c.id and g.season = '2026-27' and g.round = r.round
    and (g.home_team_id = v.id or g.away_team_id = v.id)
  join public.players p on lower(p.name) = lower(r.player_name)
)
insert into public.game_player_stats (game_id, player_id, minutes, minutes_seconds, points, rebounds, assists)
select game_id, player_id, round(seconds::numeric / 60, 1), seconds, points, rebounds, assists
from stats
on conflict (game_id, player_id) do update set
  minutes = excluded.minutes,
  minutes_seconds = excluded.minutes_seconds,
  points = excluded.points,
  rebounds = excluded.rebounds,
  assists = excluded.assists;

commit;

