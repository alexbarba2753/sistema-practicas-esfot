import { AulaVirtual, Usuario } from '../../infrastructure/database/models/index.js';
import { MODALIDADES, ROLES, ESTADOS_AULA, HORAS_REGLAMENTARIAS } from '../../domain/constants/practicasConstants.js';
import { errorHttp } from '../../domain/utils/errorHttp.js';
import { toAulaVirtualDto, toAulaVirtualListDto } from '../dtos/index.js';

export const aulaVirtualService = {
  /**
   * Crea y parametriza un aula virtual para 1 docente tutor y 1 estudiante
   * Calcula automáticamente 240 horas para laboral o 96 horas para comunitario
   */
  async crearAulaVirtual(datos) {
    const { nombre, periodo, modalidad, docenteTutor, fechaInicio } = datos;
    const fechaFin = datos.fechaFin || datos.fechaLimiteEntrega;
    const estudianteId = datos.estudiante || datos.estudianteId || (Array.isArray(datos.estudiantes) ? datos.estudiantes[0] : null);

    // 1. Validar campos obligatorios
    if (!nombre || !periodo || !modalidad || !docenteTutor || !estudianteId || !fechaFin) {
      throw errorHttp('Nombre, período, modalidad, docente tutor, estudiante y fecha límite de entrega son obligatorios', 400);
    }

    if (!Object.values(MODALIDADES).includes(modalidad)) {
      throw errorHttp(`Modalidad no válida. Permitidas: ${Object.values(MODALIDADES).join(', ')}`, 400);
    }

    // 2. Validar que el tutor exista y tenga rol docente
    const tutor = await Usuario.findById(docenteTutor);
    if (!tutor || tutor.rol !== ROLES.DOCENTE) {
      throw errorHttp('El docente tutor asignado no existe o no tiene el rol de docente', 400);
    }

    // 3. Validar que el estudiante exista y tenga rol estudiante
    const alumno = await Usuario.findById(estudianteId);
    if (!alumno || alumno.rol !== ROLES.ESTUDIANTE) {
      throw errorHttp('El estudiante asignado no existe o no tiene el rol de estudiante', 400);
    }

    // 4. Regla de negocio: Un estudiante puede tener 1 aula activa por modalidad (laboral y comunitaria independientes)
    const aulaActivaMismaModalidad = await AulaVirtual.findOne({
      estudiante: alumno._id,
      modalidad,
      estado: ESTADOS_AULA.ABIERTA
    });
    if (aulaActivaMismaModalidad) {
      throw errorHttp(`El estudiante ya cuenta con un aula virtual activa para la modalidad '${modalidad}'`, 409);
    }

    // 5. Validar coherencia de fechas
    const fInicio = fechaInicio ? new Date(fechaInicio) : new Date();
    const fFin = new Date(fechaFin);
    if (isNaN(fFin.getTime()) || fFin <= fInicio) {
      throw errorHttp('La fecha límite debe ser una fecha válida y posterior al inicio', 400);
    }

    // 6. Horas según modalidad (240 laboral, 96 comunitario)
    const horasRequeridas = modalidad === MODALIDADES.LABORAL
      ? HORAS_REGLAMENTARIAS.LABORAL
      : HORAS_REGLAMENTARIAS.COMUNITARIO;

    const nuevaAula = new AulaVirtual({
      nombre: nombre.trim(),
      periodo: periodo.trim(),
      modalidad,
      docenteTutor: tutor._id,
      estudiante: alumno._id,
      horasRequeridas,
      fechaInicio: fInicio,
      fechaFin: fFin,
      estado: ESTADOS_AULA.ABIERTA
    });

    await nuevaAula.save();

    const aulaPoblada = await AulaVirtual.findById(nuevaAula._id)
      .populate('docenteTutor', 'nombres apellidos correo telefono')
      .populate('estudiante', 'nombres apellidos correo cedula telefono estado');

    return {
      success: true,
      message: 'Aula virtual creada y parametrizada exitosamente para el estudiante y docente tutor',
      aulaVirtual: toAulaVirtualDto(aulaPoblada)
    };
  },

  /**
   * Consulta las aulas virtuales con filtros por periodo, modalidad, tutor o estudiante
   */
  async listarAulasVirtuales(filtros = {}) {
    const query = {};
    if (filtros.periodo) query.periodo = new RegExp(filtros.periodo.trim(), 'i');
    if (filtros.modalidad && Object.values(MODALIDADES).includes(filtros.modalidad)) query.modalidad = filtros.modalidad;
    if (filtros.estado && Object.values(ESTADOS_AULA).includes(filtros.estado)) query.estado = filtros.estado;
    if (filtros.docenteTutor) query.docenteTutor = filtros.docenteTutor;
    if (filtros.estudiante) query.estudiante = filtros.estudiante;

    const aulas = await AulaVirtual.find(query)
      .populate('docenteTutor', 'nombres apellidos correo telefono')
      .populate('estudiante', 'nombres apellidos correo cedula telefono estado')
      .select('-__v')
      .sort({ createdAt: -1 });

    return {
      success: true,
      total: aulas.length,
      aulasVirtuales: toAulaVirtualListDto(aulas)
    };
  },

  /**
   * Obtiene el detalle de un aula virtual con su docente tutor y estudiante
   */
  async obtenerAulaVirtualPorId(aulaId) {
    const aula = await AulaVirtual.findById(aulaId)
      .populate('docenteTutor', 'nombres apellidos correo telefono')
      .populate('estudiante', 'nombres apellidos correo cedula telefono estado');

    if (!aula) throw errorHttp('Aula virtual no encontrada', 404);

    return {
      success: true,
      aulaVirtual: toAulaVirtualDto(aula)
    };
  },

  /**
   * Actualiza la parametrización del aula virtual (modalidad, fechas, tutor o estudiante)
   */
  async actualizarAulaVirtual(aulaId, datos) {
    const aula = await AulaVirtual.findById(aulaId);
    if (!aula) throw errorHttp('Aula virtual no encontrada', 404);

    const { nombre, periodo, estado, docenteTutor, modalidad } = datos;
    const fechaFin = datos.fechaFin || datos.fechaLimiteEntrega;
    const estudianteId = datos.estudiante || datos.estudianteId;

    if (nombre) aula.nombre = nombre.trim();
    if (periodo) aula.periodo = periodo.trim();
    if (estado && Object.values(ESTADOS_AULA).includes(estado)) aula.estado = estado;

    // Si el administrador cambia la modalidad, se recalculan automáticamente las horas
    if (modalidad && Object.values(MODALIDADES).includes(modalidad)) {
      aula.modalidad = modalidad;
      aula.horasRequeridas = modalidad === MODALIDADES.LABORAL
        ? HORAS_REGLAMENTARIAS.LABORAL
        : HORAS_REGLAMENTARIAS.COMUNITARIO;
    }

    if (fechaFin) {
      const fFin = new Date(fechaFin);
      if (isNaN(fFin.getTime()) || fFin <= aula.fechaInicio) {
        throw errorHttp('La fecha límite debe ser válida y posterior al inicio', 400);
      }
      aula.fechaFin = fFin;
    }

    if (docenteTutor && docenteTutor.toString() !== aula.docenteTutor?.toString()) {
      const tutor = await Usuario.findById(docenteTutor);
      if (!tutor || tutor.rol !== ROLES.DOCENTE) {
        throw errorHttp('El docente tutor asignado no existe o no tiene el rol de docente', 400);
      }
      aula.docenteTutor = tutor._id;
    }

    // Reasignación de estudiante o cambio de modalidad validando regla de 1 aula activa por modalidad
    const modalidadComparar = modalidad || aula.modalidad;
    const nuevoEstudianteId = estudianteId || aula.estudiante;

    if (nuevoEstudianteId && (estudianteId || modalidad)) {
      const alumno = await Usuario.findById(nuevoEstudianteId);
      if (!alumno || alumno.rol !== ROLES.ESTUDIANTE) {
        throw errorHttp('El estudiante asignado no existe o no tiene el rol de estudiante', 400);
      }

      const aulaActiva = await AulaVirtual.findOne({
        estudiante: alumno._id,
        modalidad: modalidadComparar,
        estado: ESTADOS_AULA.ABIERTA,
        _id: { $ne: aulaId }
      });
      if (aulaActiva) {
        throw errorHttp(`El estudiante ya cuenta con otra aula virtual activa para la modalidad '${modalidadComparar}'`, 409);
      }
      if (estudianteId) {
        aula.estudiante = alumno._id;
      }
    }

    await aula.save();

    const aulaActualizada = await AulaVirtual.findById(aulaId)
      .populate('docenteTutor', 'nombres apellidos correo telefono')
      .populate('estudiante', 'nombres apellidos correo cedula telefono estado');

    return {
      success: true,
      message: 'Aula virtual actualizada exitosamente',
      aulaVirtual: toAulaVirtualDto(aulaActualizada)
    };
  },

  /**
   * Matricula o asigna al estudiante único en el aula virtual
   */
  async matricularEstudiante(aulaId, idEstudiante) {
    const aula = await AulaVirtual.findById(aulaId);
    if (!aula) throw errorHttp('Aula virtual no encontrada', 404);

    if (!idEstudiante) throw errorHttp('Debe proporcionar el ID del estudiante a matricular', 400);

    // Si ya tiene un estudiante diferente asignado, advertir que cada aula es 1 a 1
    if (aula.estudiante && aula.estudiante.toString() !== idEstudiante.toString()) {
      throw errorHttp('El aula virtual ya cuenta con un estudiante asignado (capacidad máxima: 1 estudiante por aula)', 409);
    }

    const alumno = await Usuario.findById(idEstudiante);
    if (!alumno || alumno.rol !== ROLES.ESTUDIANTE) {
      throw errorHttp('El ID proporcionado no corresponde a un estudiante válido en el sistema', 400);
    }

    // Verificar que el estudiante no tenga otra aula abierta en esta misma modalidad
    const aulaActiva = await AulaVirtual.findOne({
      estudiante: alumno._id,
      modalidad: aula.modalidad,
      estado: ESTADOS_AULA.ABIERTA,
      _id: { $ne: aulaId }
    });
    if (aulaActiva) {
      throw errorHttp(`El estudiante ya cuenta con un aula virtual activa para la modalidad '${aula.modalidad}'`, 409);
    }

    aula.estudiante = alumno._id;
    await aula.save();

    const aulaPoblada = await AulaVirtual.findById(aulaId)
      .populate('docenteTutor', 'nombres apellidos correo telefono')
      .populate('estudiante', 'nombres apellidos correo cedula telefono estado');

    return {
      success: true,
      message: 'Estudiante matriculado exitosamente en el aula virtual',
      aulaVirtual: toAulaVirtualDto(aulaPoblada)
    };
  },

  /**
   * Desmatricula al estudiante del aula virtual dejando la plaza disponible
   */
  async desmatricularEstudiante(aulaId, idEstudiante) {
    const aula = await AulaVirtual.findById(aulaId);
    if (!aula) throw errorHttp('Aula virtual no encontrada', 404);

    if (!aula.estudiante) {
      throw errorHttp('El aula virtual no tiene ningún estudiante matriculado actualmente', 400);
    }

    if (idEstudiante && aula.estudiante.toString() !== idEstudiante.toString()) {
      throw errorHttp('El estudiante especificado no coincide con el alumno matriculado en esta aula', 400);
    }

    aula.estudiante = null;
    await aula.save();

    return {
      success: true,
      message: 'Estudiante desmatriculado exitosamente del aula virtual'
    };
  }
};
