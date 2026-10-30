-- Marcadores por cuarto para los partidos.
-- Ejecutar una vez en Supabase > SQL Editor.
-- Los campos pueden quedar NULL cuando todavía no se han introducido los parciales.

alter table public.games
  add column if not exists home_q1_score smallint,
  add column if not exists away_q1_score smallint,
  add column if not exists home_q2_score smallint,
  add column if not exists away_q2_score smallint,
  add column if not exists home_q3_score smallint,
  add column if not exists away_q3_score smallint,
  add column if not exists home_q4_score smallint,
  add column if not exists away_q4_score smallint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'games_quarter_scores_nonnegative') then
    alter table public.games add constraint games_quarter_scores_nonnegative check (
      (home_q1_score is null or home_q1_score >= 0) and (away_q1_score is null or away_q1_score >= 0) and
      (home_q2_score is null or home_q2_score >= 0) and (away_q2_score is null or away_q2_score >= 0) and
      (home_q3_score is null or home_q3_score >= 0) and (away_q3_score is null or away_q3_score >= 0) and
      (home_q4_score is null or home_q4_score >= 0) and (away_q4_score is null or away_q4_score >= 0)
    );
  end if;
end $$;
