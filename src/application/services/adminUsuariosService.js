import { Usuario } from '../../infrastructure/database/models/index.js';
import { ROLES } from '../../domain/constants/practicasConstants.js';
import { validarCedula } from '../../domain/utils/validarCedula.js';

export const adminUsuariosService = {
  /**
   * Crea un nuevo usuario directamente por el Administrador (Docente, Estudiante o Administrador)
   */
  async crearUsuarioPorAdmin(datos) {
    const { cedula, nombres, apellidos, correo, password, telefono, rol, estado } = datos;

    // 1. Validar campos obligatorios
    if (!cedula || !nombres || !apellidos || !correo || !password || !rol) {
      const error = new Error('Cédula, nombres, apellidos, correo, contraseña y rol son obligatorios');
      error.statusCode = 400;
      throw error;
    }

    // 2. Validar cédula ecuatoriana
    if (!validarCedula(cedula)) {
      const error = new Error('El número de cédula ingresado no es válido para Ecuador');
      error.statusCode = 400;
      throw error;
    }

    // 3. Validar formato de correo
    const correoLimpio = correo.toLowerCase().trim();
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(correoLimpio)) {
      const error = new Error('El formato del correo electrónico no es válido');
      error.statusCode = 400;
      throw error;
    }

    // 4. Validar rol permitido
    if (!Object.values(ROLES).includes(rol)) {
      const error = new Error(`El rol especificado no es válido. Roles permitidos: ${Object.values(ROLES).join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    // 5. Validar longitud de contraseña
    if (password.length < 6) {
      const error = new Error('La contraseña debe tener un mínimo de 6 caracteres');
      error.statusCode = 400;
      throw error;
    }

    // 6. Validar no duplicidad
    const usuarioExistente = await Usuario.findOne({
      $or: [{ cedula: cedula.trim() }, { correo: correoLimpio }]
    });

    if (usuarioExistente) {
      const error = new Error(
        usuarioExistente.correo === correoLimpio
          ? 'El correo electrónico ya se encuentra registrado'
          : 'El número de cédula ya se encuentra registrado'
      );
      error.statusCode = 409;
      throw error;
    }

    // 7. Crear el usuario (por defecto activo al ser dado de alta por el admin)
    const estadoAsignado = estado && ['activo', 'inactivo', 'pendiente'].includes(estado)
      ? estado
      : 'activo';

    const nuevoUsuario = new Usuario({
      cedula: cedula.trim(),
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      correo: correoLimpio,
      password,
      telefono: telefono ? telefono.trim() : '',
      rol,
      estado: estadoAsignado,
      token: null,
      tokenExpires: null
    });

    await nuevoUsuario.save();

    return {
      success: true,
      message: 'Usuario registrado exitosamente por el Administrador',
      usuario: {
        id: nuevoUsuario._id,
        cedula: nuevoUsuario.cedula,
        nombres: nuevoUsuario.nombres,
        apellidos: nuevoUsuario.apellidos,
        correo: nuevoUsuario.correo,
        rol: nuevoUsuario.rol,
        estado: nuevoUsuario.estado,
        telefono: nuevoUsuario.telefono
      }
    };
  },

  /**
   * Consulta el listado de usuarios con filtros por rol, estado y búsqueda general
   */
  async listarUsuarios(filtros = {}) {
    const query = {};

    if (filtros.rol && Object.values(ROLES).includes(filtros.rol)) {
      query.rol = filtros.rol;
    }

    if (filtros.estado && ['activo', 'inactivo', 'pendiente'].includes(filtros.estado)) {
      query.estado = filtros.estado;
    }

    if (filtros.busqueda && filtros.busqueda.trim()) {
      const regex = new RegExp(filtros.busqueda.trim(), 'i');
      query.$or = [
        { nombres: regex },
        { apellidos: regex },
        { cedula: regex },
        { correo: regex }
      ];
    }

    const usuarios = await Usuario.find(query)
      .select('-password -token -tokenExpires')
      .sort({ createdAt: -1 });

    return {
      success: true,
      total: usuarios.length,
      usuarios
    };
  },

  /**
   * Obtiene la información completa de un usuario por su ID
   */
  async obtenerUsuarioPorId(usuarioId) {
    const usuario = await Usuario.findById(usuarioId).select('-password -token -tokenExpires');
    if (!usuario) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }

    return {
      success: true,
      usuario
    };
  },

  /**
   * Actualiza los datos personales de un usuario por parte del Administrador
   */
  async actualizarUsuario(usuarioId, datos) {
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const { nombres, apellidos, telefono, correo, cedula } = datos;

    if (correo && correo.toLowerCase().trim() !== usuario.correo) {
      const correoLimpio = correo.toLowerCase().trim();
      const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!regexEmail.test(correoLimpio)) {
        const error = new Error('El formato del correo electrónico no es válido');
        error.statusCode = 400;
        throw error;
      }

      const correoExiste = await Usuario.findOne({ correo: correoLimpio, _id: { $ne: usuarioId } });
      if (correoExiste) {
        const error = new Error('El correo electrónico ya se encuentra registrado por otro usuario');
        error.statusCode = 409;
        throw error;
      }
      usuario.correo = correoLimpio;
    }

    if (cedula && cedula.trim() !== usuario.cedula) {
      if (!validarCedula(cedula.trim())) {
        const error = new Error('El número de cédula ingresado no es válido para Ecuador');
        error.statusCode = 400;
        throw error;
      }

      const cedulaExiste = await Usuario.findOne({ cedula: cedula.trim(), _id: { $ne: usuarioId } });
      if (cedulaExiste) {
        const error = new Error('El número de cédula ya se encuentra registrado por otro usuario');
        error.statusCode = 409;
        throw error;
      }
      usuario.cedula = cedula.trim();
    }

    if (nombres) usuario.nombres = nombres.trim();
    if (apellidos) usuario.apellidos = apellidos.trim();
    if (telefono !== undefined) usuario.telefono = telefono ? telefono.trim() : '';

    await usuario.save();

    return {
      success: true,
      message: 'Datos del usuario actualizados exitosamente',
      usuario: {
        id: usuario._id,
        cedula: usuario.cedula,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        rol: usuario.rol,
        estado: usuario.estado,
        telefono: usuario.telefono
      }
    };
  },

  /**
   * Cambia el estado de una cuenta (activar, suspender o poner en pendiente)
   */
  async cambiarEstadoUsuario(usuarioId, nuevoEstado) {
    if (!nuevoEstado || !['activo', 'inactivo', 'pendiente'].includes(nuevoEstado)) {
      const error = new Error('El estado especificado no es válido (permitidos: activo, inactivo, pendiente)');
      error.statusCode = 400;
      throw error;
    }

    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }

    usuario.estado = nuevoEstado;
    await usuario.save();

    return {
      success: true,
      message: `El estado del usuario ha sido actualizado a '${nuevoEstado}' exitosamente`,
      usuario: {
        id: usuario._id,
        correo: usuario.correo,
        rol: usuario.rol,
        estado: usuario.estado
      }
    };
  }
};
