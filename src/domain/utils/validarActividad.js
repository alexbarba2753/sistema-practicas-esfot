import { errorHttp } from './errorHttp.js';

/**
 * Validaciones de negocio para el registro de jornadas laborales (HU-011)
 */
export function validarJornadaLaboral(datos, aula, resumenActual) {
  const { fecha, horaEntrada, horaSalida, horas, descripcion } = datos;

  if (!fecha || !horaEntrada || !horaSalida || horas === undefined || horas === null || !descripcion) {
    throw errorHttp('Fecha, hora de entrada, hora de salida, número de horas y descripción técnica son obligatorios', 400);
  }

  // 1. Formato de hora HH:mm en 24 horas
  const formatoHoraRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const entradaTrim = String(horaEntrada).trim();
  const salidaTrim = String(horaSalida).trim();

  if (!formatoHoraRegex.test(entradaTrim) || !formatoHoraRegex.test(salidaTrim)) {
    throw errorHttp('El formato de hora de entrada y salida debe ser HH:mm en formato de 24 horas (ejemplo: 08:00, 16:30)', 400);
  }

  // 2. Consistencia cronológica (horaSalida > horaEntrada)
  const [hE, mE] = entradaTrim.split(':').map(Number);
  const [hS, mS] = salidaTrim.split(':').map(Number);
  const minEntrada = hE * 60 + mE;
  const minSalida = hS * 60 + mS;

  if (minSalida <= minEntrada) {
    throw errorHttp('La hora de salida debe ser estrictamente posterior a la hora de entrada', 400);
  }

  const minutosTranscurridos = minSalida - minEntrada;
  const horasTranscurridas = minutosTranscurridos / 60;

  // 3. Rango de horas reglamentario (0.5h a 8h)
  const numHoras = Number(horas);
  if (isNaN(numHoras) || numHoras < 0.5 || numHoras > 8) {
    throw errorHttp('El número de horas diarias debe ser un valor numérico entre 0.5 y 8 horas reglamentarias', 400);
  }

  if (numHoras > horasTranscurridas) {
    throw errorHttp(
      `Las horas reportadas (${numHoras}h) exceden el tiempo cronológico transcurrido entre la entrada y salida (${horasTranscurridas.toFixed(1)}h)`,
      400
    );
  }

  // 4. Bloques de 10 minutos reglamentarios (HU-011 de la tesis)
  const minutosTrabajados = Math.round(numHoras * 60);
  if (minutosTrabajados % 10 !== 0) {
    throw errorHttp('El número de horas debe registrarse en fracciones de bloques de 10 minutos (por ejemplo: 2h, 4.5h, 6h, 8h)', 400);
  }

  // 5. Validación de fecha y prevención de fechas futuras
  const fechaObj = new Date(fecha);
  if (isNaN(fechaObj.getTime())) {
    throw errorHttp('La fecha proporcionada no tiene un formato válido (YYYY-MM-DD)', 400);
  }

  const ahora = new Date();
  const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);
  if (fechaObj > finHoy) {
    throw errorHttp('No se pueden registrar actividades con fechas futuras a la fecha actual', 400);
  }

  if (aula?.fechaInicio) {
    const fechaInicioAula = new Date(aula.fechaInicio);
    fechaInicioAula.setHours(0, 0, 0, 0);
    if (fechaObj < fechaInicioAula) {
      throw errorHttp(
        `La fecha de la actividad no puede ser anterior a la fecha de inicio del aula virtual (${fechaInicioAula.toISOString().split('T')[0]})`,
        400
      );
    }
  }

  // 6. Longitud mínima de descripción técnica
  const descripcionTrim = String(descripcion).trim();
  if (descripcionTrim.length < 15) {
    throw errorHttp('La descripción técnica debe tener al menos 15 caracteres detallando las tareas desarrolladas', 400);
  }

  // 7. Control de tope máximo de horas aprobadas
  if (resumenActual && resumenActual.horasAprobadas >= (aula?.horasRequeridas || 240)) {
    throw errorHttp(
      `Ya has completado y aprobado las ${aula?.horasRequeridas || 240} horas reglamentarias. No se requieren más registros.`,
      400
    );
  }

  return {
    fechaObj,
    entradaTrim,
    salidaTrim,
    numHoras,
    descripcionTrim
  };
}

/**
 * Validaciones de negocio para el registro de actividades comunitarias (HU-013)
 */
export function validarActividadComunitariaDatos(datos, aula, resumenActual) {
  const { fecha, horas, comunidadOInstitucion, beneficiariosAproximados, descripcion } = datos;

  if (horas === undefined || horas === null || !comunidadOInstitucion || !descripcion) {
    throw errorHttp('Horas cumplidas, institución o comunidad beneficiaria y descripción son obligatorios', 400);
  }

  const numHoras = Number(horas);
  if (isNaN(numHoras) || numHoras <= 0 || numHoras > 96) {
    throw errorHttp('El número de horas debe ser un valor positivo y no exceder las 96 horas reglamentarias', 400);
  }

  const fechaObj = fecha ? new Date(fecha) : new Date();
  if (isNaN(fechaObj.getTime())) {
    throw errorHttp('La fecha proporcionada no tiene un formato válido', 400);
  }

  const ahora = new Date();
  const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);
  if (fechaObj > finHoy) {
    throw errorHttp('No se pueden registrar actividades comunitarias con fechas futuras', 400);
  }

  const institucionTrim = String(comunidadOInstitucion).trim();
  if (institucionTrim.length < 3) {
    throw errorHttp('El nombre de la comunidad o institución beneficiaria debe tener al menos 3 caracteres', 400);
  }

  const descripcionTrim = String(descripcion).trim();
  if (descripcionTrim.length < 15) {
    throw errorHttp('La descripción debe tener al menos 15 caracteres explicando el impacto social o actividad desarrollada', 400);
  }

  if (resumenActual && resumenActual.horasAprobadas >= (aula?.horasRequeridas || 96)) {
    throw errorHttp(
      `Ya has completado y aprobado las ${aula?.horasRequeridas || 96} horas reglamentarias de Servicio Comunitario.`,
      400
    );
  }

  return {
    fechaObj,
    numHoras,
    institucionTrim,
    descripcionTrim,
    beneficiariosNum: beneficiariosAproximados ? Math.max(0, Number(beneficiariosAproximados)) : 0
  };
}
