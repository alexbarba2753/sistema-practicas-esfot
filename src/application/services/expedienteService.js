import { AulaVirtual, FormularioAprobacion } from '../../infrastructure/database/models/index.js';
import { ESTADOS_AULA } from '../../domain/constants/practicasConstants.js';
import { errorHttp } from '../../domain/utils/errorHttp.js';
import { actividadService } from './actividadService.js';
import { toAulaVirtualDto } from '../dtos/index.js';

export const expedienteService = {
  /**
   * Consulta las aulas virtuales del estudiante con cálculo en vivo de progreso
   */
  async obtenerAulasEstudiante(estudianteId) {
    const aulas = await AulaVirtual.find({ estudiante: estudianteId })
      .populate('docenteTutor', 'nombres apellidos correo telefono')
      .populate('estudiante', 'nombres apellidos correo cedula telefono estado')
      .sort({ createdAt: -1 });

    const aulasConProgreso = await Promise.all(
      aulas.map(async (aula) => {
        const resumen = await actividadService.calcularHorasAula(aula._id);
        const dto = toAulaVirtualDto(aula);
        return {
          ...dto,
          resumenHoras: resumen
        };
      })
    );

    return {
      success: true,
      total: aulasConProgreso.length,
      aulas: aulasConProgreso
    };
  },

  /**
   * Consulta las aulas virtuales asignadas al docente tutor con progreso de cada estudiante
   */
  async obtenerAulasDocente(docenteId) {
    const aulas = await AulaVirtual.find({ docenteTutor: docenteId })
      .populate('docenteTutor', 'nombres apellidos correo telefono')
      .populate('estudiante', 'nombres apellidos correo cedula telefono estado')
      .sort({ createdAt: -1 });

    const aulasConProgreso = await Promise.all(
      aulas.map(async (aula) => {
        const resumen = await actividadService.calcularHorasAula(aula._id);
        const dto = toAulaVirtualDto(aula);
        return {
          ...dto,
          resumenHoras: resumen
        };
      })
    );

    return {
      success: true,
      total: aulasConProgreso.length,
      aulas: aulasConProgreso
    };
  },

  /**
   * Consulta el detalle específico de un aula virtual para el docente tutor
   */
  async obtenerDetalleAulaDocente(aulaId, docenteId) {
    const aula = await AulaVirtual.findOne({ _id: aulaId, docenteTutor: docenteId })
      .populate('docenteTutor', 'nombres apellidos correo telefono')
      .populate('estudiante', 'nombres apellidos correo cedula telefono estado');

    if (!aula) throw errorHttp('Aula virtual no encontrada o no asignada a este docente', 404);

    const resumen = await actividadService.calcularHorasAula(aulaId);
    const dto = toAulaVirtualDto(aula);

    const formulario = await FormularioAprobacion.findOne({ aulaVirtual: aulaId });

    return {
      success: true,
      aula: {
        ...dto,
        resumenHoras: resumen,
        formularioAprobacion: formulario || null
      }
    };
  },

  /**
   * El estudiante envía formalmente su expediente a revisión (bloquea nuevas bitácoras)
   */
  async entregarExpediente(aulaId, estudianteId) {
    const aula = await AulaVirtual.findById(aulaId);
    if (!aula) throw errorHttp('Aula virtual no encontrada', 404);

    if (aula.estudiante?.toString() !== estudianteId.toString()) {
      throw errorHttp('No tienes permiso para entregar el expediente de esta aula', 403);
    }

    if (aula.estado !== ESTADOS_AULA.ABIERTA) {
      throw errorHttp('El aula virtual ya se encuentra cerrada', 400);
    }

    if (aula.expedienteEntregado) {
      throw errorHttp('El expediente ya fue entregado previamente y se encuentra en revisión', 400);
    }

    const resumen = await actividadService.calcularHorasAula(aulaId);
    if (resumen.totalRegistradas === 0) {
      throw errorHttp('No puedes entregar un expediente sin haber registrado actividades en tu bitácora', 400);
    }

    aula.expedienteEntregado = true;
    aula.fechaEntregaExpediente = new Date();
    await aula.save();

    // Crear o actualizar formulario en estado 'en_revision'
    let formulario = await FormularioAprobacion.findOne({ aulaVirtual: aulaId });
    if (!formulario) {
      formulario = new FormularioAprobacion({
        estudiante: estudianteId,
        docenteTutor: aula.docenteTutor,
        aulaVirtual: aulaId,
        modalidad: aula.modalidad,
        horasCompletadas: resumen.horasAprobadas,
        horasRequeridas: aula.horasRequeridas,
        dictamen: 'Aprobado',
        estado: 'en_revision'
      });
    } else {
      formulario.horasCompletadas = resumen.horasAprobadas;
      formulario.estado = 'en_revision';
    }
    await formulario.save();

    return {
      success: true,
      message: 'Expediente entregado exitosamente al docente tutor para revisión final',
      resumenHoras: resumen,
      fechaEntrega: aula.fechaEntregaExpediente,
      estadoExpediente: 'en_revision'
    };
  },

  /**
   * El docente tutor emite la aprobación final y cierra el proceso
   */
  async cerrarProcesoDocente(aulaId, docenteId, datos = {}) {
    const aula = await AulaVirtual.findOne({ _id: aulaId, docenteTutor: docenteId });
    if (!aula) throw errorHttp('Aula virtual no encontrada o no asignada a este docente tutor', 404);

    const resumen = await actividadService.calcularHorasAula(aulaId);

    if (resumen.horasAprobadas < aula.horasRequeridas) {
      throw errorHttp(
        `El estudiante aún no cumple con las horas reglamentarias (${resumen.horasAprobadas}/${aula.horasRequeridas} horas aprobadas)`,
        400
      );
    }

    // Cerrar aula virtual
    aula.estado = ESTADOS_AULA.CERRADA;
    await aula.save();

    // Registrar acta / formulario de aprobación
    let formulario = await FormularioAprobacion.findOne({ aulaVirtual: aulaId });
    if (!formulario) {
      formulario = new FormularioAprobacion({
        estudiante: aula.estudiante,
        docenteTutor: docenteId,
        aulaVirtual: aulaId,
        modalidad: aula.modalidad,
        horasCompletadas: resumen.horasAprobadas,
        horasRequeridas: aula.horasRequeridas,
        dictamen: 'Aprobado',
        estado: 'aprobado',
        observacionesFinales: datos.observacionesFinales || 'Prácticas culminadas satisfactoriamente con 100% de horas aprobadas'
      });
    } else {
      formulario.horasCompletadas = resumen.horasAprobadas;
      formulario.dictamen = 'Aprobado';
      formulario.estado = 'aprobado';
      formulario.observacionesFinales = datos.observacionesFinales || 'Prácticas culminadas satisfactoriamente con 100% de horas aprobadas';
      formulario.fechaEmision = new Date();
    }
    await formulario.save();

    return {
      success: true,
      message: 'Proceso de prácticas aprobado y cerrado formalmente por el docente tutor',
      dictamen: 'Aprobado',
      horasAprobadas: resumen.horasAprobadas,
      horasRequeridas: aula.horasRequeridas,
      estadoAula: aula.estado,
      formularioAprobacionId: formulario._id
    };
  }
};
