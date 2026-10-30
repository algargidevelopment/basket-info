-- Carga de los dos CSV de boxscores de Valencia Basket (temporada 2026-27).
-- Importación repetible: evita duplicar partidos y actualiza las líneas por jugador.
-- El primer número de Resultado en los CSV es la puntuación de Valencia; se coloca
-- como local o visitante según Condición. Comprobar esta interpretación antes de usar.
-- Los CSV no incluyen minutos, tiros intentados, robos, tapones ni pérdidas.
-- Las estadísticas individuales no suman al marcador del equipo en varios partidos;
-- se importan tal como aparecen en la fuente y conviene revisarlas antes de publicar.

insert into public.competitions (name) values ('ACB'), ('EuroLeague') on conflict (name) do nothing;

-- Los CSV aportan rebotes totales, no separación ofensivos/defensivos.
alter table public.game_player_stats add column if not exists rebounds smallint;

-- Garantiza que existan los equipos utilizados en estos partidos.
insert into public.teams (name) values
  ('Besiktas Istanbul'),
  ('Casademont Zaragoza'),
  ('FC Barcelona'),
  ('Hapoel IBI Tel Aviv'),
  ('Ilerna Lleida'),
  ('Kosner Baskonia'),
  ('LDLC ASVEL Villeurbanne'),
  ('Maccabi Rapyd Tel Aviv'),
  ('Olympiacos Piraeus'),
  ('Paris Basketball'),
  ('UCAM Murcia'),
  ('Valencia Basket')
on conflict (name) do nothing;

-- Asegura las fichas de los 12 jugadores presentes en los CSV.
-- No agrega fecha de nacimiento, altura o dorsal porque no aparecen en la fuente.
insert into public.players (name, active)
select incoming.name, true
from (values
  ('TJ Shorts'),
  ('Álvaro Cárdenas'),
  ('Gonzalo Corbalán'),
  ('Mario Saint-Supéry'),
  ('Nikola Mirotic'),
  ('Armoni Brooks'),
  ('Jasiel Rivero'),
  ('Neal Sako'),
  ('Kameron Taylor'),
  ('Josep Puerto'),
  ('Nate Reuvers'),
  ('Dylan Osetkowski')
) as incoming(name)
where not exists (select 1 from public.players p where lower(p.name)=lower(incoming.name));

-- Partidos finalizados; marcadores en orden local-visitante.
with incoming (competition_name, season, round, game_date, home_name, away_name, home_score, away_score) as (values
  ('ACB', '2026-27', 'J1', '2026-09-27'::date, 'Valencia Basket', 'Ilerna Lleida', 100, 105),
  ('ACB', '2026-27', 'J2', '2026-10-04'::date, 'Casademont Zaragoza', 'Valencia Basket', 82, 97),
  ('ACB', '2026-27', 'J3', '2026-10-11'::date, 'FC Barcelona', 'Valencia Basket', 89, 86),
  ('ACB', '2026-27', 'J4', '2026-10-18'::date, 'Valencia Basket', 'UCAM Murcia', 116, 93),
  ('ACB', '2026-27', 'J5', '2026-10-25'::date, 'Valencia Basket', 'Kosner Baskonia', 84, 75),
  ('EuroLeague', '2026-27', 'R1', '2026-09-25'::date, 'Besiktas Istanbul', 'Valencia Basket', 94, 96),
  ('EuroLeague', '2026-27', 'R2', '2026-09-29'::date, 'Valencia Basket', 'Kosner Baskonia', 111, 88),
  ('EuroLeague', '2026-27', 'R3', '2026-10-02'::date, 'LDLC ASVEL Villeurbanne', 'Valencia Basket', 92, 105),
  ('EuroLeague', '2026-27', 'R4', '2026-10-08'::date, 'Valencia Basket', 'Hapoel IBI Tel Aviv', 93, 82),
  ('EuroLeague', '2026-27', 'R5', '2026-10-13'::date, 'Valencia Basket', 'Olympiacos Piraeus', 97, 102),
  ('EuroLeague', '2026-27', 'R6', '2026-10-15'::date, 'Valencia Basket', 'Maccabi Rapyd Tel Aviv', 88, 91),
  ('EuroLeague', '2026-27', 'R7', '2026-10-23'::date, 'Paris Basketball', 'Valencia Basket', 93, 104)
)
insert into public.games (competition_id, season, round, game_date, home_team_id, away_team_id, status, home_score, away_score)
select c.id, i.season, i.round, i.game_date::timestamptz, home_team.id, away_team.id, 'finished', i.home_score, i.away_score
from incoming i join public.competitions c on c.name = i.competition_name
join public.teams home_team on home_team.name = i.home_name join public.teams away_team on away_team.name = i.away_name
where not exists (select 1 from public.games g where g.competition_id=c.id and g.season=i.season and g.round=i.round and g.home_team_id=home_team.id and g.away_team_id=away_team.id);

