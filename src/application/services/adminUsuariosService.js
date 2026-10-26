import { Usuario } from '../../infrastructure/database/models/index.js';
import { ROLES } from '../../domain/constants/practicasConstants.js';
import { validarCedula } from '../../domain/utils/validarCedula.js';
import { validarDatosUsuario } from '../../domain/utils/validarUsuario.js';
import { errorHttp } from '../../domain/utils/errorHttp.js';

export const adminUsuariosService = {
  /**
   * Crea un nuevo usuario directamente desde el Administrador (activo por defecto)
   */
  async crearUsuarioPorAdmin(datos) {
    validarDatosUsuario(datos);

    const { cedula, nombres, apellidos, correo, password, telefono, rol, estado } = datos;

    if (!rol || !Object.values(ROLES).includes(rol)) {
      throw errorHttp(`El rol especificado no es válido. Roles permitidos: ${Object.values(ROLES).join(', ')}`, 400);
    }

    const correoLimpio = correo.toLowerCase().trim();

    // Comprobar que no exista cédula o correo previo
    const usuarioExistente = await Usuario.findOne({
      $or: [{ cedula: cedula.trim() }, { correo: correoLimpio }]
    });

    if (usuarioExistente) {
      throw errorHttp(
        usuarioExistente.correo === correoLimpio
          ? 'El correo electrónico ya se encuentra registrado'
          : 'El número de cédula ya se encuentra registrado',
        409
      );
    }

    const nuevoUsuario = new Usuario({
      cedula: cedula.trim(),
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      correo: correoLimpio,
      password,
      telefono: telefono ? telefono.trim() : '',
      rol,
      estado: estado && ['activo', 'inactivo', 'pendiente'].includes(estado) ? estado : 'activo',
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

    if (filtros.busqueda?.trim()) {
      const regex = new RegExp(filtros.busqueda.trim(), 'i');
      query.$or = [{ nombres: regex }, { apellidos: regex }, { cedula: regex }, { correo: regex }];
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
    if (!usuario) throw errorHttp('Usuario no encontrado', 404);

    return {
      success: true,
      usuario
    };
  },

  /**
   * Actualiza los datos de un usuario garantizando no duplicidad de correo o cédula
   */
  async actualizarUsuario(usuarioId, datos) {
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) throw errorHttp('Usuario no encontrado', 404);

    const { nombres, apellidos, telefono, correo, cedula } = datos;

    // Si cambia el correo, validar formato y unicidad
    if (correo && correo.toLowerCase().trim() !== usuario.correo) {
      const correoLimpio = correo.toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
        throw errorHttp('El formato del correo electrónico no es válido', 400);
      }
      const correoExiste = await Usuario.findOne({ correo: correoLimpio, _id: { $ne: usuarioId } });
      if (correoExiste) throw errorHttp('El correo electrónico ya se encuentra registrado por otro usuario', 409);
      usuario.correo = correoLimpio;
    }

    // Si cambia la cédula, validar Módulo 10 y unicidad
    if (cedula && cedula.trim() !== usuario.cedula) {
      if (!validarCedula(cedula.trim())) {
        throw errorHttp('El número de cédula ingresado no es válido para Ecuador', 400);
      }
      const cedulaExiste = await Usuario.findOne({ cedula: cedula.trim(), _id: { $ne: usuarioId } });
      if (cedulaExiste) throw errorHttp('El número de cédula ya se encuentra registrado por otro usuario', 409);
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
   * Cambia el estado de una cuenta (activo, inactivo, pendiente)
   */
  async cambiarEstadoUsuario(usuarioId, nuevoEstado) {
    if (!nuevoEstado || !['activo', 'inactivo', 'pendiente'].includes(nuevoEstado)) {
      throw errorHttp('El estado especificado no es válido (permitidos: activo, inactivo, pendiente)', 400);
    }

    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) throw errorHttp('Usuario no encontrado', 404);

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
