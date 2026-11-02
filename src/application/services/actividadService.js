import { AulaVirtual, ActividadLaboral, ActividadComunitaria } from '../../infrastructure/database/models/index.js';
import { ESTADOS_ACTIVIDAD, ESTADOS_AULA, MODALIDADES } from '../../domain/constants/practicasConstants.js';
import { errorHttp } from '../../domain/utils/errorHttp.js';
import {
  toActividadLaboralDto,
  toActividadLaboralListDto,
  toActividadComunitariaDto,
  toActividadComunitariaListDto
} from '../dtos/index.js';

export const actividadService = {
  /**
   * Calcula el acumulado de horas aprobadas y pendientes de un aula virtual
   */
  async calcularHorasAula(aulaId) {
    const aula = await AulaVirtual.findById(aulaId);
    if (!aula) throw errorHttp('Aula virtual no encontrada', 404);

    let actividades = [];
    if (aula.modalidad === MODALIDADES.LABORAL) {
      actividades = await ActividadLaboral.find({ aulaVirtual: aulaId });
    } else {
      actividades = await ActividadComunitaria.find({ aulaVirtual: aulaId });
    }

    let horasAprobadas = 0;
    let horasPendientes = 0;
    let horasRechazadas = 0;

    for (const act of actividades) {
      if (act.estadoAprobacion === ESTADOS_ACTIVIDAD.APROBADO) {
        horasAprobadas += act.horas;
      } else if (act.estadoAprobacion === ESTADOS_ACTIVIDAD.PENDIENTE) {
        horasPendientes += act.horas;
      } else if (act.estadoAprobacion === ESTADOS_ACTIVIDAD.RECHAZADO) {
        horasRechazadas += act.horas;
      }
    }

    const porcentaje = Math.min(100, Math.round((horasAprobadas / aula.horasRequeridas) * 100));

    return {
      horasAprobadas,
      horasPendientes,
      horasRechazadas,
      totalRegistradas: horasAprobadas + horasPendientes,
      horasRequeridas: aula.horasRequeridas,
      horasRestantes: Math.max(0, aula.horasRequeridas - horasAprobadas),
      porcentajeCompletado: porcentaje,
      cumplioRequisito: horasAprobadas >= aula.horasRequeridas
    };
  },

  /**
   * Registra una jornada laboral diaria (máximo 8 horas)
   */
  async crearActividadLaboral(estudianteId, aulaId, datos) {
    const aula = await AulaVirtual.findById(aulaId);
    if (!aula) throw errorHttp('Aula virtual no encontrada', 404);

    if (aula.estudiante?.toString() !== estudianteId.toString()) {
      throw errorHttp('No tienes permiso para registrar actividades en esta aula virtual', 403);
    }

    if (aula.modalidad !== MODALIDADES.LABORAL) {
      throw errorHttp('Esta aula virtual no corresponde a la modalidad de Prácticas Laborales', 400);
    }

    if (aula.estado !== ESTADOS_AULA.ABIERTA) {
      throw errorHttp('El aula virtual se encuentra cerrada; no se permiten nuevos registros', 400);
    }

    if (aula.expedienteEntregado) {
      throw errorHttp('El expediente ya fue entregado a revisión formal; no se pueden añadir más actividades', 400);
    }

    const { fecha, horaEntrada, horaSalida, horas, descripcion } = datos;

    if (!fecha || !horaEntrada || !horaSalida || !horas || !descripcion) {
      throw errorHttp('Fecha, hora de entrada, hora de salida, número de horas y descripción técnica son obligatorios', 400);
    }

    const numHoras = Number(horas);
    if (isNaN(numHoras) || numHoras <= 0 || numHoras > 8) {
      throw errorHttp('El número de horas diarias debe ser un valor numérico entre 0.5 y 8 horas', 400);
    }

    const nuevaActividad = new ActividadLaboral({
      estudiante: estudianteId,
      aulaVirtual: aulaId,
      fecha: new Date(fecha),
      horaEntrada: horaEntrada.trim(),
      horaSalida: horaSalida.trim(),
      horas: numHoras,
      descripcion: descripcion.trim(),
      estadoAprobacion: ESTADOS_ACTIVIDAD.PENDIENTE
    });

    await nuevaActividad.save();
    const resumen = await this.calcularHorasAula(aulaId);

    return {
      success: true,
      message: 'Jornada laboral registrada exitosamente en la bitácora',
      actividad: toActividadLaboralDto(nuevaActividad),
      resumenHoras: resumen
    };
  },

  /**
   * Consulta las actividades laborales de un aula virtual
   */
  async listarActividadesLaborales(aulaId, usuario) {
    const aula = await AulaVirtual.findById(aulaId);
    if (!aula) throw errorHttp('Aula virtual no encontrada', 404);

    const esEstudianteAsignado = aula.estudiante?.toString() === usuario._id.toString();
    const esDocenteTutor = aula.docenteTutor?.toString() === usuario._id.toString();

    if (!esEstudianteAsignado && !esDocenteTutor && usuario.rol !== 'administrador') {
      throw errorHttp('No tienes permiso para consultar las actividades de esta aula virtual', 403);
    }

    const actividades = await ActividadLaboral.find({ aulaVirtual: aulaId }).sort({ fecha: -1 });
    const resumen = await this.calcularHorasAula(aulaId);

    return {
      success: true,
      total: actividades.length,
      resumenHoras: resumen,
      actividades: toActividadLaboralListDto(actividades)
    };
  },

  /**
   * El docente tutor evalúa (aprueba o rechaza) una actividad laboral
   */
  async evaluarActividadLaboral(actividadId, docenteId, datos) {
    const actividad = await ActividadLaboral.findById(actividadId);
    if (!actividad) throw errorHttp('Actividad laboral no encontrada', 404);

    const aula = await AulaVirtual.findById(actividad.aulaVirtual);
    if (!aula || aula.docenteTutor?.toString() !== docenteId.toString()) {
      throw errorHttp('No estás autorizado para evaluar actividades de esta aula virtual', 403);
    }

    const { estado, observacionesDocente } = datos;
    if (!estado || ![ESTADOS_ACTIVIDAD.APROBADO, ESTADOS_ACTIVIDAD.RECHAZADO].includes(estado)) {
      throw errorHttp("El estado de evaluación debe ser 'aprobado' o 'rechazado'", 400);
    }

    actividad.estadoAprobacion = estado;
    actividad.observacionesDocente = observacionesDocente ? observacionesDocente.trim() : '';
    await actividad.save();

    const resumen = await this.calcularHorasAula(actividad.aulaVirtual);

    return {
      success: true,
      message: `Actividad laboral ${estado === ESTADOS_ACTIVIDAD.APROBADO ? 'aprobada' : 'rechazada'} exitosamente`,
      actividad: toActividadLaboralDto(actividad),
      resumenHoras: resumen
    };
  },

  /**
   * Registra actividades o certificados de Servicio Comunitario
   */
  async crearActividadComunitaria(estudianteId, aulaId, datos) {
    const aula = await AulaVirtual.findById(aulaId);
    if (!aula) throw errorHttp('Aula virtual no encontrada', 404);

    if (aula.estudiante?.toString() !== estudianteId.toString()) {
      throw errorHttp('No tienes permiso para registrar actividades en esta aula virtual', 403);
    }

    if (aula.modalidad !== MODALIDADES.COMUNITARIO) {
      throw errorHttp('Esta aula virtual no corresponde a la modalidad de Servicio Comunitario', 400);
    }

    if (aula.estado !== ESTADOS_AULA.ABIERTA) {
      throw errorHttp('El aula virtual se encuentra cerrada; no se permiten nuevos registros', 400);
    }

    if (aula.expedienteEntregado) {
      throw errorHttp('El expediente ya fue entregado a revisión formal; no se pueden añadir más actividades', 400);
    }

    const { fecha, horas, comunidadOInstitucion, beneficiariosAproximados, descripcion, archivoEvidenciaUrl } = datos;

    if (!horas || !comunidadOInstitucion || !descripcion) {
      throw errorHttp('Horas cumplidas, institución o comunidad beneficiaria y descripción son obligatorios', 400);
    }

    const numHoras = Number(horas);
    if (isNaN(numHoras) || numHoras <= 0 || numHoras > 96) {
      throw errorHttp('El número de horas debe ser un valor positivo y no exceder las 96 horas reglamentarias', 400);
    }

    const nuevaActividad = new ActividadComunitaria({
      estudiante: estudianteId,
      aulaVirtual: aulaId,
      fecha: fecha ? new Date(fecha) : new Date(),
      horas: numHoras,
      comunidadOInstitucion: comunidadOInstitucion.trim(),
      beneficiariosAproximados: beneficiariosAproximados ? Number(beneficiariosAproximados) : 0,
      descripcion: descripcion.trim(),
      archivoEvidenciaUrl: archivoEvidenciaUrl ? archivoEvidenciaUrl.trim() : '',
      estadoAprobacion: ESTADOS_ACTIVIDAD.PENDIENTE
    });

    await nuevaActividad.save();
    const resumen = await this.calcularHorasAula(aulaId);

    return {
      success: true,
      message: 'Actividad de servicio comunitario registrada exitosamente',
      actividad: toActividadComunitariaDto(nuevaActividad),
      resumenHoras: resumen
    };
  },

  /**
   * Consulta las actividades comunitarias de un aula virtual
   */
  async listarActividadesComunitarias(aulaId, usuario) {
    const aula = await AulaVirtual.findById(aulaId);
    if (!aula) throw errorHttp('Aula virtual no encontrada', 404);

    const esEstudianteAsignado = aula.estudiante?.toString() === usuario._id.toString();
    const esDocenteTutor = aula.docenteTutor?.toString() === usuario._id.toString();

    if (!esEstudianteAsignado && !esDocenteTutor && usuario.rol !== 'administrador') {
      throw errorHttp('No tienes permiso para consultar las actividades de esta aula virtual', 403);
    }

    const actividades = await ActividadComunitaria.find({ aulaVirtual: aulaId }).sort({ fecha: -1 });
    const resumen = await this.calcularHorasAula(aulaId);

    return {
      success: true,
      total: actividades.length,
      resumenHoras: resumen,
      actividades: toActividadComunitariaListDto(actividades)
    };
  },

  /**
   * El docente tutor evalúa (aprueba o rechaza) una actividad comunitaria
   */
  async evaluarActividadComunitaria(actividadId, docenteId, datos) {
    const actividad = await ActividadComunitaria.findById(actividadId);
    if (!actividad) throw errorHttp('Actividad comunitaria no encontrada', 404);

    const aula = await AulaVirtual.findById(actividad.aulaVirtual);
    if (!aula || aula.docenteTutor?.toString() !== docenteId.toString()) {
      throw errorHttp('No estás autorizado para evaluar actividades de esta aula virtual', 403);
    }

    const { estado, observacionesDocente } = datos;
    if (!estado || ![ESTADOS_ACTIVIDAD.APROBADO, ESTADOS_ACTIVIDAD.RECHAZADO].includes(estado)) {
      throw errorHttp("El estado de evaluación debe ser 'aprobado' o 'rechazado'", 400);
    }

    actividad.estadoAprobacion = estado;
    actividad.observacionesDocente = observacionesDocente ? observacionesDocente.trim() : '';
    await actividad.save();

    const resumen = await this.calcularHorasAula(actividad.aulaVirtual);

    return {
      success: true,
      message: `Actividad comunitaria ${estado === ESTADOS_ACTIVIDAD.APROBADO ? 'aprobada' : 'rechazada'} exitosamente`,
      actividad: toActividadComunitariaDto(actividad),
      resumenHoras: resumen
    };
  }
};
