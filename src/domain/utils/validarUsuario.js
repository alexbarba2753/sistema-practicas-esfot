import { validarCedula } from './validarCedula.js';
import { errorHttp } from './errorHttp.js';

/**
 * Validador unificado de datos personales para registro y administración de usuarios
 */
export const validarDatosUsuario = ({ cedula, correo, password, nombres, apellidos }) => {
  if (!cedula || !correo || !password || !nombres || !apellidos) {
    throw errorHttp('Todos los campos obligatorios deben ser completados', 400);
  }

  if (!validarCedula(cedula)) {
    throw errorHttp('El número de cédula ingresado no es válido para Ecuador', 400);
  }

  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regexEmail.test(correo.trim())) {
    throw errorHttp('El formato del correo electrónico no es válido', 400);
  }

  if (password.length < 6) {
    throw errorHttp('La contraseña debe tener un mínimo de 6 caracteres', 400);
  }
};
