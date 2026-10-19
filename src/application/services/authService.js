import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Usuario } from '../../infrastructure/database/models/index.js';
import { ROLES } from '../../domain/constants/practicasConstants.js';
import { validarCedula } from '../../domain/utils/validarCedula.js';
import { emailAdapter } from '../../infrastructure/adapters/emailAdapter.js';
import { ENV } from '../../infrastructure/config/env.js';

export const authService = {
  /**
   * Registro de un nuevo estudiante con validaciones y token unificado
   */
  async registrarEstudiante(datos) {
    const { cedula, nombres, apellidos, correo, password, telefono } = datos;

    // 1. Validar campos obligatorios
    if (!cedula || !nombres || !apellidos || !correo || !password) {
      const error = new Error('Todos los campos obligatorios deben ser completados');
      error.statusCode = 400;
      throw error;
    }

    // 2. Validar cédula ecuatoriana (Dominio)
    if (!validarCedula(cedula)) {
      const error = new Error('El número de cédula ingresado no es válido para Ecuador');
      error.statusCode = 400;
      throw error;
    }

    // 3. Validar formato de correo electrónico
    const correoLimpio = correo.toLowerCase().trim();
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(correoLimpio)) {
      const error = new Error('El formato del correo electrónico no es válido');
      error.statusCode = 400;
      throw error;
    }

    // 4. Validar longitud mínima de contraseña
    if (password.length < 6) {
      const error = new Error('La contraseña debe tener un mínimo de 6 caracteres');
      error.statusCode = 400;
      throw error;
    }

    // 5. Comprobar duplicidad de cédula o correo
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

    // 6. Generar token temporal unificado (24 horas para activación)
    const token = crypto.randomBytes(24).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 7. Crear el usuario en estado pendiente
    const nuevoUsuario = new Usuario({
      cedula: cedula.trim(),
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      correo: correoLimpio,
      password,
      telefono: telefono ? telefono.trim() : '',
      rol: ROLES.ESTUDIANTE,
      estado: 'pendiente',
      token,
      tokenExpires
    });

    await nuevoUsuario.save();

    // 8. Enviar correo de verificación
    await emailAdapter.enviarTokenVerificacion(correoLimpio, nombres.trim(), token);

    return {
      success: true,
      message: 'Registro exitoso. Se ha enviado un token de verificación a su correo para activar la cuenta.',
      usuarioId: nuevoUsuario._id,
      correo: nuevoUsuario.correo
    };
  },

  /**
   * Valida y activa la cuenta del usuario mediante el token recibido
   */
  async verificarCuenta(token) {
    if (!token) {
      const error = new Error('El token de verificación es obligatorio');
      error.statusCode = 400;
      throw error;
    }

    const usuario = await Usuario.findOne({
      token: token.trim(),
      tokenExpires: { $gt: new Date() }
    });

    if (!usuario) {
      const error = new Error('El token de verificación es inválido o ha expirado');
      error.statusCode = 400;
      throw error;
    }

    // Activar cuenta y limpiar token
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
    if (!correo || !password) {
      const error = new Error('El correo electrónico y la contraseña son obligatorios');
      error.statusCode = 400;
      throw error;
    }

    const correoLimpio = correo.toLowerCase().trim();

    // Buscar usuario incluyendo el password
    const usuario = await Usuario.findOne({ correo: correoLimpio }).select('+password');
    if (!usuario) {
      const error = new Error('Credenciales incorrectas');
      error.statusCode = 401;
      throw error;
    }

    // Verificar si la cuenta fue activada
    if (usuario.estado === 'pendiente') {
      const error = new Error('Su cuenta no ha sido activada. Por favor revise el token de verificación enviado a su correo.');
      error.statusCode = 403;
      throw error;
    }

    if (usuario.estado === 'inactivo') {
      const error = new Error('Su cuenta se encuentra inactiva. Por favor comuníquese con el administrador.');
      error.statusCode = 403;
      throw error;
    }

    // Comprobar contraseña con bcryptjs
    const passwordValida = await usuario.comparePassword(password);
    if (!passwordValida) {
      const error = new Error('Credenciales incorrectas');
      error.statusCode = 401;
      throw error;
    }

    // Generar JWT
    const payload = {
      id: usuario._id,
      correo: usuario.correo,
      rol: usuario.rol
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN
    });

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
   * Obtiene la información del perfil del usuario autenticado
   */
  async obtenerPerfil(usuarioId) {
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }

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

    if (!usuario) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }

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
      const error = new Error('Debe proporcionar la contraseña actual y la nueva contraseña');
      error.statusCode = 400;
      throw error;
    }

    if (passwordNueva.length < 6) {
      const error = new Error('La nueva contraseña debe tener al menos 6 caracteres');
      error.statusCode = 400;
      throw error;
    }

    const usuario = await Usuario.findById(usuarioId).select('+password');
    if (!usuario) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }

    // Verificar contraseña actual con bcryptjs
    const coincide = await usuario.comparePassword(passwordActual);
    if (!coincide) {
      const error = new Error('La contraseña actual ingresada es incorrecta');
      error.statusCode = 400;
      throw error;
    }

    // Actualizar con la nueva clave (el hook pre-save de Usuario.js la hashea automáticamente)
    usuario.password = passwordNueva;
    await usuario.save();

    return {
      success: true,
      message: 'Contraseña actualizada correctamente'
    };
  },

  /**
   * Genera un token temporal unificado y envía el correo para restablecer contraseña
   */
  async solicitarRecuperacionPassword(correo) {
    if (!correo) {
      const error = new Error('El correo electrónico es obligatorio');
      error.statusCode = 400;
      throw error;
    }

    const correoLimpio = correo.toLowerCase().trim();
    const usuario = await Usuario.findOne({ correo: correoLimpio });

    // Por seguridad, si el usuario no existe no revelamos el detalle pero informamos mensaje estándar
    if (!usuario) {
      return {
        success: true,
        message: 'Si el correo se encuentra registrado en el sistema, recibirá las instrucciones para restablecer su contraseña.'
      };
    }

    // Usar el mismo campo 'token' y 'tokenExpires' unificado (1 hora de validez)
    const resetToken = crypto.randomBytes(24).toString('hex');
    usuario.token = resetToken;
    usuario.tokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    await usuario.save();

    // Enviar correo con SendGrid
    await emailAdapter.enviarTokenRecuperacion(usuario.correo, usuario.nombres, resetToken);

    return {
      success: true,
      message: 'Se ha enviado un enlace con el token temporal de recuperación a su correo electrónico.'
    };
  },

  /**
   * Restablece la contraseña utilizando el token temporal unificado
   */
  async restablecerPassword(token, passwordNueva) {
    if (!token || !passwordNueva) {
      const error = new Error('El token y la nueva contraseña son obligatorios');
      error.statusCode = 400;
      throw error;
    }

    if (passwordNueva.length < 6) {
      const error = new Error('La nueva contraseña debe tener al menos 6 caracteres');
      error.statusCode = 400;
      throw error;
    }

    // Buscar por el campo unificado 'token' y 'tokenExpires'
    const usuario = await Usuario.findOne({
      token: token.trim(),
      tokenExpires: { $gt: new Date() }
    });

    if (!usuario) {
      const error = new Error('El token de recuperación es inválido o ha caducado');
      error.statusCode = 400;
      throw error;
    }

    // Actualizar contraseña y limpiar token unificado
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
