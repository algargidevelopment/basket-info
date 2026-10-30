-- Plantilla masculina de Valencia Basket 2026-27.
-- Compatible con public.players del archivo supabase-schema.sql.
-- Idempotente por nombre: no vuelve a insertar jugadores ya existentes.
-- birth_date y photo_url quedan NULL porque se pueden completar luego
-- con fechas e imágenes verificadas desde fuentes oficiales.

with roster(name, shirt_number, position, height_cm) as (
  values
    ('TJ Shorts', 0, 'Base', 175),
    ('Kameron Taylor', 1, 'Alero', 198),
    ('Josep Puerto', 2, 'Alero', 199),
    ('Nate Reuvers', 3, 'Pívot', 211),
    ('Mario Saint-Supéry', 5, 'Base', 194),
    ('Álvaro Cárdenas', 7, 'Base', 187),
    ('Dylan Osetkowski', 8, 'Ala-pívot', 206),
    ('Omari Moore', 10, 'Escolta', 198),
    ('Armoni Brooks', 12, 'Escolta', 194),
    ('Neal Sako', 13, 'Pívot', 210),
    ('Mouhamadou Gueye', 16, 'Ala-pívot', 206),
    ('Gonzalo Corbalán', 20, 'Escolta', 193),
    ('Lucas Marí', 23, 'Escolta', 197),
    ('Nikola Mirotic', 33, 'Ala-pívot', 208),
    ('Jasiel Rivero', 41, 'Ala-pívot', 206),
    ('Yankuba Sima', 77, 'Pívot', 211)
)
insert into public.players (name, shirt_number, position, height_cm, active)
select r.name, r.shirt_number, r.position, r.height_cm, true
from roster r
where not exists (
  select 1
  from public.players p
  where lower(p.name) = lower(r.name)
);
