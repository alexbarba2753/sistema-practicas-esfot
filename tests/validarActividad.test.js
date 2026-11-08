import { validarJornadaLaboral, validarActividadComunitariaDatos } from '../src/domain/utils/validarActividad.js';

describe('Validaciones de Negocio para Prácticas Laborales (HU-011)', () => {
  const aulaLaboral = {
    horasRequeridas: 240,
    fechaInicio: new Date('2026-09-01T00:00:00Z'),
    fechaFin: new Date('2026-12-31T23:59:59Z')
  };

  const resumenPrevio = {
    horasAprobadas: 40,
    cumplioRequisito: false
  };

  test('debe aceptar una jornada laboral válida con granularidad de 10 minutos', () => {
    const datos = {
      fecha: '2026-10-15',
      horaEntrada: '08:00',
      horaSalida: '16:00',
      horas: 8,
      descripcion: 'Desarrollo de controladores y middlewares en Express con pruebas unitarias.'
    };
    const resultado = validarJornadaLaboral(datos, aulaLaboral, resumenPrevio);
    expect(resultado.numHoras).toBe(8);
    expect(resultado.entradaTrim).toBe('08:00');
    expect(resultado.salidaTrim).toBe('16:00');
  });

  test('debe rechazar si la hora de salida no es posterior a la hora de entrada', () => {
    const datos = {
      fecha: '2026-10-15',
      horaEntrada: '16:00',
      horaSalida: '08:00',
      horas: 8,
      descripcion: 'Desarrollo de módulos del backend'
    };
    expect(() => validarJornadaLaboral(datos, aulaLaboral, resumenPrevio))
      .toThrow('La hora de salida debe ser estrictamente posterior a la hora de entrada');
  });

  test('debe rechazar si las horas reportadas exceden el tiempo cronológico transcurrido', () => {
    const datos = {
      fecha: '2026-10-15',
      horaEntrada: '08:00',
      horaSalida: '12:00',
      horas: 6,
      descripcion: 'Desarrollo de módulos del backend'
    };
    expect(() => validarJornadaLaboral(datos, aulaLaboral, resumenPrevio))
      .toThrow(/exceden el tiempo cronológico transcurrido/);
  });

  test('debe rechazar horas con granularidad menor a bloques de 10 minutos', () => {
    const datos = {
      fecha: '2026-10-15',
      horaEntrada: '08:00',
      horaSalida: '16:00',
      horas: 7.25,
      descripcion: 'Desarrollo de módulos del backend'
    };
    expect(() => validarJornadaLaboral(datos, aulaLaboral, resumenPrevio))
      .toThrow(/bloques de 10 minutos/);
  });

  test('debe rechazar fechas anteriores al inicio del aula virtual', () => {
    const datos = {
      fecha: '2026-08-15',
      horaEntrada: '08:00',
      horaSalida: '16:00',
      horas: 8,
      descripcion: 'Desarrollo de módulos del backend'
    };
    expect(() => validarJornadaLaboral(datos, aulaLaboral, resumenPrevio))
      .toThrow(/no puede ser anterior a la fecha de inicio/);
  });

  test('debe rechazar descripciones con menos de 15 caracteres', () => {
    const datos = {
      fecha: '2026-10-15',
      horaEntrada: '08:00',
      horaSalida: '16:00',
      horas: 8,
      descripcion: 'Hice tareas'
    };
    expect(() => validarJornadaLaboral(datos, aulaLaboral, resumenPrevio))
      .toThrow(/al menos 15 caracteres/);
  });

  test('debe bloquear registros si el estudiante ya cuenta con 240 horas aprobadas', () => {
    const resumenCompleto = {
      horasAprobadas: 240,
      cumplioRequisito: true
    };
    const datos = {
      fecha: '2026-10-15',
      horaEntrada: '08:00',
      horaSalida: '16:00',
      horas: 8,
      descripcion: 'Desarrollo de pruebas automatizadas'
    };
    expect(() => validarJornadaLaboral(datos, aulaLaboral, resumenCompleto))
      .toThrow(/Ya has completado y aprobado las 240 horas reglamentarias/);
  });
});

describe('Validaciones de Negocio para Servicio Comunitario (HU-013)', () => {
  const aulaComunitaria = {
    horasRequeridas: 96,
    fechaInicio: new Date('2026-09-01T00:00:00Z'),
    fechaFin: new Date('2026-12-31T23:59:59Z')
  };

  const resumenPrevio = {
    horasAprobadas: 24,
    cumplioRequisito: false
  };

  test('debe aceptar un registro comunitario válido', () => {
    const datos = {
      fecha: '2026-10-20',
      horas: 24,
      comunidadOInstitucion: 'Fundación Renacer Quito',
      beneficiariosAproximados: 45,
      descripcion: 'Capacitación en alfabetización digital para adultos mayores de la comunidad.'
    };
    const resultado = validarActividadComunitariaDatos(datos, aulaComunitaria, resumenPrevio);
    expect(resultado.numHoras).toBe(24);
    expect(resultado.beneficiariosNum).toBe(45);
    expect(resultado.institucionTrim).toBe('Fundación Renacer Quito');
  });

  test('debe rechazar horas inválidas o mayores al límite del aula', () => {
    const datos = {
      fecha: '2026-10-20',
      horas: 120,
      comunidadOInstitucion: 'Fundación Renacer Quito',
      beneficiariosAproximados: 45,
      descripcion: 'Capacitación en alfabetización digital'
    };
    expect(() => validarActividadComunitariaDatos(datos, aulaComunitaria, resumenPrevio))
      .toThrow(/no exceder las 96 horas reglamentarias/);
  });
});
