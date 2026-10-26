/**
 * Helper para crear errores con código de estado HTTP (statusCode) en una sola línea
 */
export const errorHttp = (mensaje, statusCode = 400) => {
  const error = new Error(mensaje);
  error.statusCode = statusCode;
  return error;
};
