const ZONA = 'America/Bogota';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const TIPOS = {
  ordinaria: 'Ordinaria',
  reciclaje: 'Reciclaje',
  organicos: 'Orgánicos',
  voluminosos: 'Voluminosos',
};

function ahoraBogota(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha);

  const valor = (tipo) => partes.find((parte) => parte.type === tipo)?.value;
  const semana = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hora = Number(valor('hour'));
  const minuto = Number(valor('minute'));

  return {
    zona: ZONA,
    dia: semana[valor('weekday')],
    nombreDia: DIAS[semana[valor('weekday')]],
    minutos: hora * 60 + minuto,
    hora: `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`,
  };
}

function minutosDe(hora) {
  const [h, m] = String(hora).slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

function esperaDe(horario, ahora) {
  let dias = (horario.diaSemana - ahora.dia + 7) % 7;
  if (dias === 0 && minutosDe(horario.hora) < ahora.minutos) dias = 7;
  return dias * 1440 + minutosDe(horario.hora);
}

function cuandoLlega(horario, ahora) {
  let dias = (horario.diaSemana - ahora.dia + 7) % 7;
  const yaPaso = dias === 0 && minutosDe(horario.hora) < ahora.minutos;
  if (yaPaso) dias = 7;
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return DIAS[horario.diaSemana];
}

function presentar(fila, ahora) {
  const horario = {
    id: fila.id,
    diaSemana: fila.dia_semana,
    nombreDia: DIAS[fila.dia_semana],
    hora: String(fila.hora).slice(0, 5),
    horaFin: fila.hora_fin ? String(fila.hora_fin).slice(0, 5) : null,
    tipo: fila.tipo,
    tipoLabel: TIPOS[fila.tipo] || fila.tipo,
    frecuencia: fila.frecuencia,
    puntoReferencia: fila.punto_referencia,
    notas: fila.notas,
    barrio: {
      id: fila.barrio_id,
      nombre: fila.barrio_nombre,
      comuna: fila.barrio_comuna,
    },
  };

  horario.yaPasoHoy = horario.diaSemana === ahora.dia && minutosDe(horario.hora) < ahora.minutos;
  horario.cuando = cuandoLlega(horario, ahora);
  horario.espera = esperaDe(horario, ahora);
  return horario;
}

module.exports = { ZONA, DIAS, TIPOS, ahoraBogota, presentar };
