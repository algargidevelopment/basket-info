-- Datos iniciales de competiciones y equipos participantes en 2026-27.
-- Compatible con public.competitions (id, name) y public.teams
-- (id, name, short_name, logo_url) del esquema supabase-schema.sql.
-- Inserta una sola vez los clubes compartidos por ACB y EuroLeague.
-- logo_url se deja NULL; se puede completar más adelante.

insert into public.competitions (name)
values ('ACB'), ('EuroLeague')
on conflict (name) do nothing;

insert into public.teams (name, short_name, logo_url)
values
  ('Asisa Joventut', 'JOV', null),
  ('FC Barcelona', 'BAR', null),
  ('Casademont Zaragoza', 'ZAR', null),
  ('FIATC Girona', 'GIR', null),
  ('Ilerna Lleida', 'LLE', null),
  ('Kids&Us Manresa', 'MAN', null),
  ('Kosner Baskonia', 'BAS', null),
  ('La Laguna Tenerife', 'TEN', null),
  ('Leyma Coruña', 'COR', null),
  ('Monbus Obradoiro', 'OBR', null),
  ('MoraBanc Andorra', 'AND', null),
  ('Real Madrid', 'RMA', null),
  ('Recoletas Salud San Pablo Burgos', 'BUR', null),
  ('Río Breogán', 'BRE', null),
  ('Surne Bilbao Basket', 'BLB', null),
  ('UCAM Murcia', 'MUR', null),
  ('Unicaja', 'UNI', null),
  ('Valencia Basket', 'VAL', null),
  ('Anadolu Efes Istanbul', 'EFS', null),
  ('Besiktas Istanbul', 'BES', null),
  ('Crvena Zvezda Meridianbet Belgrade', 'CZV', null),
  ('Dubai Basketball', 'DUB', null),
  ('Armani Olimpia Milan', 'MIL', null),
  ('FC Bayern Munich', 'BAY', null),
  ('Fenerbahce Tarfin Istanbul', 'FEN', null),
  ('Hapoel IBI Tel Aviv', 'HAP', null),
  ('LDLC ASVEL Villeurbanne', 'ASV', null),
  ('Maccabi Rapyd Tel Aviv', 'MAC', null),
  ('Olympiacos Piraeus', 'OLY', null),
  ('Panathinaikos AKTOR Athens', 'PAN', null),
  ('Paris Basketball', 'PAR', null),
  ('Partizan Mozzart Bet Belgrade', 'PARB', null),
  ('Virtus Bologna', 'VIR', null),
  ('Zalgiris Kaunas', 'ZAL', null)
on conflict (name) do update
set short_name = excluded.short_name;
