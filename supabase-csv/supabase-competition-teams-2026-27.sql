-- Relación explícita de participantes por competición para 2026-27.
-- Seguro para ejecutar más de una vez: no borra ni modifica datos existentes.
create table if not exists public.competition_teams (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  primary key (competition_id, team_id)
);

alter table public.competition_teams enable row level security;
grant select on public.competition_teams to anon, authenticated;
drop policy if exists competition_teams_public_read on public.competition_teams;
create policy competition_teams_public_read on public.competition_teams
  for select to anon, authenticated using (true);

with membership(competition_name, team_name) as (values
  ('ACB', 'Asisa Joventut'), ('ACB', 'FC Barcelona'), ('ACB', 'Casademont Zaragoza'),
  ('ACB', 'FIATC Girona'), ('ACB', 'Ilerna Lleida'), ('ACB', 'Kids&Us Manresa'),
  ('ACB', 'Kosner Baskonia'), ('ACB', 'La Laguna Tenerife'), ('ACB', 'Leyma Coruña'),
  ('ACB', 'Monbus Obradoiro'), ('ACB', 'MoraBanc Andorra'), ('ACB', 'Real Madrid'),
  ('ACB', 'Recoletas Salud San Pablo Burgos'), ('ACB', 'Río Breogán'),
  ('ACB', 'Surne Bilbao Basket'), ('ACB', 'UCAM Murcia'), ('ACB', 'Unicaja'),
  ('ACB', 'Valencia Basket'),
  ('EuroLeague', 'Anadolu Efes Istanbul'), ('EuroLeague', 'Besiktas Istanbul'),
  ('EuroLeague', 'Crvena Zvezda Meridianbet Belgrade'), ('EuroLeague', 'Dubai Basketball'),
  ('EuroLeague', 'Armani Olimpia Milan'), ('EuroLeague', 'FC Bayern Munich'),
  ('EuroLeague', 'Fenerbahce Tarfin Istanbul'), ('EuroLeague', 'Hapoel IBI Tel Aviv'),
  ('EuroLeague', 'LDLC ASVEL Villeurbanne'), ('EuroLeague', 'Maccabi Rapyd Tel Aviv'),
  ('EuroLeague', 'Olympiacos Piraeus'), ('EuroLeague', 'Panathinaikos AKTOR Athens'),
  ('EuroLeague', 'Paris Basketball'), ('EuroLeague', 'Partizan Mozzart Bet Belgrade'),
  ('EuroLeague', 'Virtus Bologna'), ('EuroLeague', 'Zalgiris Kaunas'),
  ('EuroLeague', 'FC Barcelona'), ('EuroLeague', 'Real Madrid'),
  ('EuroLeague', 'Kosner Baskonia'), ('EuroLeague', 'Valencia Basket')
)
insert into public.competition_teams (competition_id, team_id)
select c.id, t.id
from membership m
join public.competitions c on c.name = m.competition_name
join public.teams t on t.name = m.team_name
where not exists (
  select 1 from public.competition_teams existing
  where existing.competition_id = c.id and existing.team_id = t.id
);
