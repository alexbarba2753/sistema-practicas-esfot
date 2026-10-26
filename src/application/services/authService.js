import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Usuario } from '../../infrastructure/database/models/index.js';
import { ROLES } from '../../domain/constants/practicasConstants.js';
import { validarDatosUsuario } from '../../domain/utils/validarUsuario.js';
import { errorHttp } from '../../domain/utils/errorHttp.js';
import { emailAdapter } from '../../infrastructure/adapters/emailAdapter.js';
import { ENV } from '../../infrastructure/config/env.js';

export const authService = {
  /**
   * Registro de un nuevo usuario con verificación por correo (Estudiante, Docente, Administrador)
   */
  async registrarUsuario(datos) {
    validarDatosUsuario(datos);

    const { cedula, nombres, apellidos, correo, password, telefono, rol } = datos;
    const correoLimpio = correo.toLowerCase().trim();
    const rolValido = rol && Object.values(ROLES).includes(rol) ? rol : ROLES.ESTUDIANTE;

    // Verificar no duplicidad
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

    // Token temporal (24 horas) para activación
    const token = crypto.randomBytes(24).toString('hex');
    const nuevoUsuario = new Usuario({
      cedula: cedula.trim(),
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      correo: correoLimpio,
      password,
      telefono: telefono ? telefono.trim() : '',
      rol: rolValido,
      estado: 'pendiente',
      token,
      tokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    await nuevoUsuario.save();
    await emailAdapter.enviarTokenVerificacion(correoLimpio, nombres.trim(), token);

    return {
      success: true,
      message: 'Registro exitoso. Se ha enviado un token de verificación a su correo para activar la cuenta.',
      usuarioId: nuevoUsuario._id,
      correo: nuevoUsuario.correo,
      rol: nuevoUsuario.rol,
      tokenVerificacion: token
    };
  },

  /**
   * Valida y activa la cuenta del usuario mediante el token recibido
   */
  async verificarCuenta(token) {
    if (!token) throw errorHttp('El token de verificación es obligatorio', 400);

    const usuario = await Usuario.findOne({
      token: token.trim(),
      tokenExpires: { $gt: new Date() }
    });

    if (!usuario) throw errorHttp('El token de verificación es inválido o ha expirado', 400);

    usuario.estado = 'activo';
    usuario.token = null;
    usuario.tokenExpires = null;
    await usuario.save();

    return {
      success: true,
      message: 'Cuenta verificada y activada exitosamente. Ya puede iniciar sesión en la plataforma.'
    };
  },

  /**
   * Inicio de sesión con credenciales y emisión de token JWT
   */
  async login(correo, password) {
    if (!correo || !password) throw errorHttp('El correo electrónico y la contraseña son obligatorios', 400);

    const correoLimpio = correo.toLowerCase().trim();
    const usuario = await Usuario.findOne({ correo: correoLimpio }).select('+password');
    if (!usuario) throw errorHttp('Credenciales incorrectas', 401);

    if (usuario.estado === 'pendiente') {
      throw errorHttp('Su cuenta no ha sido activada. Por favor revise el token de verificación enviado a su correo.', 403);
    }
    if (usuario.estado === 'inactivo') {
      throw errorHttp('Su cuenta se encuentra inactiva. Por favor comuníquese con el administrador.', 403);
    }

    const passwordValida = await usuario.comparePassword(password);
    if (!passwordValida) throw errorHttp('Credenciales incorrectas', 401);

    const token = jwt.sign(
      { id: usuario._id, correo: usuario.correo, rol: usuario.rol },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN }
    );

    return {
      success: true,
      message: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: usuario._id,
        cedula: usuario.cedula,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        rol: usuario.rol,
        telefono: usuario.telefono
      }
    };
  },

  /**
   * Consulta los datos del perfil del usuario autenticado
   */
  async obtenerPerfil(usuarioId) {
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) throw errorHttp('Usuario no encontrado', 404);

    return {
      success: true,
      usuario: {
        id: usuario._id,
        cedula: usuario.cedula,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        rol: usuario.rol,
        telefono: usuario.telefono,
        estado: usuario.estado,
        createdAt: usuario.createdAt
      }
    };
  },

  /**
   * Actualiza datos personales (nombres, apellidos, teléfono)
   */
  async actualizarPerfil(usuarioId, datos) {
    const { nombres, apellidos, telefono } = datos;
    const camposActualizar = {};
    if (nombres) camposActualizar.nombres = nombres.trim();
    if (apellidos) camposActualizar.apellidos = apellidos.trim();
    if (telefono !== undefined) camposActualizar.telefono = telefono.trim();

    const usuario = await Usuario.findByIdAndUpdate(usuarioId, camposActualizar, {
      returnDocument: 'after',
      runValidators: true
    });

    if (!usuario) throw errorHttp('Usuario no encontrado', 404);

    return {
      success: true,
      message: 'Perfil actualizado exitosamente',
      usuario: {
        id: usuario._id,
        cedula: usuario.cedula,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        rol: usuario.rol,
        telefono: usuario.telefono
      }
    };
  },

  /**
   * Cambia la contraseña solicitando y verificando obligatoriamente la clave anterior
   */
  async cambiarPassword(usuarioId, passwordActual, passwordNueva) {
    if (!passwordActual || !passwordNueva) {
      throw errorHttp('Debe proporcionar la contraseña actual y la nueva contraseña', 400);
    }
    if (passwordNueva.length < 6) {
      throw errorHttp('La nueva contraseña debe tener al menos 6 caracteres', 400);
    }

    const usuario = await Usuario.findById(usuarioId).select('+password');
    if (!usuario) throw errorHttp('Usuario no encontrado', 404);

    const coincide = await usuario.comparePassword(passwordActual);
    if (!coincide) throw errorHttp('La contraseña actual ingresada es incorrecta', 400);

    usuario.password = passwordNueva;
    await usuario.save();

    return {
      success: true,
      message: 'Contraseña actualizada correctamente'
    };
  },

  /**
   * Genera un token temporal y envía el correo para restablecer contraseña
   */
  async solicitarRecuperacionPassword(correo) {
    if (!correo) throw errorHttp('El correo electrónico es obligatorio', 400);

    const usuario = await Usuario.findOne({ correo: correo.toLowerCase().trim() });
    if (!usuario) {
      return {
        success: true,
        message: 'Si el correo se encuentra registrado en el sistema, recibirá las instrucciones para restablecer su contraseña.'
      };
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    usuario.token = resetToken;
    usuario.tokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    await usuario.save();

    await emailAdapter.enviarTokenRecuperacion(usuario.correo, usuario.nombres, resetToken);

    return {
      success: true,
      message: 'Se ha enviado un enlace con el token temporal de recuperación a su correo electrónico.',
      tokenRecuperacion: resetToken
    };
  },

  /**
   * Restablece la contraseña utilizando el token temporal recibido
   */
  async restablecerPassword(token, passwordNueva) {
    if (!token || !passwordNueva) throw errorHttp('El token y la nueva contraseña son obligatorios', 400);
    if (passwordNueva.length < 6) throw errorHttp('La nueva contraseña debe tener al menos 6 caracteres', 400);

    const usuario = await Usuario.findOne({
      token: token.trim(),
      tokenExpires: { $gt: new Date() }
    });

    if (!usuario) throw errorHttp('El token de recuperación es inválido o ha caducado', 400);

    usuario.password = passwordNueva;
    usuario.token = null;
    usuario.tokenExpires = null;
    await usuario.save();

    return {
      success: true,
      message: 'Su contraseña ha sido restablecida exitosamente. Ya puede iniciar sesión con sus nuevas credenciales.'
    };
  }
};
