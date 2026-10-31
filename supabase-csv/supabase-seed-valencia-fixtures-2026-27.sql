-- Calendario de Valencia Basket 2026-27: 34 jornadas ACB y 38 jornadas EuroLeague.
-- Resuelve competition_id y team_id desde sus nombres canónicos; no usa UUID fijos.
-- Inserción repetible: actualiza horario/sede solo en partidos aún scheduled y conserva
-- los partidos live/finished y sus marcadores existentes. Los ausentes se crean scheduled.
-- ACB J34: fecha/hora por definir; game_date usa provisionalmente el 21/05/2027 00:00 (+02)
-- porque el esquema exige un timestamptz. Actualizar cuando se confirme el horario oficial.

with incoming (competition_name, season, round, game_date, home_name, away_name, venue) as (values
  ('ACB', '2026-27', 'J1', '2026-09-27 18:00:00+02'::timestamptz, 'Valencia Basket', 'Ilerna Lleida', 'Roig Arena'),
  ('ACB', '2026-27', 'J2', '2026-10-04 17:00:00+02'::timestamptz, 'Casademont Zaragoza', 'Valencia Basket', 'Pab. Príncipe Felipe'),
  ('ACB', '2026-27', 'J3', '2026-10-11 19:00:00+02'::timestamptz, 'FC Barcelona', 'Valencia Basket', 'Palau Blaugrana'),
  ('ACB', '2026-27', 'J4', '2026-10-18 17:00:00+02'::timestamptz, 'Valencia Basket', 'UCAM Murcia', 'Roig Arena'),
  ('ACB', '2026-27', 'J5', '2026-10-25 17:00:00+01'::timestamptz, 'Valencia Basket', 'Kosner Baskonia', 'Roig Arena'),
  ('ACB', '2026-27', 'J6', '2026-11-01 18:00:00+01'::timestamptz, 'MoraBanc Andorra', 'Valencia Basket', 'Poliesportiu d''Andorra'),
  ('ACB', '2026-27', 'J7', '2026-11-08 12:30:00+01'::timestamptz, 'Recoletas Salud San Pablo Burgos', 'Valencia Basket', 'Coliseum Burgos'),
  ('ACB', '2026-27', 'J8', '2026-11-15 12:00:00+01'::timestamptz, 'Valencia Basket', 'Leyma Coruña', 'Roig Arena'),
  ('ACB', '2026-27', 'J9', '2026-11-22 17:00:00+01'::timestamptz, 'Valencia Basket', 'Río Breogán', 'Roig Arena'),
  ('ACB', '2026-27', 'J10', '2026-12-06 19:00:00+01'::timestamptz, 'Unicaja', 'Valencia Basket', 'Pab. Martín Carpena'),
  ('ACB', '2026-27', 'J11', '2026-12-08 19:00:00+01'::timestamptz, 'Asisa Joventut', 'Valencia Basket', 'Pab. de Badalona'),
  ('ACB', '2026-27', 'J12', '2026-12-13 18:00:00+01'::timestamptz, 'Kids&Us Manresa', 'Valencia Basket', 'Pavelló Nou Congost'),
  ('ACB', '2026-27', 'J13', '2026-12-20 12:30:00+01'::timestamptz, 'Valencia Basket', 'La Laguna Tenerife', 'Roig Arena'),
  ('ACB', '2026-27', 'J14', '2026-12-27 19:00:00+01'::timestamptz, 'FIATC Girona', 'Valencia Basket', 'Pavelló Fontajau'),
  ('ACB', '2026-27', 'J16', '2027-01-02 18:00:00+01'::timestamptz, 'Monbus Obradoiro', 'Valencia Basket', 'Multiusos do Sar'),
  ('ACB', '2026-27', 'J15', '2027-01-04 20:00:00+01'::timestamptz, 'Valencia Basket', 'Real Madrid', 'Roig Arena'),
  ('ACB', '2026-27', 'J17', '2027-01-10 16:30:00+01'::timestamptz, 'Valencia Basket', 'Surne Bilbao Basket', 'Roig Arena'),
  ('ACB', '2026-27', 'J18', '2027-01-17 18:00:00+01'::timestamptz, 'Valencia Basket', 'MoraBanc Andorra', 'Roig Arena'),
  ('ACB', '2026-27', 'J19', '2027-01-24 18:00:00+01'::timestamptz, 'Río Breogán', 'Valencia Basket', 'Pazo dos Deportes'),
  ('ACB', '2026-27', 'J20', '2027-01-30 18:00:00+01'::timestamptz, 'Leyma Coruña', 'Valencia Basket', 'Coliseum da Coruña'),
  ('ACB', '2026-27', 'J21', '2027-02-07 18:00:00+01'::timestamptz, 'Valencia Basket', 'Asisa Joventut', 'Roig Arena'),
  ('ACB', '2026-27', 'J22', '2027-02-14 12:00:00+01'::timestamptz, 'Valencia Basket', 'Casademont Zaragoza', 'Roig Arena'),
  ('ACB', '2026-27', 'J23', '2027-03-07 19:00:00+01'::timestamptz, 'La Laguna Tenerife', 'Valencia Basket', 'Pab. Santiago Martín'),
  ('ACB', '2026-27', 'J24', '2027-03-14 19:00:00+01'::timestamptz, 'Real Madrid', 'Valencia Basket', 'WiZink Center'),
  ('ACB', '2026-27', 'J25', '2027-03-21 12:30:00+01'::timestamptz, 'Valencia Basket', 'Recoletas Salud San Pablo Burgos', 'Roig Arena'),
  ('ACB', '2026-27', 'J26', '2027-03-28 17:00:00+02'::timestamptz, 'Valencia Basket', 'FIATC Girona', 'Roig Arena'),
  ('ACB', '2026-27', 'J27', '2027-04-04 19:00:00+02'::timestamptz, 'Kosner Baskonia', 'Valencia Basket', 'Fernando Buesa Arena'),
  ('ACB', '2026-27', 'J28', '2027-04-11 18:00:00+02'::timestamptz, 'Valencia Basket', 'Monbus Obradoiro', 'Roig Arena'),
  ('ACB', '2026-27', 'J29', '2027-04-18 18:00:00+02'::timestamptz, 'Surne Bilbao Basket', 'Valencia Basket', 'Bilbao Arena'),
  ('ACB', '2026-27', 'J30', '2027-04-25 19:00:00+02'::timestamptz, 'Valencia Basket', 'FC Barcelona', 'Roig Arena'),
  ('ACB', '2026-27', 'J31', '2027-05-02 12:30:00+02'::timestamptz, 'Valencia Basket', 'Unicaja', 'Roig Arena'),
  ('ACB', '2026-27', 'J32', '2027-05-09 17:00:00+02'::timestamptz, 'Ilerna Lleida', 'Valencia Basket', 'Pavelló Barris Nord'),
  ('ACB', '2026-27', 'J33', '2027-05-16 18:00:00+02'::timestamptz, 'Valencia Basket', 'Kids&Us Manresa', 'Roig Arena'),
  ('ACB', '2026-27', 'J34', '2027-05-21 14:00:00+02'::timestamptz, 'UCAM Murcia', 'Valencia Basket', 'Palacio de Deportes de Murcia'),
  ('EuroLeague', '2026-27', 'R1', '2026-09-25 19:00:00+02'::timestamptz, 'Besiktas Istanbul', 'Valencia Basket', 'Basketbol Gelişim Merkezi'),
  ('EuroLeague', '2026-27', 'R2', '2026-09-29 20:30:00+02'::timestamptz, 'Valencia Basket', 'Kosner Baskonia', 'Roig Arena'),
  ('EuroLeague', '2026-27', 'R3', '2026-10-02 20:00:00+02'::timestamptz, 'LDLC ASVEL Villeurbanne', 'Valencia Basket', 'LDLC Arena'),
  ('EuroLeague', '2026-27', 'R4', '2026-10-08 20:30:00+02'::timestamptz, 'Valencia Basket', 'Hapoel IBI Tel Aviv', 'Roig Arena'),
  ('EuroLeague', '2026-27', 'R5', '2026-10-13 21:00:00+02'::timestamptz, 'Valencia Basket', 'Olympiacos Piraeus', 'Roig Arena'),
  ('EuroLeague', '2026-27', 'R6', '2026-10-15 20:30:00+02'::timestamptz, 'Valencia Basket', 'Maccabi Rapyd Tel Aviv', 'Roig Arena'),
  ('EuroLeague', '2026-27', 'R7', '2026-10-23 20:45:00+02'::timestamptz, 'Paris Basketball', 'Valencia Basket', 'Adidas Arena'),
  ('EuroLeague', '2026-27', 'R8', '2026-10-27 20:30:00+01'::timestamptz, 'Valencia Basket', 'Fenerbahce Tarfin Istanbul', 'Roig Arena'),
  ('EuroLeague', '2026-27', 'R9', '2026-10-30 20:30:00+01'::timestamptz, 'FC Barcelona', 'Valencia Basket', 'Palau Blaugrana'),
  ('EuroLeague', '2026-27', 'R10', '2026-11-05 20:30:00+01'::timestamptz, 'Armani Olimpia Milan', 'Valencia Basket', 'Unipol Forum'),
  ('EuroLeague', '2026-27', 'R11', '2026-11-12 20:30:00+01'::timestamptz, 'Valencia Basket', 'FC Bayern Munich', 'Roig Arena'),
  ('EuroLeague', '2026-27', 'R12', '2026-11-17 20:45:00+01'::timestamptz, 'Partizan Mozzart Bet Belgrade', 'Valencia Basket', 'Belgrade Arena'),
  ('EuroLeague', '2026-27', 'R13', '2026-11-19 21:00:00+01'::timestamptz, 'Valencia Basket', 'Virtus Bologna', 'Roig Arena'),
  ('EuroLeague', '2026-27', 'R14', '2026-11-24 20:30:00+01'::timestamptz, 'Valencia Basket', 'Panathinaikos AKTOR Athens', 'Roig Arena'),
  ('EuroLeague', '2026-27', 'R15', '2026-12-03 18:30:00+01'::timestamptz, 'Anadolu Efes Istanbul', 'Valencia Basket', 'Basketbol Gelişim Merkezi'),
  ('EuroLeague', '2026-27', 'R16', '2026-12-11 20:30:00+01'::timestamptz, 'Valencia Basket', 'Crvena Zvezda Meridianbet Belgrade', 'Roig Arena'),
  ('EuroLeague', '2026-27', 'R17', '2026-12-15 20:30:00+01'::timestamptz, 'Valencia Basket', 'Dubai Basketball', 'Roig Arena'),
  ('EuroLeague', '2026-27', 'R18', '2026-12-17 20:45:00+01'::timestamptz, 'Real Madrid', 'Valencia Basket', 'Movistar Arena / WiZink'),
  ('EuroLeague', '2026-27', 'R19', '2026-12-23 19:00:00+01'::timestamptz, 'Zalgiris Kaunas', 'Valencia Basket', 'Žalgiris Arena'),
  ('EuroLeague', '2026-27', 'R20', '2026-12-29 20:30:00+01'::timestamptz, 'Kosner Baskonia', 'Valencia Basket', 'Fernando Buesa Arena'),
  ('EuroLeague', '2026-27', 'R21', '2027-01-07 20:30:00+01'::timestamptz, 'Valencia Basket', 'Partizan Mozzart Bet Belgrade', 'Roig Arena'),
  ('EuroLeague', '2026-27', 'R22', '2027-01-12 20:15:00+01'::timestamptz, 'Panathinaikos AKTOR Athens', 'Valencia Basket', 'Telekom Center Athens'),
  ('EuroLeague', '2026-27', 'R23', '2027-01-14 19:45:00+01'::timestamptz, 'Hapoel IBI Tel Aviv', 'Valencia Basket', 'Shlomo Group Arena'),
  ('EuroLeague', '2026-27', 'R24', '2027-01-22 20:30:00+01'::timestamptz, 'Valencia Basket', 'LDLC ASVEL Villeurbanne', 'Roig Arena'),
  ('EuroLeague', '2026-27', 'R25', '2027-01-28 20:30:00+01'::timestamptz, 'FC Bayern Munich', 'Valencia Basket', 'BMW Park / Audi Dome'),
  ('EuroLeague', '2026-27', 'R26', '2027-02-03 20:45:00+01'::timestamptz, 'Valencia Basket', 'Armani Olimpia Milan', 'Roig Arena'),
  ('EuroLeague', '2026-27', 'R27', '2027-02-05 20:45:00+01'::timestamptz, 'Valencia Basket', 'FC Barcelona', 'Roig Arena'),
  ('EuroLeague', '2026-27', 'R28', '2027-02-11 20:30:00+01'::timestamptz, 'Valencia Basket', 'Paris Basketball', 'Roig Arena'),
  ('EuroLeague', '2026-27', 'R29', '2027-03-04 20:30:00+01'::timestamptz, 'Valencia Basket', 'Zalgiris Kaunas', 'Roig Arena'),
  ('EuroLeague', '2026-27', 'R30', '2027-03-10 17:00:00+01'::timestamptz, 'Dubai Basketball', 'Valencia Basket', 'Coca-Cola Arena'),
  ('EuroLeague', '2026-27', 'R31', '2027-03-12 18:45:00+01'::timestamptz, 'Fenerbahce Tarfin Istanbul', 'Valencia Basket', 'Ülker Sports Arena'),
  ('EuroLeague', '2026-27', 'R32', '2027-03-18 20:05:00+01'::timestamptz, 'Maccabi Rapyd Tel Aviv', 'Valencia Basket', 'Menora Mivtachim Arena'),
  ('EuroLeague', '2026-27', 'R33', '2027-03-24 20:30:00+01'::timestamptz, 'Valencia Basket', 'Besiktas Istanbul', 'Roig Arena'),
  ('EuroLeague', '2026-27', 'R34', '2027-03-26 20:00:00+01'::timestamptz, 'Crvena Zvezda Meridianbet Belgrade', 'Valencia Basket', 'Belgrade Arena'),
  ('EuroLeague', '2026-27', 'R35', '2027-04-01 20:30:00+02'::timestamptz, 'Valencia Basket', 'Real Madrid', 'Roig Arena'),
  ('EuroLeague', '2026-27', 'R36', '2027-04-06 20:30:00+02'::timestamptz, 'Virtus Bologna', 'Valencia Basket', 'SuperTennis Arena'),
  ('EuroLeague', '2026-27', 'R37', '2027-04-08 20:30:00+02'::timestamptz, 'Valencia Basket', 'Anadolu Efes Istanbul', 'Roig Arena'),
  ('EuroLeague', '2026-27', 'R38', '2027-04-16 20:15:00+02'::timestamptz, 'Olympiacos Piraeus', 'Valencia Basket', 'Estadio de la Paz y la Amistad')
), resolved as (
  select c.id as competition_id, i.season, i.round, i.game_date,
         h.id as home_team_id, a.id as away_team_id, i.venue
  from incoming i
  join public.competitions c on c.name = i.competition_name
  join public.teams h on h.name = i.home_name
  join public.teams a on a.name = i.away_name
), checks as materialized (
  select 1 / case
    when (select count(*) from incoming) = 72
      and (select count(*) from resolved) = 72
      and (select count(distinct (competition_id, season, round)) from resolved) = 72
    then 1 else 0 end as valid
), updated as (
  update public.games g
  set game_date = r.game_date,
      venue = r.venue,
      status = 'scheduled',
      home_score = null,
      away_score = null,
      home_q1_score = null,
      away_q1_score = null,
      home_q2_score = null,
      away_q2_score = null,
      home_q3_score = null,
      away_q3_score = null,
      home_q4_score = null,
      away_q4_score = null
  from resolved r
  cross join checks
  where checks.valid = 1
    and g.competition_id = r.competition_id
    and g.season = r.season
    and g.round = r.round
    and g.home_team_id = r.home_team_id
    and g.away_team_id = r.away_team_id
    and g.status = 'scheduled'
  returning g.id
), inserted as (
  insert into public.games (
    competition_id, season, round, game_date, home_team_id, away_team_id, venue, status, home_score, away_score
  )
  select r.competition_id, r.season, r.round, r.game_date, r.home_team_id, r.away_team_id, r.venue, 'scheduled', null, null
  from resolved r
  cross join checks
  where checks.valid = 1
    and not exists (
      select 1 from public.games g
      where g.competition_id = r.competition_id
        and g.season = r.season
        and g.round = r.round
        and g.home_team_id = r.home_team_id
        and g.away_team_id = r.away_team_id
    )
  returning id
)
select (select count(*) from inserted) as partidos_insertados,
       (select count(*) from updated) as partidos_pendientes_actualizados;
