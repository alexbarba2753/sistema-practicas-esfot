import { AulaVirtual, Usuario } from '../../infrastructure/database/models/index.js';
import { MODALIDADES, ROLES, ESTADOS_AULA } from '../../domain/constants/practicasConstants.js';

export const aulaVirtualService = {
  /**
   * Crea una nueva aula virtual asociada a un período académico y docente tutor
   */
  async crearAulaVirtual(datos) {
    const { nombre, periodo, modalidad, docenteTutor, estudiantes = [], fechaInicio } = datos;
    const fechaFin = datos.fechaFin || datos.fechaLimiteEntrega;

    // 1. Validar campos obligatorios
    if (!nombre || !periodo || !modalidad || !docenteTutor || !fechaFin) {
      const error = new Error('Nombre, período, modalidad, docente tutor y fecha límite de entrega son obligatorios');
      error.statusCode = 400;
      throw error;
    }

    // 2. Validar modalidad
    if (!Object.values(MODALIDADES).includes(modalidad)) {
      const error = new Error(`Modalidad no válida. Permitidas: ${Object.values(MODALIDADES).join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    // 3. Validar docente tutor
    const tutorExistente = await Usuario.findById(docenteTutor);
    if (!tutorExistente || tutorExistente.rol !== ROLES.DOCENTE) {
      const error = new Error('El docente tutor asignado no existe o no tiene el rol de docente');
      error.statusCode = 400;
      throw error;
    }

    // 4. Validar fechas
    const fInicio = fechaInicio ? new Date(fechaInicio) : new Date();
    const fFin = new Date(fechaFin);

    if (isNaN(fFin.getTime())) {
      const error = new Error('La fecha límite de entrega no tiene un formato de fecha válido');
      error.statusCode = 400;
      throw error;
    }

    if (fFin <= fInicio) {
      const error = new Error('La fecha de fin debe ser posterior a la fecha de inicio del aula virtual');
      error.statusCode = 400;
      throw error;
    }

    // 5. Validar estudiantes a matricular inicialmente (si se envían)
    let estudiantesValidados = [];
    if (Array.isArray(estudiantes) && estudiantes.length > 0) {
      const estudiantesEncontrados = await Usuario.find({
        _id: { $in: estudiantes },
        rol: ROLES.ESTUDIANTE
      });

      if (estudiantesEncontrados.length !== estudiantes.length) {
        const error = new Error('Uno o más estudiantes especificados no existen o no tienen rol de estudiante');
        error.statusCode = 400;
        throw error;
      }
      estudiantesValidados = estudiantesEncontrados.map((e) => e._id);
    }

    // 6. Crear el aula virtual
    const nuevaAula = new AulaVirtual({
      nombre: nombre.trim(),
      periodo: periodo.trim(),
      modalidad,
      docenteTutor: tutorExistente._id,
      estudiantes: estudiantesValidados,
      fechaInicio: fInicio,
      fechaFin: fFin,
      estado: ESTADOS_AULA.ABIERTA
    });

    await nuevaAula.save();

    const aulaPoblada = await AulaVirtual.findById(nuevaAula._id)
      .populate('docenteTutor', 'nombres apellidos correo telefono')
      .populate('estudiantes', 'nombres apellidos correo cedula');

    return {
      success: true,
      message: 'Aula virtual creada y parametrizada exitosamente',
      aulaVirtual: aulaPoblada
    };
  },

  /**
   * Lista aulas virtuales con filtros opcionales (periodo, modalidad, estado, docenteTutor)
   */
  async listarAulasVirtuales(filtros = {}) {
    const query = {};

    if (filtros.periodo) {
      query.periodo = new RegExp(filtros.periodo.trim(), 'i');
    }

    if (filtros.modalidad && Object.values(MODALIDADES).includes(filtros.modalidad)) {
      query.modalidad = filtros.modalidad;
    }

    if (filtros.estado && Object.values(ESTADOS_AULA).includes(filtros.estado)) {
      query.estado = filtros.estado;
    }

    if (filtros.docenteTutor) {
      query.docenteTutor = filtros.docenteTutor;
    }

    const aulas = await AulaVirtual.find(query)
      .populate('docenteTutor', 'nombres apellidos correo telefono')
      .select('-__v')
      .sort({ createdAt: -1 });

    const aulasFormateadas = aulas.map((a) => {
      const obj = a.toObject();
      obj.totalEstudiantes = a.estudiantes ? a.estudiantes.length : 0;
      return obj;
    });

    return {
      success: true,
      total: aulasFormateadas.length,
      aulasVirtuales: aulasFormateadas
    };
  },

  /**
   * Obtiene el detalle completo de un aula virtual por ID con estudiantes y docente tutor
   */
  async obtenerAulaVirtualPorId(aulaId) {
    const aula = await AulaVirtual.findById(aulaId)
      .populate('docenteTutor', 'nombres apellidos correo telefono')
      .populate('estudiantes', 'nombres apellidos correo cedula telefono estado');

    if (!aula) {
      const error = new Error('Aula virtual no encontrada');
      error.statusCode = 404;
      throw error;
    }

    return {
      success: true,
      aulaVirtual: aula
    };
  },

  /**
   * Actualiza datos de parametrización del aula virtual
   */
  async actualizarAulaVirtual(aulaId, datos) {
    const aula = await AulaVirtual.findById(aulaId);
    if (!aula) {
      const error = new Error('Aula virtual no encontrada');
      error.statusCode = 404;
      throw error;
    }

    const { nombre, periodo, estado, docenteTutor } = datos;
    const fechaFin = datos.fechaFin || datos.fechaLimiteEntrega;

    if (nombre) aula.nombre = nombre.trim();
    if (periodo) aula.periodo = periodo.trim();

    if (fechaFin) {
      const nuevaFechaFin = new Date(fechaFin);
      if (isNaN(nuevaFechaFin.getTime())) {
        const error = new Error('La fecha límite no es válida');
        error.statusCode = 400;
        throw error;
      }
      if (nuevaFechaFin <= aula.fechaInicio) {
        const error = new Error('La fecha de fin debe ser posterior a la fecha de inicio');
        error.statusCode = 400;
        throw error;
      }
      aula.fechaFin = nuevaFechaFin;
    }

    if (estado && Object.values(ESTADOS_AULA).includes(estado)) {
      aula.estado = estado;
    }

    if (docenteTutor && docenteTutor.toString() !== aula.docenteTutor.toString()) {
      const tutor = await Usuario.findById(docenteTutor);
      if (!tutor || tutor.rol !== ROLES.DOCENTE) {
        const error = new Error('El docente tutor asignado no existe o no tiene el rol de docente');
        error.statusCode = 400;
        throw error;
      }
      aula.docenteTutor = tutor._id;
    }

    await aula.save();

    const aulaActualizada = await AulaVirtual.findById(aulaId)
      .populate('docenteTutor', 'nombres apellidos correo telefono')
      .populate('estudiantes', 'nombres apellidos correo cedula');

    return {
      success: true,
      message: 'Aula virtual actualizada exitosamente',
      aulaVirtual: aulaActualizada
    };
  },

  /**
   * Matricula uno o más estudiantes en el aula virtual
   */
  async matricularEstudiantes(aulaId, estudiantesIds) {
    const aula = await AulaVirtual.findById(aulaId);
    if (!aula) {
      const error = new Error('Aula virtual no encontrada');
      error.statusCode = 404;
      throw error;
    }

    const ids = Array.isArray(estudiantesIds) ? estudiantesIds : [estudiantesIds];
    if (ids.length === 0) {
      const error = new Error('Debe proporcionar al menos un ID de estudiante para matricular');
      error.statusCode = 400;
      throw error;
    }

    // Validar existencia y rol de cada estudiante
    const estudiantesValidos = await Usuario.find({
      _id: { $in: ids },
      rol: ROLES.ESTUDIANTE
    });

    if (estudiantesValidos.length !== ids.length) {
      const error = new Error('Uno o más IDs no corresponden a estudiantes válidos en el sistema');
      error.statusCode = 400;
      throw error;
    }

    // Incorporar sin duplicados
    const estudiantesActualesStr = aula.estudiantes.map((id) => id.toString());
    let nuevosAgregados = 0;

    for (const est of estudiantesValidos) {
      if (!estudiantesActualesStr.includes(est._id.toString())) {
        aula.estudiantes.push(est._id);
        nuevosAgregados++;
      }
    }

    await aula.save();

    return {
      success: true,
      message: `Se matricularon ${nuevosAgregados} nuevo(s) estudiante(s) en el aula virtual`,
      totalEstudiantesMatriculados: aula.estudiantes.length
    };
  },

  /**
   * Remueve a un estudiante del aula virtual
   */
  async desmatricularEstudiante(aulaId, estudianteId) {
    const aula = await AulaVirtual.findById(aulaId);
    if (!aula) {
      const error = new Error('Aula virtual no encontrada');
      error.statusCode = 404;
      throw error;
    }

    const index = aula.estudiantes.findIndex((id) => id.toString() === estudianteId.toString());
    if (index === -1) {
      const error = new Error('El estudiante no se encuentra matriculado en esta aula virtual');
      error.statusCode = 404;
      throw error;
    }

    aula.estudiantes.splice(index, 1);
    await aula.save();

    return {
      success: true,
      message: 'Estudiante desmatriculado exitosamente del aula virtual',
      totalEstudiantesMatriculados: aula.estudiantes.length
    };
  }
};
