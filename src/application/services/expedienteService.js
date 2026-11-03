import { AulaVirtual, FormularioAprobacion, FormularioPendiente, Usuario } from '../../infrastructure/database/models/index.js';
import { ESTADOS_AULA, MODALIDADES } from '../../domain/constants/practicasConstants.js';
import { errorHttp } from '../../domain/utils/errorHttp.js';
import { actividadService } from './actividadService.js';
import { excelService } from './excelService.js';
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

    // Actualizar formulario pendiente a estado aprobado si existe
    await FormularioPendiente.findOneAndUpdate(
      { aulaVirtual: aulaId },
      { estado: 'aprobado' }
    );

    return {
      success: true,
      message: 'Proceso de prácticas aprobado y cerrado formalmente por el docente tutor',
      dictamen: 'Aprobado',
      horasAprobadas: resumen.horasAprobadas,
      horasRequeridas: aula.horasRequeridas,
      estadoAula: aula.estado,
      formularioAprobacionId: formulario._id
    };
  },

  /**
   * Consulta el borrador de formulario pendiente generado por IA para un aula
   */
  async obtenerFormularioPendiente(aulaId, estudianteId) {
    const aula = await AulaVirtual.findById(aulaId);
    if (!aula) throw errorHttp('Aula virtual no encontrada', 404);

    if (aula.estudiante?.toString() !== estudianteId.toString()) {
      throw errorHttp('No tienes permiso para consultar el formulario de esta aula', 403);
    }

    const formPendiente = await FormularioPendiente.findOne({
      aulaVirtual: aulaId,
      estudiante: estudianteId
    });

    if (!formPendiente) {
      throw errorHttp(
        'Aún no existe un borrador de formulario pendiente para esta aula. Primero debe generar el reporte con el asistente IA.',
        404
      );
    }

    return {
      success: true,
      formularioPendiente: formPendiente
    };
  },

  /**
   * Permite al estudiante editar manualmente los comentarios o datos del borrador sin gastar tokens de IA
   */
  async actualizarFormularioPendiente(aulaId, estudianteId, datosActualizados = {}) {
    const aula = await AulaVirtual.findById(aulaId);
    if (!aula) throw errorHttp('Aula virtual no encontrada', 404);

    if (aula.estudiante?.toString() !== estudianteId.toString()) {
      throw errorHttp('No tienes permiso para editar el formulario de esta aula', 403);
    }

    const formPendiente = await FormularioPendiente.findOne({
      aulaVirtual: aulaId,
      estudiante: estudianteId
    });

    if (!formPendiente) {
      throw errorHttp(
        'No se encontró el borrador del formulario. Primero debe generarlo mediante el asistente IA.',
        404
      );
    }

    if (formPendiente.estado === 'aprobado') {
      throw errorHttp('Este formulario ya ha sido aprobado formalmente y no puede ser modificado.', 400);
    }

    // Actualizar campos de entidad receptora si fueron provistos
    if (datosActualizados.entidadReceptora && typeof datosActualizados.entidadReceptora === 'object') {
      Object.assign(formPendiente.entidadReceptora, datosActualizados.entidadReceptora);
    }

    // Actualizar secciones de contenido IA si fueron provistos
    if (datosActualizados.contenidoIa && typeof datosActualizados.contenidoIa === 'object') {
      Object.assign(formPendiente.contenidoIa, datosActualizados.contenidoIa);
    }

    formPendiente.ultimaEdicionEstudiante = new Date();
    await formPendiente.save();

    return {
      success: true,
      message: 'Borrador de formulario actualizado exitosamente sin consumo de tokens de IA',
      formularioPendiente: formPendiente
    };
  },

  /**
   * Genera y transmite en streaming el archivo Excel inyectando los datos de la colección formularios_pendientes
   */
  async descargarInformeExcel(aulaId, estudianteId, modalidadEsperada) {
    const aula = await AulaVirtual.findById(aulaId)
      .populate('estudiante', 'nombres apellidos cedula correo telefono')
      .populate('docenteTutor', 'nombres apellidos cedula correo telefono');

    if (!aula) throw errorHttp('Aula virtual no encontrada', 404);

    if (aula.estudiante?._id?.toString() !== estudianteId.toString()) {
      throw errorHttp('No tienes permiso para descargar el formulario de esta aula', 403);
    }

    if (modalidadEsperada && aula.modalidad !== modalidadEsperada) {
      throw errorHttp(
        `Esta aula virtual pertenece a la modalidad de ${aula.modalidad}, no a ${modalidadEsperada}`,
        400
      );
    }

    // Validación estricta: Si la IA no ha generado la información en formularios_pendientes, se bloquea la descarga
    const formPendiente = await FormularioPendiente.findOne({
      aulaVirtual: aulaId,
      estudiante: estudianteId
    });

    if (!formPendiente) {
      throw errorHttp(
        'Primero debe generar el borrador asistido por IA antes de descargar el formulario Excel.',
        400
      );
    }

    if (aula.modalidad === MODALIDADES.LABORAL) {
      return await excelService.generarExcelInformeLaboral({
        aula,
        estudiante: aula.estudiante,
        docente: aula.docenteTutor,
        formularioPendiente: formPendiente
      });
    } else {
      return await excelService.generarExcelInformeComunitario({
        aula,
        estudiante: aula.estudiante,
        docente: aula.docenteTutor,
        formularioPendiente: formPendiente
      });
    }
  }
};