-- Boxscore por jugador; los ceros se conservan tal como aparecen en los CSV.
with incoming (competition_name, season, round, game_date, player_name, points, rebounds, assists) as (values
  ('EuroLeague', '2026-27', 'R1', '2026-09-25'::date, 'TJ Shorts', 10, 0, 3),
  ('EuroLeague', '2026-27', 'R1', '2026-09-25'::date, 'Nikola Mirotic', 8, 2, 0),
  ('EuroLeague', '2026-27', 'R1', '2026-09-25'::date, 'Armoni Brooks', 5, 1, 0),
  ('EuroLeague', '2026-27', 'R1', '2026-09-25'::date, 'Jasiel Rivero', 8, 3, 2),
  ('EuroLeague', '2026-27', 'R1', '2026-09-25'::date, 'Neal Sako', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R1', '2026-09-25'::date, 'Kameron Taylor', 18, 7, 6),
  ('EuroLeague', '2026-27', 'R1', '2026-09-25'::date, 'Álvaro Cárdenas', 2, 1, 0),
  ('EuroLeague', '2026-27', 'R1', '2026-09-25'::date, 'Josep Puerto', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R1', '2026-09-25'::date, 'Nate Reuvers', 5, 2, 1),
  ('EuroLeague', '2026-27', 'R1', '2026-09-25'::date, 'Gonzalo Corbalán', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R1', '2026-09-25'::date, 'Dylan Osetkowski', 2, 1, 0),
  ('EuroLeague', '2026-27', 'R1', '2026-09-25'::date, 'Mario Saint-Supéry', 0, 0, 0),
  ('EuroLeague', '2026-27', 'R2', '2026-09-29'::date, 'TJ Shorts', 10, 0, 3),
  ('EuroLeague', '2026-27', 'R2', '2026-09-29'::date, 'Nikola Mirotic', 8, 2, 0),
  ('EuroLeague', '2026-27', 'R2', '2026-09-29'::date, 'Armoni Brooks', 5, 1, 0),
  ('EuroLeague', '2026-27', 'R2', '2026-09-29'::date, 'Jasiel Rivero', 8, 3, 2),
  ('EuroLeague', '2026-27', 'R2', '2026-09-29'::date, 'Neal Sako', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R2', '2026-09-29'::date, 'Kameron Taylor', 18, 7, 6),
  ('EuroLeague', '2026-27', 'R2', '2026-09-29'::date, 'Álvaro Cárdenas', 2, 1, 0),
  ('EuroLeague', '2026-27', 'R2', '2026-09-29'::date, 'Josep Puerto', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R2', '2026-09-29'::date, 'Nate Reuvers', 5, 2, 1),
  ('EuroLeague', '2026-27', 'R2', '2026-09-29'::date, 'Gonzalo Corbalán', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R2', '2026-09-29'::date, 'Dylan Osetkowski', 2, 1, 0),
  ('EuroLeague', '2026-27', 'R2', '2026-09-29'::date, 'Mario Saint-Supéry', 0, 0, 0),
  ('EuroLeague', '2026-27', 'R3', '2026-10-02'::date, 'TJ Shorts', 10, 0, 3),
  ('EuroLeague', '2026-27', 'R3', '2026-10-02'::date, 'Nikola Mirotic', 8, 2, 0),
  ('EuroLeague', '2026-27', 'R3', '2026-10-02'::date, 'Armoni Brooks', 5, 1, 0),
  ('EuroLeague', '2026-27', 'R3', '2026-10-02'::date, 'Jasiel Rivero', 8, 3, 2),
  ('EuroLeague', '2026-27', 'R3', '2026-10-02'::date, 'Neal Sako', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R3', '2026-10-02'::date, 'Kameron Taylor', 18, 7, 6),
  ('EuroLeague', '2026-27', 'R3', '2026-10-02'::date, 'Álvaro Cárdenas', 2, 1, 0),
  ('EuroLeague', '2026-27', 'R3', '2026-10-02'::date, 'Josep Puerto', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R3', '2026-10-02'::date, 'Nate Reuvers', 5, 2, 1),
  ('EuroLeague', '2026-27', 'R3', '2026-10-02'::date, 'Gonzalo Corbalán', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R3', '2026-10-02'::date, 'Dylan Osetkowski', 2, 1, 0),
  ('EuroLeague', '2026-27', 'R3', '2026-10-02'::date, 'Mario Saint-Supéry', 0, 0, 0),
  ('EuroLeague', '2026-27', 'R4', '2026-10-08'::date, 'TJ Shorts', 10, 0, 3),
  ('EuroLeague', '2026-27', 'R4', '2026-10-08'::date, 'Nikola Mirotic', 8, 2, 0),
  ('EuroLeague', '2026-27', 'R4', '2026-10-08'::date, 'Armoni Brooks', 5, 1, 0),
  ('EuroLeague', '2026-27', 'R4', '2026-10-08'::date, 'Jasiel Rivero', 8, 3, 2),
  ('EuroLeague', '2026-27', 'R4', '2026-10-08'::date, 'Neal Sako', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R4', '2026-10-08'::date, 'Kameron Taylor', 18, 7, 6),
  ('EuroLeague', '2026-27', 'R4', '2026-10-08'::date, 'Álvaro Cárdenas', 2, 1, 0),
  ('EuroLeague', '2026-27', 'R4', '2026-10-08'::date, 'Josep Puerto', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R4', '2026-10-08'::date, 'Nate Reuvers', 5, 2, 1),
  ('EuroLeague', '2026-27', 'R4', '2026-10-08'::date, 'Gonzalo Corbalán', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R4', '2026-10-08'::date, 'Dylan Osetkowski', 2, 1, 0),
  ('EuroLeague', '2026-27', 'R4', '2026-10-08'::date, 'Mario Saint-Supéry', 0, 0, 0),
  ('EuroLeague', '2026-27', 'R5', '2026-10-13'::date, 'TJ Shorts', 10, 0, 3),
  ('EuroLeague', '2026-27', 'R5', '2026-10-13'::date, 'Nikola Mirotic', 8, 2, 0),
  ('EuroLeague', '2026-27', 'R5', '2026-10-13'::date, 'Armoni Brooks', 5, 1, 0),
  ('EuroLeague', '2026-27', 'R5', '2026-10-13'::date, 'Jasiel Rivero', 8, 3, 2),
  ('EuroLeague', '2026-27', 'R5', '2026-10-13'::date, 'Neal Sako', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R5', '2026-10-13'::date, 'Kameron Taylor', 18, 7, 6),
  ('EuroLeague', '2026-27', 'R5', '2026-10-13'::date, 'Álvaro Cárdenas', 2, 1, 0),
  ('EuroLeague', '2026-27', 'R5', '2026-10-13'::date, 'Josep Puerto', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R5', '2026-10-13'::date, 'Nate Reuvers', 5, 2, 1),
  ('EuroLeague', '2026-27', 'R5', '2026-10-13'::date, 'Gonzalo Corbalán', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R5', '2026-10-13'::date, 'Dylan Osetkowski', 2, 1, 0),
  ('EuroLeague', '2026-27', 'R5', '2026-10-13'::date, 'Mario Saint-Supéry', 0, 0, 0),
  ('EuroLeague', '2026-27', 'R6', '2026-10-15'::date, 'TJ Shorts', 10, 0, 3),
  ('EuroLeague', '2026-27', 'R6', '2026-10-15'::date, 'Nikola Mirotic', 8, 2, 0),
  ('EuroLeague', '2026-27', 'R6', '2026-10-15'::date, 'Armoni Brooks', 5, 1, 0),
  ('EuroLeague', '2026-27', 'R6', '2026-10-15'::date, 'Jasiel Rivero', 8, 3, 2),
  ('EuroLeague', '2026-27', 'R6', '2026-10-15'::date, 'Neal Sako', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R6', '2026-10-15'::date, 'Kameron Taylor', 18, 7, 6),
  ('EuroLeague', '2026-27', 'R6', '2026-10-15'::date, 'Álvaro Cárdenas', 2, 1, 0),
  ('EuroLeague', '2026-27', 'R6', '2026-10-15'::date, 'Josep Puerto', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R6', '2026-10-15'::date, 'Nate Reuvers', 5, 2, 1),
  ('EuroLeague', '2026-27', 'R6', '2026-10-15'::date, 'Gonzalo Corbalán', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R6', '2026-10-15'::date, 'Dylan Osetkowski', 2, 1, 0),
  ('EuroLeague', '2026-27', 'R6', '2026-10-15'::date, 'Mario Saint-Supéry', 0, 0, 0),
  ('EuroLeague', '2026-27', 'R7', '2026-10-23'::date, 'TJ Shorts', 10, 0, 3),
  ('EuroLeague', '2026-27', 'R7', '2026-10-23'::date, 'Nikola Mirotic', 8, 2, 0),
  ('EuroLeague', '2026-27', 'R7', '2026-10-23'::date, 'Armoni Brooks', 5, 1, 0),
  ('EuroLeague', '2026-27', 'R7', '2026-10-23'::date, 'Jasiel Rivero', 8, 3, 2),
  ('EuroLeague', '2026-27', 'R7', '2026-10-23'::date, 'Neal Sako', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R7', '2026-10-23'::date, 'Kameron Taylor', 18, 7, 6),
  ('EuroLeague', '2026-27', 'R7', '2026-10-23'::date, 'Álvaro Cárdenas', 2, 1, 0),
  ('EuroLeague', '2026-27', 'R7', '2026-10-23'::date, 'Josep Puerto', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R7', '2026-10-23'::date, 'Nate Reuvers', 5, 2, 1),
  ('EuroLeague', '2026-27', 'R7', '2026-10-23'::date, 'Gonzalo Corbalán', 11, 4, 3),
  ('EuroLeague', '2026-27', 'R7', '2026-10-23'::date, 'Dylan Osetkowski', 2, 1, 0),
  ('EuroLeague', '2026-27', 'R7', '2026-10-23'::date, 'Mario Saint-Supéry', 0, 0, 0),
  ('ACB', '2026-27', 'J1', '2026-09-27'::date, 'TJ Shorts', 19, 4, 6),
  ('ACB', '2026-27', 'J1', '2026-09-27'::date, 'Nikola Mirotic', 14, 5, 2),
  ('ACB', '2026-27', 'J1', '2026-09-27'::date, 'Armoni Brooks', 13, 4, 3),
  ('ACB', '2026-27', 'J1', '2026-09-27'::date, 'Jasiel Rivero', 11, 4, 2),
  ('ACB', '2026-27', 'J1', '2026-09-27'::date, 'Neal Sako', 11, 7, 1),
  ('ACB', '2026-27', 'J1', '2026-09-27'::date, 'Kameron Taylor', 8, 3, 3),
  ('ACB', '2026-27', 'J1', '2026-09-27'::date, 'Álvaro Cárdenas', 8, 3, 3),
  ('ACB', '2026-27', 'J1', '2026-09-27'::date, 'Josep Puerto', 8, 3, 3),
  ('ACB', '2026-27', 'J1', '2026-09-27'::date, 'Nate Reuvers', 8, 3, 3),
  ('ACB', '2026-27', 'J1', '2026-09-27'::date, 'Gonzalo Corbalán', 8, 3, 3),
  ('ACB', '2026-27', 'J1', '2026-09-27'::date, 'Dylan Osetkowski', 8, 3, 3),
  ('ACB', '2026-27', 'J1', '2026-09-27'::date, 'Mario Saint-Supéry', 8, 3, 3),
  ('ACB', '2026-27', 'J2', '2026-10-04'::date, 'TJ Shorts', 21, 5, 7),
  ('ACB', '2026-27', 'J2', '2026-10-04'::date, 'Nikola Mirotic', 16, 6, 3),
  ('ACB', '2026-27', 'J2', '2026-10-04'::date, 'Armoni Brooks', 15, 5, 4),
  ('ACB', '2026-27', 'J2', '2026-10-04'::date, 'Jasiel Rivero', 13, 5, 3),
  ('ACB', '2026-27', 'J2', '2026-10-04'::date, 'Neal Sako', 13, 8, 2),
  ('ACB', '2026-27', 'J2', '2026-10-04'::date, 'Kameron Taylor', 10, 4, 4),
  ('ACB', '2026-27', 'J2', '2026-10-04'::date, 'Álvaro Cárdenas', 10, 4, 4),
  ('ACB', '2026-27', 'J2', '2026-10-04'::date, 'Josep Puerto', 10, 4, 4),
  ('ACB', '2026-27', 'J2', '2026-10-04'::date, 'Nate Reuvers', 10, 4, 4),
  ('ACB', '2026-27', 'J2', '2026-10-04'::date, 'Gonzalo Corbalán', 10, 4, 4),
  ('ACB', '2026-27', 'J2', '2026-10-04'::date, 'Dylan Osetkowski', 10, 4, 4),
  ('ACB', '2026-27', 'J2', '2026-10-04'::date, 'Mario Saint-Supéry', 10, 4, 4),
  ('ACB', '2026-27', 'J3', '2026-10-11'::date, 'TJ Shorts', 13, 1, 3),
  ('ACB', '2026-27', 'J3', '2026-10-11'::date, 'Nikola Mirotic', 8, 2, 0),
  ('ACB', '2026-27', 'J3', '2026-10-11'::date, 'Armoni Brooks', 7, 1, 0),
  ('ACB', '2026-27', 'J3', '2026-10-11'::date, 'Jasiel Rivero', 5, 1, 0),
  ('ACB', '2026-27', 'J3', '2026-10-11'::date, 'Neal Sako', 5, 4, 0),
  ('ACB', '2026-27', 'J3', '2026-10-11'::date, 'Kameron Taylor', 2, 0, 0),
  ('ACB', '2026-27', 'J3', '2026-10-11'::date, 'Álvaro Cárdenas', 2, 0, 0),
  ('ACB', '2026-27', 'J3', '2026-10-11'::date, 'Josep Puerto', 2, 0, 0),
  ('ACB', '2026-27', 'J3', '2026-10-11'::date, 'Nate Reuvers', 2, 0, 0),
  ('ACB', '2026-27', 'J3', '2026-10-11'::date, 'Gonzalo Corbalán', 2, 0, 0),
  ('ACB', '2026-27', 'J3', '2026-10-11'::date, 'Dylan Osetkowski', 2, 0, 0),
  ('ACB', '2026-27', 'J3', '2026-10-11'::date, 'Mario Saint-Supéry', 2, 0, 0),
  ('ACB', '2026-27', 'J4', '2026-10-18'::date, 'TJ Shorts', 15, 2, 4),
  ('ACB', '2026-27', 'J4', '2026-10-18'::date, 'Nikola Mirotic', 10, 3, 0),
  ('ACB', '2026-27', 'J4', '2026-10-18'::date, 'Armoni Brooks', 9, 2, 1),
  ('ACB', '2026-27', 'J4', '2026-10-18'::date, 'Jasiel Rivero', 7, 2, 0),
  ('ACB', '2026-27', 'J4', '2026-10-18'::date, 'Neal Sako', 7, 5, 0),
  ('ACB', '2026-27', 'J4', '2026-10-18'::date, 'Kameron Taylor', 4, 1, 1),
  ('ACB', '2026-27', 'J4', '2026-10-18'::date, 'Álvaro Cárdenas', 4, 1, 1),
  ('ACB', '2026-27', 'J4', '2026-10-18'::date, 'Josep Puerto', 4, 1, 1),
  ('ACB', '2026-27', 'J4', '2026-10-18'::date, 'Nate Reuvers', 4, 1, 1),
  ('ACB', '2026-27', 'J4', '2026-10-18'::date, 'Gonzalo Corbalán', 4, 1, 1),
  ('ACB', '2026-27', 'J4', '2026-10-18'::date, 'Dylan Osetkowski', 4, 1, 1),
  ('ACB', '2026-27', 'J4', '2026-10-18'::date, 'Mario Saint-Supéry', 4, 1, 1),
  ('ACB', '2026-27', 'J5', '2026-10-25'::date, 'TJ Shorts', 17, 3, 5),
  ('ACB', '2026-27', 'J5', '2026-10-25'::date, 'Nikola Mirotic', 12, 4, 1),
  ('ACB', '2026-27', 'J5', '2026-10-25'::date, 'Armoni Brooks', 11, 3, 2),
  ('ACB', '2026-27', 'J5', '2026-10-25'::date, 'Jasiel Rivero', 9, 3, 1),
  ('ACB', '2026-27', 'J5', '2026-10-25'::date, 'Neal Sako', 9, 6, 0),
  ('ACB', '2026-27', 'J5', '2026-10-25'::date, 'Kameron Taylor', 6, 2, 2),
  ('ACB', '2026-27', 'J5', '2026-10-25'::date, 'Álvaro Cárdenas', 6, 2, 2),
  ('ACB', '2026-27', 'J5', '2026-10-25'::date, 'Josep Puerto', 6, 2, 2),
  ('ACB', '2026-27', 'J5', '2026-10-25'::date, 'Nate Reuvers', 6, 2, 2),
  ('ACB', '2026-27', 'J5', '2026-10-25'::date, 'Gonzalo Corbalán', 6, 2, 2),
  ('ACB', '2026-27', 'J5', '2026-10-25'::date, 'Dylan Osetkowski', 6, 2, 2),
  ('ACB', '2026-27', 'J5', '2026-10-25'::date, 'Mario Saint-Supéry', 6, 2, 2)
)
insert into public.game_player_stats (game_id, player_id, points, rebounds, assists)
select g.id, p.id, i.points, i.rebounds, i.assists from incoming i
join public.competitions c on c.name=i.competition_name
join public.games g on g.competition_id=c.id and g.season=i.season and g.round=i.round and g.game_date::date=i.game_date
join public.players p on p.name=i.player_name
on conflict (game_id, player_id) do update set points=excluded.points, rebounds=excluded.rebounds, assists=excluded.assists;

-- game_team_stats no se carga: no hay estadísticas colectivas ni datos de tiro.
