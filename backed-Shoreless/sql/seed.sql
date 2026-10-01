INSERT INTO barrios (nombre, comuna) VALUES
  ('Centro', 'Comuna 1'),
  ('San José', 'Comuna 2'),
  ('El Prado', 'Comuna 3'),
  ('La Floresta', 'Comuna 4'),
  ('Boston', 'Comuna 5'),
  ('Belén', 'Comuna 6'),
  ('Laureles', 'Comuna 7'),
  ('Buenos Aires', 'Comuna 8');

INSERT INTO horarios (barrio_id, dia_semana, hora, hora_fin, tipo, frecuencia, punto_referencia, notas)
SELECT b.id, d.dia, d.hora, d.hora_fin, d.tipo, 'semanal', d.punto, d.notas
FROM barrios b
JOIN (
  SELECT 'Centro' nombre, 1 dia, '06:00:00' hora, '08:00:00' hora_fin, 'ordinaria' tipo, 'Parque principal' punto, 'Saca las bolsas antes de las 6:00 a. m.' notas
  UNION ALL SELECT 'Centro', 4, '06:00:00', '08:00:00', 'ordinaria', 'Parque principal', 'Saca las bolsas antes de las 6:00 a. m.'
  UNION ALL SELECT 'Centro', 3, '08:00:00', '10:00:00', 'reciclaje', 'Esquina de la alcaldía', 'Separado en bolsa blanca.'
  UNION ALL SELECT 'San José', 2, '06:30:00', '08:30:00', 'ordinaria', 'Calle 40 con carrera 50', NULL
  UNION ALL SELECT 'San José', 5, '06:30:00', '08:30:00', 'ordinaria', 'Calle 40 con carrera 50', NULL
  UNION ALL SELECT 'San José', 6, '09:00:00', '11:00:00', 'organicos', 'Frente al colegio', 'Solo residuos de comida.'
  UNION ALL SELECT 'El Prado', 3, '05:45:00', '07:45:00', 'ordinaria', 'Avenida El Prado', NULL
  UNION ALL SELECT 'El Prado', 6, '05:45:00', '07:45:00', 'ordinaria', 'Avenida El Prado', NULL
  UNION ALL SELECT 'El Prado', 0, '10:00:00', '12:00:00', 'voluminosos', 'Parque El Prado', 'Muebles y colchones, una vez por semana.'
  UNION ALL SELECT 'La Floresta', 4, '07:00:00', '09:00:00', 'ordinaria', 'Carrera 70', NULL
  UNION ALL SELECT 'La Floresta', 0, '07:00:00', '09:00:00', 'ordinaria', 'Carrera 70', NULL
  UNION ALL SELECT 'La Floresta', 2, '08:30:00', '10:30:00', 'reciclaje', 'Plaza de mercado', 'Papel, plástico y vidrio.'
  UNION ALL SELECT 'Boston', 5, '06:15:00', '08:15:00', 'ordinaria', 'Calle 45', NULL
  UNION ALL SELECT 'Boston', 1, '06:15:00', '08:15:00', 'ordinaria', 'Calle 45', NULL
  UNION ALL SELECT 'Boston', 4, '09:00:00', '11:00:00', 'organicos', 'Frente a la iglesia', NULL
  UNION ALL SELECT 'Belén', 6, '06:00:00', '08:00:00', 'ordinaria', 'Parque Belén', NULL
  UNION ALL SELECT 'Belén', 2, '06:00:00', '08:00:00', 'ordinaria', 'Parque Belén', NULL
  UNION ALL SELECT 'Belén', 5, '08:00:00', '10:00:00', 'reciclaje', 'Calle 30', NULL
  UNION ALL SELECT 'Laureles', 0, '06:30:00', '08:30:00', 'ordinaria', 'Circular 1', NULL
  UNION ALL SELECT 'Laureles', 3, '06:30:00', '08:30:00', 'ordinaria', 'Circular 1', NULL
  UNION ALL SELECT 'Laureles', 1, '09:00:00', '11:00:00', 'voluminosos', 'Estadio', 'Con cita del conjunto, si aplica.'
  UNION ALL SELECT 'Buenos Aires', 1, '07:30:00', '09:30:00', 'ordinaria', 'Calle 10', NULL
  UNION ALL SELECT 'Buenos Aires', 4, '07:30:00', '09:30:00', 'ordinaria', 'Calle 10', NULL
  UNION ALL SELECT 'Buenos Aires', 6, '08:00:00', '10:00:00', 'organicos', 'Cancha', NULL
) d ON d.nombre = b.nombre;
