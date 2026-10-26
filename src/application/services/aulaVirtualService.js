import { AulaVirtual, Usuario } from '../../infrastructure/database/models/index.js';
import { MODALIDADES, ROLES, ESTADOS_AULA } from '../../domain/constants/practicasConstants.js';
import { errorHttp } from '../../domain/utils/errorHttp.js';

export const aulaVirtualService = {
  /**
   * Crea y parametriza un aula virtual con cálculo automático de 240/96 horas
   */
  async crearAulaVirtual(datos) {
    const { nombre, periodo, modalidad, docenteTutor, estudiantes = [], fechaInicio } = datos;
    const fechaFin = datos.fechaFin || datos.fechaLimiteEntrega;

    // Validar obligatorios y reglas básicas
    if (!nombre || !periodo || !modalidad || !docenteTutor || !fechaFin) {
      throw errorHttp('Nombre, período, modalidad, docente tutor y fecha límite de entrega son obligatorios', 400);
    }
    if (!Object.values(MODALIDADES).includes(modalidad)) {
      throw errorHttp(`Modalidad no válida. Permitidas: ${Object.values(MODALIDADES).join(', ')}`, 400);
    }

    // Validar que el tutor exista y sea docente
    const tutor = await Usuario.findById(docenteTutor);
    if (!tutor || tutor.rol !== ROLES.DOCENTE) {
      throw errorHttp('El docente tutor asignado no existe o no tiene el rol de docente', 400);
    }

    // Validar coherencia de fechas
    const fInicio = fechaInicio ? new Date(fechaInicio) : new Date();
    const fFin = new Date(fechaFin);
    if (isNaN(fFin.getTime()) || fFin <= fInicio) {
      throw errorHttp('La fecha límite debe tener un formato válido y ser posterior al inicio', 400);
    }

    // Validar estudiantes iniciales si fueron enviados
    let estudiantesValidos = [];
    if (Array.isArray(estudiantes) && estudiantes.length > 0) {
      const encontrados = await Usuario.find({ _id: { $in: estudiantes }, rol: ROLES.ESTUDIANTE });
      if (encontrados.length !== estudiantes.length) {
        throw errorHttp('Uno o más estudiantes especificados no existen o no tienen rol de estudiante', 400);
      }
      estudiantesValidos = encontrados.map((e) => e._id);
    }

    const nuevaAula = new AulaVirtual({
      nombre: nombre.trim(),
      periodo: periodo.trim(),
      modalidad,
      docenteTutor: tutor._id,
      estudiantes: estudiantesValidos,
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
   * Consulta las aulas virtuales con filtros por periodo, modalidad o tutor
   */
  async listarAulasVirtuales(filtros = {}) {
    const query = {};
    if (filtros.periodo) query.periodo = new RegExp(filtros.periodo.trim(), 'i');
    if (filtros.modalidad && Object.values(MODALIDADES).includes(filtros.modalidad)) query.modalidad = filtros.modalidad;
    if (filtros.estado && Object.values(ESTADOS_AULA).includes(filtros.estado)) query.estado = filtros.estado;
    if (filtros.docenteTutor) query.docenteTutor = filtros.docenteTutor;

    const aulas = await AulaVirtual.find(query)
      .populate('docenteTutor', 'nombres apellidos correo telefono')
      .select('-__v')
      .sort({ createdAt: -1 });

    const aulasVirtuales = aulas.map((a) => {
      const obj = a.toObject();
      obj.totalEstudiantes = a.estudiantes ? a.estudiantes.length : 0;
      return obj;
    });

    return {
      success: true,
      total: aulasVirtuales.length,
      aulasVirtuales
    };
  },

  /**
   * Obtiene el detalle de un aula virtual con sus alumnos y tutor asignado
   */
  async obtenerAulaVirtualPorId(aulaId) {
    const aula = await AulaVirtual.findById(aulaId)
      .populate('docenteTutor', 'nombres apellidos correo telefono')
      .populate('estudiantes', 'nombres apellidos correo cedula telefono estado');

    if (!aula) throw errorHttp('Aula virtual no encontrada', 404);

    return {
      success: true,
      aulaVirtual: aula
    };
  },

  /**
   * Actualiza la parametrización de un aula virtual
   */
  async actualizarAulaVirtual(aulaId, datos) {
    const aula = await AulaVirtual.findById(aulaId);
    if (!aula) throw errorHttp('Aula virtual no encontrada', 404);

    const { nombre, periodo, estado, docenteTutor } = datos;
    const fechaFin = datos.fechaFin || datos.fechaLimiteEntrega;

    if (nombre) aula.nombre = nombre.trim();
    if (periodo) aula.periodo = periodo.trim();
    if (estado && Object.values(ESTADOS_AULA).includes(estado)) aula.estado = estado;

    if (fechaFin) {
      const fFin = new Date(fechaFin);
      if (isNaN(fFin.getTime()) || fFin <= aula.fechaInicio) {
        throw errorHttp('La fecha límite debe ser válida y posterior al inicio', 400);
      }
      aula.fechaFin = fFin;
    }

    if (docenteTutor && docenteTutor.toString() !== aula.docenteTutor.toString()) {
      const tutor = await Usuario.findById(docenteTutor);
      if (!tutor || tutor.rol !== ROLES.DOCENTE) {
        throw errorHttp('El docente tutor asignado no existe o no tiene el rol de docente', 400);
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
   * Matricula estudiantes garantizando no duplicidad mediante Set
   */
  async matricularEstudiantes(aulaId, estudiantesIds) {
    const aula = await AulaVirtual.findById(aulaId);
    if (!aula) throw errorHttp('Aula virtual no encontrada', 404);

    const idsRaw = Array.isArray(estudiantesIds) ? estudiantesIds : [estudiantesIds];
    const ids = Array.from(new Set(idsRaw.map((id) => id.toString())));
    if (ids.length === 0) throw errorHttp('Debe proporcionar al menos un ID de estudiante', 400);

    const validos = await Usuario.find({ _id: { $in: ids }, rol: ROLES.ESTUDIANTE });
    if (validos.length !== ids.length) {
      throw errorHttp('Uno o más IDs no corresponden a estudiantes válidos en el sistema', 400);
    }

    // Incorporar sin duplicados con Set
    const conjunto = new Set(aula.estudiantes.map((id) => id.toString()));
    const totalInicial = conjunto.size;
    ids.forEach((id) => conjunto.add(id));

    aula.estudiantes = Array.from(conjunto);
    await aula.save();

    return {
      success: true,
      message: `Se matricularon ${conjunto.size - totalInicial} nuevo(s) estudiante(s) en el aula virtual`,
      totalEstudiantesMatriculados: aula.estudiantes.length
    };
  },

  /**
   * Desmatricula a un estudiante del aula virtual
   */
  async desmatricularEstudiante(aulaId, estudianteId) {
    const aula = await AulaVirtual.findById(aulaId);
    if (!aula) throw errorHttp('Aula virtual no encontrada', 404);

    const totalInicial = aula.estudiantes.length;
    aula.estudiantes = aula.estudiantes.filter((id) => id.toString() !== estudianteId.toString());

    if (aula.estudiantes.length === totalInicial) {
      throw errorHttp('El estudiante no se encuentra matriculado en esta aula virtual', 404);
    }

    await aula.save();

    return {
      success: true,
      message: 'Estudiante desmatriculado exitosamente del aula virtual',
      totalEstudiantesMatriculados: aula.estudiantes.length
    };
  }
};
