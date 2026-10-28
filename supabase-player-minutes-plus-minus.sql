-- Añade segundos exactos de juego y +/- por jugador. Seguro para volver a ejecutar.
alter table public.game_player_stats
  add column if not exists minutes_seconds integer not null default 0,
  add column if not exists plus_minus smallint not null default 0;

alter table public.game_player_stats
  drop constraint if exists game_player_stats_minutes_seconds_nonnegative;
alter table public.game_player_stats
  add constraint game_player_stats_minutes_seconds_nonnegative check (minutes_seconds >= 0);

-- Los registros antiguos guardan minutos en decimal; conserva su valor aproximado en segundos.
update public.game_player_stats
set minutes_seconds = round(minutes * 60)::integer
where minutes_seconds = 0 and minutes > 0;
